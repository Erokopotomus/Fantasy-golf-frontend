import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useRoster } from '../hooks/useRoster'
import { useLineup } from '../hooks/useLineup'
import { useTrades } from '../hooks/useTrades'
import { useTournaments } from '../hooks/useTournaments'
import { useLeague } from '../hooks/useLeague'
import { useAuth } from '../context/AuthContext'
import { usePlayerDetail } from '../hooks/usePlayerDetail'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import RosterList from '../components/roster/RosterList'
import LineupEditor from '../components/roster/LineupEditor'
import TradeProposal from '../components/roster/TradeProposal'
import TradeReview from '../components/roster/TradeReview'
import PlayerDetailModal from '../components/players/PlayerDetailModal'
import ChatPanel from '../components/chat/ChatPanel'

const TeamRoster = () => {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { league, loading: leagueLoading } = useLeague(leagueId)

  // Find user's team in this league
  const userTeam = league?.teams?.find(t => t.userId === user?.id)
  const teamId = userTeam?.id

  const { roster, loading: rosterLoading, error: rosterError, dropPlayer } = useRoster(teamId)
  const { activeLineup, setActiveLineup, setLineup, loading: lineupLoading, saved } = useLineup(leagueId)
  const { pendingTrades, proposeTrade, acceptTrade, rejectTrade, cancelTrade, actionLoading } = useTrades(leagueId)
  const { currentTournament } = useTournaments()
  const { selectedPlayer, isModalOpen, openPlayerDetail, closePlayerDetail } = usePlayerDetail()

  const [isEditing, setIsEditing] = useState(false)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [selectedPlayerForTrade, setSelectedPlayerForTrade] = useState(null)

  // Initialize active lineup from roster
  useEffect(() => {
    if (roster.length > 0 && activeLineup.length === 0) {
      const activeIds = roster.filter(p => p.isActive !== false).slice(0, 4).map(p => p.id)
      setActiveLineup(activeIds)
    }
  }, [roster, activeLineup.length, setActiveLineup])

  const maxActiveLineup = 4 // Default max active players
  const isLineupLocked = currentTournament?.status === 'in-progress'

  const handleTogglePlayer = (player) => {
    setActiveLineup(prev => {
      if (prev.includes(player.id)) {
        return prev.filter(id => id !== player.id)
      }
      if (prev.length >= maxActiveLineup) {
        return prev
      }
      return [...prev, player.id]
    })
  }

  const handleDropPlayer = async (player) => {
    if (window.confirm(`Are you sure you want to drop ${player.name}?`)) {
      await dropPlayer(player.id)
    }
  }

  const handleTradePlayer = (player) => {
    setSelectedPlayerForTrade(player)
    setShowTradeModal(true)
  }

  const handleSaveLineup = async (playerIds) => {
    await setLineup(currentTournament?.id, playerIds)
  }

  const handleProposeTrade = async (tradeData) => {
    await proposeTrade(tradeData)
    setShowTradeModal(false)
  }

  // Mock league members for trade
  const mockLeagueMembers = [
    { id: 'team-2', name: 'Mike S.', isUser: false, roster: [
      { id: 'player-7', name: 'Collin Morikawa', countryFlag: '🇺🇸' },
      { id: 'player-8', name: 'Ludvig Aberg', countryFlag: '🇸🇪' },
    ]},
    { id: 'team-3', name: 'Sarah K.', isUser: false, roster: [
      { id: 'player-9', name: 'Tommy Fleetwood', countryFlag: '🇬🇧' },
    ]},
    { id: 'team-4', name: 'James T.', isUser: false, roster: [] },
  ]

  if (leagueLoading || (teamId && rosterLoading)) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading roster...</p>
        </div>
      </div>
    )
  }

  // Show empty roster state if no team or roster is empty (pre-draft)
  if (!userTeam || roster.length === 0) {
    const isDraftPending = league?.status === 'draft-pending' || league?.status === 'DRAFT_PENDING'

    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white">My Roster</h1>
              <p className="text-text-secondary">{league?.name}</p>
            </div>

            <Card className="text-center py-12">
              <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {isDraftPending ? 'Draft Your Team' : 'Empty Roster'}
              </h2>
              <p className="text-text-secondary mb-6 max-w-sm mx-auto">
                {isDraftPending
                  ? "Your league's draft hasn't started yet. Once the draft begins, you'll build your roster by selecting players."
                  : "Your roster is empty. Head to the waiver wire to add players to your team."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {isDraftPending ? (
                  <Button onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
                    Go to Draft Room
                  </Button>
                ) : (
                  <Button onClick={() => navigate(`/leagues/${leagueId}/waivers`)}>
                    Browse Waiver Wire
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate(`/leagues/${leagueId}/team-settings`)}>
                  Team Settings
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (rosterError) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center py-12">
              <h2 className="text-xl font-bold text-white mb-2">Error Loading Roster</h2>
              <p className="text-text-secondary mb-6">{rosterError}</p>
              <Link to={`/leagues/${leagueId}`} className="text-accent-green hover:underline">
                Return to League
              </Link>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <Link
                to="/dashboard"
                className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">My Roster</h1>
            </div>
            <div className="flex gap-3">
              <Link to={`/leagues/${leagueId}/team-settings`}>
                <Button variant="secondary" size="sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Team
                </Button>
              </Link>
              <Link to={`/leagues/${leagueId}/waivers`}>
                <Button variant="secondary">Waiver Wire</Button>
              </Link>
              <Button
                variant={isEditing ? 'primary' : 'secondary'}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Done Editing' : 'Edit Lineup'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Roster */}
            <div className="lg:col-span-2">
              <RosterList
                roster={roster}
                activeLineup={activeLineup}
                isEditing={isEditing}
                onTogglePlayer={handleTogglePlayer}
                onDropPlayer={handleDropPlayer}
                onTradePlayer={handleTradePlayer}
                onViewPlayer={openPlayerDetail}
              />
            </div>

            {/* Right Column - Lineup Editor & Trades */}
            <div className="space-y-6">
              <LineupEditor
                roster={roster}
                activeLineup={activeLineup}
                maxActive={maxActiveLineup}
                tournament={currentTournament}
                isLocked={isLineupLocked}
                onSave={handleSaveLineup}
                loading={lineupLoading}
                saved={saved}
              />

              <TradeReview
                trades={pendingTrades}
                onAccept={acceptTrade}
                onReject={rejectTrade}
                onCancel={cancelTrade}
                loading={actionLoading}
              />

              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowTradeModal(true)}
              >
                Propose Trade
              </Button>

              {/* League Chat */}
              <ChatPanel
                leagueId={leagueId}
                leagueName={league?.name}
                memberCount={league?.memberCount}
                collapsible
                defaultCollapsed
              />
            </div>
          </div>
        </div>
      </main>

      {/* Trade Modal */}
      {showTradeModal && (
        <TradeProposal
          roster={roster}
          leagueMembers={mockLeagueMembers}
          onPropose={handleProposeTrade}
          loading={actionLoading}
          onClose={() => setShowTradeModal(false)}
        />
      )}

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={selectedPlayer}
        isOpen={isModalOpen}
        onClose={closePlayerDetail}
      />
    </div>
  )
}

export default TeamRoster
