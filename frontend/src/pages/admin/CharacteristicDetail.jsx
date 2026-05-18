import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { formatValue } from '../../components/admin/intelligence/valueFormatters'

// Same palette + category pills as the Library so the drill-down feels continuous.
const CATEGORY_META = {
  pick_quality: { label: 'Pick Quality', cls: 'bg-blaze/15 text-blaze' },
  positional:   { label: 'Positional',   cls: 'bg-slate-light/20 text-slate-light' },
  auction:      { label: 'Auction',      cls: 'bg-crown/15 text-crown-bright' },
  trade:        { label: 'Trade',        cls: 'bg-field/15 text-field-bright' },
  waiver:       { label: 'Waiver',       cls: 'bg-blaze-deep/15 text-blaze-deep' },
  drop:         { label: 'Drop',         cls: 'bg-live-red/15 text-live-red' },
  outcome:      { label: 'Outcome',      cls: 'bg-crown/15 text-crown' },
  unknown:      { label: 'Other',        cls: 'bg-[var(--card-bg)] text-text-muted' },
}

const CONFIDENCE_BADGE = {
  HIGH: 'bg-field/15 text-field-bright',
  MED:  'bg-crown/15 text-crown-bright',
  LOW:  'bg-live-red/15 text-live-red',
}

// Must mirror DEFAULT_THRESHOLDS in backend/src/services/intelligence/confidence.js.
// The backend's POST upsert writes whatever shape we send (including identical-to-default
// values), so `!!override` alone can't tell us if a custom override is actually live.
const DEFAULT_THRESHOLDS = {
  highMinN: 5,
  highMinConsistency: 0.80,
  medMinN: 3,
  medMinConsistency: 0.60,
}

function isOverrideActive(override) {
  if (!override) return false
  return (
    Number(override.highMinN) !== DEFAULT_THRESHOLDS.highMinN ||
    Number(override.highMinConsistency) !== DEFAULT_THRESHOLDS.highMinConsistency ||
    Number(override.medMinN) !== DEFAULT_THRESHOLDS.medMinN ||
    Number(override.medMinConsistency) !== DEFAULT_THRESHOLDS.medMinConsistency
  )
}

// 10-bucket histogram color rule: green for high-confidence buckets,
// crown for the middle band, red for the low buckets. Matches the
// HIGH/MED/LOW badges used elsewhere.
//
// Why raw hex (not Tailwind classes or CSS vars)? SVG `fill` requires literal
// color strings — it can't resolve Tailwind classes, and the brand color CSS
// vars (--color-field-bright etc.) aren't defined in index.css, so the prior
// `var(..., #fallback)` form was always rendering the off-brand emerald-500
// fallback. Hex values below are pulled directly from the Clutch brand spec.
function bucketColor(label) {
  // label looks like "0-9", "10-19", ..., "90-100" — use the lower bound.
  const lo = parseInt(label.split('-')[0], 10)
  if (lo >= 70) return '#0D9668' // field (success / HIGH)
  if (lo >= 40) return '#D4930D' // crown (premium / MED)
  return '#E83838'               // live-red (LOW)
}

