import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useNotificationInbox from '../../hooks/useNotificationInbox'
import useTournaments from '../../hooks/useTournaments'
import NotificationDropdown from '../notifications/NotificationDropdown'
import ClutchLogo from '../common/ClutchLogo'
import Button from '../common/Button'
import SearchButton from '../search/SearchButton'

const Navbar = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [researchOpen, setResearchOpen] = useState(false)
  const researchRef = useRef(null)
  const profileRef = useRef(null)
  const notifRef = useRef(null)
  const inbox = useNotificationInbox()
  const { currentTournament } = useTournaments()

  // Close dropdowns on outside click (backdrop-filter breaks fixed overlays)
  useEffect(() => {
    if (!researchOpen && !profileMenuOpen && !notifOpen) return
    const handleClick = (e) => {
      if (researchOpen && researchRef.current && !researchRef.current.contains(e.target)) {
        setResearchOpen(false)
      }
      if (profileMenuOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [researchOpen, profileMenuOpen, notifOpen])

  const isActive = (path) => location.pathname === path
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
      ? 'text-gold bg-surface-bright'
      : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
    }
  `

  const mobileNavLinkStyles = (path) => `
    block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300
    ${isActive(path)
      ? 'text-gold bg-surface-bright'
      : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
    }
  `

  return (
    <nav className="backdrop-blur-xl backdrop-saturate-150 bg-dark-secondary/80 border-b border-white/[0.08] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <ClutchLogo size={32} className="rounded-lg" />
            <span className="text-xl font-display font-extrabold text-gold tracking-tight">CLUTCH</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <Link to="/dashboard" className={navLinkStyles('/dashboard')}>
                  Dashboard
                </Link>
                <Link to="/draft" className={navLinkStyles('/draft')}>
                  Draft
                </Link>
                <Link to="/lab" className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                  ${location.pathname.startsWith('/lab')
                    ? 'text-gold bg-surface-bright'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                  }
                `}>
                  The Lab
                </Link>
                <Link to="/prove-it" className={navLinkStyles('/prove-it')}>
                  Prove It
                </Link>
                <Link to="/feed" className={navLinkStyles('/feed')}>
                  Feed
                </Link>

                {/* Research Dropdown */}
                <div className="relative" ref={researchRef}>
                  <button
                    onClick={() => {
                      setResearchOpen(!researchOpen)
                      setProfileMenuOpen(false)
                      setNotifOpen(false)
                    }}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-1
                      ${location.pathname === '/nfl' || location.pathname === '/golf' || location.pathname.startsWith('/nfl/') || location.pathname.startsWith('/players') || location.pathname.startsWith('/tournaments') || location.pathname.startsWith('/courses')
                        ? 'text-gold bg-surface-bright'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                      }
                    `}
                  >
                    Research
                    <svg className={`w-3.5 h-3.5 transition-transform ${researchOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {researchOpen && (
                      <div className="absolute left-0 mt-2 w-56 backdrop-blur-xl bg-dark-secondary/90 border border-white/[0.08] rounded-card shadow-lg z-20 py-2">
                        {/* NFL Hub */}
                        <Link
                          to="/nfl"
                          className="block px-4 py-2 text-sm font-semibold text-orange hover:bg-surface-hover transition-colors"
                          onClick={() => setResearchOpen(false)}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🏈</span>
                            NFL Hub
                          </div>
                        </Link>
                        <Link
                          to="/nfl/players"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          onClick={() => setResearchOpen(false)}
                        >
                          <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Players
                          </div>
                        </Link>
                        <Link
                          to="/nfl/schedule"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          onClick={() => setResearchOpen(false)}
                        >
                          <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Schedule
                          </div>
                        </Link>
                        <Link
                          to="/nfl/leaderboards"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          onClick={() => setResearchOpen(false)}
                        >
                          <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Leaderboards
                          </div>
                        </Link>
                        <Link
                          to="/nfl/teams"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          onClick={() => setResearchOpen(false)}
                        >
                          <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Teams
                          </div>
                        </Link>

                        <div className="border-t border-white/[0.06] my-2" />

                        {/* Golf Hub */}
                        <Link
                          to="/golf"
                          className="block px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-surface-hover transition-colors"
                          onClick={() => setResearchOpen(false)}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">⛳</span>
                            Golf Hub
                          </div>
                        </Link>
                        <Link
                          to="/players"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          onClick={() => setResearchOpen(false)}
                        >
                          <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Players
                          </div>
                        </Link>
                        <Link
                          to="/tournaments"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          onClick={() => setResearchOpen(false)}
                        >
                          <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Tournaments
                          </div>
                        </Link>
                        <Link
                          to="/courses"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          onClick={() => setResearchOpen(false)}
                        >
                          <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Courses
                          </div>
                        </Link>
                      </div>
                  )}
                </div>
                <Link
                  to={tournamentLink || '/tournaments'}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-1.5
                    ${isLiveTournament
                      ? 'text-gold bg-surface-bright'
                      : isTournamentActive
                        ? 'text-gold bg-surface-bright'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'}
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
            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => {
                      setNotifOpen(!notifOpen)
                      setProfileMenuOpen(false)
                    }}
                    className="relative p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {inbox.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold text-dark-primary text-[10px] font-bold rounded-full flex items-center justify-center">
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
                    className="hidden sm:flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-hover"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-gold to-orange rounded-full flex items-center justify-center text-dark-primary font-semibold shadow-button">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="hidden lg:block">{user.name || user.email}</span>
                    <svg className={`w-4 h-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Profile Dropdown */}
                  {profileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-52 backdrop-blur-xl bg-dark-secondary/90 border border-white/[0.08] rounded-card shadow-lg z-20 py-1">
                        <div className="px-4 py-2 border-b border-white/[0.08]">
                          <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
                          <p className="text-xs text-text-muted truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
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
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
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
                          to="/leagues"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
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
                          to="/news"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                            Player News
                          </div>
                        </Link>
                        <div className="border-t border-white/[0.08] my-1" />
                        <Link
                          to="/settings/notifications"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
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
                            <div className="border-t border-white/[0.08] my-1" />
                            <Link
                              to="/admin"
                              className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
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
                        <div className="border-t border-white/[0.08] my-1" />
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
              className="md:hidden p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all duration-300"
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
        <div className="md:hidden backdrop-blur-xl bg-dark-secondary/90 border-t border-white/[0.08] animate-slide-down">
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
                  to="/draft"
                  className={mobileNavLinkStyles('/draft')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Draft
                </Link>
                <Link
                  to="/lab"
                  className={mobileNavLinkStyles('/lab')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  The Lab
                </Link>
                <Link
                  to="/prove-it"
                  className={mobileNavLinkStyles('/prove-it')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Prove It
                </Link>
                <Link
                  to="/feed"
                  className={mobileNavLinkStyles('/feed')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Feed
                </Link>

                {/* Research section */}
                <div className="pt-2 pb-1 px-4">
                  <span className="text-[10px] font-mono font-bold text-white/25 uppercase tracking-widest">Research</span>
                </div>
                <div className="pl-2 space-y-1">
                  <Link to="/nfl" className={mobileNavLinkStyles('/nfl')} onClick={() => setMobileMenuOpen(false)}>
                    <span className="flex items-center gap-2">🏈 NFL Hub</span>
                  </Link>
                  <Link to="/nfl/players" className={mobileNavLinkStyles('/nfl/players')} onClick={() => setMobileMenuOpen(false)}>
                    NFL Players
                  </Link>
                  <Link to="/nfl/leaderboards" className={mobileNavLinkStyles('/nfl/leaderboards')} onClick={() => setMobileMenuOpen(false)}>
                    NFL Leaderboards
                  </Link>
                  <Link to="/nfl/schedule" className={mobileNavLinkStyles('/nfl/schedule')} onClick={() => setMobileMenuOpen(false)}>
                    NFL Schedule
                  </Link>
                  <Link to="/golf" className={mobileNavLinkStyles('/golf')} onClick={() => setMobileMenuOpen(false)}>
                    <span className="flex items-center gap-2">⛳ Golf Hub</span>
                  </Link>
                  <Link to="/players" className={mobileNavLinkStyles('/players')} onClick={() => setMobileMenuOpen(false)}>
                    Golf Players
                  </Link>
                  <Link to="/tournaments" className={mobileNavLinkStyles('/tournaments')} onClick={() => setMobileMenuOpen(false)}>
                    Tournaments
                  </Link>
                  <Link to="/courses" className={mobileNavLinkStyles('/courses')} onClick={() => setMobileMenuOpen(false)}>
                    Courses
                  </Link>
                </div>

                <Link
                  to={`/manager/${user.id}`}
                  className={mobileNavLinkStyles(`/manager/${user.id}`)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Manager Stats
                </Link>
                <Link
                  to={tournamentLink || '/tournaments'}
                  className={`
                    flex items-center gap-2
                    ${isTournamentActive
                      ? 'block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 text-gold bg-surface-bright'
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
