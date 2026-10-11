// 4clique OpenStreetMap Drainage Geometry Service
// Queries OSM Overpass API for verified stormwater drains, ditches, culverts, waterways and manholes within the active 1 km² block.

const OVERPASS_ENDPOINTS = typeof window !== 'undefined'
  ? ['/api/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']
  : ['https://overpass-api.de/api/interpreter'];

const osmDrainageCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute cache

/**
 * Generates verified fallback drainage vectors along natural gradient for Bengaluru blocks
 */
function generateBlockDrainageFallback(bounds) {
  const { minLng, minLat, maxLng, maxLat } = bounds;
  const midLng = (minLng + maxLng) / 2;
  const midLat = (minLat + maxLat) / 2;

  // Major primary stormwater corridor (Rajakaluve) through block
  const rajakaluveCoords = [
    [minLng + 0.15 * (maxLng - minLng), maxLat - 0.1 * (maxLat - minLat)],
    [midLng - 0.05 * (maxLng - minLng), midLat + 0.05 * (maxLat - minLat)],
    [midLng + 0.1 * (maxLng - minLng), midLat - 0.1 * (maxLat - minLat)],
    [maxLng - 0.15 * (maxLng - minLng), minLat + 0.15 * (maxLat - minLat)]
  ];

  // Secondary feeder culverts
  const feederCoords1 = [
    [minLng + 0.05 * (maxLng - minLng), midLat + 0.25 * (maxLat - minLat)],
    [midLng - 0.05 * (maxLng - minLng), midLat + 0.05 * (maxLat - minLat)]
  ];
  const feederCoords2 = [
    [maxLng - 0.05 * (maxLng - minLng), midLat + 0.2 * (maxLat - minLat)],
    [midLng + 0.1 * (maxLng - minLng), midLat - 0.1 * (maxLat - minLat)]
  ];

  return [
    {
      type: 'Feature',
      id: 'osm_fallback_primary_drain',
      properties: {
        id: 'osm_fallback_primary_drain',
        name: 'Estimated Primary Drainage Corridor',
        drainType: 'drain',
        source: 'Estimated Flow Path (Synthetic Fallback)',
        verified: false,
        isFallback: true,
        widthMeters: 3.5
      },
      geometry: { type: 'LineString', coordinates: rajakaluveCoords }
    },
    {
      type: 'Feature',
      id: 'osm_fallback_feeder_1',
      properties: {
        id: 'osm_fallback_feeder_1',
        name: 'Estimated Secondary Feeder Drain',
        drainType: 'ditch',
        source: 'Estimated Flow Path (Synthetic Fallback)',
        verified: false,
        isFallback: true,
        widthMeters: 1.5
      },
      geometry: { type: 'LineString', coordinates: feederCoords1 }
    },
    {
      type: 'Feature',
      id: 'osm_fallback_feeder_2',
      properties: {
        id: 'osm_fallback_feeder_2',
        name: 'Estimated Culvert Outflow',
        drainType: 'drain',
        source: 'Estimated Flow Path (Synthetic Fallback)',
        verified: false,
        isFallback: true,
        widthMeters: 1.8
      },
      geometry: { type: 'LineString', coordinates: feederCoords2 }
    },
    {
      type: 'Feature',
      id: 'osm_fallback_manhole_1',
      properties: {
        id: 'osm_fallback_manhole_1',
        name: 'Estimated Drainage Inspection Point',
        featureType: 'manhole',
        source: 'Estimated Flow Path (Synthetic Fallback)',
        verified: false,
        isFallback: true
      },
      geometry: { type: 'Point', coordinates: [midLng, midLat] }
    }
  ];
}

/**
 * Fetches mapped stormwater drains and waterways for a given 1 km x 1 km bounding box.
 * @param {Object} bounds - { minLng, minLat, maxLng, maxLat }
 * @param {boolean} [forceRefresh=false]
 */
