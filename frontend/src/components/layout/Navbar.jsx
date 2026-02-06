import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useNotificationInbox from '../../hooks/useNotificationInbox'
import NotificationDropdown from '../notifications/NotificationDropdown'
import ClutchLogo from '../common/ClutchLogo'
import Button from '../common/Button'
import SearchButton from '../search/SearchButton'

const Navbar = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const inbox = useNotificationInbox()

  const isActive = (path) => location.pathname === path

  const navLinkStyles = (path) => `
    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
    ${isActive(path)
      ? 'bg-dark-tertiary text-white'
      : 'text-text-secondary hover:text-white hover:bg-dark-tertiary'
    }
  `

  const mobileNavLinkStyles = (path) => `
    block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300
    ${isActive(path)
      ? 'bg-dark-tertiary text-white'
      : 'text-text-secondary hover:text-white hover:bg-dark-tertiary'
    }
  `

  return (
    <nav className="bg-dark-secondary border-b border-dark-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <ClutchLogo size={32} className="shadow-button rounded-lg" />
            <span className="text-xl font-bold text-white">Clutch</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <Link to="/dashboard" className={navLinkStyles('/dashboard')}>
                  Dashboard
                </Link>
                <Link to="/leagues" className={navLinkStyles('/leagues')}>
                  My Leagues
                </Link>
                <Link to="/draft" className={navLinkStyles('/draft')}>
                  Draft
                </Link>
                <Link to="/players" className={navLinkStyles('/players')}>
                  Players
                </Link>
                <Link to="/news" className={navLinkStyles('/news')}>
                  News
                </Link>
                <div className="ml-2">
                  <SearchButton />
                </div>
              </>
            ) : (
              <>
                <Link to="/#features" className={navLinkStyles('/#features')}>
                  Features
                </Link>
                <Link to="/#how-it-works" className={navLinkStyles('/#how-it-works')}>
                  How It Works
                </Link>
              </>
            )}
          </div>

          {/* Right side - Auth buttons & Mobile menu toggle */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotifOpen(!notifOpen)
                      setProfileMenuOpen(false)
                    }}
                    className="relative p-2 text-text-secondary hover:text-white hover:bg-dark-tertiary rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {inbox.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {inbox.unreadCount > 9 ? '9+' : inbox.unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setNotifOpen(false)} />
                      <NotificationDropdown
                        notifications={inbox.notifications}
                        unreadCount={inbox.unreadCount}
                        onMarkRead={inbox.markAsRead}
                        onMarkAllRead={inbox.markAllRead}
                        onDelete={inbox.deleteNotification}
                        onClose={() => setNotifOpen(false)}
                      />
                    </>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(!profileMenuOpen)
                      setNotifOpen(false)
                    }}
                    className="hidden sm:flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors p-1 rounded-lg hover:bg-dark-tertiary"
                  >
                    <div className="w-8 h-8 bg-accent-green rounded-full flex items-center justify-center text-white font-semibold shadow-button">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="hidden lg:block">{user.name || user.email}</span>
                    <svg className={`w-4 h-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Profile Dropdown */}
                  {profileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setProfileMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-dark-secondary border border-dark-border rounded-lg shadow-lg z-20 py-1">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-white hover:bg-dark-tertiary transition-colors"
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
                          to="/leagues"
                          className="block px-4 py-2 text-sm text-text-secondary hover:text-white hover:bg-dark-tertiary transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            My Leagues
                          </div>
                        </Link>
                        <div className="border-t border-dark-border my-1" />
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false)
                            logout()
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-dark-tertiary transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </div>
                        </button>
                      </div>
                    </>
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
              className="md:hidden p-2 rounded-lg hover:bg-dark-tertiary text-text-secondary hover:text-white transition-all duration-300"
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
        <div className="md:hidden bg-dark-secondary border-t border-dark-border animate-slide-down">
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
                  to="/leagues"
                  className={mobileNavLinkStyles('/leagues')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Leagues
                </Link>
                <Link
                  to="/draft"
                  className={mobileNavLinkStyles('/draft')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Draft
                </Link>
                <Link
                  to="/players"
                  className={mobileNavLinkStyles('/players')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Players
                </Link>
                <Link
                  to="/news"
                  className={mobileNavLinkStyles('/news')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  News
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/#features"
                  className={mobileNavLinkStyles('/#features')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  to="/#how-it-works"
                  className={mobileNavLinkStyles('/#how-it-works')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </Link>
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
