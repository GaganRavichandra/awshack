import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Navigation,
  X,
  Loader2,
  ArrowRight,
  Play,
  RotateCcw,
  Building2,
  Droplets,
  Zap,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sliders,
  Layers,
  Pause,
  Compass,
  AlertTriangle,
  Route,
  CloudRain
} from 'lucide-react';
import { searchLocationIQ, cleanToEnglish } from '../services/locationiq';
import { BENGALURU_HOTSPOTS } from '../config/bengaluruHotspots';
import { KARNATAKA_DRAINS } from '../config/karnatakaDrains';

// Major Bengaluru localities & BBMP zones for instantaneous local query matching
const BENGALURU_LOCALITIES = [
  { name: 'Indiranagar', zone: 'East', coords: [77.6412, 12.9784] },
  { name: 'Whitefield', zone: 'Mahadevapura', coords: [77.7499, 12.9698] },
  { name: 'Jayanagar', zone: 'South', coords: [77.5833, 12.9308] },
  { name: 'Malleshwaram', zone: 'West', coords: [77.5714, 13.0031] },
  { name: 'Electronic City', zone: 'Bommanahalli', coords: [77.6749, 12.8452] },
  { name: 'Sarjapur Road', zone: 'Mahadevapura', coords: [77.6784, 12.9121] },
  { name: 'Manyata Tech Park', zone: 'North', coords: [77.6195, 13.0482] },
  { name: 'Banashankari', zone: 'South', coords: [77.5726, 12.9255] },
  { name: 'Basavanagudi', zone: 'South', coords: [77.5738, 12.9432] },
  { name: 'Rajajinagar', zone: 'West', coords: [77.5559, 12.9982] },
  { name: 'BTM Layout', zone: 'South', coords: [77.6101, 12.9166] },
  { name: 'Richmond Town', zone: 'East', coords: [77.6033, 12.9667] },
  { name: 'Domlur', zone: 'East', coords: [77.6389, 12.9609] },
  { name: 'Kalyan Nagar', zone: 'East', coords: [77.6433, 13.0280] },
  { name: 'Kengeri Satellite Town', zone: 'RR Nagar', coords: [77.4833, 12.9167] }
];

function searchLocalBengaluruDatasets(q) {
  if (!q || q.trim().length < 2) return [];
  const queryLower = q.toLowerCase().trim();
  const matched = [];

  // 1. Search Flood Hotspots
  for (const h of BENGALURU_HOTSPOTS) {
    if (
      h.name.toLowerCase().includes(queryLower) ||
      h.zone.toLowerCase().includes(queryLower) ||
      h.id.toLowerCase().includes(queryLower)
    ) {
      matched.push({
        place_id: `hotspot_${h.id}`,
        display_name: `${h.name}, ${h.zone} Zone, Bengaluru`,
        main_text: h.name,
        secondary_text: `${h.zone} Zone • Baseline Clogging: ${(h.baseline_clogging * 100).toFixed(0)}%`,
        lat: h.coords[1].toString(),
        lon: h.coords[0].toString(),
        category: 'HOTSPOT'
      });
      if (matched.length >= 6) break;
    }
  }

  // 2. Search Karnataka & Bengaluru Drains / Rajakaluves
  for (const d of KARNATAKA_DRAINS) {
    if (
      d.name.toLowerCase().includes(queryLower) ||
      (d.shortName && d.shortName.toLowerCase().includes(queryLower)) ||
      (d.valley && d.valley.toLowerCase().includes(queryLower)) ||
      (d.district && d.district.toLowerCase().includes(queryLower)) ||
      (d.taluk && d.taluk.toLowerCase().includes(queryLower))
    ) {
      const label = d.shortName || d.name;
      matched.push({
        place_id: `drain_${d.id}`,
        display_name: `${label}, ${d.district || 'Bengaluru'}`,
        main_text: label,
        secondary_text: `${d.valley || 'Drainage Trunk'} • Status: ${d.defaultStatus || 'Active'} • Deficit: ${d.deficitPercent || 0}%`,
        lat: d.coordinates[1].toString(),
        lon: d.coordinates[0].toString(),
        category: 'DRAIN'
      });
      if (matched.length >= 12) break;
    }
  }

  // 3. Search Key Localities
  for (const loc of BENGALURU_LOCALITIES) {
    if (
      loc.name.toLowerCase().includes(queryLower) ||
      loc.zone.toLowerCase().includes(queryLower)
    ) {
      matched.push({
        place_id: `loc_${loc.name.toLowerCase().replace(/\s+/g, '_')}`,
        display_name: `${loc.name}, ${loc.zone}, Bengaluru`,
        main_text: loc.name,
        secondary_text: `${loc.zone} Zone, Bengaluru Urban`,
        lat: loc.coords[1].toString(),
        lon: loc.coords[0].toString(),
        category: 'WARD'
      });
      if (matched.length >= 15) break;
    }
  }

  return matched;
}

