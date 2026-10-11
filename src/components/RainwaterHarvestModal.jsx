import React, { useState, useEffect } from 'react';
import { X, Droplets, Info, Home, ShieldAlert, Award, Calculator, ArrowRight, Building, CheckCircle2 } from 'lucide-react';

export function RainwaterHarvestModal({
  isOpen,
  onClose,
  rainfallMm = 120,
  rwhStats = null,
  blockLabel = ''
}) {
  const initialRoofArea = rwhStats?.terraceAreaM2 || 250000;
  const initialRain = typeof rwhStats?.rainfallMm === 'number'
    ? rwhStats.rainfallMm
    : (typeof rainfallMm === 'number' ? rainfallMm : 0);

  const [customRoofArea, setCustomRoofArea] = useState(initialRoofArea);
  const [customRainMm, setCustomRainMm] = useState(initialRain);
  const [roofType, setRoofType] = useState('rcc'); // 'rcc' (0.85) | 'metal' (0.90) | 'tile' (0.75)
  const [useBlockDynamic, setUseBlockDynamic] = useState(true);

  useEffect(() => {
    if (rwhStats?.terraceAreaM2) {
      setCustomRoofArea(rwhStats.terraceAreaM2);
    }
    if (typeof rwhStats?.rainfallMm === 'number') {
      setCustomRainMm(rwhStats.rainfallMm);
    }
  }, [rwhStats]);

  if (!isOpen) return null;

  // Runoff coefficients
  const runoffCoeffs = {
    rcc: 0.85,
    metal: 0.90,
    tile: 0.75
  };
  const C = runoffCoeffs[roofType] || 0.85;
  const eta = 0.90; // Standard Hydrology Specification: Filter Efficiency ~0.90

  const activeRoofArea = useBlockDynamic && rwhStats?.terraceAreaM2 ? rwhStats.terraceAreaM2 : customRoofArea;
  const activeRain = useBlockDynamic && typeof rwhStats?.rainfallMm === 'number' ? rwhStats.rainfallMm : customRainMm;
  const isPaused = activeRain > 50;

  // Standard Hydrology Formula strictly based on live rain:
  // - If rain == 0 mm: 0 kL / 0 L
  // - If rain > 50 mm: Paused (>50mm bypass)
  const harvestedLiters = (!isPaused && activeRain > 0)
    ? Math.round(activeRain * activeRoofArea * C * eta)
    : 0;
  const harvestedKL = Number((harvestedLiters / 1_000).toFixed(1)); // 1 kL = 1 m³
  const harvestedM3 = harvestedKL;

  // Non-potable building capacity demand breakdown:
  // Non-potable domestic requirement (toilet flushing + landscape maintenance) ~ 45 LPCD
  const estimatedOccupants = rwhStats?.estimatedOccupants || Math.max(100, Math.round(activeRoofArea / 16));
  const dailyNonPotableDemandL = Math.max(4_500, estimatedOccupants * 45);
  const daysSustained = (!isPaused && harvestedLiters > 0) ? Math.round(harvestedLiters / dailyNonPotableDemandL) : 0;

  // Recommended tank / sump capacity (~65% storm buffer)
  const recommendedTankLiters = Math.round(harvestedLiters * 0.65);

  return (
    <div className="gmaps-modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 8, 14, 0.78)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div 
        className="gmaps-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          width: '100%',
          maxWidth: '580px',
          background: '#101013',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.04), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Droplets size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
                Area-Specific Rainwater Harvesting (RWH) Engine
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                {blockLabel ? `Dynamic catchment model for ${blockLabel}` : 'Dynamic 1 km² neighborhood rooftop catchment'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          
          {/* Deluge / Surge Bypass Alert if rain > 50 mm */}
          {isPaused && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '11.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <div>
                <strong>RWH Inflow Paused ({activeRain} mm &gt; 50 mm threshold):</strong>
                <div style={{ marginTop: '2px', fontSize: '11px', color: '#fca5a5' }}>
                  Emergency stormwater bypass active. Cistern diversion suspended to prevent structural hydraulic overload and foundation flooding.
                </div>
              </div>
            </div>
          )}
          
          {/* Block Geometry & Source Badge */}
          {rwhStats && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                <Building size={14} style={{ color: '#a1a1aa' }} />
                <span>
                  <strong>Block:</strong> 1.0 km² (1,000,000 m²) • <strong>Zoning:</strong> {rwhStats.zoningCategory}
                </span>
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#a1a1aa',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {rwhStats.isExplicitFootprint ? 'Explicit Vector Footprints' : 'Zoned Density Model'}
              </span>
            </div>
          )}

          {/* Key Metric Highlight Card */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '12px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 600 }}>
                Total Collectable Rainwater
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginTop: '2px', lineHeight: 1.1 }}>
                {harvestedKL.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 600 }}>kL (m³)</span>
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                <strong>{harvestedLiters.toLocaleString()} Liters</strong> of clean harvestable runoff
              </div>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Non-Potable Building Supply</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                  ~{daysSustained} Days
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  for {estimatedOccupants.toLocaleString()} estimated occupants
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Recommended Sump Size</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  {recommendedTankLiters.toLocaleString()} L buffer
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic / Custom Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Catchment Input Parameters:</span>
            {rwhStats && (
              <button
                type="button"
                onClick={() => setUseBlockDynamic(prev => !prev)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: useBlockDynamic ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                  color: useBlockDynamic ? '#ffffff' : '#94a3b8',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {useBlockDynamic ? '✓ Using Dynamic Block Values' : 'Custom Values Enabled'}
              </button>
            )}
          </div>

          {/* Interactive Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                <span>Rooftop Coverage (A)</span>
                <span style={{ color: '#fafafa' }}>{activeRoofArea.toLocaleString()} m²</span>
              </div>
              <input
                type="range"
                min="50000"
                max="800000"
                step="10000"
                value={activeRoofArea}
                disabled={useBlockDynamic && !!rwhStats}
                onChange={(e) => {
                  setUseBlockDynamic(false);
                  setCustomRoofArea(Number(e.target.value));
                }}
                style={{ width: '100%', accentColor: '#a1a1aa', cursor: useBlockDynamic ? 'not-allowed' : 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
                <span>Suburban (15%)</span>
                <span>Residential (40%)</span>
                <span>Commercial (70%)</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                <span>Precipitation Event (P)</span>
                <span style={{ color: '#fafafa' }}>{activeRain} mm</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={activeRain}
                disabled={useBlockDynamic && !!rwhStats}
                onChange={(e) => {
                  setUseBlockDynamic(false);
                  setCustomRainMm(Number(e.target.value));
                }}
                style={{ width: '100%', accentColor: '#a1a1aa', cursor: useBlockDynamic ? 'not-allowed' : 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
                <span>25 mm (Shower)</span>
                <span>75 mm (Heavy)</span>
                <span>150 mm (Monsoon)</span>
              </div>
            </div>
          </div>

          {/* Roof Surface Material Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
              Roof Surface Material (Runoff Coefficient C)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'rcc', name: 'Flat RCC Concrete', c: 'C = 0.85', desc: 'Standard Bengaluru Terrace' },
                { id: 'metal', name: 'Corrugated Metal', c: 'C = 0.90', desc: 'Commercial Sheds' },
                { id: 'tile', name: 'Mangalore Clay Tiles', c: 'C = 0.75', desc: 'Sloped Traditional' }
              ].map(r => (
                <div
                  key={r.id}
                  onClick={() => setRoofType(r.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${roofType === r.id ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                    background: roofType === r.id ? 'rgba(255, 255, 255, 0.1)' : 'rgba(23, 23, 27, 0.7)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#f8fafc' }}>{r.name}</div>
                  <div style={{ fontSize: '10px', color: '#a1a1aa', marginTop: '2px' }}>{r.c} • η = 90%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hydrologic Formula & Calculation Breakdown Footer */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '11px',
            color: '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Standard Hydrology Formula:</span>
              <span style={{ color: '#fafafa', fontWeight: 700 }}>Filter Efficiency: 90%</span>
            </div>
            <code>Harvestable_Volume (L) = P ({activeRain} mm) × A ({activeRoofArea.toLocaleString()} m²) × C ({C}) × η (0.90)</code>
          </div>
        </div>
      </div>
    </div>
  );
}
