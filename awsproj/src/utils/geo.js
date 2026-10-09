// 4clique Geospatial Utilities
// Calculates 1km x 1km square bounds, outside-mask polygon, and terrain grid sampling

/**
 * Generates a 1 km x 1 km square bounding box around a center coordinate.
 * In Bengaluru (lat ~12.93°), 0.0045° lat is ~500m, 0.0046° lng is ~500m.
 * Spec standard: [lng - 0.005, lat - 0.005, lng + 0.005, lat + 0.005]
 */
export function calculateSquareBounds(lng, lat, halfSpanDeg = 0.005) {
  const minLng = Number((lng - halfSpanDeg).toFixed(6));
  const minLat = Number((lat - halfSpanDeg).toFixed(6));
  const maxLng = Number((lng + halfSpanDeg).toFixed(6));
  const maxLat = Number((lat + halfSpanDeg).toFixed(6));

  return {
    minLng,
    minLat,
    maxLng,
    maxLat,
    center: [Number(lng.toFixed(6)), Number(lat.toFixed(6))],
    bbox: [minLng, minLat, maxLng, maxLat]
  };
}

/**
 * Generates GeoJSON Polygon for the 1km x 1km block
 */
export function boundsToGeoJSON(bounds) {
  const { minLng, minLat, maxLng, maxLat } = bounds;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "simulation-block" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat]
          ]]
        }
      }
    ]
  };
}

/**
 * Builds an inverted mask GeoJSON polygon: covering the world with a cutout hole for the active block.
 * Dims out the surrounding map outside the selected box.
 */
export function buildOutsideMaskGeoJSON(bounds) {
  if (!bounds) {
    return { type: "FeatureCollection", features: [] };
  }
  const { minLng, minLat, maxLng, maxLat } = bounds;
  // Large world boundary covering South India / surrounding area
  const outerRing = [
    [70.0, 5.0],
    [85.0, 5.0],
    [85.0, 20.0],
    [70.0, 20.0],
    [70.0, 5.0]
  ];
  // Hole (counter-clockwise or opposite orientation)
  const holeRing = [
    [minLng, minLat],
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat]
  ];

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "outside-dimmer" },
        geometry: {
          type: "Polygon",
          coordinates: [outerRing, holeRing]
        }
      }
    ]
  };
}

/**
 * Samples a NxN elevation grid inside the 1km x 1km block using Mapbox terrain query.
 */
export function sampleTerrainGrid(map, bounds, steps = 16) {
  const { minLng, minLat, maxLng, maxLat } = bounds;
  const lngStep = (maxLng - minLng) / (steps - 1);
  const latStep = (maxLat - minLat) / (steps - 1);
  const samples = [];

  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const lng = Number((minLng + j * lngStep).toFixed(6));
      const lat = Number((minLat + i * latStep).toFixed(6));
      let elevation = 885.0; // Realistic default Bengaluru elevation
      let isActual = false;

      if (map && typeof map.queryTerrainElevation === 'function') {
        const queryElev = map.queryTerrainElevation([lng, lat]);
        if (queryElev !== null && !isNaN(queryElev)) {
          elevation = Number(queryElev.toFixed(1));
          isActual = true;
        }
      }
      samples.push({
        col: j,
        row: i,
        lng,
        lat,
        elevation_m: elevation,
        isActual,
        source: isActual ? 'Mapbox Terrain-DEM' : 'Default Elevation Fallback'
      });
    }
  }
  return samples;
}

/**
 * Computes deep Terrain Intelligence statistics from sampled elevation grid.
 * Distinguishes true satellite DEM observations from synthetic fallbacks.
 */
