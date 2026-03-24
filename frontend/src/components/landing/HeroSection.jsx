import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import ClutchLogo from '../common/ClutchLogo'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Particles } from '@/components/ui/particles'

export default function HeroSection() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section className="relative min-h-screen flex flex-col bg-[var(--bg)]" aria-label="Hero">
      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-5 py-4 md:px-10 lg:px-16">
        <Link to="/" className="flex items-center gap-2.5">
          <ClutchLogo size={32} />
          <span className="font-display font-bold text-[var(--text-1)] text-lg hidden sm:inline">
            Clutch
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-body text-[var(--text-2)]">
          <Link to="/golf" className="hover:text-[var(--text-1)] transition-colors">Golf Hub</Link>
          <Link to="/import" className="hover:text-[var(--text-1)] transition-colors">Import</Link>
          <Link to="/prove-it" className="hover:text-[var(--text-1)] transition-colors">Prove It</Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--glass-hover)] transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <Link
            to="/login"
            className="text-sm font-body text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
          >
            Log In
          </Link>
          <Link to="/register">
            <ShimmerButton
              background="linear-gradient(135deg, #F06820 0%, #D4930D 100%)"
              shimmerColor="rgba(255,255,255,0.3)"
              borderRadius="12px"
              className="text-sm font-display font-semibold px-4 py-2"
            >
              Create League
            </ShimmerButton>
          </Link>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 text-center pb-20 md:pb-24">
        <BlurFade delay={0} inView>
          <h1 className="font-display font-extrabold text-[var(--text-1)] text-4xl sm:text-5xl md:text-6xl lg:text-[70px] leading-[1.1] tracking-tight max-w-4xl">
            The more you put in,{' '}
            <br className="hidden sm:block" />
            the further ahead you get.
          </h1>
        </BlurFade>

        <BlurFade delay={0.15} inView>
          <p className="mt-6 font-body text-[var(--text-2)] text-base sm:text-lg max-w-xl leading-relaxed">
            A private AI co-pilot that learns how you play fantasy sports —
            your draft tendencies, your roster habits, your blind spots —
            and gets sharper every season.
          </p>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Link to="/register">
              <ShimmerButton
                background="linear-gradient(135deg, #F06820 0%, #D4930D 100%)"
                shimmerColor="rgba(255,255,255,0.3)"
                borderRadius="12px"
                className="text-base font-display font-bold px-8 py-3.5"
              >
                Start Building Your Edge
              </ShimmerButton>
            </Link>
            <Link
              to="/import"
              className="text-sm font-body text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors underline underline-offset-4 decoration-[var(--stone)]"
            >
              Already have a league? Import it &rarr;
            </Link>
          </div>
        </BlurFade>

        <BlurFade delay={0.45} inView>
          <p className="mt-8 font-mono text-[11px] text-[var(--text-3)] tracking-wider uppercase">
            Season-long fantasy &middot; Golf live &middot; NFL Fall 2026
          </p>
        </BlurFade>
      </div>

      {/* Particles background */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={40}
        color={isDark ? '#D4930D' : '#F06820'}
        staticity={50}
        ease={50}
        size={0.5}
      />
    </section>
  )
}
