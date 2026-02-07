import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useDraftHistory } from '../hooks/useDraftHistory'

const gradeColors = {
  'A+': 'text-green-400', A: 'text-green-400', 'A-': 'text-green-400',
  'B+': 'text-blue-400', B: 'text-blue-400', 'B-': 'text-blue-400',
  'C+': 'text-yellow-400', C: 'text-yellow-400', 'C-': 'text-yellow-400',
  'D+': 'text-orange-400', D: 'text-orange-400', 'D-': 'text-orange-400',
  F: 'text-red-400',
}

const gradeBgColors = {
  'A+': 'bg-green-500/20', A: 'bg-green-500/20', 'A-': 'bg-green-500/20',
  'B+': 'bg-blue-500/20', B: 'bg-blue-500/20', 'B-': 'bg-blue-500/20',
  'C+': 'bg-yellow-500/20', C: 'bg-yellow-500/20', 'C-': 'bg-yellow-500/20',
  'D+': 'bg-orange-500/20', D: 'bg-orange-500/20', 'D-': 'bg-orange-500/20',
  F: 'bg-red-500/20',
}

const DraftHistory = () => {
  const [tab, setTab] = useState('league')
  const { leagueDrafts, mockDrafts, mockDraftTotal, loading, deleteMockDraft } = useDraftHistory()
  const [deleting, setDeleting] = useState(null)

  const handleDelete = async (id) => {
    if (!confirm('Delete this mock draft result?')) return
    setDeleting(id)
    try {
      await deleteMockDraft(id)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">Draft History</h1>
              <p className="text-text-secondary mt-1">Review past drafts and grades</p>
            </div>
            <Link to="/draft">
              <Button variant="outline" className="text-sm">Back to Drafts</Button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-dark-secondary rounded-lg p-1 mb-6">
            <button
              onClick={() => setTab('league')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                tab === 'league' ? 'bg-gold text-dark-primary' : 'text-text-secondary hover:text-white'
              }`}
            >
              League Drafts ({leagueDrafts.length})
            </button>
            <button
              onClick={() => setTab('mock')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                tab === 'mock' ? 'bg-gold text-dark-primary' : 'text-text-secondary hover:text-white'
              }`}
            >
              Mock Drafts ({mockDraftTotal})
            </button>
          </div>

          {/* League Drafts Tab */}
          {tab === 'league' && (
            <div className="space-y-4">
              {leagueDrafts.length === 0 ? (
                <Card className="text-center py-12">
                  <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No Completed Drafts</h3>
                  <p className="text-text-secondary mb-4">Your league draft results will appear here after completion.</p>
                  <Link to="/draft"><Button>Go to Draft Center</Button></Link>
                </Card>
              ) : (
                leagueDrafts.map(draft => (
                  <Link key={draft.id} to={`/draft/history/${draft.id}`} className="block">
                    <Card className="hover:border-dark-border/80 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Grade badge */}
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${gradeBgColors[draft.overallGrade] || 'bg-dark-tertiary'}`}>
                          <span className={`text-2xl font-bold ${gradeColors[draft.overallGrade] || 'text-text-muted'}`}>
                            {draft.overallGrade || '—'}
                          </span>
                        </div>
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate">{draft.leagueName}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted mt-1">
                            <span className="px-2 py-0.5 bg-dark-tertiary rounded text-xs">{draft.draftType} Draft</span>
                            <span>{draft.teamCount} teams</span>
                            <span>{draft.totalRounds} rounds</span>
                            {draft.endTime && (
                              <span>{new Date(draft.endTime).toLocaleDateString()}</span>
                            )}
                          </div>
                          {draft.bestPick && (
                            <p className="text-text-secondary text-xs mt-1">
                              Best pick: {draft.bestPick.playerName} ({draft.bestPick.grade})
                            </p>
                          )}
                        </div>
                        {/* Arrow */}
                        <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Mock Drafts Tab */}
          {tab === 'mock' && (
            <div className="space-y-4">
              {mockDrafts.length === 0 ? (
                <Card className="text-center py-12">
                  <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No Mock Drafts Yet</h3>
                  <p className="text-text-secondary mb-4">Complete a mock draft to see your grades here.</p>
                  <Link to="/mock-draft"><Button>Start Mock Draft</Button></Link>
                </Card>
              ) : (
                mockDrafts.map(draft => (
                  <div key={draft.id} className="group">
                    <Card className="hover:border-dark-border/80 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Grade badge */}
                        <Link to={`/draft/history/mock/${draft.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${gradeBgColors[draft.overallGrade] || 'bg-dark-tertiary'}`}>
                            <span className={`text-2xl font-bold ${gradeColors[draft.overallGrade] || 'text-text-muted'}`}>
                              {draft.overallGrade || '—'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-white font-semibold">Mock Draft</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted mt-1">
                              <span className="px-2 py-0.5 bg-dark-tertiary rounded text-xs capitalize">{draft.draftType}</span>
                              <span>{draft.teamCount} teams</span>
                              <span>{draft.rosterSize} rounds</span>
                              <span>{new Date(draft.completedAt).toLocaleDateString()}</span>
                            </div>
                            {draft.bestPick && (
                              <p className="text-text-secondary text-xs mt-1">
                                Best: {draft.bestPick.playerName} ({draft.bestPick.grade})
                              </p>
                            )}
                          </div>
                          <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(draft.id)}
                          disabled={deleting === draft.id}
                          className="p-2 text-text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </Card>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default DraftHistory