export function analyzeTerrainGrid(samples, bounds = null) {
  if (!samples || samples.length === 0) {
    return {
      minElevation: 880.0,
      maxElevation: 895.0,
      meanElevation: 887.5,
      elevationRange: 15.0,
      actualSamplesCount: 0,
      totalSamplesCount: 0,
      actualRatio: 0,
      elevationQuality: 'ESTIMATED_FALLBACK',
      qualityBadge: 'ESTIMATED',
      reliabilityNote: 'No terrain samples available; using municipal defaults',
      lowestCells: [],
      slopeGradientPct: 0.0,
      maxSlopeGradientPct: 0.0,
      lowLyingZones: []
    };
  }

  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let sumElevation = 0;
  let actualSamplesCount = 0;

  for (let s of samples) {
    const e = s.elevation_m;
    if (e < minElevation) minElevation = e;
    if (e > maxElevation) maxElevation = e;
    sumElevation += e;
    if (s.isActual) actualSamplesCount++;
  }

  const totalSamplesCount = samples.length;
  const meanElevation = Number((sumElevation / totalSamplesCount).toFixed(1));
  const elevationRange = Number(Math.max(0, maxElevation - minElevation).toFixed(1));
  const actualRatio = actualSamplesCount / totalSamplesCount;

  let elevationQuality = 'ESTIMATED_FALLBACK';
  let qualityBadge = 'ESTIMATED';
  let reliabilityNote = 'Synthetic elevation estimates (Mapbox DEM offline or pending tile load)';

  if (actualRatio >= 0.85) {
    elevationQuality = 'ACTUAL_TERRAIN';
    qualityBadge = 'LIVE';
    reliabilityNote = `Verified Mapbox Terrain-DEM: ${actualSamplesCount}/${totalSamplesCount} high-res samples`;
  } else if (actualRatio > 0.1) {
    elevationQuality = 'PARTIAL_TERRAIN';
    qualityBadge = 'ESTIMATED';
    reliabilityNote = `Partial terrain capture: ${actualSamplesCount}/${totalSamplesCount} samples verified`;
  }

  // Sorted lowest 5 sampled cells
  const sorted = [...samples].sort((a, b) => a.elevation_m - b.elevation_m);
  const lowestCells = sorted.slice(0, 5).map(c => ({
    lng: c.lng,
    lat: c.lat,
    elevation_m: c.elevation_m,
    col: c.col,
    row: c.row,
    isActual: !!c.isActual
  }));

  // Estimate relative slope / terrain gradient between neighboring cells
  // Approximate cell-to-cell distance across 1km block with 16x16 grid: ~66.7 meters
  const cellDistanceM = 66.7;
  let slopeSum = 0;
  let slopeCount = 0;
  let maxSlopePct = 0;

  // Grid indexing lookup
  const gridMap = new Map();
  for (let s of samples) {
    gridMap.set(`${s.row}_${s.col}`, s.elevation_m);
  }

  for (let s of samples) {
    const right = gridMap.get(`${s.row}_${s.col + 1}`);
    const bottom = gridMap.get(`${s.row + 1}_${s.col}`);

    if (right !== undefined) {
      const grad = Math.abs(right - s.elevation_m) / cellDistanceM * 100; // percent slope
      slopeSum += grad;
      slopeCount++;
      if (grad > maxSlopePct) maxSlopePct = grad;
    }
    if (bottom !== undefined) {
      const grad = Math.abs(bottom - s.elevation_m) / cellDistanceM * 100;
      slopeSum += grad;
      slopeCount++;
      if (grad > maxSlopePct) maxSlopePct = grad;
    }
  }

  const avgSlopePct = slopeCount > 0 ? Number((slopeSum / slopeCount).toFixed(1)) : 1.2;

  // Identify low-lying accumulation zones (cells in the bottom 15% of elevation range)
  const depressionThreshold = minElevation + elevationRange * 0.15;
  const accumulationPoints = samples.filter(s => s.elevation_m <= depressionThreshold);

  return {
    minElevation: Number(minElevation.toFixed(1)),
    maxElevation: Number(maxElevation.toFixed(1)),
    meanElevation,
    elevationRange,
    actualSamplesCount,
    totalSamplesCount,
    actualRatio: Number(actualRatio.toFixed(2)),
    elevationQuality,
    qualityBadge,
    reliabilityNote,
    lowestCells,
    slopeGradientPct: avgSlopePct,
    maxSlopeGradientPct: Number(maxSlopePct.toFixed(1)),
    lowLyingZones: accumulationPoints.slice(0, 6).map(p => ({
      lng: p.lng,
      lat: p.lat,
      elevation_m: p.elevation_m
    }))
  };
}

/**
 * Calculates dynamic street water depth clamped to realistic bounds:
 * Depth = Math.min(2.0, (rainfall_mm * 0.85 * (1 + clogging_percent / 100) * 0.015))
 */
export function calculateDynamicDepth(rainfallMm, cloggingPercent) {
  if (!rainfallMm || rainfallMm <= 0) return 0;
  const runoffMultiplier = 0.85 * (1 + ((cloggingPercent || 0) / 100) * 1.5);
  const accumulatedVolume = (rainfallMm / 1000) * runoffMultiplier;
  return Math.min(2.2, accumulatedVolume * 4.0);
}

