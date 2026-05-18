import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api'

// Category styling — pill badge color per characteristic category.
// Keeps everything on Clutch brand tokens (no raw hex).
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

const CATEGORY_ORDER = ['pick_quality', 'positional', 'auction', 'trade', 'waiver', 'drop', 'outcome']

const SORT_OPTIONS = [
  { value: 'coverage',     label: 'Coverage' },
  { value: 'confidence',   label: 'Avg confidence' },
  { value: 'alphabetical', label: 'Alphabetical' },
]

const STATUS_OPTIONS = [
  { value: 'all',       label: 'All' },
  { value: 'promoted',  label: 'Promoted to coach' },
  { value: 'suppressed', label: 'Suppressed' },
]

// Confidence-bucket palette for the mini histogram.
const BUCKET_STYLE = {
  high:    { color: 'bg-field-bright', label: 'High' },
  med:     { color: 'bg-crown',        label: 'Med' },
  low:     { color: 'bg-live-red',     label: 'Low' },
  no_data: { color: 'bg-text-muted/40', label: 'None' },
}

function MiniHistogram({ row }) {
  if (row.aggregatePending) {
    return (
      <div className="h-14 flex items-center justify-center text-[10px] uppercase tracking-wider text-text-muted bg-[var(--card-bg)] rounded-md border border-dashed border-[var(--card-border)]">
        Pending aggregation
      </div>
    )
  }

  const counts = {
    high:    row.highConfidenceCount ?? 0,
    med:     row.medConfidenceCount ?? 0,
    low:     row.lowConfidenceCount ?? 0,
    no_data: row.noDataCount ?? 0,
  }
  const max = Math.max(1, counts.high, counts.med, counts.low, counts.no_data)

  return (
    <div className="flex items-end gap-1.5 h-14" aria-label="confidence distribution">
      {['high', 'med', 'low', 'no_data'].map((k) => {
        const c = counts[k]
        const pct = Math.max(4, Math.round((c / max) * 100))
        return (
          <div key={k} className="flex-1 flex flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-mono text-text-muted leading-none">{c}</span>
            <div
              className={`w-full rounded-sm ${BUCKET_STYLE[k].color}`}
              style={{ height: `${pct}%` }}
              title={`${BUCKET_STYLE[k].label}: ${c}`}
            />
          </div>
        )
      })}
    </div>
  )
}

function CharacteristicCard({ row, onOpen }) {
  const cat = CATEGORY_META[row.category] || CATEGORY_META.unknown
  const coverage = row.aggregatePending
    ? '—'
    : `${row.usersWithData ?? 0} of ${row.totalUsers ?? 0} users`

  const avgScore = row.avgConfidenceScore
  const avgScoreDisplay = (avgScore == null || row.aggregatePending)
    ? '—'
    : Number(avgScore).toFixed(1)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left w-full rounded-xl bg-[var(--surface)] border border-[var(--card-border)] shadow-sm p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-blaze/40 focus:outline-none focus:ring-2 focus:ring-blaze/40"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-display font-semibold text-text-primary leading-tight">
          {row.displayName}
        </h3>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${cat.cls}`}>
          {cat.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-text-muted leading-snug mb-4 min-h-[2.5rem]">
        {row.description || '—'}
      </p>

      {/* Histogram */}
      <MiniHistogram row={row} />

      {/* Coverage + Avg score */}
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Coverage</p>
          <p className="font-mono text-sm text-text-primary leading-tight">{coverage}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Avg confidence</p>
          <p className="font-mono text-lg font-semibold text-text-primary leading-tight">{avgScoreDisplay}</p>
        </div>
      </div>

      {/* Status badges */}
      {(row.promoteToCoach || row.suppressed) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {row.promoteToCoach && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-field/15 text-field-bright">
              Promoted to coach
            </span>
          )}
          {row.suppressed && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-live-red/15 text-live-red">
              Suppressed
            </span>
          )}
        </div>
      )}
    </button>
  )
}

export default function IntelligenceLibrary() {
  const navigate = useNavigate()
  const [characteristics, setCharacteristics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  const [sortBy, setSortBy] = useState('coverage')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await api.getIntelligenceLibrary()
      setCharacteristics(data.characteristics || [])
    } catch (e) {
      console.error('Failed to load intelligence library:', e.message)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
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

  const filtered = useMemo(() => {
    let rows = [...characteristics]

    if (categoryFilter !== 'all') {
      rows = rows.filter((r) => r.category === categoryFilter)
    }
    if (statusFilter === 'promoted') {
      rows = rows.filter((r) => r.promoteToCoach)
    } else if (statusFilter === 'suppressed') {
      rows = rows.filter((r) => r.suppressed)
    }

    rows.sort((a, b) => {
      // Pending rows always sort last
      if (a.aggregatePending && !b.aggregatePending) return 1
      if (!a.aggregatePending && b.aggregatePending) return -1

      if (sortBy === 'alphabetical') {
        return (a.displayName || '').localeCompare(b.displayName || '')
      }
      if (sortBy === 'confidence') {
        return (b.avgConfidenceScore ?? -1) - (a.avgConfidenceScore ?? -1)
      }
      // coverage — fraction of users with data
      const aCov = a.totalUsers ? (a.usersWithData ?? 0) / a.totalUsers : -1
      const bCov = b.totalUsers ? (b.usersWithData ?? 0) / b.totalUsers : -1
      return bCov - aCov
    })

    return rows
  }, [characteristics, sortBy, statusFilter, categoryFilter])

  const openDetail = (type) => {
    navigate(`/admin/intelligence/characteristics/${type}`)
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-12 text-center">
        <p className="text-text-secondary">Loading intelligence library…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-[var(--surface)] border border-live-red/30 p-6">
        <p className="text-live-red font-medium">Failed to load library</p>
        <p className="text-text-muted text-sm mt-1">{error}</p>
        <button
          onClick={load}
          className="mt-3 px-3 py-1.5 text-xs font-medium bg-blaze text-white rounded-md hover:bg-blaze-deep transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold font-display text-text-primary">
            Manager Intelligence Library
          </h2>
          <p className="text-text-muted text-xs mt-0.5">
            {characteristics.length} characteristics tracked across the platform
            {lastRefresh && (
              <span className="ml-2">· refreshed {lastRefresh.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="px-3 py-2 text-sm font-medium bg-blaze text-white rounded-lg hover:bg-blaze-deep disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {refreshing ? 'Refreshing…' : 'Refresh aggregates'}
        </button>
      </div>

      {/* Filter strip */}
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs uppercase tracking-wider text-text-muted">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-text-primary focus:border-blaze focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="h-5 w-px bg-[var(--card-border)] mx-1" />

          <span className="text-xs uppercase tracking-wider text-text-muted">Status</span>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setStatusFilter(o.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === o.value
                    ? 'bg-blaze text-white'
                    : 'bg-[var(--card-bg)] text-text-secondary hover:text-text-primary'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-text-muted mr-1">Category</span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              categoryFilter === 'all'
                ? 'bg-blaze text-white'
                : 'bg-[var(--card-bg)] text-text-secondary hover:text-text-primary'
            }`}
          >
            All
          </button>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                categoryFilter === cat
                  ? 'bg-blaze text-white'
                  : 'bg-[var(--card-bg)] text-text-secondary hover:text-text-primary'
              }`}
            >
              {CATEGORY_META[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--card-border)] p-12 text-center">
          <p className="text-text-secondary">No characteristics match these filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((row) => (
            <CharacteristicCard
              key={row.type}
              row={row}
              onOpen={() => openDetail(row.type)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
