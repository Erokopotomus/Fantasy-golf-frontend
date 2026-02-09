import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeague } from '../hooks/useLeague'
import useDraftDollars from '../hooks/useDraftDollars'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

const DraftDollars = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { league } = useLeague(leagueId)
  const {
    balances, ledger, ledgerTotal, settings, enabled, loading,
    recordTransaction, refetchLedger,
  } = useDraftDollars(leagueId)

  const isCommissioner = league?.ownerId === user?.id || league?.owner?.id === user?.id

  // Ledger filter
  const [filterTeamId, setFilterTeamId] = useState('')

  // Record transaction form
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    fromTeamId: '',
    toTeamId: '',
    amount: '',
    yearType: 'current',
    category: 'side_bet',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const handleFilterChange = (teamId) => {
    setFilterTeamId(teamId)
    refetchLedger(teamId ? { teamId } : {})
  }

  const handleSubmitTransaction = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!formData.fromTeamId && !formData.toTeamId) {
      setFormError('Select at least one team')
      return
    }
    if (!formData.amount || parseInt(formData.amount) <= 0) {
      setFormError('Amount must be positive')
      return
    }
    setSubmitting(true)
    try {
      await recordTransaction({
        fromTeamId: formData.fromTeamId || undefined,
        toTeamId: formData.toTeamId || undefined,
        amount: parseInt(formData.amount),
        yearType: formData.yearType,
        category: formData.category,
        description: formData.description || undefined,
      })
      setFormData({ fromTeamId: '', toTeamId: '', amount: '', yearType: 'current', category: 'side_bet', description: '' })
      setShowForm(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="max-w-2xl mx-auto pt-8 px-4">
        <Card className="text-center py-12">
          <h2 className="text-xl font-bold font-display text-white mb-2">Draft Dollar Trading Not Enabled</h2>
          <p className="text-text-secondary mb-4">The commissioner can enable this feature in League Settings.</p>
          <Link to={`/leagues/${leagueId}`} className="text-gold hover:underline">Back to League</Link>
        </Card>
      </div>
    )
  }

  const minBudget = settings.minBudget
  const maxBudget = settings.maxBudget

  return (
    <div className="max-w-5xl mx-auto pt-8 px-4 pb-12">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/leagues/${leagueId}`}
          className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to League
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-display text-white">Draft Dollars</h1>
          {isCommissioner && (
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Record Transaction'}
            </Button>
          )}
        </div>
      </div>

      {/* Commissioner Form */}
      {showForm && isCommissioner && (
        <Card className="mb-6 border-gold/30">
          <h3 className="text-sm font-display font-bold text-white mb-4">Record Transaction</h3>
          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">From Team</label>
                <select
                  value={formData.fromTeamId}
                  onChange={(e) => setFormData(p => ({ ...p, fromTeamId: e.target.value }))}
                  className="w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                >
                  <option value="">None (league)</option>
                  {(balances || []).map(a => (
                    <option key={a.teamId} value={a.teamId}>{a.teamName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">To Team</label>
                <select
                  value={formData.toTeamId}
                  onChange={(e) => setFormData(p => ({ ...p, toTeamId: e.target.value }))}
                  className="w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                >
                  <option value="">None (league)</option>
                  {(balances || []).map(a => (
                    <option key={a.teamId} value={a.teamId}>{a.teamName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">Amount ($)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                  className="w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Year</label>
                <select
                  value={formData.yearType}
                  onChange={(e) => setFormData(p => ({ ...p, yearType: e.target.value }))}
                  className="w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                >
                  <option value="current">Current Year</option>
                  <option value="next">Next Year</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                  className="w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                >
                  <option value="side_bet">Side Bet</option>
                  <option value="commissioner_adjustment">Commissioner Adjustment</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="e.g., Weekly matchup side bet"
                className="w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none placeholder-text-muted"
              />
            </div>

            {/* Preview */}
            {formData.amount && (formData.fromTeamId || formData.toTeamId) && (
              <div className="bg-dark-primary/50 rounded-lg p-3 text-xs text-text-secondary">
                {formData.fromTeamId && (
                  <p>{balances?.find(a => a.teamId === formData.fromTeamId)?.teamName}: -{formData.amount} {formData.yearType}-year</p>
                )}
                {formData.toTeamId && (
                  <p>{balances?.find(a => a.teamId === formData.toTeamId)?.teamName}: +{formData.amount} {formData.yearType}-year</p>
                )}
              </div>
            )}

            {formError && <p className="text-red-400 text-xs">{formError}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Recording...' : 'Submit Transaction'}
            </Button>
          </form>
        </Card>
      )}

      {/* Balances Table */}
      <Card className="mb-6">
        <h3 className="text-sm font-display font-bold text-white mb-4">Team Balances</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border text-xs text-text-muted">
                <th className="pb-2 text-left">Team</th>
                <th className="pb-2 text-left">Owner</th>
                <th className="pb-2 text-right">Current Year $</th>
                <th className="pb-2 text-right">Next Year $</th>
              </tr>
            </thead>
            <tbody>
              {(balances || []).map(account => {
                const isMe = account.userId === user?.id
                const nearMinCurrent = minBudget != null && account.currentBalance <= minBudget + 20
                const nearMaxCurrent = maxBudget != null && account.currentBalance >= maxBudget - 20
                const nearMinNext = minBudget != null && account.nextYearBalance <= minBudget + 20
                const nearMaxNext = maxBudget != null && account.nextYearBalance >= maxBudget - 20
                const atMinCurrent = minBudget != null && account.currentBalance <= minBudget
                const atMaxCurrent = maxBudget != null && account.currentBalance >= maxBudget
                const atMinNext = minBudget != null && account.nextYearBalance <= minBudget
                const atMaxNext = maxBudget != null && account.nextYearBalance >= maxBudget

                const getColor = (nearMin, nearMax, atMin, atMax) => {
                  if (atMin || atMax) return 'text-red-400'
                  if (nearMin || nearMax) return 'text-yellow-400'
                  return 'text-white'
                }

                return (
                  <tr
                    key={account.teamId}
                    className={`border-b border-dark-border/30 ${isMe ? 'bg-gold/5' : ''}`}
                  >
                    <td className={`py-3 font-medium ${isMe ? 'text-gold' : 'text-white'}`}>
                      {account.teamName}{isMe ? ' (You)' : ''}
                    </td>
                    <td className="py-3 text-text-secondary">{account.ownerName}</td>
                    <td className={`py-3 text-right font-mono font-semibold ${getColor(nearMinCurrent, nearMaxCurrent, atMinCurrent, atMaxCurrent)}`}>
                      ${account.currentBalance}
                    </td>
                    <td className={`py-3 text-right font-mono font-semibold ${getColor(nearMinNext, nearMaxNext, atMinNext, atMaxNext)}`}>
                      ${account.nextYearBalance}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {minBudget != null || maxBudget != null ? (
          <p className="text-xs text-text-muted mt-3">
            Bumpers: {minBudget != null ? `Min $${minBudget}` : ''}{minBudget != null && maxBudget != null ? ' / ' : ''}{maxBudget != null ? `Max $${maxBudget}` : ''}
          </p>
        ) : null}
      </Card>

      {/* Transaction Ledger */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-display font-bold text-white">Transaction Ledger</h3>
          <select
            value={filterTeamId}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="p-1.5 bg-dark-tertiary border border-dark-border rounded-lg text-white text-xs focus:border-gold focus:outline-none"
          >
            <option value="">All Teams</option>
            {(balances || []).map(a => (
              <option key={a.teamId} value={a.teamId}>{a.teamName}</option>
            ))}
          </select>
        </div>

        {ledger.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {ledger.map(tx => (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 bg-dark-tertiary/50 rounded-lg text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">
                      {tx.fromTeam?.name || 'League'}
                    </span>
                    <svg className="w-3 h-3 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="text-white font-medium">
                      {tx.toTeam?.name || 'League'}
                    </span>
                    <span className="font-mono font-bold text-gold">${tx.amount}</span>
                    <span className={`text-[10px] font-medium px-1.5 rounded ${
                      tx.yearType === 'current'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {tx.yearType === 'current' ? 'Current' : 'Next Year'}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 bg-dark-border/50 rounded text-text-muted">
                      {tx.category === 'trade' ? 'Trade' : tx.category === 'side_bet' ? 'Side Bet' : 'Adjustment'}
                    </span>
                  </div>
                  {tx.description && (
                    <p className="text-xs text-text-muted mt-0.5">{tx.description}</p>
                  )}
                </div>
                <span className="text-xs text-text-muted flex-shrink-0">
                  {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
        {ledgerTotal > ledger.length && (
          <p className="text-xs text-text-muted text-center mt-3">
            Showing {ledger.length} of {ledgerTotal} transactions
          </p>
        )}
      </Card>
    </div>
  )
}

export default DraftDollars