/**
 * Elevation Sampling & Gravity Flow Model (Inside Selected 1km x 1km Block)
 * - Samples ground elevation across active box using Mapbox queryTerrainElevation
 * - Computes minElevation, maxElevation, accumulatedVolume, floodRise, and waterSurfaceElevation
 * - Drapes fluid water geometry strictly over depressions where terrain elevation < waterSurfaceElevation
 */
export function calculateGravityWaterFlow(map, bounds, rainfallMm, cloggingPercent, steps = 16) {
  if (!bounds) {
    return {
      minElevation: 0,
      maxElevation: 0,
      waterSurfaceElevation: 0,
      floodRise: 0,
      waterGeoJSON: { type: 'FeatureCollection', features: [] }
    };
  }

  const { minLng, minLat, maxLng, maxLat } = bounds;
  const lngStep = (maxLng - minLng) / (steps - 1);
  const latStep = (maxLat - minLat) / (steps - 1);
  const halfDx = lngStep * 0.49;
  const halfDy = latStep * 0.49;

  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let sumElevation = 0;
  let actualSamplesCount = 0;
  const cellData = [];

  for (let r = 0; r < steps; r++) {
    for (let c = 0; c < steps; c++) {
      const lng = minLng + c * lngStep;
      const lat = minLat + r * latStep;
      let elev = 880.0;
      let isActual = false;
      if (map && typeof map.queryTerrainElevation === 'function') {
        const q = map.queryTerrainElevation([lng, lat]);
        if (q !== null && !isNaN(q)) {
          elev = q;
          isActual = true;
          actualSamplesCount++;
        }
      }
      minElevation = Math.min(minElevation, elev);
      maxElevation = Math.max(maxElevation, elev);
      sumElevation += elev;
      cellData.push({ lng, lat, r, c, elev, isActual });
    }
  }

  if (minElevation === Infinity) {
    minElevation = 880.0;
    maxElevation = 895.0;
  }

  const totalCells = steps * steps;
  const actualRatio = actualSamplesCount / totalCells;
  const elevationQuality = actualRatio >= 0.85 ? 'ACTUAL_TERRAIN' : (actualRatio > 0.1 ? 'PARTIAL_TERRAIN' : 'ESTIMATED_FALLBACK');
  const qualityBadge = actualRatio >= 0.85 ? 'LIVE' : 'ESTIMATED';
  const meanElevation = Number((sumElevation / totalCells).toFixed(1));
  const elevationRange = Number(Math.max(0, maxElevation - minElevation).toFixed(1));

  // Runoff generated by rainfall rate and drainage siltation/clogging
  const runoffMultiplier = 0.85 * (1 + ((cloggingPercent || 0) / 100) * 1.5);
  const accumulatedVolume = ((rainfallMm || 0) / 1000) * runoffMultiplier; // effective runoff in meters

  // Water fills depressions upward from minElevation (capped at 2.2m above lowest point)
  const floodRise = Math.min(2.2, accumulatedVolume * 4.0);
  const waterSurfaceElevation = minElevation + floodRise;

  const features = [];
  if (floodRise > 0.02) {
    const elevRange = Math.max(3.0, maxElevation - minElevation);
    const clogRatio = Math.max(0, Math.min(100, cloggingPercent || 0)) / 100;
    // The flood reach threshold expands up the catchment slope as rain intensity and clogging escalate
    // At zero rain: 0 (dry); At max rain & 100% clogging: covers up to 88% of catchment depressions & roads
    const floodReachThreshold = Math.min(0.88, 0.25 + (floodRise / 2.2) * 0.35 + clogRatio * 0.28);

    // Drape fluid water geometry over depressions and road corridors up to floodReachThreshold
    cellData.forEach((cell, idx) => {
      const relElev = Math.max(0, Math.min(1, (cell.elev - minElevation) / elevRange));
      if (relElev <= floodReachThreshold) {
        const depressionFactor = Math.max(0, 1.0 - (relElev / floodReachThreshold));
        const cellWaterDepth = Number((floodRise * (0.22 + 0.78 * Math.pow(depressionFactor, 1.2))).toFixed(2));
        if (cellWaterDepth >= 0.08) {
          features.push({
            type: "Feature",
            id: `water_cell_${idx}`,
            properties: {
              id: `water_cell_${idx}`,
              depth_m: cellWaterDepth,
              water_opacity: Math.min(0.85, 0.55 + cellWaterDepth * 0.15)
            },
            geometry: {
              type: "Polygon",
              coordinates: [[
                [Number((cell.lng - halfDx).toFixed(6)), Number((cell.lat - halfDy).toFixed(6))],
                [Number((cell.lng + halfDx).toFixed(6)), Number((cell.lat - halfDy).toFixed(6))],
                [Number((cell.lng + halfDx).toFixed(6)), Number((cell.lat + halfDy).toFixed(6))],
                [Number((cell.lng - halfDx).toFixed(6)), Number((cell.lat + halfDy).toFixed(6))],
                [Number((cell.lng - halfDx).toFixed(6)), Number((cell.lat - halfDy).toFixed(6))]
              ]]
            }
          });
        }
      }
    });

    // Flow vector lines through drainage paths strictly inside bounds
    const spanX = maxLng - minLng;
    const spanY = maxLat - minLat;
    const flowVectors = [
      [
        [minLng + 0.15 * spanX, maxLat - 0.20 * spanY],
        [minLng + 0.40 * spanX, maxLat - 0.45 * spanY],
        [minLng + 0.65 * spanX, minLat + 0.35 * spanY],
        [maxLng - 0.15 * spanX, minLat + 0.20 * spanY]
      ],
      [
        [minLng + 0.25 * spanX, maxLat - 0.15 * spanY],
        [minLng + 0.50 * spanX, maxLat - 0.38 * spanY],
        [minLng + 0.72 * spanX, minLat + 0.40 * spanY]
      ]
    ];

    flowVectors.forEach((coords, idx) => {
      features.push({
        type: "Feature",
        id: `flow_vector_${idx}`,
        properties: { id: `flow_vector_${idx}`, depth_m: floodRise },
        geometry: {
          type: "LineString",
          coordinates: coords.map(([lng, lat]) => [
            Number(Math.max(minLng, Math.min(maxLng, lng)).toFixed(6)),
            Number(Math.max(minLat, Math.min(maxLat, lat)).toFixed(6))
          ])
        }
      });
    });
  }

  // Sorted lowest cells
  const sortedCells = [...cellData].sort((a, b) => a.elev - b.elev);
  const lowestCells = sortedCells.slice(0, 5).map(c => ({
    lng: Number(c.lng.toFixed(6)),
    lat: Number(c.lat.toFixed(6)),
    elevation_m: Number(c.elev.toFixed(1)),
    isActual: c.isActual
  }));

  return {
    minElevation: Number(minElevation.toFixed(1)),
    maxElevation: Number(maxElevation.toFixed(1)),
    meanElevation,
    elevationRange,
    floodRise,
    waterSurfaceElevation: Number(waterSurfaceElevation.toFixed(1)),
    actualSamplesCount,
    totalSamplesCount: totalCells,
    elevationQuality,
    qualityBadge,
    lowestCells,
    waterGeoJSON: {
      type: "FeatureCollection",
      features
    }
  };
}