export function GoogleMapsSearchBar({
  onSelectLocation,
  onLocateMe,
  isSimulateMode,
  onToggleSimulate,
  isCollapsed = false,
  onExpand,
  locationiqToken,
  // Secondary Ribbon Actions
  rainfallMm = 120,
  liveRainfallMm = 0,
  isRwhPaused = false,
  rwhStats = null,
  onOpenRWH,
  onToggleOrbit,
  isOrbiting = false,
  show3DBuildings = true,
  onToggle3DBuildings,
  isTopView = false,
  onTogglePerspective,
  onOpenDemo,
  onOpenReport,
  onToggleRoutePlanner,
  isRoutePlannerOpen = false,
  onToggleEnvIntel,
  isEnvIntelOpen = false
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isToolsOpen, setIsToolsOpen] = useState(true); // Starts open on initial site load

  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const toolsRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target)) {
        setIsToolsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setHighlightedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    // Direct coordinate check (lat, lng)
    const coordMatch = val.match(/^([+-]?\d+(\.\d+)?)[,\s]+([+-]?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setResults([{
          place_id: 'coord',
          display_name: `Coordinates: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`,
          main_text: `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`,
          secondary_text: 'Geographic Coordinates Pinpoint',
          lat: lat.toString(),
          lon: lng.toString(),
          category: 'COORDINATES'
        }]);
        setIsOpen(true);
        return;
      }
    }

    // Instantaneous local dataset matching (Bengaluru hotspots, rajakaluves, wards)
    const localMatches = searchLocalBengaluruDatasets(val);
    if (localMatches.length > 0) {
      setResults(localMatches);
      setIsOpen(true);
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const items = await searchLocationIQ(val, locationiqToken);
        const formattedRemote = (items || []).map(item => {
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

        setResults(prev => {
          const existingIds = new Set(localMatches.map(m => m.place_id));
          const uniqueRemote = formattedRemote.filter(item => !existingIds.has(item.place_id));
          const combined = [...localMatches, ...uniqueRemote];
          return combined.length > 0 ? combined : formattedRemote;
        });
        setIsOpen(true);
      } catch (err) {
        if (localMatches.length > 0) {
          setResults(localMatches);
          setIsOpen(true);
        }
      } finally {
        setIsLoading(false);
      }
    }, 280);
  };

  // Keyboard navigation for autocomplete recommendations (arrow keys + Enter + Escape)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => {
        if (results.length === 0) return -1;
        return prev < results.length - 1 ? prev + 1 : 0;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => {
        if (results.length === 0) return -1;
        return prev > 0 ? prev - 1 : results.length - 1;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelectResult(results[highlightedIndex]);
      } else if (results.length > 0) {
        handleSelectResult(results[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelectResult = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      const raw = item.main_text || (item.display_name ? item.display_name.split(',')[0] : '');
      const label = cleanToEnglish(raw) || raw;
      onSelectLocation([lng, lat], label);
      setQuery(label);
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const isRWHAvailable = true;

  return (
    <div
      ref={containerRef}
      className="gmaps-control-stack"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        position: 'relative'
      }}
    >
      {/* 1. TOP BAR ROW: 3 DISTINCT, SEPARATED GLASSMORPHIC ELEMENTS */}
      <div
        className="gmaps-top-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          position: 'relative',
          zIndex: 100
        }}
      >
        {/* 1A. STANDALONE SEARCH INPUT BAR */}
        <div
          className="gmaps-search-card"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            height: '44px',
            padding: '0 10px',
            background: 'rgba(16, 16, 19, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
            position: 'relative',
            overflow: 'visible',
            transition: 'border-color 0.18s ease, box-shadow 0.18s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: '8px', color: '#a1a1aa' }}>
            <Search size={17} />
          </div>

          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0 || query.trim().length >= 2) {
                if (results.length === 0 && query.trim().length >= 2) {
                  const local = searchLocalBengaluruDatasets(query);
                  if (local.length > 0) setResults(local);
                }
                setIsOpen(true);
              }
            }}
            placeholder="Search Bengaluru places, wards, drains..."
            className="gmaps-search-input"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '13px',
              fontWeight: 500,
              outline: 'none',
              minWidth: 0
            }}
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="gmaps-icon-btn"
              title="Clear Search"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
            >
              <X size={15} />
            </button>
          )}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: '#a1a1aa' }} />
            </div>
          )}

          {/* Autocomplete Results Dropdown right beneath the search input bar */}
          {isOpen && results.length > 0 && (
            <div
              className="gmaps-autocomplete-dropdown"
              style={{
                position: 'absolute',
                top: '50px',
                left: 0,
                right: 0,
                background: 'rgba(18, 18, 22, 0.98)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75)',
                maxHeight: '320px',
                overflowY: 'auto',
                zIndex: 9999
              }}
            >
              {results.map((item, idx) => {
                const mainText = item.main_text || item.display_name.split(',')[0];
                const secondaryText = item.secondary_text || item.display_name.split(',').slice(1, 3).join(', ');
                const category = item.category || 'PLACE';
                const isHighlighted = idx === highlightedIndex;

                const badgeColor =
                  category === 'DRAIN' ? '#a1a1aa' :
                  category === 'HOTSPOT' ? '#fbbf24' :
                  category === 'WARD' ? '#34d399' : '#a1a1aa';
                const badgeBg =
                  category === 'DRAIN' ? 'rgba(255, 255, 255, 0.08)' :
                  category === 'HOTSPOT' ? 'rgba(251, 191, 36, 0.14)' :
                  category === 'WARD' ? 'rgba(52, 211, 153, 0.14)' : 'rgba(255, 255, 255, 0.06)';

                return (
                  <div
                    key={item.place_id || idx}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className="gmaps-dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isHighlighted ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {category === 'DRAIN' ? (
                      <Droplets size={16} style={{ color: '#a1a1aa', flexShrink: 0 }} />
                    ) : category === 'HOTSPOT' ? (
                      <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
                    ) : (
                      <MapPin size={16} style={{ color: '#a1a1aa', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8eaed', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {mainText}
                        </span>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: badgeColor,
                          background: badgeBg,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          letterSpacing: '0.04em'
                        }}>
                          {category}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9aa0a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                        {secondaryText}
                      </div>
                    </div>
                    <ArrowRight size={13} style={{ color: isHighlighted ? '#ffffff' : '#71717a', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 1B. STANDALONE LOCATE ME BUTTON */}
        <button
          type="button"
          onClick={onLocateMe}
          className="gmaps-locate-btn"
          title="Locate my position (GPS)"
          style={{
            height: '44px',
            width: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(20, 20, 24, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#a1a1aa',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            transition: 'all 0.18s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(20, 20, 24, 0.94)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#a1a1aa';
          }}
        >
          <Navigation size={17} />
        </button>
      </div>

      {/* 2. "TOOLS & OVERRIDES" DROPDOWN (STARTS OPEN ON INITIAL LOAD, AUTO-CLOSES ON OPTION SELECTION) */}
      <div
        ref={toolsRef}
        className="gmaps-tools-dropdown-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '100%',
          maxWidth: '320px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsToolsOpen(prev => !prev)}
            title={isToolsOpen ? "Click to collapse Tools & Overrides" : "Click to expand Tools & Overrides"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: isToolsOpen ? '#202025' : '#141418',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '20px',
              border: isToolsOpen ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: isToolsOpen ? '#ffffff' : '#e4e4e7',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.18s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isToolsOpen ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = isToolsOpen ? '#ffffff' : '#e4e4e7';
            }}
          >
            <Sliders size={13} style={{ color: '#a1a1aa' }} />
            <span>Tools & Overrides</span>
            {isToolsOpen ? <ChevronUp size={12} style={{ color: '#71717a' }} /> : <ChevronDown size={12} style={{ color: '#71717a' }} />}
          </button>

          {/* Direct Quick-Access RWH Potential Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isRwhPaused) {
                onOpenRWH();
                setIsToolsOpen(false);
              }
            }}
            disabled={isRwhPaused}
            title={
              isRwhPaused
                ? "RWH Inflow Paused: Live precipitation exceeds 50mm threshold. Stormwater bypass active."
                : liveRainfallMm === 0
                  ? "RWH Potential: 0 kL (0.0 mm live rainfall in selected area)"
                  : `RWH Potential: ${rwhStats?.harvestableKL ?? 0} kL (${liveRainfallMm} mm live rain)`
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: isRwhPaused ? 'rgba(239, 68, 68, 0.1)' : '#141418',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '20px',
              border: isRwhPaused ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: isRwhPaused ? '#f87171' : '#e4e4e7',
              fontSize: '11px',
              fontWeight: 700,
              cursor: isRwhPaused ? 'not-allowed' : 'pointer',
              opacity: isRwhPaused ? 0.6 : 1,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.18s ease'
            }}
            onMouseEnter={(e) => {
              if (!isRwhPaused) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRwhPaused) {
                e.currentTarget.style.borderColor = '1px solid rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#e4e4e7';
              }
            }}
          >
            <Droplets size={13} style={{ color: isRwhPaused ? '#f87171' : '#a1a1aa' }} />
            <span>
              {isRwhPaused ? '>50mm Paused' : liveRainfallMm === 0 ? 'RWH: 0 kL' : `RWH: ${rwhStats?.harvestableKL ?? 0} kL`}
            </span>
          </button>
        </div>

        {isToolsOpen && (
          <div
            className="gmaps-utility-ribbon"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '8px',
              background: 'rgba(18, 18, 22, 0.98)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
              width: '100%',
              animation: 'fadeInSlideDown 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px 4px 6px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Digital Twin Quick Actions
              </span>
              <span style={{ fontSize: '9.5px', color: '#64748b' }}>Primary Controls</span>
            </div>

            {/* Action 1: Rainwater Harvesting Potential */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isRwhPaused) {
                  onOpenRWH();
                  setIsToolsOpen(false);
                }
              }}
              disabled={isRwhPaused}
              title={isRwhPaused ? "RWH Inflow Paused: Rain > 50mm bypass active" : "Calculate Rainwater Harvesting rooftop potential and catchment sizing"}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: isRwhPaused ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255, 255, 255, 0.07)',
                background: isRwhPaused ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                color: isRwhPaused ? '#f87171' : '#f4f4f5',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: isRwhPaused ? 'not-allowed' : 'pointer',
                opacity: isRwhPaused ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isRwhPaused) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isRwhPaused) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplets size={14} style={{ color: isRwhPaused ? '#f87171' : '#a1a1aa' }} />
                <span>{isRwhPaused ? 'RWH (>50mm Paused)' : 'RWH Potential'}</span>
              </div>
              <span style={{
                fontSize: '9.5px',
                color: isRwhPaused ? '#f87171' : '#a1a1aa',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(255, 255, 255, 0.04)'
              }}>
                {isRwhPaused ? 'Surge Bypass' : liveRainfallMm === 0 ? '0 kL' : `${rwhStats?.harvestableKL ?? 0} kL`}
              </span>
            </button>

            {/* Action 2: 360° Panoramic Look-Around / Street View */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleOrbit();
                setIsToolsOpen(false);
              }}
              title={isOrbiting ? "Exit 360° Street View" : "Enter 360° panoramic first-person street view (pitch & yaw look-around)"}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: `1px solid ${isOrbiting ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.07)'}`,
                background: isOrbiting ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.03)',
                color: isOrbiting ? '#ffffff' : '#f4f4f5',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isOrbiting ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isOrbiting ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = isOrbiting ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.07)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={14} style={{ transform: isOrbiting ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: isOrbiting ? '#ffffff' : '#a1a1aa' }} />
                <span>360° View</span>
              </div>
              <span style={{ fontSize: '9.5px', color: isOrbiting ? '#ffffff' : '#a1a1aa', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.04)' }}>
                {isOrbiting ? 'Active Orbit' : 'Pitch & Yaw'}
              </span>
            </button>

            {/* Action 3: 3D Buildings Mesh */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle3DBuildings();
                setIsToolsOpen(false);
              }}
              title="Toggle extruded 3D buildings"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: `1px solid ${show3DBuildings ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.07)'}`,
                background: show3DBuildings ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.03)',
                color: show3DBuildings ? '#ffffff' : '#f4f4f5',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = show3DBuildings ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = show3DBuildings ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = show3DBuildings ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.07)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={14} style={{ color: show3DBuildings ? '#ffffff' : '#a1a1aa' }} />
                <span>3D Buildings</span>
              </div>
              <span style={{ fontSize: '9.5px', color: show3DBuildings ? '#ffffff' : '#71717a', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.04)' }}>
                {show3DBuildings ? 'Extruded' : 'Off'}
              </span>
            </button>

            {/* Action 4: Top View / Angled View Perspective Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePerspective();
                setIsToolsOpen(false);
              }}
              title={isTopView ? "Switch to 3D Angled Perspective View (pitch: 58°)" : "Switch to 2D Overhead Top-Down View (pitch: 0°)"}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#f4f4f5',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isTopView ? (
                  <Compass size={14} style={{ color: '#a1a1aa' }} />
                ) : (
                  <Layers size={14} style={{ color: '#a1a1aa' }} />
                )}
                <span>{isTopView ? 'Top View' : 'Angled View'}</span>
              </div>
              <span style={{
                fontSize: '9.5px',
                color: '#a1a1aa',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(255, 255, 255, 0.04)'
              }}>
                {isTopView ? '2D Overhead' : '3D Tilt'}
              </span>
            </button>

            {/* Action 5: Demo Simulation Presets */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDemo();
                setIsToolsOpen(false);
              }}
              title="Open simplified Monsoon Peak Scenario demo modal"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#f4f4f5',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={14} style={{ color: '#a1a1aa' }} />
                <span>Demo Presets</span>
              </div>
              <span style={{ fontSize: '9.5px', color: '#a1a1aa', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.04)' }}>
                Monsoon Scenarios
              </span>
            </button>

            {/* Action 6: Report / Audit Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReport();
                setIsToolsOpen(false);
              }}
              title="Citizen & Municipal drainage status override"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#f4f4f5',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={14} style={{ color: '#a1a1aa' }} />
                <span>Citizen Report</span>
              </div>
              <span style={{ fontSize: '9.5px', color: '#a1a1aa', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.04)' }}>
                Drain Audit
              </span>
            </button>

            {/* Action 7: Alternative Route Planner (Flood Bypass Corridor) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRoutePlanner();
                setIsToolsOpen(false);
              }}
              title="Open Alternative Route Planner with corridor flood hazard detection & bypass routing"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: `1px solid ${isRoutePlannerOpen ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.07)'}`,
                background: isRoutePlannerOpen ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.03)',
                color: isRoutePlannerOpen ? '#ffffff' : '#f4f4f5',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isRoutePlannerOpen ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isRoutePlannerOpen ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = isRoutePlannerOpen ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.07)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Route size={14} style={{ color: isRoutePlannerOpen ? '#ffffff' : '#a1a1aa' }} />
                <span>Route Planner</span>
              </div>
              <span style={{
                fontSize: '9.5px',
                color: isRoutePlannerOpen ? '#ffffff' : '#a1a1aa',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(255, 255, 255, 0.04)'
              }}>
                {isRoutePlannerOpen ? 'Active' : 'Flood Bypass'}
              </span>
            </button>

            {/* Action 8: Environmental Intelligence & Satellite WMS */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnvIntel();
                setIsToolsOpen(false);
              }}
              title="Open Environmental Intelligence panel with real-time weather & ISRO Bhuvan satellite WMS layers"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: `1px solid ${isEnvIntelOpen ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.07)'}`,
                background: isEnvIntelOpen ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.03)',
                color: isEnvIntelOpen ? '#ffffff' : '#f4f4f5',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isEnvIntelOpen ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isEnvIntelOpen ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = isEnvIntelOpen ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.07)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CloudRain size={14} style={{ color: isEnvIntelOpen ? '#ffffff' : '#a1a1aa' }} />
                <span>Environmental Intel</span>
              </div>
              <span style={{
                fontSize: '9.5px',
                color: isEnvIntelOpen ? '#ffffff' : '#a1a1aa',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(255, 255, 255, 0.04)'
              }}>
                {isEnvIntelOpen ? 'Active' : 'WMS & Weather'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
