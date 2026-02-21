import { useState, useEffect, useCallback } from 'react'
import SearchModal from './SearchModal'

const SearchButton = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setIsOpen(prev => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`
          flex items-center gap-2 px-3 py-2 bg-dark-tertiary rounded-lg
          text-text-muted hover:text-text-primary hover:bg-dark-border
          transition-colors ${className}
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline text-sm">Search</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-dark-secondary rounded border border-dark-border ml-auto">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>

      <SearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

export default SearchButton
