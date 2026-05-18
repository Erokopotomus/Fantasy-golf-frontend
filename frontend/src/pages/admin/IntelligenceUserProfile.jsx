import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { formatValue } from '../../components/admin/intelligence/valueFormatters'

// Same palette as Library + Detail so the drill-down feels continuous.
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

// Order categories render in (only emit a section if the user has rows in it).
const CATEGORY_ORDER = ['pick_quality', 'positional', 'auction', 'trade', 'waiver', 'drop', 'outcome']

const CONFIDENCE_BADGE = {
  HIGH:    'bg-field/15 text-field-bright',
  MED:     'bg-crown/15 text-crown-bright',
  LOW:     'bg-live-red/15 text-live-red',
  NO_DATA: 'bg-text-muted/20 text-text-muted',
}

// Pill style for source-platform badges in the import summary strip.
const PLATFORM_PILL = 'px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[var(--card-bg)] text-text-secondary border border-[var(--card-border)]'

export default function IntelligenceUserProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Recompute UX state
  const [recomputing, setRecomputing] = useState(false)
  const [recomputeResult, setRecomputeResult] = useState(null)
  const recomputeTimerRef = useRef(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const resp = await api.getIntelligenceUserProfile(userId)
      setData(resp)
    } catch (e) {
      console.error('Failed to load user profile:', e.message)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // Clear any lingering recompute banner + pending timer from a previous userId
    setRecomputeResult(null)
    if (recomputeTimerRef.current) {
      clearTimeout(recomputeTimerRef.current)
      recomputeTimerRef.current = null
    }
    setLoading(true)
    load()
    return () => {
      if (recomputeTimerRef.current) {
        clearTimeout(recomputeTimerRef.current)
        recomputeTimerRef.current = null
      }
    }
  }, [userId, load])

  const handleRecompute = async () => {
    if (recomputing) return
    // Clear any pending banner-clear timer from a previous recompute
    if (recomputeTimerRef.current) {
      clearTimeout(recomputeTimerRef.current)
      recomputeTimerRef.current = null
    }
    setRecomputing(true)
    setRecomputeResult(null)
    try {
      const resp = await api.recomputeIntelligenceUser(userId)
      setRecomputeResult({
        ok: resp.ok ?? 0,
        failed: resp.failed ?? 0,
        skipped: resp.skipped ?? 0,
      })
      // Refetch profile so updated computedAt timestamps surface
      await load()
      // Clear the result banner after ~3s
      recomputeTimerRef.current = setTimeout(() => setRecomputeResult(null), 3000)
    } catch (e) {
      console.error('Recompute failed:', e.message)
      setRecomputeResult({ error: e.message })
      recomputeTimerRef.current = setTimeout(() => setRecomputeResult(null), 5000)
    } finally {
      setRecomputing(false)
    }
  }

  // Group characteristics by meta.category — render in CATEGORY_ORDER, skip empty
  const grouped = useMemo(() => {
    const out = {}
    if (!data?.characteristics) return out
    for (const c of data.characteristics) {
      const cat = c.meta?.category || 'unknown'
      if (!out[cat]) out[cat] = []
      out[cat].push(c)
    }
    return out
  }, [data])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-12 text-center">
          <p className="text-text-secondary">Loading user profile…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-xl bg-[var(--surface)] border border-live-red/30 p-6">
          <p className="text-live-red font-medium">Failed to load user profile</p>
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

  const user = data?.user || {}
  const importSummary = data?.importSummary || { importCount: 0, seasonsClaimed: 0, platforms: [] }
  const characteristics = data?.characteristics || []
  const initial = (user.displayName || user.username || user.email || '?').slice(0, 1).toUpperCase()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* HEADER STRIP -------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate('/admin')}
            className="text-xs text-text-muted hover:text-text-primary transition-colors mb-2 inline-flex items-center gap-1"
          >
            <span>←</span>
            <span>Back to Intelligence Library</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blaze/20 text-blaze flex items-center justify-center font-mono text-lg shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-display font-bold text-text-primary leading-tight truncate">
                {user.displayName || user.username || user.id}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted mt-0.5">
                {user.username && <span className="font-mono">@{user.username}</span>}
                {user.username && user.email && <span className="text-text-muted/40">·</span>}
                {user.email && <span className="truncate">{user.email}</span>}
              </div>
              <p className="text-[11px] font-mono text-text-muted/70 mt-0.5">{user.id}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="px-3 py-2 text-sm font-medium bg-blaze text-white rounded-lg hover:bg-blaze-deep disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {recomputing && (
              <span
                aria-hidden="true"
                className="inline-block w-3 h-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin"
              />
            )}
            {recomputing ? 'Recomputing…' : 'Recompute now'}
          </button>
          {recomputeResult && !recomputeResult.error && (
            <div className="text-[11px] text-text-secondary bg-field/10 border border-field/30 rounded-md px-2 py-1 font-mono">
              Re-extracted: {recomputeResult.ok} OK · {recomputeResult.failed} failed · {recomputeResult.skipped} skipped
            </div>
          )}
          {recomputeResult?.error && (
            <div className="text-[11px] text-live-red bg-live-red/10 border border-live-red/30 rounded-md px-2 py-1">
              {recomputeResult.error}
            </div>
          )}
        </div>
      </div>

      {/* IMPORT SUMMARY STRIP ------------------------------------------------- */}
      <section className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-5">
        <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
          <div>
            <p className="font-mono text-2xl font-semibold text-text-primary leading-tight">
              {importSummary.importCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
              League imports
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-text-primary leading-tight">
              {importSummary.seasonsClaimed}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
              Seasons claimed
            </p>
          </div>
          <div className="min-w-[180px]">
            <p className="font-mono text-2xl font-semibold text-text-primary leading-tight">
              {importSummary.platforms.length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1 mb-2">
              Platforms
            </p>
            {importSummary.platforms.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {importSummary.platforms.map((p) => (
                  <span key={p} className={PLATFORM_PILL}>{p}</span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-text-muted italic">No imports yet</p>
            )}
          </div>
          <div className="ml-auto">
            <p className="font-mono text-2xl font-semibold text-text-primary leading-tight">
              {characteristics.length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
              Characteristics
            </p>
          </div>
        </div>
      </section>

      {/* CHARACTERISTICS — GROUPED BY CATEGORY ------------------------------- */}
      {characteristics.length === 0 ? (
        <section className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-10 text-center">
          <p className="text-text-secondary">No characteristics extracted yet for this user.</p>
          <p className="text-xs text-text-muted mt-2">
            Import a league or click "Recompute now" once imports complete.
          </p>
        </section>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          const rows = grouped[cat]
          if (!rows || rows.length === 0) return null
          const meta = CATEGORY_META[cat] || CATEGORY_META.unknown
          return (
            <section
              key={cat}
              className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-display font-semibold text-text-primary text-lg">
                  {meta.label}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.cls}`}>
                  {rows.length}
                </span>
              </div>
              <div className="space-y-2">
                {rows.map((c) => (
                  <CharacteristicRow key={c.type} c={c} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// CharacteristicRow — one row per ManagerCharacteristic. Click name → MI-16.
// -----------------------------------------------------------------------------
function CharacteristicRow({ c }) {
  const [expanded, setExpanded] = useState(false)
  const confidenceCls = CONFIDENCE_BADGE[c.confidenceLabel] || CONFIDENCE_BADGE.NO_DATA
  const consistency = c.consistencyPct != null ? `${Math.round(c.consistencyPct * 100)}%` : '—'
  const effect = c.effectSize != null ? Number(c.effectSize).toFixed(1) : '—'
  const score = c.confidenceScore != null ? Number(c.confidenceScore).toFixed(1) : '—'
  const valueDisplay = formatValue(c.type, c.value)

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]/40">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {/* Left: name + confidence pill */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/admin/intelligence/characteristics/${encodeURIComponent(c.type)}`}
              className="font-display font-semibold text-text-primary hover:text-blaze transition-colors truncate"
            >
              {c.meta?.displayName || c.type}
            </Link>
            {c.confidenceLabel && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${confidenceCls}`}>
                {c.confidenceLabel}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-text-muted truncate">{c.type}</p>
        </div>

        {/* Center: formatted value */}
        <div className="hidden sm:block min-w-0 max-w-[220px] truncate text-sm text-text-secondary">
          {valueDisplay}
        </div>

        {/* Right: numeric strip */}
        <div className="flex items-center gap-3 text-right shrink-0">
          <Stat label="N" value={c.sampleSize ?? '—'} />
          <Stat label="cons" value={consistency} />
          <Stat label="effect" value={effect} />
          <Stat label="score" value={score} />
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-blaze hover:text-blaze-deep transition-colors shrink-0 underline-offset-2 hover:underline"
        >
          {expanded ? 'Hide evidence' : 'Show evidence'}
        </button>
      </div>

      {/* Sub-row: mobile-only value display (since center column is hidden < sm) */}
      <div className="sm:hidden px-4 -mt-1 pb-2 text-sm text-text-secondary truncate">
        {valueDisplay}
      </div>

      {expanded && (
        <div className="border-t border-[var(--card-border)] px-4 py-3 bg-[var(--surface)]">
          <RawEvidence evidence={c.rawEvidence} />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-muted">
            {c.computedAt && (
              <span>Computed {new Date(c.computedAt).toLocaleString()}</span>
            )}
            {c.sourceImportIds?.length > 0 && (
              <span className="font-mono">
                Sources: {c.sourceImportIds.length} import{c.sourceImportIds.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-sm text-text-primary leading-none">{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-text-muted leading-none mt-1">
        {label}
      </span>
    </div>
  )
}

// -----------------------------------------------------------------------------
// RawEvidence — best-effort renderer for arbitrary JSON shapes. Common shapes
// (perSeason / sample / picks arrays) get a small table; everything else falls
// back to JSON.stringify in a <pre>. Never crashes — wraps each key in a try.
// -----------------------------------------------------------------------------
function RawEvidence({ evidence }) {
  if (evidence == null) {
    return (
      <p className="text-xs text-text-muted italic">No raw evidence captured.</p>
    )
  }
  if (typeof evidence !== 'object' || Array.isArray(evidence)) {
    // Top-level is a scalar or an array — render as a single block
    return <EvidenceBlock keyName="evidence" value={evidence} />
  }

  const keys = Object.keys(evidence)
  if (keys.length === 0) {
    return <p className="text-xs text-text-muted italic">Empty evidence object.</p>
  }

  return (
    <div className="space-y-3">
      {keys.map((k) => (
        <EvidenceBlock key={k} keyName={k} value={evidence[k]} />
      ))}
    </div>
  )
}

function EvidenceBlock({ keyName, value }) {
  // Scalars
  if (value === null || value === undefined) {
    return <ScalarRow keyName={keyName} value="null" />
  }
  if (typeof value !== 'object') {
    return <ScalarRow keyName={keyName} value={String(value)} />
  }

  // Arrays
  if (Array.isArray(value)) {
    const count = value.length
    if (count === 0) {
      return <ScalarRow keyName={keyName} value="[] (empty)" />
    }
    const first = value[0]
    // Array of plain objects with shared shape → render as a small table
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return <ArrayTable keyName={keyName} items={value} />
    }
    // Array of scalars
    return (
      <div>
        <p className="text-[11px] uppercase tracking-wider text-text-muted">
          {keyName} <span className="font-mono text-text-secondary normal-case">({count})</span>
        </p>
        <p className="font-mono text-xs text-text-secondary mt-1 break-words">
          {value.slice(0, 20).map((v) => String(v)).join(', ')}
          {count > 20 && `, … (+${count - 20} more)`}
        </p>
      </div>
    )
  }

  // Plain object → pretty-print
  let text
  try {
    text = JSON.stringify(value, null, 2)
  } catch {
    text = '[unserializable]'
  }
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-text-muted mb-1">{keyName}</p>
      <pre className="font-mono text-[11px] text-text-secondary bg-[var(--card-bg)] border border-[var(--card-border)] rounded-md p-2 overflow-x-auto whitespace-pre">
        {text}
      </pre>
    </div>
  )
}

function ScalarRow({ keyName, value }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="uppercase tracking-wider text-text-muted text-[11px]">{keyName}</span>
      <span className="font-mono text-text-primary break-all">{value}</span>
    </div>
  )
}

// Array-of-objects → small column table. Columns = union of first 5 items' keys.
function ArrayTable({ keyName, items }) {
  const sample = items.slice(0, 5)
  // Build column list from union of keys across the sample. Keep insertion order
  // from the first item so common shapes (e.g., perSeason rows) feel stable.
  // Computed inline — the prior useMemo([sample]) invalidated every render
  // because `sample` was a fresh slice, so it provided zero benefit.
  const cols = (() => {
    const seen = new Set()
    const ordered = []
    for (const it of sample) {
      if (!it || typeof it !== 'object') continue
      for (const k of Object.keys(it)) {
        if (!seen.has(k)) {
          seen.add(k)
          ordered.push(k)
        }
      }
    }
    return ordered
  })()

  if (cols.length === 0) {
    // Fallback — items aren't all plain objects, dump JSON
    return (
      <div>
        <p className="text-[11px] uppercase tracking-wider text-text-muted mb-1">
          {keyName} <span className="normal-case font-mono text-text-secondary">({items.length})</span>
        </p>
        <pre className="font-mono text-[11px] text-text-secondary bg-[var(--card-bg)] border border-[var(--card-border)] rounded-md p-2 overflow-x-auto whitespace-pre">
          {safeStringify(sample)}
        </pre>
      </div>
    )
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-text-muted mb-1">
        {keyName} <span className="normal-case font-mono text-text-secondary">({items.length})</span>
      </p>
      <div className="overflow-x-auto border border-[var(--card-border)] rounded-md">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="bg-[var(--card-bg)]">
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-2 py-1 text-left text-text-muted font-normal whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sample.map((row, i) => (
              <tr key={i} className="border-t border-[var(--card-border)]">
                {cols.map((c) => (
                  <td
                    key={c}
                    className="px-2 py-1 text-text-secondary whitespace-nowrap max-w-[200px] truncate"
                    title={renderCell(row?.[c])}
                  >
                    {renderCell(row?.[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > 5 && (
        <p className="text-[10px] text-text-muted mt-1 italic">
          Showing first 5 of {items.length}
        </p>
      )}
    </div>
  )
}

function renderCell(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return '[obj]'
    }
  }
  if (typeof v === 'number') {
    // Trim long decimals for readability
    return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, '')
  }
  return String(v)
}

function safeStringify(v) {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return '[unserializable]'
  }
}
