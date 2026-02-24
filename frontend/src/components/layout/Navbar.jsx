import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import useNotificationInbox from '../../hooks/useNotificationInbox'
import useTournaments from '../../hooks/useTournaments'
import NotificationDropdown from '../notifications/NotificationDropdown'
import ClutchLogo from '../common/ClutchLogo'
import Button from '../common/Button'
import SearchButton from '../search/SearchButton'

const navDropdownItems = {
  golf: {
    accent: 'emerald',
    items: [
      { label: 'Golf Hub', to: '/golf', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg> },
      { label: 'Players', to: '/players', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
      { label: 'Tournaments', to: '/tournaments', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
      { label: 'Courses', to: '/courses', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    ],
  },
  nfl: {
    accent: 'orange',
    items: [
      { label: 'NFL Hub', to: '/nfl', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg> },
      { label: 'Players', to: '/nfl/players', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
      { label: 'Teams', to: '/nfl/teams', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
      { label: 'Schedule', to: '/nfl/schedule', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
      { label: 'Leaderboards', to: '/nfl/leaderboards', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
      { label: 'Compare', to: '/nfl/compare', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> },
    ],
  },
  lab: {
    accent: 'purple',
    items: [
      { label: 'Lab Hub', to: '/lab', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg> },
      { label: 'Watch List', to: '/lab/watch-list', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> },
      { label: 'Decision Journal', to: '/lab/journal', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
      { label: 'Mock Draft', to: '/mock-draft', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
      { label: 'Draft History', to: '/draft/history', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    ],
  },
}

const accentColors = {
  emerald: { icon: 'text-emerald-400', hover: 'hover:text-emerald-400', active: 'text-emerald-400', border: 'border-emerald-500/20' },
  orange: { icon: 'text-orange-400', hover: 'hover:text-orange-400', active: 'text-orange-400', border: 'border-orange-500/20' },
  purple: { icon: 'text-purple-400', hover: 'hover:text-purple-400', active: 'text-purple-400', border: 'border-purple-500/20' },
}

const NavDropdown = ({ label, to, items, accent = 'emerald', isActiveGroup, location, onNavigate }) => {
  const colors = accentColors[accent]
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <Link
        to={to}
        onClick={() => { setOpen(false); onNavigate?.() }}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-1
          ${isActiveGroup
            ? 'text-white bg-white/15'
            : 'text-white/60 hover:text-white hover:bg-white/10'
          }
        `}
      >
        {label}
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Link>
      {open && (
        <div className={`absolute left-0 top-full mt-1 w-48 bg-[var(--nav-bg)] border border-white/10 ${colors.border} rounded-xl shadow-lg z-50 py-1.5`}>
          {items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                location.pathname === item.to
                  ? `${colors.active} bg-white/10`
                  : `text-white/60 ${colors.hover} hover:bg-white/10`
              }`}
            >
              <span className={location.pathname === item.to ? colors.icon : 'text-white/30'}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

const Navbar = () => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const profileRef = useRef(null)
  const notifRef = useRef(null)
  const inbox = useNotificationInbox()
  const { currentTournament } = useTournaments()

  // Close dropdowns on outside click
  useEffect(() => {
    if (!profileMenuOpen && !notifOpen) return
    const handleClick = (e) => {
      if (profileMenuOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileMenuOpen, notifOpen])

  const isActive = (path) => location.pathname === path
  const isGolfActive = ['/golf', '/players', '/tournaments', '/courses'].some(p => location.pathname.startsWith(p))
  const isNflActive = location.pathname.startsWith('/nfl')
  const isLabActive = ['/lab', '/mock-draft', '/draft/history'].some(p => location.pathname.startsWith(p))
  const isTournamentActive = location.pathname.startsWith('/tournaments/')

  const tournamentLink = currentTournament ? `/tournaments/${currentTournament.id}` : null
  const isLiveTournament = currentTournament?.status === 'IN_PROGRESS'

  const scrollToSection = (id) => {
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/')
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  const navLinkStyles = (path) => `
    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
    ${isActive(path)
      ? 'text-white bg-white/15'
      : 'text-white/60 hover:text-white hover:bg-white/10'
    }
  `

  const mobileNavLinkStyles = (path) => `
    block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300
    ${isActive(path)
      ? 'text-white bg-white/15'
      : 'text-white/60 hover:text-white hover:bg-white/10'
    }
  `

  return (
    <nav className="bg-[var(--nav-bg)] border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <ClutchLogo size={32} className="rounded-lg" />
            <span className="text-xl font-display font-extrabold text-[#F06820] tracking-tight">CLUTCH</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <Link to="/dashboard" className={navLinkStyles('/dashboard')}>
                  Dashboard
                </Link>
                <NavDropdown
                  label="Golf"
                  to="/golf"
                  items={navDropdownItems.golf.items}
                  accent={navDropdownItems.golf.accent}
                  isActiveGroup={isGolfActive}
                  location={location}
                />
                <NavDropdown
                  label="NFL"
                  to="/nfl"
                  items={navDropdownItems.nfl.items}
                  accent={navDropdownItems.nfl.accent}
                  isActiveGroup={isNflActive}
                  location={location}
                />
                <NavDropdown
                  label="The Lab"
                  to="/lab"
                  items={navDropdownItems.lab.items}
                  accent={navDropdownItems.lab.accent}
                  isActiveGroup={isLabActive}
                  location={location}
                />
                <Link
                  to={tournamentLink || '/tournaments'}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-1.5
                    ${isLiveTournament
                      ? 'text-white bg-white/15'
                      : isTournamentActive
                        ? 'text-white bg-white/15'
                        : 'text-white/60 hover:text-white hover:bg-white/10'}
                  `}
                >
                  {isLiveTournament && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose"></span>
                    </span>
                  )}
                  Live
                </Link>
                <div className="ml-2">
                  <SearchButton />
                </div>
              </>
            ) : (
              <>
                <button onClick={() => scrollToSection('features')} className={navLinkStyles('')}>
                  Features
                </button>
                <button onClick={() => scrollToSection('how-it-works')} className={navLinkStyles('')}>
                  How It Works
                </button>
              </>
            )}
          </div>

          {/* Right side - Auth buttons & Mobile menu toggle */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => {
                      setNotifOpen(!notifOpen)
                      setProfileMenuOpen(false)
                    }}
                    className="relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {inbox.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold text-slate text-[10px] font-bold rounded-full flex items-center justify-center">
                        {inbox.unreadCount > 9 ? '9+' : inbox.unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                      <NotificationDropdown
                        notifications={inbox.notifications}
                        unreadCount={inbox.unreadCount}
                        onMarkRead={inbox.markAsRead}
                        onMarkAllRead={inbox.markAllRead}
                        onDelete={inbox.deleteNotification}
                        onClose={() => setNotifOpen(false)}
                      />
                  )}
                </div>

                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(!profileMenuOpen)
                      setNotifOpen(false)
                    }}
                    className="hidden sm:flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-gold to-orange rounded-full flex items-center justify-center text-slate font-semibold shadow-button">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="hidden lg:block">{user.name || user.email}</span>
                    <svg className={`w-4 h-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Profile Dropdown */}
                  {profileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-[var(--nav-bg)] border border-white/10 rounded-card shadow-lg z-20 py-1">
                        <div className="px-4 py-2 border-b border-white/10">
                          <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
                          <p className="text-xs text-white/50 truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            My Profile
                          </div>
                        </Link>
                        <Link
                          to={`/manager/${user.id}`}
                          className="block px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Manager Stats
                          </div>
                        </Link>
                        <Link
                          to="/my-rating"
                          className="block px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Clutch Rating
                          </div>
                        </Link>
                        <Link
                          to="/leagues"
                          className="block px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            My Leagues
                          </div>
                        </Link>
                        <Link
                          to="/vault"
                          className="block px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={2} />
                              <circle cx="12" cy="12" r="3" strokeWidth={2} />
                              <path strokeLinecap="round" strokeWidth={2} d="M12 9v0M12 15v0M9 12h0M15 12h0" />
                            </svg>
                            League Vault
                          </div>
                        </Link>
                        <Link
                          to="/news"
                          className="block px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                            Player News
                          </div>
                        </Link>
                        <div className="border-t border-white/10 my-1" />
                        <Link
                          to="/settings/notifications"
                          className="block px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            Notification Settings
                          </div>
                        </Link>
                        {user?.role === 'admin' && (
                          <>
                            <div className="border-t border-white/10 my-1" />
                            <Link
                              to="/admin"
                              className="block px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                              onClick={() => setProfileMenuOpen(false)}
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Admin Dashboard
                              </div>
                            </Link>
                          </>
                        )}
                        <div className="border-t border-white/10 my-1" />
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false)
                            logout()
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </div>
                        </button>
                      </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="sm:hidden">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">
                    Sign Up Free
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all duration-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--nav-bg)] border-t border-white/10 animate-slide-down">
          <div className="px-4 py-4 space-y-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={mobileNavLinkStyles('/dashboard')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/golf"
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${isGolfActive ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Golf
                </Link>
                {navDropdownItems.golf.items.filter(i => i.to !== '/golf').map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block pl-8 pr-4 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/nfl"
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${isNflActive ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  NFL
                </Link>
                {navDropdownItems.nfl.items.filter(i => i.to !== '/nfl').map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block pl-8 pr-4 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/lab"
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${isLabActive ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  The Lab
                </Link>
                {navDropdownItems.lab.items.filter(i => i.to !== '/lab').map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block pl-8 pr-4 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}

                <Link
                  to={`/manager/${user.id}`}
                  className={mobileNavLinkStyles(`/manager/${user.id}`)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Manager Stats
                </Link>
                <Link
                  to="/my-rating"
                  className={mobileNavLinkStyles('/my-rating')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Clutch Rating
                </Link>
                <Link
                  to={tournamentLink || '/tournaments'}
                  className={`
                    flex items-center gap-2
                    ${isTournamentActive
                      ? 'block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 text-white bg-white/15'
                      : mobileNavLinkStyles('')}
                  `}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {isLiveTournament && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose"></span>
                    </span>
                  )}
                  Live
                </Link>
              </>
            ) : (
              <>
                <button
                  className={mobileNavLinkStyles('')}
                  onClick={() => { setMobileMenuOpen(false); scrollToSection('features') }}
                >
                  Features
                </button>
                <button
                  className={mobileNavLinkStyles('')}
                  onClick={() => { setMobileMenuOpen(false); scrollToSection('how-it-works') }}
                >
                  How It Works
                </button>
                <Link
                  to="/login"
                  className={mobileNavLinkStyles('/login')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
