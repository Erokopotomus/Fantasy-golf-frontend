import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import ClutchLogo from '../common/ClutchLogo'

export default function LandingFooter() {
  const { theme, toggleTheme } = useTheme()

  return (
    <footer className="bg-[var(--bg)] border-t border-[var(--card-border)] py-12 px-5" aria-label="Footer">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <ClutchLogo size={28} />
            <span className="font-display font-bold text-[var(--text-1)] text-base">
              Clutch Fantasy Sports
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-body text-[var(--text-2)]">
            <Link to="/golf" className="hover:text-[var(--text-1)] transition-colors">Golf Hub</Link>
            <Link to="/nfl" className="hover:text-[var(--text-1)] transition-colors">NFL Hub</Link>
            <Link to="/prove-it" className="hover:text-[var(--text-1)] transition-colors">Prove It</Link>
            <Link to="/lab" className="hover:text-[var(--text-1)] transition-colors">The Lab</Link>
            <Link to="/import" className="hover:text-[var(--text-1)] transition-colors">Import</Link>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--glass-hover)] transition-colors self-start"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-[var(--card-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="font-mono text-[10px] text-[var(--text-3)]">
            Season-long fantasy. No gambling. No noise.
          </p>
          <div className="flex gap-6 text-xs font-body text-[var(--text-3)]">
            <a href="#" className="hover:text-[var(--text-2)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--text-2)] transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
