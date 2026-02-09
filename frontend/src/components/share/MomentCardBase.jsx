import { forwardRef } from 'react'

const MomentCardBase = forwardRef(({ children, username }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: 1200,
        height: 675,
        background: 'linear-gradient(135deg, #0A0908 0%, #1A1510 100%)',
        border: '2px solid rgba(232, 184, 77, 0.15)',
        borderRadius: 24,
        padding: 48,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(232, 184, 77, 0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header — Clutch logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, position: 'relative', zIndex: 1 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #E8B84D, #D4A03A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 800,
            color: '#0A0908',
          }}
        >
          C
        </div>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#E8B84D',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Clutch
        </span>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        {children}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
          marginTop: 24,
        }}
      >
        {username && (
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
            @{username}
          </span>
        )}
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
          clutchfantasysports.com
        </span>
      </div>
    </div>
  )
})

MomentCardBase.displayName = 'MomentCardBase'
export default MomentCardBase
