import { useMemo, useState } from 'react'

/**
 * Build a 6-tier default mirroring the original Buckeye PGA Championship
 * pool. Tiers 1-5: 10 players each by OWGR. Tier 6: rest of the field.
 * Each tier requires 1 pick (6 picks per entry total).
 * Unranked players sort to the back so they land in T6.
 */
export function buildDefaultTiers(field) {
  if (!field || field.length === 0) return null

  const sorted = [...field].sort((a, b) => {
    const ra = a.owgrRank ?? 9999
    const rb = b.owgrRank ?? 9999
    return ra - rb
  })

  const tiers = []
  for (let i = 0; i < 5; i++) {
    const slice = sorted.slice(i * 10, (i + 1) * 10)
    tiers.push({
      tierNumber: i + 1,
      label: '',
      picksRequired: 1,
      playerIds: slice.map(p => p.playerId),
    })
  }
  tiers.push({
    tierNumber: 6,
    label: '',
    picksRequired: 1,
    playerIds: sorted.slice(50).map(p => p.playerId),
  })
  return tiers
}

/**
 * Shared tier configuration UI: auto preview with per-tier picks stepper,
 * plus a Customize mode for full player-by-tier editing.
 *
 * Props:
 *   field    — array of { playerId, playerName, owgrRank, countryFlag }
 *   tiers    — current tier array (each { tierNumber, label, picksRequired, playerIds })
 *   onChange — called with the next tier array on any edit
 */
export default function TierBuilder({ field, tiers, onChange }) {
  const [mode, setMode] = useState('auto')

  const fieldById = useMemo(() => {
    const m = new Map()
    for (const p of field || []) m.set(p.playerId, p)
    return m
  }, [field])

  const totalPicks = tiers.reduce((sum, t) => sum + (t.picksRequired || 0), 0)

  const updateTier = (idx, patch) =>
    onChange(tiers.map((t, i) => i === idx ? { ...t, ...patch } : t))

  const addTier = () =>
    onChange([...tiers, { tierNumber: tiers.length + 1, label: '', picksRequired: 1, playerIds: [] }])

  const removeTier = (idx) =>
    onChange(tiers.filter((_, i) => i !== idx).map((t, i) => ({ ...t, tierNumber: i + 1 })))

  const resetToDefaults = () => {
    const defaults = buildDefaultTiers(field)
    if (defaults) onChange(defaults)
    setMode('auto')
  }

  if (!field || field.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-text-2/25 bg-[var(--surface)] p-6 sm:p-8 text-center">
        <p className="text-text-2 text-sm">No field data available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        {mode === 'auto' ? (
          <button
            type="button"
            onClick={() => setMode('custom')}
            className="text-sm font-display font-semibold text-blaze hover:text-blaze/80 transition-colors"
          >
            Customize tiers →
          </button>
        ) : (
          <button
            type="button"
            onClick={resetToDefaults}
            className="text-sm font-display font-semibold text-text-2 hover:text-blaze transition-colors"
          >
            ← Reset to defaults
          </button>
        )}
      </div>

      {mode === 'auto' ? (
        <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-text-2/10 flex items-baseline justify-between gap-3">
            <div>
              <div className="font-display font-bold text-text-primary text-lg">
                {tiers.length} tiers · {totalPicks} picks per entry
              </div>
              <div className="font-editorial italic text-sm text-text-2 mt-0.5">
                Tap +/− to bump picks per tier.
              </div>
            </div>
          </div>
          <div className="divide-y divide-text-2/10">
            {tiers.map((tier, idx) => {
              const players = tier.playerIds.map(id => fieldById.get(id)).filter(Boolean)
              const preview = players.slice(0, 3).map(p => p.playerName).join(' · ')
              const maxPicks = Math.min(3, tier.playerIds.length)
              const bump = (delta) => {
                const next = Math.max(1, Math.min(maxPicks, tier.picksRequired + delta))
                if (next !== tier.picksRequired) updateTier(idx, { picksRequired: next })
              }
              return (
                <div key={tier.tierNumber} className="px-5 py-3.5 flex items-center gap-4">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blaze/10 text-blaze font-mono text-sm font-bold shrink-0">
                    T{tier.tierNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-text-primary">
                      {tier.label || `Tier ${tier.tierNumber}`}
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-text-2 mt-0.5 truncate">
                      {tier.playerIds.length} players
                      {preview && <span className="normal-case tracking-normal text-text-2/70"> · {preview}{players.length > 3 ? '…' : ''}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-text-2/20 bg-bg px-1 py-1">
                    <button
                      type="button"
                      onClick={() => bump(-1)}
                      disabled={tier.picksRequired <= 1}
                      aria-label={`Decrease picks for tier ${tier.tierNumber}`}
                      className="w-7 h-7 rounded-md flex items-center justify-center font-mono text-lg font-bold text-text-2 hover:bg-blaze/10 hover:text-blaze disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-2 transition-colors"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[3.5rem] leading-tight">
                      <div className="font-mono font-bold text-text-primary text-base">{tier.picksRequired}</div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-text-2">pick{tier.picksRequired !== 1 ? 's' : ''}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => bump(1)}
                      disabled={tier.picksRequired >= maxPicks}
                      aria-label={`Increase picks for tier ${tier.tierNumber}`}
                      className="w-7 h-7 rounded-md flex items-center justify-center font-mono text-lg font-bold text-text-2 hover:bg-blaze/10 hover:text-blaze disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-2 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addTier}
              className="inline-flex items-center gap-1.5 text-sm bg-blaze hover:bg-blaze/90 text-white font-display font-semibold rounded-lg px-3 py-1.5 transition-colors"
            >
              + Add tier
            </button>
          </div>
          {tiers.map((tier, idx) => (
            <div key={idx} className="rounded-2xl border border-text-2/15 p-4 space-y-3 bg-[var(--surface)]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg font-bold text-text-primary">Tier {tier.tierNumber}</span>
                <input
                  className="flex-1 min-w-32 border border-text-2/20 rounded-lg px-3 py-1.5 text-text-primary bg-bg"
                  placeholder="Label (e.g. 'Stars')"
                  value={tier.label}
                  onChange={e => updateTier(idx, { label: e.target.value })}
                />
                <label className="text-sm text-text-2 flex items-center gap-2">
                  Picks:
                  <input
                    type="number" min="1" max="10"
                    className="w-16 border border-text-2/20 rounded-lg px-2 py-1.5 text-text-primary bg-bg font-mono font-bold"
                    value={tier.picksRequired}
                    onChange={e => updateTier(idx, { picksRequired: parseInt(e.target.value) || 1 })}
                  />
                </label>
                {tiers.length > 1 && (
                  <button type="button" onClick={() => removeTier(idx)} className="text-live-red text-sm hover:underline">Remove</button>
                )}
              </div>
              <select
                multiple
                className="w-full border border-text-2/20 rounded-lg p-2 h-40 bg-bg font-mono text-sm text-text-primary"
                value={tier.playerIds}
                onChange={e => updateTier(idx, { playerIds: Array.from(e.target.selectedOptions).map(o => o.value) })}
              >
                {field.map(p => (
                  <option key={p.playerId} value={p.playerId}>
                    {p.countryFlag || ''} {p.playerName} {p.owgrRank ? `#${p.owgrRank}` : ''}
                  </option>
                ))}
              </select>
              <div className="text-xs text-text-2 font-mono">
                {tier.playerIds.length} player(s) selected · ⌘/Ctrl-click to multi-select
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