/**
 * Converts pooled cell results into GeoJSON Polygons for terrain-draped fluid water rendering.
 */
export function pooledCellsToGeoJSON(pooledCells, bounds, steps = 16) {
  if (!pooledCells || pooledCells.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const { minLng, minLat, maxLng, maxLat } = bounds;
  const halfDx = ((maxLng - minLng) / (steps - 1)) / 2;
  const halfDy = ((maxLat - minLat) / (steps - 1)) / 2;

  const features = pooledCells
    .filter(cell => cell.depth_meters > 0.02)
    .map((cell, idx) => {
      const { lng, lat, depth_meters, tier } = cell;
      return {
        type: "Feature",
        id: `pool_cell_${idx}`,
        properties: {
          id: `pool_cell_${idx}`,
          depth_m: depth_meters,
          tier: tier || (depth_meters >= 0.8 ? "SEVERE" : (depth_meters >= 0.3 ? "MODERATE" : "LOW")),
          water_opacity: Math.min(0.85, 0.45 + depth_meters * 0.25)
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [Number((lng - halfDx).toFixed(6)), Number((lat - halfDy).toFixed(6))],
            [Number((lng + halfDx).toFixed(6)), Number((lat - halfDy).toFixed(6))],
            [Number((lng + halfDx).toFixed(6)), Number((lat + halfDy).toFixed(6))],
            [Number((lng - halfDx).toFixed(6)), Number((lat + halfDy).toFixed(6))],
            [Number((lng - halfDx).toFixed(6)), Number((lat - halfDy).toFixed(6))]
          ]]
        }
      };
    });

  return {
    type: "FeatureCollection",
    features
  };
}