export async function fetchOsmDrainageFeatures(bounds, forceRefresh = false) {
  if (!bounds || typeof bounds.minLat !== 'number') {
    return {
      type: 'FeatureCollection',
      features: [],
      metadata: { totalCount: 0, status: 'EMPTY_BOUNDS' }
    };
  }

  const { minLat, minLng, maxLat, maxLng } = bounds;
  const cacheKey = `${minLat.toFixed(4)},${minLng.toFixed(4)},${maxLat.toFixed(4)},${maxLng.toFixed(4)}`;

  const cached = osmDrainageCache.get(cacheKey);
  if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  // Construct Overpass QL query:
  // Extracts waterways (drain, ditch, canal, stream), culverts, and stormwater manholes
  const query = `
    [out:json][timeout:10];
    (
      way["waterway"~"drain|ditch|canal|stream"](${minLat},${minLng},${maxLat},${maxLng});
      way["tunnel"="culvert"](${minLat},${minLng},${maxLat},${maxLng});
      way["covered"="yes"]["waterway"](${minLat},${minLng},${maxLat},${maxLng});
      node["manhole"="drain"](${minLat},${minLng},${maxLat},${maxLng});
      node["manhole"="stormwater"](${minLat},${minLng},${maxLat},${maxLng});
    );
    out body;
    >;
    out skel qt;
  `;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const osmData = await res.json();
      const geojsonFeatures = convertOsmJsonToGeoJSON(osmData);

      const isRealOsm = geojsonFeatures.length > 0;
      const featuresToUse = isRealOsm
        ? geojsonFeatures
        : generateBlockDrainageFallback(bounds);

      const result = {
        type: 'FeatureCollection',
        features: featuresToUse,
        sourceStatus: isRealOsm ? 'LIVE' : 'ESTIMATED',
        metadata: {
          totalCount: featuresToUse.length,
          verifiedOsmCount: geojsonFeatures.length,
          isFallback: !isRealOsm,
          provider: isRealOsm ? 'OpenStreetMap Overpass API' : 'Estimated Natural Drainage Alignment (Synthetic Fallback)',
          timestamp: new Date().toISOString()
        }
      };

      osmDrainageCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch {
      // Try next endpoint
    }
  }

  // Graceful fallback to synthetic flow alignment
  const fallbackFeatures = generateBlockDrainageFallback(bounds);
  const fallbackResult = {
    type: 'FeatureCollection',
    features: fallbackFeatures,
    sourceStatus: 'ESTIMATED',
    metadata: {
      totalCount: fallbackFeatures.length,
      verifiedOsmCount: 0,
      isFallback: true,
      provider: 'Estimated Natural Drainage Alignment (Synthetic Fallback)',
      timestamp: new Date().toISOString()
    }
  };
  osmDrainageCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
  return fallbackResult;
}

/**
 * Converts raw Overpass JSON elements to standard GeoJSON features
 */
function convertOsmJsonToGeoJSON(osmData) {
  if (!osmData || !Array.isArray(osmData.elements)) return [];

  const nodesMap = new Map();
  const ways = [];
  const pointNodes = [];

  for (const el of osmData.elements) {
    if (el.type === 'node') {
      nodesMap.set(el.id, [el.lon, el.lat]);
      if (el.tags && (el.tags.manhole || el.tags.waterway)) {
        pointNodes.push(el);
      }
    } else if (el.type === 'way') {
      ways.push(el);
    }
  }

  const features = [];

  for (const way of ways) {
    if (!Array.isArray(way.nodes) || way.nodes.length < 2) continue;
    const coords = [];
    for (const nodeId of way.nodes) {
      const pt = nodesMap.get(nodeId);
      if (pt) coords.push(pt);
    }
    if (coords.length < 2) continue;

    features.push({
      type: 'Feature',
      id: `osm_way_${way.id}`,
      properties: {
        id: way.id,
        name: way.tags?.name || way.tags?.waterway ? `Stormwater ${way.tags.waterway}` : 'Drainage Line',
        drainType: way.tags?.waterway || (way.tags?.tunnel === 'culvert' ? 'culvert' : 'drain'),
        widthMeters: parseFloat(way.tags?.width) || 2.0,
        covered: way.tags?.covered === 'yes' || way.tags?.tunnel === 'culvert',
        source: 'OpenStreetMap Contributors',
        verified: true
      },
      geometry: { type: 'LineString', coordinates: coords }
    });
  }

  for (const node of pointNodes) {
    features.push({
      type: 'Feature',
      id: `osm_node_${node.id}`,
      properties: {
        id: node.id,
        name: node.tags?.name || 'Drainage Inspection Chamber',
        featureType: 'manhole',
        manholeType: node.tags?.manhole || 'stormwater',
        source: 'OpenStreetMap Contributors',
        verified: true
      },
      geometry: { type: 'Point', coordinates: [node.lon, node.lat] }
    });
  }

  return features;
}

/**
 * Evaluates drainage condition & clogging risk for the selected block
 * using the real API drainage features and any official monitored drains / reports in the area.
 *
 * @param {Object} osmDrainageData - Returned GeoJSON FeatureCollection from fetchOsmDrainageFeatures
 * @param {Object} blockBounds - { minLng, minLat, maxLng, maxLat }
 * @param {Array} drainageAlerts - State-wide monitored drains with citizen/municipal overrides
 * @returns {Object} { assessedCloggingPercent, assessmentStatus, isEstimate, drainCount, culvertCount, monitoredDrain, explanation }
 */
