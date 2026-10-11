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
  let depthColor = '#30D158'; // Green (Safe)
  if (peakDepthM >= 0.6) depthColor = '#FF453A'; // Red (Severe)
  else if (peakDepthM >= 0.3) depthColor = '#FF9F0A'; // Orange (Moderate)
  else if (peakDepthM >= 0.08) depthColor = '#FFD60A'; // Yellow (Low risk)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 35,
        width: 'auto',
        minWidth: '420px',
        maxWidth: '540px',
        background: 'rgba(28, 28, 30, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid #3A3A3C',
        borderRadius: '16px',
        padding: '12px 16px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
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
          title={isPlaying ? "Pause 24h Playback" : "Play 24-Hour Simulation"}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 14px',
            borderRadius: '10px',
            border: 'none',
            background: isPlaying ? '#FF9F0A' : '#0A84FF',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            boxShadow: isPlaying ? '0 0 10px rgba(255, 159, 10, 0.4)' : '0 0 10px rgba(10, 132, 255, 0.4)'
          }}
        >
          {isPlaying ? <Pause size={13} fill="#FFFFFF" /> : <Play size={13} fill="#FFFFFF" />}
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        {/* Reset (0h) Button */}
        <button
          type="button"
          onClick={onReset}
          title="Reset simulation to Hour 0 (Baseline)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            borderRadius: '10px',
            border: '1px solid #3A3A3C',
            background: '#2C2C2E',
            color: '#FFFFFF',
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
            max="24"
            step="1"
            value={currentHour}
            onChange={(e) => onHourChange && onHourChange(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#0A84FF',
              cursor: 'pointer',
              height: '4px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)' }}>
            <span>0h (Dry)</span>
            <span>7h (Peak)</span>
            <span>16h (Recede)</span>
            <span>24h</span>
          </div>
        </div>

        {/* Hour Badge */}
        <div
          style={{
            padding: '4px 8px',
            borderRadius: '8px',
            background: 'rgba(10, 132, 255, 0.16)',
            border: '1px solid rgba(10, 132, 255, 0.35)',
            color: '#0A84FF',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          {String(currentHour).padStart(2, '0')}:00
        </div>
      </div>

      {/* Row 2: Clean Horizontal Metric Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '12px',
          background: '#2C2C2E',
          border: '1px solid #3A3A3C'
        }}
      >
        {/* Metric 1: Timeline Hour */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Hour
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF', marginTop: '1px' }}>
            T + {currentHour}h
          </span>
        </div>

        {/* Metric 2: Max Water Depth */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Max Depth
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: depthColor, marginTop: '1px' }}>
            {peakDepthM.toFixed(2)} m
          </span>
        </div>

        {/* Metric 3: Inundated Area % */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Inundated Area
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: floodFraction > 0.3 ? '#FF9F0A' : '#0A84FF', marginTop: '1px' }}>
            {Math.round(floodFraction * 100)}%
          </span>
        </div>

        {/* Metric 4: Risk Buildings */}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span style={{ fontSize: '9px', color: 'rgba(235, 235, 245, 0.60)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Risk Bldgs
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: affectedBuildings > 12 ? '#FF453A' : (affectedBuildings > 0 ? '#FF9F0A' : '#30D158'), marginTop: '1px' }}>
            {affectedBuildings}
          </span>
        </div>
      </div>
    </div>
  );
}
