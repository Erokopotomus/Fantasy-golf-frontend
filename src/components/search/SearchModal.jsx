import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'

const SearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const {
    query,
    setQuery,
    results,
    loading,
    hasResults,
    recentSearches,
    addToRecentSearches,
    clearRecentSearches,
    clearSearch,
  } = useGlobalSearch()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      clearSearch()
      setSelectedIndex(0)
    }
  }, [isOpen, clearSearch])

  // Flatten results for keyboard navigation
  const flattenedResults = [
    ...results.players,
    ...results.leagues,
    ...results.tournaments,
    ...results.news,
  ]

  const displayItems = query.length >= 2 ? flattenedResults : recentSearches

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, displayItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && displayItems[selectedIndex]) {
        e.preventDefault()
        handleSelectItem(displayItems[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, displayItems, selectedIndex, onClose])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelectItem = (item) => {
    addToRecentSearches(item)
    onClose()
    navigate(item.url)
  }

  const getTypeLabel = (type) => {
    const labels = {
      player: 'Player',
      league: 'League',
      tournament: 'Tournament',
      news: 'News',
    }
    return labels[type] || type
  }

  const getTypeBadgeColor = (type) => {
    const colors = {
      player: 'bg-blue-500/20 text-blue-400',
      league: 'bg-yellow-500/20 text-yellow-400',
      tournament: 'bg-green-500/20 text-green-400',
      news: 'bg-red-500/20 text-red-400',
    }
    return colors[type] || 'bg-gray-500/20 text-gray-400'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
        <div className="w-full max-w-xl bg-dark-secondary rounded-xl shadow-2xl border border-dark-border overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-dark-border">
            <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players, leagues, tournaments..."
              className="flex-1 bg-transparent text-white placeholder-text-muted outline-none text-lg"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="text-text-muted hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <kbd className="hidden sm:inline-flex px-2 py-1 text-xs text-text-muted bg-dark-tertiary rounded border border-dark-border">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-accent-green border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-text-muted text-sm">Searching...</p>
              </div>
            ) : query.length >= 2 && !hasResults ? (
              <div className="p-8 text-center">
                <p className="text-text-muted">No results found for "{query}"</p>
                <p className="text-text-muted text-sm mt-1">Try a different search term</p>
              </div>
            ) : query.length >= 2 && hasResults ? (
              <div className="py-2">
                {/* Players */}
                {results.players.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                      Players
                    </p>
                    {results.players.map((item, idx) => (
                      <SearchResultItem
                        key={item.id}
                        item={item}
                        isSelected={displayItems.indexOf(item) === selectedIndex}
                        onClick={() => handleSelectItem(item)}
                        getTypeBadgeColor={getTypeBadgeColor}
                      />
                    ))}
                  </div>
                )}

                {/* Leagues */}
                {results.leagues.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                      Leagues
                    </p>
                    {results.leagues.map((item, idx) => (
                      <SearchResultItem
                        key={item.id}
                        item={item}
                        isSelected={displayItems.indexOf(item) === selectedIndex}
                        onClick={() => handleSelectItem(item)}
                        getTypeBadgeColor={getTypeBadgeColor}
                      />
                    ))}
                  </div>
                )}

                {/* Tournaments */}
                {results.tournaments.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                      Tournaments
                    </p>
                    {results.tournaments.map((item, idx) => (
                      <SearchResultItem
                        key={item.id}
                        item={item}
                        isSelected={displayItems.indexOf(item) === selectedIndex}
                        onClick={() => handleSelectItem(item)}
                        getTypeBadgeColor={getTypeBadgeColor}
                      />
                    ))}
                  </div>
                )}

                {/* News */}
                {results.news.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                      News
                    </p>
                    {results.news.map((item, idx) => (
                      <SearchResultItem
                        key={item.id}
                        item={item}
                        isSelected={displayItems.indexOf(item) === selectedIndex}
                        onClick={() => handleSelectItem(item)}
                        getTypeBadgeColor={getTypeBadgeColor}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : recentSearches.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Recent Searches
                  </p>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-text-muted hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((item, idx) => (
                  <SearchResultItem
                    key={`${item.type}-${item.id}`}
                    item={item}
                    isSelected={idx === selectedIndex}
                    onClick={() => handleSelectItem(item)}
                    getTypeBadgeColor={getTypeBadgeColor}
                    showType
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-text-muted">Type to search players, leagues, and more</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-dark-border flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-dark-tertiary rounded border border-dark-border">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-dark-tertiary rounded border border-dark-border">↓</kbd>
                <span className="ml-1">Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-dark-tertiary rounded border border-dark-border">↵</kbd>
                <span className="ml-1">Select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-tertiary rounded border border-dark-border">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-dark-tertiary rounded border border-dark-border">K</kbd>
              <span className="ml-1">to toggle</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const SearchResultItem = ({ item, isSelected, onClick, getTypeBadgeColor, showType = false }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
        ${isSelected ? 'bg-accent-green/20' : 'hover:bg-dark-tertiary'}
      `}
    >
      <span className="text-xl flex-shrink-0">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isSelected ? 'text-accent-green' : 'text-white'}`}>
          {item.name}
        </p>
        <p className="text-text-muted text-sm truncate">{item.subtitle}</p>
      </div>
      {showType && (
        <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeBadgeColor(item.type)}`}>
          {item.type}
        </span>
      )}
      {isSelected && (
        <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  )
}

export default SearchModal
