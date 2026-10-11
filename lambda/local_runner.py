"""
4clique Unified Digital Twin Runner
Combines both Frontend (React/Mapbox Digital Twin) and Backend (AWS Hydrologic Twin) into ONE unified server.
Runs locally on http://localhost:8000 (or http://127.0.0.1:8000).
"""

import sys
import os
import json
import mimetypes
import ssl
import urllib.request
import urllib.error
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

# Setup directory paths
LAMBDA_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(LAMBDA_DIR)
DIST_DIR = os.path.join(PARENT_DIR, "dist")

# Add lambda dir to sys.path
sys.path.insert(0, LAMBDA_DIR)
from lambda_function import lambda_handler

def load_env():
    env_file = os.path.join(PARENT_DIR, ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip().strip('"').strip("'")
                    os.environ[k] = v

load_env()

PORT = int(os.environ.get("LAMBDA_LOCAL_PORT", 8000))

# SSL context for outbound proxy requests (Bhuvan, Overpass)
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


class UnifiedTwinHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Clean terminal logging
        sys.stderr.write(f"[4clique Unified Server] {self.command} {self.path} - {format % args}\n")

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Range")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _serve_file(self, full_path):
        if not os.path.isfile(full_path):
            return False
        mime_type, _ = mimetypes.guess_type(full_path)
        if mime_type is None:
            if full_path.endswith(".js"):
                mime_type = "text/javascript"
            elif full_path.endswith(".css"):
                mime_type = "text/css"
            elif full_path.endswith(".svg"):
                mime_type = "image/svg+xml"
            else:
                mime_type = "application/octet-stream"

        try:
            with open(full_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
            return True
        except Exception as e:
            sys.stderr.write(f"Error serving {full_path}: {e}\n")
            return False

    def _proxy_request(self, target_base_url, stripped_prefix, method="GET", body=None):
        subpath = self.path
        if subpath.startswith(stripped_prefix):
            subpath = subpath[len(stripped_prefix):]
        if not subpath.startswith("/"):
            subpath = "/" + subpath

        target_url = target_base_url.rstrip("/") + subpath
        try:
            headers = {"User-Agent": "4clique-EnvironmentalIntel/1.0"}
            for k, v in self.headers.items():
                if k.lower() in ["content-type", "accept", "accept-encoding"]:
                    headers[k] = v

            req = urllib.request.Request(target_url, data=body, headers=headers, method=method)
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=12) as resp:
                resp_data = resp.read()
                self.send_response(resp.status)
                for hk, hv in resp.headers.items():
                    if hk.lower() in ["content-type", "content-encoding", "cache-control"]:
                        self.send_header(hk, hv)
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(resp_data)
        except urllib.error.HTTPError as he:
            err_body = he.read()
            self.send_response(he.code)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Proxy failure to {target_url}: {str(e)}"}).encode("utf-8"))

    def do_GET(self):
        clean_path = urllib.parse.urlparse(self.path).path

        # 1. Healthcheck endpoints
        if clean_path in ["/health", "/api/health"]:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                "service": "4clique-hydrologic-twin",
                "status": "ready",
                "environment": "unified-local-server",
                "instructions": "Digital Twin Frontend and AWS Lambda combined on single port",
                "frontend": "Available at /",
                "simulation": "Send POST to / with hydrologic payload"
            }).encode("utf-8"))
            return

        # 2. Proxy Bhuvan WMS requests
        if clean_path.startswith("/api/bhuvan"):
            self._proxy_request("https://bhuvan-vec1.nrsc.gov.in", "/api/bhuvan", method="GET")
            return

        # 3. Proxy Overpass API requests
        if clean_path.startswith("/api/overpass"):
            self._proxy_request("https://overpass-api.de", "/api/overpass", method="GET")
            return

        # 4. Frontend static files
        if os.path.exists(DIST_DIR):
            target_file = None
            if clean_path in ["", "/", "/index.html"]:
                target_file = os.path.join(DIST_DIR, "index.html")
            else:
                candidate = os.path.join(DIST_DIR, clean_path.lstrip("/"))
                if os.path.isfile(candidate):
                    target_file = candidate
                else:
                    # SPA Fallback for client-side routing
                    target_file = os.path.join(DIST_DIR, "index.html")

            if target_file and self._serve_file(target_file):
                return

        # Fallback if dist has not been built
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(b"""<!DOCTYPE html>
        <html>
        <head><title>4clique Digital Twin</title></head>
        <body style="font-family:sans-serif;background:#0d1117;color:#f0f6fc;padding:40px;text-align:center;">
          <h1 style="color:#00f0ff;">4clique Unified Server Active</h1>
          <p>Please run <code>npm run build</code> in awsproj to bundle the production frontend.</p>
          <p>Backend API is active and ready on port 8000.</p>
        </body>
        </html>
        """)

    def do_POST(self):
        clean_path = urllib.parse.urlparse(self.path).path
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b""

        # 1. Proxy Overpass POST requests
        if clean_path.startswith("/api/overpass"):
            self._proxy_request("https://overpass-api.de", "/api/overpass", method="POST", body=body_bytes)
            return

        # 2. AWS Hydrologic Simulation & Assessment POST requests
        body_str = body_bytes.decode("utf-8") if body_bytes else ""
        event = {
            "httpMethod": "POST",
            "requestContext": {"http": {"method": "POST"}},
            "path": self.path,
            "headers": dict(self.headers),
            "body": body_str
        }

        response = lambda_handler(event, None)
        self.send_response(response["statusCode"])
        for k, v in response.get("headers", {}).items():
            self.send_header(k, v)
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(response.get("body", "").encode("utf-8"))


def run():
    server_address = ("127.0.0.1", PORT)
    httpd = HTTPServer(server_address, UnifiedTwinHandler)
    print(f"\n========================================================")
    print(f"4CLIQUE UNIFIED DIGITAL TWIN SERVER ACTIVE")
    print(f"Frontend & Backend combined into ONE live local server!")
    print(f"Local Host URL: http://localhost:{PORT} (or http://127.0.0.1:{PORT})")
    print(f"========================================================")
    print(f"• Frontend App:     http://localhost:{PORT}/")
    print(f"• Health Status:    http://localhost:{PORT}/health")
    print(f"• Hydrologic API:   POST http://localhost:{PORT}/")
    print(f"• WMS / OSM Proxy:  /api/bhuvan, /api/overpass")
    print(f"========================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down unified server.")
        httpd.server_close()


if __name__ == "__main__":
    run()
