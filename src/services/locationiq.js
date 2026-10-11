// 4clique LocationIQ Autocomplete & Reverse Geocoding Service

const LOCATIONIQ_AUTOCOMPLETE_URL = 'https://api.locationiq.com/v1/autocomplete';
const LOCATIONIQ_REVERSE_URL = 'https://us1.locationiq.com/v1/reverse';

// Bengaluru Bounding Box constraint
const BENGALURU_VIEWBOX = '77.4,13.15,77.8,12.8';

// Clean string by removing non-Latin / Indic / Kannada scripts and trimming
export function cleanToEnglish(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u0900-\u0DFF]+/g, '') // Strip Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam
    .replace(/^[,\-\s/]+|[,\-\s/]+$/g, '')
    .trim();
}

// Curated list of major Bengaluru localities for instant, offline English fallback
const BENGALURU_ENGLISH_LOCALITIES = [
  { name: 'Koramangala', coords: [77.6245, 12.9352] },
  { name: 'Indiranagar', coords: [77.6412, 12.9784] },
  { name: 'Whitefield', coords: [77.7499, 12.9698] },
  { name: 'Jayanagar', coords: [77.5833, 12.9308] },
  { name: 'HSR Layout', coords: [77.6320, 12.9120] },
  { name: 'BTM Layout', coords: [77.6101, 12.9166] },
  { name: 'Malleshwaram', coords: [77.5714, 13.0031] },
  { name: 'Rajajinagar', coords: [77.5559, 12.9982] },
  { name: 'Electronic City', coords: [77.6749, 12.8452] },
  { name: 'Sarjapur Road', coords: [77.6784, 12.9121] },
  { name: 'Bellandur', coords: [77.6710, 12.9370] },
  { name: 'Marathahalli', coords: [77.6980, 12.9550] },
  { name: 'Hebbal', coords: [77.5920, 13.0350] },
  { name: 'Yelahanka', coords: [77.6000, 13.1050] },
  { name: 'Banashankari', coords: [77.5726, 12.9255] },
  { name: 'Basavanagudi', coords: [77.5738, 12.9432] },
  { name: 'Shivajinagar', coords: [77.6050, 12.9860] },
  { name: 'Shanthinagar', coords: [77.5950, 12.9560] },
  { name: 'Ulsoor', coords: [77.6200, 12.9820] },
  { name: 'Richmond Town', coords: [77.6033, 12.9667] },
  { name: 'Domlur', coords: [77.6389, 12.9609] },
  { name: 'Kalyan Nagar', coords: [77.6433, 13.0280] },
  { name: 'Peenya', coords: [77.5180, 13.0280] },
  { name: 'Kengeri', coords: [77.4833, 12.9167] },
  { name: 'Vijayanagar', coords: [77.5350, 12.9680] },
  { name: 'Manyata Tech Park', coords: [77.6195, 13.0482] }
];

export function findNearestEnglishLocality(lat, lng) {
  let closest = null;
  let minDistance = Infinity;
  for (const loc of BENGALURU_ENGLISH_LOCALITIES) {
    const dLat = loc.coords[1] - lat;
    const dLng = loc.coords[0] - lng;
    const dist = Math.hypot(dLat, dLng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = loc.name;
    }
  }
  // If within ~5km (~0.05 degrees)
  return minDistance < 0.05 ? closest : 'Bengaluru Urban';
}

const MAPBOX_DEFAULT_TOKEN = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN)
  ? import.meta.env.VITE_MAPBOX_TOKEN
  : (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('4clique_mapbox_token') || '' : '');

/**
 * Autocomplete place search restricted to Bengaluru in English (Google Maps Style)
 * Uses Mapbox Geocoding with LocationIQ fallback.
 */