// Custom SVG histogram — keeps us off recharts (not installed) and matches
// the codebase's hand-rolled SVG style (SgRadarChart, MiniHistogram).
function DistributionHistogram({ buckets }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const max = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.count)),
    [buckets]
  )
  const total = useMemo(
    () => buckets.reduce((sum, b) => sum + b.count, 0),
    [buckets]
  )

  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-text-muted bg-[var(--card-bg)] rounded-lg border border-dashed border-[var(--card-border)]">
        No users have scored data on this characteristic yet
      </div>
    )
  }

  // Geometry — chart inhabits a 600x180 viewBox; y-axis labels live in the
  // left 28px, x-axis labels in the bottom 22px.
  const W = 600
  const H = 180
  const padL = 28
  const padR = 8
  const padT = 8
  const padB = 22
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const barW = innerW / buckets.length

  // Y-axis ticks — 0, 25%, 50%, 75%, 100% of max.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padT + innerH - innerH * t,
    label: Math.round(max * t),
  }))

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Confidence-score distribution"
      >
        {/* gridlines + y ticks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              y1={t.y}
              x2={W - padR}
              y2={t.y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <text
              x={padL - 4}
              y={t.y + 3}
              textAnchor="end"
              className="fill-text-muted"
              style={{ fontSize: '9px', fontFamily: 'monospace' }}
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* bars */}
        {buckets.map((b, i) => {
          const h = (b.count / max) * innerH
          const x = padL + i * barW
          const y = padT + innerH - h
          const fill = bucketColor(b.label)
          const isHover = hoverIdx === i
          return (
            <g key={b.label}>
              <rect
                x={x + 2}
                y={y}
                width={Math.max(0, barW - 4)}
                height={h}
                fill={fill}
                opacity={isHover ? 1 : 0.85}
                rx="2"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                style={{ cursor: 'pointer', transition: 'opacity 120ms' }}
              />
              {/* count label above bar when non-zero */}
              {b.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 3}
                  textAnchor="middle"
                  className="fill-text-secondary"
                  style={{ fontSize: '9px', fontFamily: 'monospace' }}
                >
                  {b.count}
                </text>
              )}
              {/* x-axis bucket label */}
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                className="fill-text-muted"
                style={{ fontSize: '9px', fontFamily: 'monospace' }}
              >
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {hoverIdx != null && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[var(--card-bg)] border border-[var(--card-border)] text-xs">
          <span className="font-mono text-text-primary">{buckets[hoverIdx].label}</span>
          <span className="text-text-muted"> · </span>
          <span className="font-mono text-text-primary">{buckets[hoverIdx].count}</span>
          <span className="text-text-muted"> users</span>
        </div>
      )}
    </div>
  )
}