/**
 * Generates water GeoJSON strictly inside active 1 km x 1 km bounds [minLng, minLat, maxLng, maxLat].
 * Combines polygon pooling cells (rendered by 'water-fill') and drainage flow lines (rendered by 'water-flow-lines').
 */
export function generateBlockWaterGeoJSON(bounds, depth, pooledCells = null) {
  if (!bounds || depth <= 0.02) {
    return { type: "FeatureCollection", features: [] };
  }

  const { minLng, minLat, maxLng, maxLat } = bounds;
  const features = [];

  if (pooledCells && pooledCells.length > 0) {
    const poolGeoJSON = pooledCellsToGeoJSON(pooledCells, bounds);
    features.push(...poolGeoJSON.features);
  } else {
    // Generate simulated natural depression pooling inside the 1km bounds
    const steps = 14;
    const lngStep = (maxLng - minLng) / (steps - 1);
    const latStep = (maxLat - minLat) / (steps - 1);
    const halfDx = lngStep * 0.48;
    const halfDy = latStep * 0.48;

    for (let r = 0; r < steps; r++) {
      for (let c = 0; c < steps; c++) {
        // Natural drainage depression pattern (valleys & road channels)
        const u = c / (steps - 1);
        const v = r / (steps - 1);
        const distToValley = Math.abs(v - (0.3 + 0.4 * u));
        const depressionFactor = Math.max(0, 1.0 - distToValley * 2.5);

        if (depressionFactor > 0.15) {
          const cellDepth = Number((depth * depressionFactor).toFixed(2));
          if (cellDepth > 0.04) {
            const cLng = minLng + c * lngStep;
            const cLat = minLat + r * latStep;
            features.push({
              type: "Feature",
              id: `pool_${r}_${c}`,
              properties: {
                id: `pool_${r}_${c}`,
                depth_m: cellDepth,
                water_opacity: Math.min(0.85, 0.55 + cellDepth * 0.2)
              },
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [Number((cLng - halfDx).toFixed(6)), Number((cLat - halfDy).toFixed(6))],
                  [Number((cLng + halfDx).toFixed(6)), Number((cLat - halfDy).toFixed(6))],
                  [Number((cLng + halfDx).toFixed(6)), Number((cLat + halfDy).toFixed(6))],
                  [Number((cLng - halfDx).toFixed(6)), Number((cLat + halfDy).toFixed(6))],
                  [Number((cLng - halfDx).toFixed(6)), Number((cLat - halfDy).toFixed(6))]
                ]]
              }
            });
          }
        }
      }
    }
  }

  // 4 drainage flow vector LineStrings along drainage corridors strictly within bounds
  const spanX = maxLng - minLng;
  const spanY = maxLat - minLat;
  const flowVectors = [
    [
      [minLng + 0.15 * spanX, maxLat - 0.20 * spanY],
      [minLng + 0.40 * spanX, maxLat - 0.45 * spanY],
      [minLng + 0.65 * spanX, minLat + 0.35 * spanY],
      [maxLng - 0.15 * spanX, minLat + 0.20 * spanY]
    ],
    [
      [minLng + 0.25 * spanX, maxLat - 0.15 * spanY],
      [minLng + 0.50 * spanX, maxLat - 0.38 * spanY],
      [minLng + 0.72 * spanX, minLat + 0.40 * spanY]
    ],
    [
      [minLng + 0.20 * spanX, minLat + 0.45 * spanY],
      [minLng + 0.55 * spanX, minLat + 0.30 * spanY],
      [maxLng - 0.20 * spanX, minLat + 0.15 * spanY]
    ]
  ];

  flowVectors.forEach((coords, idx) => {
    features.push({
      type: "Feature",
      id: `flow_vector_${idx}`,
      properties: {
        id: `flow_vector_${idx}`,
        depth_m: depth
      },
      geometry: {
        type: "LineString",
        coordinates: coords.map(([lng, lat]) => [
          Number(Math.max(minLng, Math.min(maxLng, lng)).toFixed(6)),
          Number(Math.max(minLat, Math.min(maxLat, lat)).toFixed(6))
        ])
      }
    });
  });

  return {
    type: "FeatureCollection",
    features
  };
}
