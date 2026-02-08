import { useState } from 'react'
import Card from '../components/common/Card'
import NewsCard from '../components/news/NewsCard'
import { useNews, useInjuryReports, useTrendingPlayers } from '../hooks/useNews'

const News = () => {
  const [activeTab, setActiveTab] = useState('all')

  const { news: allNews, loading: loadingAll, refetch: refetchAll } = useNews({ limit: 20 })
  const { reports: injuryReports, loading: loadingInjuries } = useInjuryReports()
  const { trending, loading: loadingTrending } = useTrendingPlayers()

  const tabs = [
    { id: 'all', label: 'All News', count: allNews.length },
    { id: 'injuries', label: 'Injuries & WDs', count: injuryReports.length },
    { id: 'trending', label: 'Trending', count: trending.length },
  ]

  const getActiveContent = () => {
    switch (activeTab) {
      case 'injuries':
        return { data: injuryReports, loading: loadingInjuries }
      case 'trending':
        return { data: trending, loading: loadingTrending }
      default:
        return { data: allNews, loading: loadingAll }
    }
  }

  const { data: activeData, loading: activeLoading } = getActiveContent()

  const highPriorityNews = allNews.filter(n => n.priority === 'high')

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-white">Player News</h1>
        <p className="text-text-secondary">
          Injuries, withdrawals, trending players, and fantasy insights
        </p>
      </div>

      {/* High Priority Alerts */}
      {highPriorityNews.length > 0 && (
        <Card className="bg-gradient-to-r from-red-600/10 to-orange-600/10 border-red-500/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🚨</span>
            <h2 className="text-lg font-semibold font-display text-white">Important Alerts</h2>
          </div>
          <div className="space-y-3">
            {highPriorityNews.slice(0, 3).map(item => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed - 2 columns */}
        <div className="lg:col-span-2">
          <Card padding="none">
            {/* Tabs */}
            <div className="border-b border-dark-border">
              <div className="flex">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 px-4 py-3 text-sm font-medium transition-colors
                      border-b-2 -mb-px
                      ${activeTab === tab.id
                        ? 'text-gold border-gold'
                        : 'text-text-muted border-transparent hover:text-white'
                      }
                    `}
                  >
                    {tab.label}
                    <span className="ml-2 text-xs bg-dark-tertiary px-1.5 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* News List */}
            <div className="p-4">
              {activeLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-32 bg-dark-tertiary rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : activeData.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <p>No news available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeData.map(item => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <h3 className="text-lg font-semibold font-display text-white mb-4">News Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  <span className="text-text-secondary">Active Injuries</span>
                </div>
                <span className="text-white font-medium">
                  {injuryReports.filter(r => r.type === 'injury').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⛔</span>
                  <span className="text-text-secondary">Withdrawals</span>
                </div>
                <span className="text-white font-medium">
                  {injuryReports.filter(r => r.type === 'withdrawal').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-text-secondary">Hot Players</span>
                </div>
                <span className="text-white font-medium">
                  {trending.filter(t => t.type === 'hot').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">❄️</span>
                  <span className="text-text-secondary">Cold Players</span>
                </div>
                <span className="text-white font-medium">
                  {allNews.filter(n => n.type === 'cold').length}
                </span>
              </div>
            </div>
          </Card>

          {/* Trending Players Compact */}
          <Card>
            <h3 className="text-lg font-semibold font-display text-white mb-4">Trending Up</h3>
            <div className="space-y-3">
              {trending
                .filter(t => t.impact === 'positive')
                .slice(0, 4)
                .map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-tertiary transition-colors cursor-pointer"
                  >
                    <span className="text-lg">{item.playerFlag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {item.playerName}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {item.headline}
                      </p>
                    </div>
                    <span className="text-gold text-sm">📈</span>
                  </div>
                ))}
            </div>
          </Card>

          {/* Refresh Button */}
          <button
            onClick={refetchAll}
            className="w-full py-3 bg-dark-secondary border border-dark-border rounded-lg text-text-secondary hover:text-white hover:bg-dark-tertiary transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh News
          </button>
        </div>
      </div>
      </div>
      </main>
    </div>
  )
}

export default News