export default function CharacteristicDetail() {
  const { type } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  // Threshold form state — initialized when data lands.
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS)
  const [thresholdsSaving, setThresholdsSaving] = useState(false)
  const [thresholdsMsg, setThresholdsMsg] = useState(null)

  // Notes state — local copy so we can debounce-save on blur.
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  // Inline error messaging for the silent toggle/notes save paths — mirrors
  // the `thresholdsMsg` pattern so a click never looks dead.
  const [toggleMsg, setToggleMsg] = useState({ promote: null, suppress: null, notes: null })

  const load = useCallback(async () => {
    try {
      setError(null)
      const resp = await api.getCharacteristicDetail(type)
      setData(resp)

      // Seed threshold form from override or defaults
      const override = resp?.aggregate?.thresholdsOverride
      if (override && typeof override === 'object') {
        setThresholds({
          highMinN: Number(override.highMinN ?? DEFAULT_THRESHOLDS.highMinN),
          highMinConsistency: Number(override.highMinConsistency ?? DEFAULT_THRESHOLDS.highMinConsistency),
          medMinN: Number(override.medMinN ?? DEFAULT_THRESHOLDS.medMinN),
          medMinConsistency: Number(override.medMinConsistency ?? DEFAULT_THRESHOLDS.medMinConsistency),
        })
      } else {
        setThresholds(DEFAULT_THRESHOLDS)
      }

      // Seed notes
      setNotes(resp?.aggregate?.adminNotes || '')
    } catch (e) {
      console.error('Failed to load characteristic detail:', e.message)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await api.refreshIntelligenceAggregates()
      await load()
      setLastRefresh(new Date())
    } catch (e) {
      console.error('Aggregate refresh failed:', e.message)
      setError(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  // --- Threshold validation -------------------------------------------------
  const thresholdErrors = useMemo(() => {
    const errs = []
    const { highMinN, highMinConsistency, medMinN, medMinConsistency } = thresholds
    if (!(highMinN > 0)) errs.push('High N must be > 0')
    if (!(medMinN > 0)) errs.push('Med N must be > 0')
    if (!(highMinConsistency > 0)) errs.push('High consistency must be > 0')
    if (!(medMinConsistency > 0)) errs.push('Med consistency must be > 0')
    if (medMinN > highMinN) errs.push('Med N must be ≤ High N')
    if (medMinConsistency > highMinConsistency) errs.push('Med consistency must be ≤ High consistency')
    return errs
  }, [thresholds])

  const saveThresholds = async () => {
    if (thresholdErrors.length > 0 || thresholdsSaving) return
    setThresholdsSaving(true)
    setThresholdsMsg(null)
    try {
      const resp = await api.updateCharacteristicThresholds(type, {
        highMinN: Number(thresholds.highMinN),
        highMinConsistency: Number(thresholds.highMinConsistency),
        medMinN: Number(thresholds.medMinN),
        medMinConsistency: Number(thresholds.medMinConsistency),
      })
      setData((prev) => prev ? { ...prev, aggregate: resp.aggregate } : prev)
      setThresholdsMsg('Saved')
      setTimeout(() => setThresholdsMsg(null), 2000)
    } catch (e) {
      setThresholdsMsg(`Failed: ${e.message}`)
    } finally {
      setThresholdsSaving(false)
    }
  }

  const restoreDefaults = async () => {
    setThresholds(DEFAULT_THRESHOLDS)
    setThresholdsSaving(true)
    setThresholdsMsg(null)
    try {
      // Backend POST upserts an override regardless of contents, so we write
      // the defaults to clear any drift. Live values then revert to canonical.
      const resp = await api.updateCharacteristicThresholds(type, DEFAULT_THRESHOLDS)
      setData((prev) => prev ? { ...prev, aggregate: resp.aggregate } : prev)
      setThresholdsMsg('Defaults restored')
      setTimeout(() => setThresholdsMsg(null), 2000)
    } catch (e) {
      setThresholdsMsg(`Failed: ${e.message}`)
    } finally {
      setThresholdsSaving(false)
    }
  }

  // --- Toggles --------------------------------------------------------------
  const togglePromote = async () => {
    setToggleMsg((m) => ({ ...m, promote: null }))
    const next = !data?.aggregate?.promoteToCoach
    try {
      const resp = await api.toggleCharacteristicPromote(type, next)
      setData((prev) => prev ? { ...prev, aggregate: resp.aggregate } : prev)
    } catch (e) {
      console.error('Toggle promote failed:', e.message)
      setToggleMsg((m) => ({ ...m, promote: 'Save failed — try again' }))
    }
  }

  const toggleSuppress = async () => {
    setToggleMsg((m) => ({ ...m, suppress: null }))
    const next = !data?.aggregate?.suppressed
    try {
      const resp = await api.toggleCharacteristicSuppress(type, next)
      setData((prev) => prev ? { ...prev, aggregate: resp.aggregate } : prev)
    } catch (e) {
      console.error('Toggle suppress failed:', e.message)
      setToggleMsg((m) => ({ ...m, suppress: 'Save failed — try again' }))
    }
  }

  // --- Notes save on blur ---------------------------------------------------
  const saveNotes = async () => {
    if (notesSaving) return
    const original = data?.aggregate?.adminNotes || ''
    if (notes === original) return
    setToggleMsg((m) => ({ ...m, notes: null }))
    setNotesSaving(true)
    try {
      const resp = await api.updateCharacteristicNotes(type, notes)
      setData((prev) => prev ? { ...prev, aggregate: resp.aggregate } : prev)
    } catch (e) {
      console.error('Save notes failed:', e.message)
      setToggleMsg((m) => ({ ...m, notes: 'Save failed — try again' }))
    } finally {
      setNotesSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-12 text-center">
          <p className="text-text-secondary">Loading characteristic…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-xl bg-[var(--surface)] border border-live-red/30 p-6">
          <p className="text-live-red font-medium">Failed to load characteristic</p>
          <p className="text-text-muted text-sm mt-1">{error}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { setLoading(true); load() }}
              className="px-3 py-1.5 text-xs font-medium bg-blaze text-white rounded-md hover:bg-blaze-deep transition-colors"
            >
              Retry
            </button>
            <Link
              to="/admin"
              className="px-3 py-1.5 text-xs font-medium bg-[var(--card-bg)] text-text-primary rounded-md hover:bg-[var(--card-bg)]/80 transition-colors"
            >
              Back to Library
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const meta = data?.meta || { displayName: type, description: '', category: 'unknown' }
  const agg = data?.aggregate
  const cat = CATEGORY_META[meta.category] || CATEGORY_META.unknown
  const buckets = data?.distribution?.buckets || []
  const topUsers = data?.topUsers || []
  const hasOverride = isOverrideActive(agg?.thresholdsOverride)

  const usersWithData = agg?.usersWithData ?? 0
  const totalUsers = agg?.totalUsers ?? 0
  const avgScore = agg?.avgConfidenceScore
  const avgScoreDisplay = avgScore == null ? '—' : Number(avgScore).toFixed(1)
  const lastComputed = agg?.computedAt ? new Date(agg.computedAt) : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* HEADER STRIP -------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate('/admin')}
            className="text-xs text-text-muted hover:text-text-primary transition-colors mb-2 inline-flex items-center gap-1"
          >
            <span>←</span>
            <span>Back to Intelligence Library</span>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-text-primary leading-tight">
              {meta.displayName}
            </h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${cat.cls}`}>
              {cat.label}
            </span>
            {agg?.promoteToCoach && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-field/15 text-field-bright">
                Promoted to coach
              </span>
            )}
            {agg?.suppressed && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-live-red/15 text-live-red">
                Suppressed
              </span>
            )}
          </div>
          {meta.description && (
            <p className="text-sm text-text-muted mt-1">{meta.description}</p>
          )}
          <p className="text-[11px] font-mono text-text-muted mt-1">{type}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="px-3 py-2 text-sm font-medium bg-blaze text-white rounded-lg hover:bg-blaze-deep disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {refreshing ? 'Refreshing…' : 'Refresh aggregates'}
          </button>
          {lastComputed && (
            <p className="text-[11px] text-text-muted">
              Last computed {lastComputed.toLocaleString()}
            </p>
          )}
          {lastRefresh && (
            <p className="text-[11px] text-text-muted">
              Refreshed {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* SECTION 1: AGGREGATE SUMMARY ---------------------------------------- */}
      <section className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-5">
        <div className="flex flex-wrap items-start gap-6">
          {/* Coverage */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Coverage</p>
            <p className="font-mono text-2xl font-semibold text-text-primary leading-tight mt-1">
              {usersWithData}
              <span className="text-text-muted text-base"> / {totalUsers}</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">users with data</p>
          </div>

          {/* Avg confidence */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Avg confidence</p>
            <p className="font-mono text-2xl font-semibold text-text-primary leading-tight mt-1">
              {avgScoreDisplay}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">across active users</p>
          </div>

          {/* Mini histogram (4 colored bars) */}
          <div className="flex-1 min-w-[180px]">
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Confidence buckets</p>
            <MiniHistogram aggregate={agg} />
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col items-stretch gap-0.5">
              <button
                onClick={togglePromote}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  agg?.promoteToCoach
                    ? 'bg-field text-white hover:bg-field-bright'
                    : 'bg-[var(--card-bg)] text-text-secondary hover:text-text-primary'
                }`}
              >
                {agg?.promoteToCoach ? '✓ Promoted to Coach' : 'Promote to Coach'}
              </button>
              {toggleMsg.promote && (
                <span className="text-[10px] text-live-red text-center">{toggleMsg.promote}</span>
              )}
            </div>
            <div className="flex flex-col items-stretch gap-0.5">
              <button
                onClick={toggleSuppress}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  agg?.suppressed
                    ? 'bg-live-red text-white hover:bg-live-red/80'
                    : 'bg-[var(--card-bg)] text-text-secondary hover:text-text-primary'
                }`}
              >
                {agg?.suppressed ? '✓ Suppressed' : 'Suppress'}
              </button>
              {toggleMsg.suppress && (
                <span className="text-[10px] text-live-red text-center">{toggleMsg.suppress}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: DISTRIBUTION HISTOGRAM ----------------------------------- */}
      <section className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-text-primary">
              Confidence-score distribution
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              How the platform's users land on the confidence scale (0-100, 10 buckets)
            </p>
          </div>
        </div>
        <DistributionHistogram buckets={buckets} />
      </section>

      {/* SECTION 3: THRESHOLD SLIDERS ---------------------------------------- */}
      <section className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display font-semibold text-text-primary">
              Thresholds
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Tune what counts as HIGH or MED confidence for this characteristic.
              Re-aggregation applies new values nightly (or via Refresh).
            </p>
          </div>
          {hasOverride && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-crown/15 text-crown-bright">
                Custom thresholds active
              </span>
              <button
                onClick={restoreDefaults}
                className="text-xs text-blaze hover:text-blaze-deep transition-colors underline-offset-2 hover:underline"
              >
                Restore defaults
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ThresholdField
            label="HIGH min sample size (N)"
            help="Min observations to qualify for HIGH"
            value={thresholds.highMinN}
            onChange={(v) => setThresholds((t) => ({ ...t, highMinN: v }))}
            type="int"
            min={1}
            max={50}
          />
          <ThresholdField
            label="HIGH min consistency"
            help="Min consistency ratio (0-1) to qualify for HIGH"
            value={thresholds.highMinConsistency}
            onChange={(v) => setThresholds((t) => ({ ...t, highMinConsistency: v }))}
            type="float"
            min={0}
            max={1}
            step={0.01}
          />
          <ThresholdField
            label="MED min sample size (N)"
            help="Min observations to qualify for MED"
            value={thresholds.medMinN}
            onChange={(v) => setThresholds((t) => ({ ...t, medMinN: v }))}
            type="int"
            min={1}
            max={50}
          />
          <ThresholdField
            label="MED min consistency"
            help="Min consistency ratio (0-1) to qualify for MED"
            value={thresholds.medMinConsistency}
            onChange={(v) => setThresholds((t) => ({ ...t, medMinConsistency: v }))}
            type="float"
            min={0}
            max={1}
            step={0.01}
          />
        </div>

        {thresholdErrors.length > 0 && (
          <ul className="mt-3 space-y-0.5">
            {thresholdErrors.map((err, i) => (
              <li key={i} className="text-xs text-live-red">· {err}</li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveThresholds}
            disabled={thresholdsSaving || thresholdErrors.length > 0}
            className="px-4 py-2 text-sm font-medium bg-blaze text-white rounded-lg hover:bg-blaze-deep disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {thresholdsSaving ? 'Saving…' : 'Save thresholds'}
          </button>
          {thresholdsMsg && (
            <span className="text-xs text-text-muted">{thresholdsMsg}</span>
          )}
        </div>
      </section>

      {/* SECTION 4: TOP USERS TABLE ------------------------------------------ */}
      <section className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-text-primary">
              Top users by confidence
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Up to 25 users with the highest confidence score on this characteristic
            </p>
          </div>
        </div>

        {topUsers.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-muted bg-[var(--card-bg)] rounded-lg border border-dashed border-[var(--card-border)]">
            No users have data on this characteristic yet
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="px-5 py-2 font-medium">Manager</th>
                  <th className="px-3 py-2 font-medium">Confidence</th>
                  <th className="px-3 py-2 font-medium text-right">Score</th>
                  <th className="px-3 py-2 font-medium text-right">N</th>
                  <th className="px-3 py-2 font-medium text-right">Consistency</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((u) => (
                  <tr
                    key={u.userId}
                    onClick={() => navigate(`/admin/intelligence/users/${u.userId}`)}
                    className="border-t border-[var(--card-border)] hover:bg-[var(--card-bg)]/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blaze/20 text-blaze flex items-center justify-center font-mono text-xs shrink-0">
                          {(u.displayName || u.username || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-text-primary truncate">
                            {u.displayName || u.username || u.userId}
                          </p>
                          {u.username && (
                            <p className="text-[11px] text-text-muted truncate">@{u.username}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.confidenceLabel && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CONFIDENCE_BADGE[u.confidenceLabel] || 'bg-text-muted/20 text-text-muted'}`}>
                          {u.confidenceLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                      {u.confidenceScore != null ? Number(u.confidenceScore).toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-secondary">
                      {u.sampleSize ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-secondary">
                      {u.consistencyPct != null ? `${Math.round(u.consistencyPct * 100)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary truncate max-w-[200px]">
                      {formatValue(type, u.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 5: ADMIN NOTES ---------------------------------------------- */}
      <section className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-semibold text-text-primary">
              Admin notes
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Internal context — saved automatically when the field loses focus
            </p>
          </div>
          {notesSaving && (
            <span className="text-[11px] text-text-muted">Saving…</span>
          )}
          {!notesSaving && toggleMsg.notes && (
            <span className="text-[11px] text-live-red">{toggleMsg.notes}</span>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={4}
          placeholder="Add internal notes about this characteristic..."
          className="w-full px-3 py-2 text-sm bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-text-primary placeholder:text-text-muted focus:border-blaze focus:outline-none resize-y"
        />
      </section>
    </div>
  )
}

// 4-bar mini histogram for the summary card — mirrors the Library card style
// but with persistent labels for the detail view.
function MiniHistogram({ aggregate }) {
  if (!aggregate) {
    return (
      <div className="h-14 flex items-center justify-center text-[10px] uppercase tracking-wider text-text-muted bg-[var(--card-bg)] rounded-md border border-dashed border-[var(--card-border)]">
        Pending aggregation
      </div>
    )
  }

  const counts = {
    high:    aggregate.highConfidenceCount ?? 0,
    med:     aggregate.medConfidenceCount ?? 0,
    low:     aggregate.lowConfidenceCount ?? 0,
    no_data: aggregate.noDataCount ?? 0,
  }
  const styles = {
    high:    { color: 'bg-field-bright', label: 'HIGH' },
    med:     { color: 'bg-crown',        label: 'MED'  },
    low:     { color: 'bg-live-red',     label: 'LOW'  },
    no_data: { color: 'bg-text-muted/40', label: 'NONE' },
  }
  const max = Math.max(1, counts.high, counts.med, counts.low, counts.no_data)

  return (
    <div className="flex items-end gap-2 h-14">
      {['high', 'med', 'low', 'no_data'].map((k) => {
        const c = counts[k]
        const pct = Math.max(4, Math.round((c / max) * 100))
        return (
          <div key={k} className="flex-1 flex flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-mono text-text-muted leading-none">{c}</span>
            <div
              className={`w-full rounded-sm ${styles[k].color}`}
              style={{ height: `${pct}%` }}
              title={`${styles[k].label}: ${c}`}
            />
            <span className="text-[9px] uppercase tracking-wider text-text-muted leading-none">
              {styles[k].label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ThresholdField({ label, help, value, onChange, type, min, max, step }) {
  const handle = (e) => {
    const raw = e.target.value
    if (raw === '') {
      onChange('')
      return
    }
    const parsed = type === 'int' ? parseInt(raw, 10) : parseFloat(raw)
    if (Number.isFinite(parsed)) onChange(parsed)
  }
  return (
    <label className="block">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <input
        type="number"
        inputMode={type === 'int' ? 'numeric' : 'decimal'}
        step={step ?? (type === 'int' ? 1 : 'any')}
        min={min}
        max={max}
        value={value}
        onChange={handle}
        className="mt-1 w-full px-3 py-2 text-sm font-mono bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-text-primary focus:border-blaze focus:outline-none"
      />
      {help && <span className="text-[11px] text-text-muted mt-1 block">{help}</span>}
    </label>
  )
}
