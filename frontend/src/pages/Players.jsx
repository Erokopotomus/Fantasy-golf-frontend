import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import { usePlayerComparison } from '../hooks/usePlayerComparison'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import PlayerSearch from '../components/players/PlayerSearch'
import PlayerFilters from '../components/players/PlayerFilters'
import PlayerTable from '../components/players/PlayerTable'
import PlayerComparison from '../components/players/PlayerComparison'

const Players = () => {
  const navigate = useNavigate()
  const [compareMode, setCompareMode] = useState(false)
  const {
    players,
    totalPlayers,
    loading,
    error,
    params,
    updateParams,
    setPage,
    totalPages,
    currentPage,
  } = usePlayers({ perPage: 15 })

  const {
    selectedPlayers,
    togglePlayer,
    removePlayer,
    clearAll,
    comparisonData,
    canAddMore,
    canCompare,
  } = usePlayerComparison(3)

  const handleSort = (field) => {
    if (params.sortBy === field) {
      updateParams({ sortDir: params.sortDir === 'asc' ? 'desc' : 'asc' })
    } else {
      updateParams({ sortBy: field, sortDir: 'asc' })
    }
  }

  const handleResetFilters = () => {
    updateParams({
      search: '',
      minRank: 1,
      maxRank: 100,
      country: '',
      minSgTotal: null,
      availability: 'all',
    })
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center py-12">
              <h2 className="text-xl font-bold text-white mb-2">Error Loading Players</h2>
              <p className="text-text-secondary mb-6">{error}</p>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Players</h1>
              <p className="text-text-secondary mt-1">
                Browse and compare {totalPlayers} golfers
              </p>
            </div>
            <Button
              variant={compareMode ? 'primary' : 'secondary'}
              onClick={() => {
                setCompareMode(!compareMode)
                if (compareMode) clearAll()
              }}
            >
              {compareMode ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit Compare
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Compare Players
                </>
              )}
            </Button>
          </div>

          {/* Compare Mode Banner */}
          {compareMode && (
            <Card className="mb-6 bg-accent-blue/10 border-accent-blue/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-blue/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Compare Mode Active</p>
                    <p className="text-text-muted text-sm">
                      {selectedPlayers.length === 0
                        ? 'Select 2-3 players to compare'
                        : `${selectedPlayers.length} of 3 players selected`}
                    </p>
                  </div>
                </div>
                {selectedPlayers.length > 0 && (
                  <div className="flex items-center gap-2">
                    {selectedPlayers.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-1 bg-dark-tertiary rounded text-sm text-white"
                      >
                        {p.name.split(' ').pop()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Player Table */}
            <div className={compareMode && canCompare ? 'lg:col-span-2' : 'lg:col-span-3'}>
              {/* Search and Filters */}
              <Card className="mb-6">
                <div className="mb-4">
                  <PlayerSearch
                    value={params.search}
                    onChange={(value) => updateParams({ search: value })}
                  />
                </div>
                <PlayerFilters
                  params={params}
                  onUpdate={updateParams}
                  onReset={handleResetFilters}
                />
              </Card>

              {/* Player Table */}
              <Card padding="none">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-text-muted">Loading players...</p>
                  </div>
                ) : (
                  <>
                    <PlayerTable
                      players={players}
                      sortBy={params.sortBy}
                      sortDir={params.sortDir}
                      onSort={handleSort}
                      onSelectPlayer={togglePlayer}
                      selectedIds={selectedPlayers.map(p => p.id)}
                      canSelect={canAddMore}
                      compareMode={compareMode}
                      onViewPlayer={(player) => navigate(`/players/${player.id}`)}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t border-dark-border">
                        <p className="text-text-muted text-sm">
                          Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

            {/* Right Column - Comparison Panel */}
            {compareMode && canCompare && (
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <PlayerComparison
                    players={selectedPlayers}
                    comparisonData={comparisonData}
                    onRemovePlayer={removePlayer}
                    onClear={clearAll}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  )
}

export default Players
