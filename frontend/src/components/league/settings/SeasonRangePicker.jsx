import { useMemo } from 'react'

const SEGMENT_COLORS = [
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', dot: 'bg-purple-400' },
]

const SEGMENT_LABELS = ['Q1', 'Q2', 'Q3', 'Q4']

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function computeSegments(weeks, segmentCount) {
  if (!weeks || weeks.length === 0 || segmentCount <= 0) return []
  if (segmentCount === 1) {
    return [{ label: 'Full Season', weeks, color: SEGMENT_COLORS[0] }]
  }
  const segments = []
  const baseSize = Math.floor(weeks.length / segmentCount)
  const remainder = weeks.length % segmentCount
  let offset = 0
  for (let i = 0; i < segmentCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0)
    const segWeeks = weeks.slice(offset, offset + size)
    segments.push({
      label: SEGMENT_LABELS[i] || `S${i + 1}`,
      weeks: segWeeks,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    })
    offset += size
  }
  return segments
}

const SeasonRangePicker = ({ weeks, startWeekId, endWeekId, segments = 4, onChange }) => {
  // Build option label for a week
  const optionLabel = (week) => {
    const name = week.tournament?.shortName || week.tournament?.name || week.name
    const date = formatDate(week.tournament?.startDate)
    const parts = [name]
    if (date) parts.push(`\u2014 ${date}`)
    if (week.tournament?.isMajor) parts.push(' (Major)')
    if (week.tournament?.isPlayoff && week.tournament?.fieldSize) {
      parts.push(` (${week.tournament.fieldSize}-player field)`)
    } else if (week.tournament?.isPlayoff) {
      parts.push(' (Playoff)')
    }
    return parts.join('')
  }

  // Filter weeks between start and end
  const filteredWeeks = useMemo(() => {
    if (!weeks || weeks.length === 0) return []
    const startIdx = startWeekId ? weeks.findIndex(w => w.id === startWeekId) : 0
    const endIdx = endWeekId ? weeks.findIndex(w => w.id === endWeekId) : weeks.length - 1
    if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return weeks
    return weeks.slice(startIdx, endIdx + 1)
  }, [weeks, startWeekId, endWeekId])

  // Compute segment preview
  const segmentPreview = useMemo(() => {
    return computeSegments(filteredWeeks, segments)
  }, [filteredWeeks, segments])

  // Validation
  const startIdx = startWeekId ? weeks?.findIndex(w => w.id === startWeekId) ?? -1 : -1
  const endIdx = endWeekId ? weeks?.findIndex(w => w.id === endWeekId) ?? -1 : -1
  const isValid = !startWeekId || !endWeekId || startIdx <= endIdx
  const hasMinWeeks = filteredWeeks.length >= segments

  if (!weeks || weeks.length === 0) {
    return (
      <div className="text-sm text-text-muted py-4 text-center">
        No tournament schedule available yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Tournament */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Season Starts
          </label>
          <select
            value={startWeekId || ''}
            onChange={(e) => {
              const weekId = e.target.value || null
              const week = weeks.find(w => w.id === weekId)
              onChange?.({
                startFantasyWeekId: weekId,
                endFantasyWeekId: endWeekId,
                startWeekNumber: week?.weekNumber || null,
                endWeekNumber: endWeekId ? weeks.find(w => w.id === endWeekId)?.weekNumber : null,
              })
            }}
            className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none text-sm"
          >
            <option value="">First tournament of season</option>
            {weeks.map(w => (
              <option key={w.id} value={w.id}>
                {optionLabel(w)}
              </option>
            ))}
          </select>
        </div>

        {/* End Tournament */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Season Ends
          </label>
          <select
            value={endWeekId || ''}
            onChange={(e) => {
              const weekId = e.target.value || null
              const week = weeks.find(w => w.id === weekId)
              onChange?.({
                startFantasyWeekId: startWeekId,
                endFantasyWeekId: weekId,
                startWeekNumber: startWeekId ? weeks.find(w => w.id === startWeekId)?.weekNumber : null,
                endWeekNumber: week?.weekNumber || null,
              })
            }}
            className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none text-sm"
          >
            <option value="">Last tournament of season</option>
            {weeks.map(w => (
              <option key={w.id} value={w.id}>
                {optionLabel(w)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Validation messages */}
      {!isValid && (
        <p className="text-xs text-red-400">End tournament must come after start tournament.</p>
      )}
      {isValid && !hasMinWeeks && filteredWeeks.length > 0 && (
        <p className="text-xs text-amber-400">
          Need at least {segments} tournaments for {segments} segments (currently {filteredWeeks.length}).
        </p>
      )}

      {/* Summary */}
      {isValid && filteredWeeks.length > 0 && (
        <div className="text-sm text-text-secondary">
          {filteredWeeks.length} tournament{filteredWeeks.length !== 1 ? 's' : ''} in {segments} segment{segments !== 1 ? 's' : ''}
        </div>
      )}

      {/* Segment Preview */}
      {isValid && segmentPreview.length > 0 && hasMinWeeks && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Segment Preview</p>
          {segmentPreview.map((seg, i) => {
            const first = seg.weeks[0]
            const last = seg.weeks[seg.weeks.length - 1]
            const firstName = first?.tournament?.shortName || first?.tournament?.name || first?.name || ''
            const lastName = last?.tournament?.shortName || last?.tournament?.name || last?.name || ''
            const hasMajor = seg.weeks.some(w => w.tournament?.isMajor)

            return (
              <div
                key={i}
                className={`${seg.color.bg} ${seg.color.border} border rounded-lg px-3 py-2 flex items-center gap-2`}
              >
                <span className={`${seg.color.dot} w-2 h-2 rounded-full flex-shrink-0`}></span>
                <span className={`${seg.color.text} font-semibold font-mono text-xs w-8 flex-shrink-0`}>
                  {seg.label}
                </span>
                <span className="text-text-secondary text-xs flex-1 min-w-0 truncate">
                  ({seg.weeks.length} event{seg.weeks.length !== 1 ? 's' : ''}): {firstName} {'\u2192'} {lastName}
                </span>
                {hasMajor && (
                  <span className="text-amber-400 text-xs flex-shrink-0" title="Includes a major">
                    {'\u2B50'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Playoff warning */}
      {filteredWeeks.some(w => w.tournament?.isPlayoff) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-400">
            Your range includes FedEx Cup Playoff events which have smaller fields (70/50/30 players).
            Players who don't qualify may score 0 in those weeks.
          </p>
        </div>
      )}
    </div>
  )
}

export default SeasonRangePicker
