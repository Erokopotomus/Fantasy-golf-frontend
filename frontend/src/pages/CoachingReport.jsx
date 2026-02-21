import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import Card from '../components/common/Card'

const REPORT_LABELS = {
  'pre_draft': 'Pre-Draft Coaching Report',
  'mid_season': 'Mid-Season Coaching Report',
  'post_season': 'Season Retrospective',
}

const CoachingReport = () => {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedSections, setExpandedSections] = useState(new Set())

  useEffect(() => {
    if (!reportId) return
    setLoading(true)
    api.getAiReport(reportId)
      .then(res => {
        setReport(res.report)
        // Expand all sections by default
        const content = res.report?.contentJson
        if (content?.sections) {
          setExpandedSections(new Set(content.sections.map((_, i) => i)))
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [reportId])

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
          <div className="h-8 bg-dark-tertiary/5 rounded w-2/3" />
          <div className="h-4 bg-dark-tertiary/5 rounded w-1/3" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-dark-tertiary/5 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-text-primary/50">{error || 'Report not found'}</p>
        <Link to="/lab" className="text-gold text-sm mt-4 inline-block">Back to The Lab</Link>
      </div>
    )
  }

  const content = report.contentJson || {}
  const sections = content.sections || []
  const reportLabel = REPORT_LABELS[content.reportType] || content.title || 'Coaching Report'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-text-primary">{reportLabel}</h1>
            <p className="text-xs text-text-primary/30">
              Powered by Clutch Coach
              {report.generatedAt && ` · ${new Date(report.generatedAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        {/* Data confidence indicator */}
        {content.dataConfidence && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-dark-tertiary/[0.04] rounded-lg">
            <div className={`w-2 h-2 rounded-full ${
              content.dataConfidence === 'HIGH' ? 'bg-emerald-400' :
              content.dataConfidence === 'MEDIUM' ? 'bg-yellow-400' : 'bg-orange-400'
            }`} />
            <span className="text-xs text-text-primary/40">
              {content.dataConfidence === 'HIGH' ? 'High confidence — multiple seasons of data' :
               content.dataConfidence === 'MEDIUM' ? 'Medium confidence — building your profile' :
               'Low confidence — more data needed for stronger insights'}
            </span>
          </div>
        )}

        {content.caveat && (
          <p className="text-xs text-text-primary/25 mt-2 italic">{content.caveat}</p>
        )}
      </div>

      {/* Report Sections */}
      <div className="space-y-4">
        {sections.map((section, i) => (
          <Card key={i} className="overflow-hidden">
            <button
              onClick={() => toggleSection(i)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-base font-semibold font-display text-text-primary">{section.title}</h3>
              <svg
                className={`w-5 h-5 text-text-primary/30 transition-transform ${expandedSections.has(i) ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.has(i) && (
              <div className="mt-3 text-sm text-text-primary/60 leading-relaxed whitespace-pre-line">
                {section.body}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Shareable Card */}
      {content.shareableCard && (
        <Card className="mt-6 bg-gradient-to-r from-purple-500/10 to-gold/10 border-purple-400/20">
          <h4 className="text-sm font-semibold text-text-primary/70 mb-2">Season Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            {content.shareableCard.accuracy && (
              <div>
                <p className="text-lg font-bold text-gold">{content.shareableCard.accuracy}</p>
                <p className="text-[10px] text-text-primary/30">Accuracy</p>
              </div>
            )}
            {content.shareableCard.bestCall && (
              <div>
                <p className="text-sm font-bold text-emerald-400">{content.shareableCard.bestCall}</p>
                <p className="text-[10px] text-text-primary/30">Best Call</p>
              </div>
            )}
            {content.shareableCard.topStrength && (
              <div>
                <p className="text-sm font-bold text-purple-400">{content.shareableCard.topStrength}</p>
                <p className="text-[10px] text-text-primary/30">Strength</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link to="/lab" className="text-gold text-sm hover:text-gold/80">&larr; Back to The Lab</Link>
      </div>
    </div>
  )
}

export default CoachingReport
