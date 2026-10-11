import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  Layers,
  Droplets,
  Building2,
  Calendar
} from 'lucide-react';

/**
 * Floating Simulation Playback Dock (Anchored at Bottom-Center)
 *
 * Provides:
 * 1. Playback controls: Play, Pause, Reset (0h), and 24-hour scrubber
 * 2. High-level metric strip: Timeline Hour, Max Water Depth, Inundated Area %, Risk Buildings count
 */
export function SimulationPlaybackDock({
  isActive = false,
  isPlaying = false,
  currentHour = 0,
  simSequence = null,
  isOrbiting = false,
  onTogglePlay,
  onReset,
  onHourChange
}) {
  if (!isActive) return null;

  const activeStep = simSequence?.steps?.[currentHour] || null;

  const peakDepthM = activeStep?.peakWaterDepthM !== undefined
    ? activeStep.peakWaterDepthM
    : 0.0;

  const floodFraction = activeStep?.floodFraction !== undefined
    ? activeStep.floodFraction
    : 0.0;

  const affectedBuildings = activeStep?.affectedBuildings !== undefined
    ? activeStep.affectedBuildings
    : 0;

  const rainfallMm = activeStep?.rainfallMm !== undefined
    ? activeStep.rainfallMm
    : 0;

  // Depth color coding
  let depthColor = '#10b981'; // Green (Safe)
  if (peakDepthM >= 0.6) depthColor = '#ef4444'; // Red (Severe)
  else if (peakDepthM >= 0.3) depthColor = '#f97316'; // Orange (Moderate)
  else if (peakDepthM >= 0.08) depthColor = '#eab308'; // Yellow (Low risk)

  const isForecastMode = !!simSequence?.isForecastMode;
  const totalHours = simSequence?.totalHours ?? 24;
  const timeDisplay = isForecastMode
    ? (activeStep?.displayTime || activeStep?.label || `T+${currentHour}h`)
    : `${String(currentHour).padStart(2, '0')}:00`;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: isOrbiting ? '84px' : '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: isOrbiting ? 50 : 35,
        transition: 'bottom 0.22s ease',
        width: 'auto',
        minWidth: '440px',
        maxWidth: '560px',
        background: '#121215',
        backdropFilter: 'blur(16px)',
        border: isForecastMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)',
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        animation: 'fadeInSlideUp 0.25s ease-out',
        pointerEvents: 'auto'
      }}
    >
      {/* Row 1: Playback Controls & Timeline Scrubber */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          title={isPlaying ? "Pause Timeline Playback" : "Play Timeline Sequence"}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 12px',
            borderRadius: '7px',
            border: 'none',
            background: isPlaying ? '#c2820a' : (isForecastMode ? '#10b981' : '#e3af35'),
            color: '#05080c',
            fontWeight: 800,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
          }}
        >
          {isPlaying ? <Pause size={13} fill="#05080c" /> : <Play size={13} fill="#05080c" />}
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        {/* Reset (0h) Button */}
        <button
          type="button"
          onClick={onReset}
          title="Reset simulation to initial step"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '7px',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#cbd5e1',
            fontWeight: 600,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>

        {/* Timeline Scrubber Slider */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <input
            type="range"
            min="0"
            max={totalHours}
            step="1"
            value={currentHour}
            onChange={(e) => onHourChange && onHourChange(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: isForecastMode ? '#10b981' : '#a1a1aa',
              cursor: 'pointer',
              height: '4px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b' }}>
            <span>{isForecastMode ? 'Now (0h)' : '0h (Dry)'}</span>
            <span>{isForecastMode ? 'Peak Prob' : '7h (Peak)'}</span>
            <span>{isForecastMode ? `${Math.round(totalHours / 2)}h` : '16h (Recede)'}</span>
            <span>{totalHours}h</span>
          </div>
        </div>

        {/* Mode & Hour Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
          <div
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: isForecastMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              border: isForecastMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: isForecastMode ? '#34d399' : '#fafafa',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            {isForecastMode ? 'LIVE FORECAST' : 'SCENARIO'}
          </div>
          <div
            style={{
              padding: '3px 7px',
              borderRadius: '5px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}
          >
            {timeDisplay}
          </div>
        </div>
      </div>

      {/* Row 2: Clean Horizontal Metric Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        {/* Metric 1: Timeline Hour or Forecast Time */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isForecastMode ? 'Forecast Step' : 'Hour'}
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#f1f5f9', marginTop: '1px' }}>
            {isForecastMode ? `+${currentHour}h (${rainfallMm}mm/h)` : `T + ${currentHour}h`}
          </span>
        </div>

        {/* Metric 2: Max Water Depth */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Max Depth
          </span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: depthColor, marginTop: '1px' }}>
            {peakDepthM.toFixed(2)} m
          </span>
        </div>

        {/* Metric 3: Inundated Area % */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Inundated Area
          </span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: floodFraction > 0.3 ? '#f97316' : '#fafafa', marginTop: '1px' }}>
            {Math.round(floodFraction * 100)}%
          </span>
        </div>

        {/* Metric 4: Risk Buildings */}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Risk Bldgs
          </span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: affectedBuildings > 12 ? '#ef4444' : (affectedBuildings > 0 ? '#f59e0b' : '#10b981'), marginTop: '1px' }}>
            {affectedBuildings}
          </span>
        </div>
      </div>
    </div>
  );
}