export async function searchLocationIQ(query, tokenOverride = null) {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  // 1. Primary: Mapbox Geocoding (Google Maps quality, English, fast, high rate-limit)
  const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN || MAPBOX_DEFAULT_TOKEN).trim();
  if (mapboxToken) {
    try {
      const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxToken}&country=IN&proximity=77.5946,12.9716&language=en&limit=8`;
      const res = await fetch(mbUrl);
      if (res.ok) {
        const data = await res.json();
        const features = data?.features || [];
        if (features.length > 0) {
          return features.map((feat) => {
            const rawMain = feat.text || feat.place_name?.split(',')[0] || q;
            const mainText = cleanToEnglish(rawMain) || rawMain;
            const fullText = cleanToEnglish(feat.place_name) || feat.place_name;
            const sub = fullText.replace(mainText, '').replace(/^[,\s]+|[,\s]+$/g, '') || 'Karnataka, India';

            return {
              place_id: feat.id,
              display_name: fullText,
              main_text: mainText,
              secondary_text: sub,
              lat: feat.center ? feat.center[1].toString() : '12.9716',
              lon: feat.center ? feat.center[0].toString() : '77.5946',
              category: feat.place_type?.includes('poi') ? 'PLACE' : 'WARD'
            };
          });
        }
      }
    } catch (mbErr) {
      console.warn("Mapbox autocomplete fallback:", mbErr.message);
    }
  }

  // 2. Secondary Fallback: LocationIQ Autocomplete (no custom headers to prevent browser CORS block)
  const token = (tokenOverride || import.meta.env.VITE_LOCATIONIQ_TOKEN || 'pk.b331338dcd3fee9865865d43152f9ed9').trim();
  const params = new URLSearchParams({
    key: token,
    q: q,
    countrycodes: 'in',
    viewbox: BENGALURU_VIEWBOX,
    limit: '8',
    'accept-language': 'en'
  });

  const url = `${LOCATIONIQ_AUTOCOMPLETE_URL}?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`LocationIQ HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(item => {
      const cleanName = cleanToEnglish(item.display_name) || item.display_name;
      const parts = cleanName.split(',');
      return {
        ...item,
        display_name: cleanName,
        main_text: parts[0]?.trim() || cleanName,
        secondary_text: parts.slice(1, 3).map(p => p.trim()).join(', '),
        category: 'PLACE'
      };
    });
  } catch (err) {
    console.warn("LocationIQ autocomplete error:", err.message);
    return [];
  }
}

/**
 * Reverse geocodes coordinates to the selected area/neighborhood name strictly in English
 * Prioritizes Mapbox reverse geocode, then LocationIQ, then nearest locality dataset.
 */
export async function reverseLocationIQ(lat, lng, tokenOverride = null) {
  // 1. Primary: Mapbox Reverse Geocoding
  const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN || MAPBOX_DEFAULT_TOKEN).trim();
  if (mapboxToken) {
    try {
      const mbRevUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=neighborhood,locality,place,address&language=en&limit=3`;
      const res = await fetch(mbRevUrl);
      if (res.ok) {
        const data = await res.json();
        const features = data?.features || [];
        if (features.length > 0) {
          // Look for neighborhood or locality first
          const areaFeat = features.find(f => f.place_type?.includes('neighborhood') || f.place_type?.includes('locality')) || features[0];
          const areaName = cleanToEnglish(areaFeat.text) || areaFeat.text;
          const fullName = cleanToEnglish(areaFeat.place_name) || `${areaName}, Bengaluru`;
          return {
            fullName: fullName,
            primaryName: areaName,
            subName: `${areaName}, Bengaluru Urban`
          };
        }
      }
    } catch (mbErr) {
      console.warn("Mapbox reverse fallback:", mbErr.message);
    }
  }

  // 2. Secondary Fallback: LocationIQ Reverse (no custom headers to prevent browser CORS block)
  const token = (tokenOverride || import.meta.env.VITE_LOCATIONIQ_TOKEN || 'pk.b331338dcd3fee9865865d43152f9ed9').trim();
  const url = `${LOCATIONIQ_REVERSE_URL}?key=${token}&lat=${lat}&lon=${lng}&format=json&accept-language=en&addressdetails=1&namedetails=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`LocationIQ reverse HTTP ${res.status}`);
    const data = await res.json();

    const addr = data.address || {};
    const namedetails = data.namedetails || {};

    let areaCandidate = (
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.quarter ||
      addr.subdistrict ||
      addr.city_district ||
      addr.town ||
      addr.village ||
      namedetails['name:en'] ||
      addr.city ||
      ''
    );

    areaCandidate = cleanToEnglish(areaCandidate);

    if (!areaCandidate || /^\d+/.test(areaCandidate) || areaCandidate.length < 2) {
      const parts = (data.display_name || '').split(',').map(p => cleanToEnglish(p)).filter(Boolean);
      for (const p of parts) {
        if (!/^\d+/.test(p) && p.length > 2) {
          areaCandidate = p;
          break;
        }
      }
    }

    if (!areaCandidate) {
      areaCandidate = findNearestEnglishLocality(lat, lng);
    }

    const city = cleanToEnglish(addr.city) || 'Bengaluru';
    const subName = areaCandidate !== city ? `${areaCandidate}, ${city}` : `${city} Urban`;

    return {
      fullName: cleanToEnglish(data.display_name) || subName,
      primaryName: areaCandidate,
      subName: subName
    };
  } catch (err) {
    console.warn("LocationIQ reverse error:", err.message);
    const fallbackArea = findNearestEnglishLocality(lat, lng);
    return {
      fullName: `${fallbackArea}, Bengaluru`,
      primaryName: fallbackArea,
      subName: `${fallbackArea}, Bengaluru Urban`
    };
  }
}
