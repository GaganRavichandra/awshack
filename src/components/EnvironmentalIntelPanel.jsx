import React, { useState } from 'react';
import {
  CloudRain,
  Compass,
  Wind,
  Thermometer,
  Droplets,
  Gauge,
  Mountain,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  Eye,
  EyeOff,
  X,
  Clock
} from 'lucide-react';

export function EnvironmentalIntelPanel({
  isOpen = true,
  onClose,
  environmentalData,
  terrainStats,
  isLoadingWeather,
  onRefreshWeather,
  bhuvanLayersEnabled,
  onToggleBhuvanLayer,
  bhuvanStatus,
  showOsmDrainage,
  onToggleOsmDrainage,
  osmDrainageData,
  isLoadingOsm,
  onApplyForecastToSimulator,
  blockLabel
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('weather'); // 'weather' | 'terrain' | 'geospatial' | 'sources'
  const [forecastSyncNotice, setForecastSyncNotice] = useState(null);

  if (!isOpen) return null;

  const currentWeather = environmentalData?.currentWeather;
  const forecast = environmentalData?.forecast;
  const weatherStatus = environmentalData?.sourceStatus || 'LIVE';

  const handleApplyForecast = (rateMmHr, windowLabel) => {
    if (rateMmHr === undefined || rateMmHr === null) return;
    if (onApplyForecastToSimulator) {
      onApplyForecastToSimulator(rateMmHr);
      setForecastSyncNotice(`Applied ${rateMmHr} mm/hr (${windowLabel}) to simulation slider.`);
      setTimeout(() => setForecastSyncNotice(null), 4000);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'LIVE':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '9.5px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(48, 209, 88, 0.16)',
            color: '#30D158',
            border: '1px solid rgba(48, 209, 88, 0.35)',
            letterSpacing: '0.04em'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30D158', boxShadow: '0 0 6px #30D158' }} />
            LIVE
          </span>
        );
      case 'CACHED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '9.5px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(10, 132, 255, 0.16)',
            color: '#0A84FF',
            border: '1px solid rgba(10, 132, 255, 0.35)',
            letterSpacing: '0.04em'
          }}>
            CACHED
          </span>
        );
      case 'AVAILABLE':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '9.5px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(48, 209, 88, 0.16)',
            color: '#30D158',
            border: '1px solid rgba(48, 209, 88, 0.35)'
          }}>
            ONLINE
          </span>
        );
      case 'UNAVAILABLE':
      case 'OFFLINE':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '9.5px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(255, 69, 58, 0.16)',
            color: '#FF453A',
            border: '1px solid rgba(255, 69, 58, 0.35)'
          }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div
      className="env-intel-panel"
      style={{
        position: 'absolute',
        top: '195px',
        right: '16px',
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 215px)',
        background: 'rgba(28, 28, 30, 0.94)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '18px',
        border: '1px solid #3A3A3C',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.3)',
        zIndex: 40,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
        animation: 'fadeInSlideDown 0.22s ease-out'
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: isCollapsed ? 'none' : '1px solid #3A3A3C',
          background: 'rgba(44, 44, 46, 0.92)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'rgba(10, 132, 255, 0.16)',
            border: '1px solid rgba(10, 132, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0A84FF'
          }}>
            <CloudRain size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.01em' }}>
              Environmental Intelligence
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(235, 235, 245, 0.60)', marginTop: '1px' }}>
              {blockLabel || 'Bengaluru Urban Corridor'} • WMS & Weather
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="gmaps-icon-btn"
            style={{ width: '28px', height: '28px', background: 'rgba(37, 37, 40, 0.85)', border: '1px solid #3A3A3C', color: '#FFFFFF' }}
            title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="gmaps-icon-btn"
              style={{ width: '28px', height: '28px', background: 'rgba(37, 37, 40, 0.85)', border: '1px solid #3A3A3C', color: '#FFFFFF' }}
              title="Close Panel"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100vh - 310px)', overflowY: 'auto' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#2C2C2E', border: '1px solid #3A3A3C', padding: '3px', borderRadius: '10px' }}>
            {[
              { id: 'weather', label: 'Weather', icon: CloudRain },
              { id: 'terrain', label: 'Terrain', icon: Mountain },
              { id: 'geospatial', label: 'Bhuvan & OSM', icon: Layers },
              { id: 'sources', label: 'Sources', icon: Compass }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '6px 4px',
                    borderRadius: '7px',
                    border: 'none',
                    background: isActive ? '#0A84FF' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'rgba(235, 235, 245, 0.60)',
                    fontSize: '10.5px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: REAL-TIME WEATHER & OPEN-METEO TELEMETRY */}
          {activeTab === 'weather' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Header Telemetry Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#f1f5f9' }}>Real-Time Atmosphere</span>
                  {renderStatusBadge(weatherStatus)}
                </div>
                <button
                  type="button"
                  onClick={onRefreshWeather}
                  disabled={isLoadingWeather}
                  className="gmaps-icon-btn"
                  style={{ width: '26px', height: '26px', color: '#8ab4f8' }}
                  title="Refresh weather telemetry"
                >
                  <RefreshCw size={12} className={isLoadingWeather ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Weather Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <div style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(44, 44, 46, 0.7)', border: '1px solid #3A3A3C' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0A84FF', fontSize: '10px', fontWeight: 600 }}>
                    <Droplets size={13} />
                    <span>Rainfall Rate</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                    {currentWeather?.rainfall_rate_mm_hr !== null ? `${currentWeather?.rainfall_rate_mm_hr} mm/h` : '--'}
                  </div>
                </div>

                <div style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(44, 44, 46, 0.7)', border: '1px solid #3A3A3C' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FF9F0A', fontSize: '10px', fontWeight: 600 }}>
                    <Thermometer size={13} />
                    <span>Temperature</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                    {currentWeather?.temperature_c !== null ? `${currentWeather?.temperature_c}°C` : '--'}
                  </div>
                </div>

                <div style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(44, 44, 46, 0.7)', border: '1px solid #3A3A3C' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#30D158', fontSize: '10px', fontWeight: 600 }}>
                    <Wind size={13} />
                    <span>Wind & Heading</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>
                    {currentWeather?.wind_speed_kmh !== null ? `${currentWeather?.wind_speed_kmh} km/h ${currentWeather?.wind_direction_compass || ''}` : '--'}
                  </div>
                </div>

                <div style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(44, 44, 46, 0.7)', border: '1px solid #3A3A3C' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#BF5AF2', fontSize: '10px', fontWeight: 600 }}>
                    <Gauge size={13} />
                    <span>Surface Pressure</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>
                    {currentWeather?.surface_pressure_hpa !== null ? `${currentWeather?.surface_pressure_hpa} hPa` : '--'}
                  </div>
                </div>
              </div>

              {/* Forecast Overview Card */}
              <div style={{ padding: '10px 12px', borderRadius: '14px', background: '#2C2C2E', border: '1px solid #3A3A3C' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', marginBottom: '6px' }}>
                  Open-Meteo Short-Range Precipitation Forecast
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>Next 1 Hour</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                      {forecast?.next_1h_accumulation_mm ?? 0} mm
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>Next 3 Hours</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                      {forecast?.next_3h_accumulation_mm ?? 0} mm
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>Peak Rate</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FF9F0A' }}>
                      {forecast?.next_3h_peak_rate_mm_hr ?? 0} mm/h
                    </div>
                  </div>
                </div>

                {/* Apply Forecast To Simulator */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleApplyForecast(forecast?.next_1h_rate_mm_hr ?? 0, '1-Hour')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: '1px solid #3A3A3C',
                      background: 'rgba(10, 132, 255, 0.15)',
                      color: '#0A84FF',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Sliders size={11} />
                    <span>Use 1-Hr ({forecast?.next_1h_rate_mm_hr ?? 0} mm/h)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyForecast(forecast?.next_3h_peak_rate_mm_hr ?? 0, '3-Hour Peak')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: '1px solid #3A3A3C',
                      background: 'rgba(255, 159, 10, 0.15)',
                      color: '#FF9F0A',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Sliders size={11} />
                    <span>Use Peak ({forecast?.next_3h_peak_rate_mm_hr ?? 0} mm/h)</span>
                  </button>
                </div>
                {forecastSyncNotice && (
                  <div style={{ fontSize: '9.5px', color: '#30D158', marginTop: '6px', textAlign: 'center' }}>
                    {forecastSyncNotice}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TERRAIN INTELLIGENCE */}
          {activeTab === 'terrain' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>Topographic Elevation Sampling</span>
                {renderStatusBadge(terrainStats?.elevationQuality === 'ACTUAL_TERRAIN' ? 'LIVE' : 'ESTIMATED')}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '14px',
                background: '#2C2C2E',
                border: '1px solid #3A3A3C',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>Min Elevation</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#30D158', marginTop: '2px' }}>
                    {terrainStats?.minElevation ? `${terrainStats.minElevation}m` : '--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>Max Elevation</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                    {terrainStats?.maxElevation ? `${terrainStats.maxElevation}m` : '--'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>Slope Relief</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0A84FF', marginTop: '2px' }}>
                    {terrainStats?.elevationRange ? `${terrainStats.elevationRange}m` : '--'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '10px', color: 'rgba(235, 235, 245, 0.60)', lineHeight: 1.4 }}>
                Real-time 16×16 elevation DEM grid sampled directly from Mapbox Terrain RGB. Highlights natural gravity sinks, depression basins, and urban surface slopes.
              </div>
            </div>
          )}

          {/* TAB 3: SATELLITE WMS & OSM DRAINAGE */}
          {activeTab === 'geospatial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>
                ISRO NRSC Bhuvan WMS Overlays
              </div>

              {/* Bhuvan Water Bodies Layer Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '12px',
                background: '#2C2C2E',
                border: '1px solid #3A3A3C'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>Water Bodies & Hydrology</div>
                  <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>ISRO/NRSC satellite DEM depressions</div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleBhuvanLayer && onToggleBhuvanLayer('waterbodies')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${bhuvanLayersEnabled?.waterbodies ? '#0A84FF' : '#3A3A3C'}`,
                    background: bhuvanLayersEnabled?.waterbodies ? '#0A84FF' : 'rgba(255, 255, 255, 0.05)',
                    color: bhuvanLayersEnabled?.waterbodies ? '#FFFFFF' : 'rgba(235, 235, 245, 0.60)',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {bhuvanLayersEnabled?.waterbodies ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{bhuvanLayersEnabled?.waterbodies ? 'Active' : 'Off'}</span>
                </button>
              </div>

              {/* Bhuvan Watershed Layer Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '12px',
                background: '#2C2C2E',
                border: '1px solid #3A3A3C'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>Watershed Basins & Drainage</div>
                  <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>National macro-drainage corridors</div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleBhuvanLayer && onToggleBhuvanLayer('watershed')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${bhuvanLayersEnabled?.watershed ? '#0A84FF' : '#3A3A3C'}`,
                    background: bhuvanLayersEnabled?.watershed ? '#0A84FF' : 'rgba(255, 255, 255, 0.05)',
                    color: bhuvanLayersEnabled?.watershed ? '#FFFFFF' : 'rgba(235, 235, 245, 0.60)',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {bhuvanLayersEnabled?.watershed ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{bhuvanLayersEnabled?.watershed ? 'Active' : 'Off'}</span>
                </button>
              </div>

              {/* OpenStreetMap Stormwater Drainage Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '12px',
                background: '#2C2C2E',
                border: '1px solid #3A3A3C',
                marginTop: '4px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>OSM Micro-Drainage & Culverts</div>
                  <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>OpenStreetMap Overpass alignment</div>
                </div>
                <button
                  type="button"
                  onClick={onToggleOsmDrainage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${showOsmDrainage ? '#30D158' : '#3A3A3C'}`,
                    background: showOsmDrainage ? '#30D158' : 'rgba(255, 255, 255, 0.05)',
                    color: showOsmDrainage ? '#FFFFFF' : 'rgba(235, 235, 245, 0.60)',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {showOsmDrainage ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{showOsmDrainage ? 'Active' : 'Off'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DATA SOURCES MATRIX */}
          {activeTab === 'sources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10.5px', color: 'rgba(235, 235, 245, 0.60)' }}>
                Operational integrity & data freshness across active providers:
              </div>

              {[
                {
                  name: 'Open-Meteo High-Res Forecast',
                  type: 'Weather & Precipitation Telemetry',
                  status: weatherStatus,
                  time: environmentalData?.lastUpdatedFormatted || 'Just now'
                },
                {
                  name: 'Mapbox Terrain-DEM (Satellite)',
                  type: '16×16 Elevation Grid Sampling',
                  status: terrainStats?.elevationQuality === 'ACTUAL_TERRAIN' ? 'LIVE' : 'ESTIMATED',
                  time: 'Live DEM Mesh'
                },
                {
                  name: 'ISRO Bhuvan / NRSC OGC WMS',
                  type: 'Water Bodies & Hydrology',
                  status: bhuvanStatus?.status || 'AVAILABLE',
                  time: 'OGC WMS 1.1.1'
                },
                {
                  name: 'OpenStreetMap Overpass API',
                  type: 'Stormwater Culverts & Micro-drainage',
                  status: osmDrainageData?.features?.length ? 'LIVE' : 'AVAILABLE',
                  time: osmDrainageData?.features?.length ? `${osmDrainageData.features.length} features` : 'Overpass QL'
                }
              ].map((src, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: '#2C2C2E',
                    border: '1px solid #3A3A3C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>
                      {src.name}
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)', marginTop: '1px' }}>
                      {src.type} • {src.time}
                    </div>
                  </div>
                  {renderStatusBadge(src.status)}
                </div>
              ))}
            </div>
          )}

          {/* Panel Footer Telemetry */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '8px',
            borderTop: '1px solid #3A3A3C',
            fontSize: '9.5px',
            color: 'rgba(235, 235, 245, 0.60)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={10} />
              <span>Updated: {environmentalData?.lastUpdatedFormatted || 'Live'}</span>
            </div>
            <div>Timezone: Asia/Kolkata</div>
          </div>
        </div>
      )}
    </div>
  );
}
