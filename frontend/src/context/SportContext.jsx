import { createContext, useContext, useState, useCallback } from 'react'

const SportContext = createContext(null)

const SPORTS = {
  golf: { slug: 'golf', name: 'Golf', emoji: '\u26F3', color: 'text-green-400' },
  nfl: { slug: 'nfl', name: 'NFL', emoji: '\uD83C\uDFC8', color: 'text-orange-400' },
}

export function SportProvider({ children }) {
  const [activeSport, setActiveSportState] = useState(() => {
    return localStorage.getItem('clutch_sport') || 'golf'
  })

  const setActiveSport = useCallback((sport) => {
    const slug = sport.toLowerCase()
    if (SPORTS[slug]) {
      setActiveSportState(slug)
      localStorage.setItem('clutch_sport', slug)
    }
  }, [])

  const sportConfig = SPORTS[activeSport] || SPORTS.golf
  const isNfl = activeSport === 'nfl'
  const isGolf = activeSport === 'golf'

  return (
    <SportContext.Provider value={{
      activeSport,
      setActiveSport,
      sportConfig,
      isNfl,
      isGolf,
      sports: SPORTS,
    }}>
      {children}
    </SportContext.Provider>
  )
}

export function useSport() {
  const ctx = useContext(SportContext)
  if (!ctx) throw new Error('useSport must be used within SportProvider')
  return ctx
}

export default SportContext
