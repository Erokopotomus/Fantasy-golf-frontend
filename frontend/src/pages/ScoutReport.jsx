import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import Card from '../components/common/Card'

const ScoutReport = () => {
  const { sport, eventId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedSections, setExpandedSections] = useState(new Set())

  useEffect(() => {
    if (!sport || !eventId) return
    setLoading(true)
    api.getScoutReport(sport, eventId)
      .then(res => {
        if (res.report) {
          setReport(res.report)
          const sections = res.report.sections || []
          setExpandedSections(new Set(sections.map((_, i) => i)))
        } else {
          setError('No scout report available yet')
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [sport, eventId])

  const toggleSection = (index) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-2/3" />
          <div className="h-4 bg-white/5 rounded w-1/3" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-white/50 mb-4">{error || 'No scout report available'}</p>
        <Link to={sport === 'golf' ? '/golf' : '/nfl'} className="text-gold text-sm">
          &larr; Back to {sport === 'golf' ? 'PGA Hub' : 'NFL Hub'}
        </Link>
      </div>
    )
  }

  const sections = report.sections || []
  const annotations = report.personalAnnotations || []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-white">{report.title || 'Scout Report'}</h1>
            <p className="text-xs text-white/30">
              Powered by Clutch Scout
              {report.generatedAt && ` · ${new Date(report.generatedAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Annotations */}
      {annotations.length > 0 && (
        <Card className="mb-4 bg-gold/5 border-gold/20">
          <h4 className="text-xs font-semibold text-gold/70 uppercase tracking-wider mb-2">Your Board Connections</h4>
          <div className="flex flex-wrap gap-2">
            {annotations.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.06] rounded-lg text-xs text-white/60">
                <span className="font-semibold text-white/80">{a.playerName}</span>
                <span className="text-white/30">#{a.boardRank}</span>
                {a.tags?.map(t => (
                  <span key={t} className={`text-[10px] px-1 rounded ${
                    t === 'Target' ? 'bg-emerald-500/20 text-emerald-400' :
                    t === 'Sleeper' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{t}</span>
                ))}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Report Sections */}
      <div className="space-y-4">
        {sections.map((section, i) => (
          <Card key={i} className="overflow-hidden">
            <button
              onClick={() => toggleSection(i)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-base font-semibold font-display text-white">{section.title}</h3>
              <svg
                className={`w-5 h-5 text-white/30 transition-transform ${expandedSections.has(i) ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.has(i) && (
              <div className="mt-3 text-sm text-white/60 leading-relaxed whitespace-pre-line">
                {section.body}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link to={sport === 'golf' ? '/golf' : '/nfl'} className="text-gold text-sm hover:text-gold/80">
          &larr; Back to {sport === 'golf' ? 'PGA Hub' : 'NFL Hub'}
        </Link>
      </div>
    </div>
  )
}

export default ScoutReport