export function assessDrainageCondition(osmDrainageData, blockBounds, drainageAlerts = []) {
  if (!blockBounds) {
    return {
      assessedCloggingPercent: 70,
      assessmentStatus: 'MANUAL',
      isEstimate: true,
      drainCount: 0,
      culvertCount: 0,
      monitoredDrain: null,
      explanation: 'No block selected. Manual scenario setting active.'
    };
  }

  const { minLng, minLat, maxLng, maxLat } = blockBounds;

  // 1. Check if any monitored Karnataka/Bengaluru rajakaluves / outfalls intersect this block
  let matchedMonitoredDrain = null;
  if (Array.isArray(drainageAlerts) && drainageAlerts.length > 0) {
    matchedMonitoredDrain = drainageAlerts.find(d => {
      if (!Array.isArray(d.coordinates)) return false;
      const [lng, lat] = d.coordinates;
      return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
    });
  }

  // 2. Inspect real OSM drainage features in block
  const features = osmDrainageData?.features || [];
  const isFallback = osmDrainageData?.metadata?.isFallback ?? (features.length === 0);
  const realOsmFeatures = isFallback ? [] : features;

  const lines = realOsmFeatures.filter(f => f.geometry?.type === 'LineString');
  const manholes = realOsmFeatures.filter(f => f.geometry?.type === 'Point');
  const culverts = lines.filter(f => f.properties?.drainType === 'culvert' || f.properties?.covered);

  // If a monitored drain with known deficit / municipal status is inside this block:
  if (matchedMonitoredDrain) {
    let baseClog = 55;
    if (matchedMonitoredDrain.currentStatus === 'Severe' || matchedMonitoredDrain.defaultStatus === 'Severe') {
      baseClog = Math.max(75, matchedMonitoredDrain.deficitPercent ? Math.min(85, matchedMonitoredDrain.deficitPercent * 2) : 75);
    } else if (matchedMonitoredDrain.currentStatus === 'Moderate' || matchedMonitoredDrain.defaultStatus === 'Moderate') {
      baseClog = 55;
    } else if (matchedMonitoredDrain.currentStatus === 'Critical') {
      baseClog = 85;
    } else if (matchedMonitoredDrain.currentStatus === 'Normal') {
      baseClog = 30;
    }

    if (culverts.length > 0) baseClog = Math.min(90, baseClog + 5);

    return {
      assessedCloggingPercent: Math.round(baseClog),
      assessmentStatus: 'OBSERVED_DEFICIT',
      isEstimate: false,
      drainCount: lines.length,
      culvertCount: culverts.length,
      manholeCount: manholes.length,
      monitoredDrain: matchedMonitoredDrain,
      isFallback: false,
      explanation: `${matchedMonitoredDrain.shortName || matchedMonitoredDrain.name}: ${matchedMonitoredDrain.currentStatus} (${matchedMonitoredDrain.deficitPercent ? matchedMonitoredDrain.deficitPercent + '% deficit' : matchedMonitoredDrain.criticality || 'Monitored Outfall'})`
    };
  }

  // If genuine OSM features are found (geometry without sensor telemetry)
  if (!isFallback && lines.length > 0) {
    let estimatedClog = 50;
    if (culverts.length > 0) estimatedClog += 10;
    if (lines.length <= 2) estimatedClog += 10;

    return {
      assessedCloggingPercent: Math.min(85, Math.max(25, estimatedClog)),
      assessmentStatus: 'ESTIMATED_GEOMETRY',
      isEstimate: true,
      drainCount: lines.length,
      culvertCount: culverts.length,
      manholeCount: manholes.length,
      monitoredDrain: null,
      isFallback: false,
      explanation: `${lines.length} mapped OSM stormwater conduits (${culverts.length} culverts, ${manholes.length} chambers). No sensor telemetry; clogging estimated from conduit morphology.`
    };
  }

  // If no OSM features or fallback used
  return {
    assessedCloggingPercent: 70,
    assessmentStatus: isFallback ? 'ESTIMATED_SYNTHETIC' : 'UNAVAILABLE',
    isEstimate: true,
    drainCount: features.length,
    culvertCount: 0,
    manholeCount: 0,
    monitoredDrain: null,
    isFallback: true,
    explanation: 'No direct drainage sensors in this block. Using baseline hydraulic estimation.'
  };
}
