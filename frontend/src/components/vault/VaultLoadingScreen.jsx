// Loading transition screen — shown for ~2.2s before the vault reveal.
// Used by both the assignment wizard Step 3 and the standalone first-visit vault page.

const LOADING_KEYFRAMES = `
  @keyframes vaultDotPulse {
    0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
  @keyframes vaultBarGrow {
    0% { width: 0%; }
    60% { width: 85%; }
    100% { width: 100%; }
  }
  @keyframes vaultBuildPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
`

export default function VaultLoadingScreen({ seasonCount = 0 }) {
  return (
    <>
      <style>{LOADING_KEYFRAMES}</style>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-primary">
        {/* Pulsing dots */}
        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-accent-gold"
              style={{ animation: `vaultDotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>

        {/* Building text */}
        <div
          className="text-[15px] font-mono font-semibold text-accent-gold mb-2"
          style={{ animation: 'vaultBuildPulse 2s ease-in-out infinite' }}
        >
          Building your league history...
        </div>
        <div className="text-xs font-mono text-text-muted mb-6">
          Merging {seasonCount} season{seasonCount !== 1 ? 's' : ''} of data
        </div>

        {/* Progress bar */}
        <div className="w-48 h-0.5 bg-dark-tertiary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #D4A853, #B8922E)',
              animation: 'vaultBarGrow 2.2s ease-out forwards',
            }}
          />
        </div>
      </div>
    </>
  )
}
