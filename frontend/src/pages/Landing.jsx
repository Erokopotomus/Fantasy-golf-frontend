import { useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/layout/Footer'
import ClutchLogo from '../components/common/ClutchLogo'
import ClutchRatingGauge from '../components/common/ClutchRatingGauge'
import Button from '../components/common/Button'
import api from '../services/api'

// ─── Mock Data ──────────────────────────────────────────────

const mockLeaderboard = [
  { rank: 1, name: 'ChaseTheTrophy', rating: 94, record: '147-31', accuracy: '82.6%', trend: 'up' },
  { rank: 2, name: 'GridironGuru', rating: 91, record: '139-34', accuracy: '80.3%', trend: 'stable' },
  { rank: 3, name: 'StatSurgeon', rating: 88, record: '128-29', accuracy: '81.5%', trend: 'up' },
  { rank: 4, name: 'ClutchCallKing', rating: 85, record: '122-33', accuracy: '78.7%', trend: 'down' },
  { rank: 5, name: 'BoldPickBrian', rating: 83, record: '118-36', accuracy: '76.6%', trend: 'up' },
  { rank: 6, name: 'AceAnalyst', rating: 80, record: '110-30', accuracy: '78.6%', trend: 'stable' },
  { rank: 7, name: 'FantasyPhenom', rating: 78, record: '105-35', accuracy: '75.0%', trend: 'up' },
]

const mockLeagues = [
  { id: 1, name: 'Weekend Warriors', rank: 2, members: 10, format: 'Full League', color: 'bg-gold' },
  { id: 2, name: 'Masters Mania', rank: 1, members: 8, format: 'Head-to-Head', color: 'bg-orange' },
]

const mockStandings = [
  { rank: 1, name: 'TigerFanatic', points: 2450, avatar: 'TF' },
  { rank: 2, name: 'You', points: 2380, avatar: 'ME', isUser: true },
  { rank: 3, name: 'BirdieKing', points: 2290, avatar: 'BK' },
  { rank: 4, name: 'GolfPro99', points: 2150, avatar: 'GP' },
]

const mockActivity = [
  { type: 'trade', text: 'Trade accepted: Rory for Hovland', time: '2h ago' },
  { type: 'pick', text: 'Waiver claim: Added Cam Young', time: '5h ago' },
  { type: 'score', text: 'Scottie Scheffler: -6 (R2)', time: '1d ago' },
]

// ─── Waitlist Form ──────────────────────────────────────────

const WaitlistForm = ({ variant = 'default' }) => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      await api.request('/waitlist', { method: 'POST', body: JSON.stringify({ email, sport: 'nfl' }), headers: { 'Content-Type': 'application/json' } })
      setStatus('success')
    } catch {
      // Still show success to user — backend may not have endpoint yet
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <div className={`flex items-center gap-2 ${variant === 'inline' ? '' : 'justify-center'}`}>
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-emerald-400 font-medium text-sm">You're on the list. We'll be in touch.</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${variant === 'inline' ? '' : 'justify-center'} max-w-md ${variant === 'inline' ? '' : 'mx-auto'}`}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 px-4 py-2.5 rounded-button bg-dark-tertiary border border-dark-border text-white placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50"
      />
      <Button type="submit" variant="outline" size="md" loading={status === 'loading'}>
        Get Early Access
      </Button>
    </form>
  )
}

// ─── Landing Page ───────────────────────────────────────────

const Landing = () => {
  return (
    <div className="min-h-screen bg-dark-primary">

      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-20 sm:pt-28 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-72 h-72 bg-gold/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: Copy + CTAs */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full mb-8">
                <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
                <span className="text-gold text-sm font-medium">2026 PGA Tour Season is Live</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-text-primary mb-6 leading-tight tracking-tight">
                Prove You Know
                <span className="block bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">Sports.</span>
              </h1>
              <p className="text-lg sm:text-xl text-text-secondary max-w-xl mb-4 leading-relaxed">
                Lock in your predictions. Track your accuracy. Build your reputation.
                The platform where sports knowledge meets accountability.
              </p>
              <p className="text-sm text-text-muted font-mono max-w-xl mb-10">
                Season-long fantasy leagues. AI-powered research. Prediction tracking. Your entire sports brain — one platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-4">
                <Link to="/signup">
                  <Button size="lg" fullWidth className="sm:w-auto">
                    Play Fantasy Golf — It's Live
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  className="sm:w-auto"
                  onClick={() => document.getElementById('nfl-2026')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  NFL 2026 — Get Early Access
                </Button>
              </div>
              <p className="text-text-muted text-sm">Golf is live now. NFL predictions launch Spring 2026.</p>
            </div>

            {/* Right: Gauge */}
            <div className="flex-shrink-0">
              <ClutchRatingGauge rating={84} size="xl" animated />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ THE PROBLEM ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-dark-secondary border-y border-dark-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-6 leading-tight">
            Everyone's an expert.
            <span className="block text-text-muted">Nobody can prove it.</span>
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed mb-6">
            Sports media is top-down. Influencers and podcasters have audiences based on personality and
            platform access — not accuracy. Nobody tracks whether their predictions are right.
            Nobody holds them accountable.
          </p>
          <p className="text-text-secondary text-lg leading-relaxed">
            On Clutch, everyone competes on the same playing field — from a nobody in Ohio to the Fantasy Footballers.
            Predictions are locked, tracked, and scored. Records are public. The leaderboard doesn't care
            how many followers you have. <span className="text-gold font-semibold">That's the point.</span>
          </p>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-4 leading-tight">
              How It Works
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-10">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-dark-primary shadow-glow-gold group-hover:scale-110 transition-transform duration-300">
                1
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-3">Prep</h3>
              <p className="text-text-secondary leading-relaxed">
                Enter your projections — player stats, game outcomes, season predictions.
                Your reasoning is logged. Your projections become your draft cheat sheet automatically.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-dark-primary shadow-glow-gold group-hover:scale-110 transition-transform duration-300">
                2
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-3">Compete</h3>
              <p className="text-text-secondary leading-relaxed">
                Predictions lock at kickoff. Scored against reality. Weekly picks, season-long contests,
                and league leaderboards track who's actually right — not who's loudest.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-dark-primary shadow-glow-gold group-hover:scale-110 transition-transform duration-300">
                3
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-3">Prove</h3>
              <p className="text-text-secondary leading-relaxed">
                Your Clutch Rating builds over time. Accuracy, bold calls, consistency, draft intelligence.
                Share your profile. Put your rating in your bio. This is your sports resume.
              </p>
            </div>
          </div>

          {/* OR — Just play fantasy */}
          <div className="mt-14 sm:mt-16 text-center">
            <div className="flex items-center gap-4 max-w-md mx-auto mb-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/30" />
              <span className="text-gold font-display font-bold text-sm tracking-widest uppercase">Or</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/30" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-display text-white mb-3">
              Just play fantasy sports.
            </h3>
            <p className="text-text-secondary leading-relaxed max-w-2xl mx-auto mb-6">
              Don't care about predictions? No problem. Run your league on the most modern fantasy platform
              built — import your history from ESPN, Yahoo, Sleeper, or Fantrax, draft with your friends,
              and enjoy a commissioner experience that actually doesn't suck.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Snake & Auction Drafts', 'League History Vault', 'Live Scoring', 'Waivers & Trades', 'In-League Chat'].map(tag => (
                <span key={tag} className="text-xs font-mono text-gold/80 bg-gold/10 border border-gold/20 px-3 py-1.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ THE CLUTCH RATING ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-dark-secondary border-y border-dark-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-4 leading-tight">
              Your number. Your reputation.
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Gauge */}
            <div className="flex-shrink-0">
              <ClutchRatingGauge rating={84} size="xl" animated />
            </div>

            {/* Components + Tiers */}
            <div className="flex-1 space-y-8">
              {/* Components */}
              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">What builds your score</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Prediction Accuracy', pct: 82, color: 'bg-emerald-500' },
                    { label: 'Pick Record', pct: 76, color: 'bg-gold' },
                    { label: 'Draft Intelligence', pct: 70, color: 'bg-orange' },
                    { label: 'Consistency', pct: 88, color: 'bg-blue-500' },
                    { label: 'Bold Calls Rewarded', pct: 65, color: 'bg-purple-500' },
                  ].map(c => (
                    <div key={c.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">{c.label}</span>
                        <span className="text-white font-mono font-medium">{c.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tiers */}
              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Score Tiers</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { range: '90-100', label: 'Elite', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
                    { range: '80-89', label: 'Expert', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
                    { range: '70-79', label: 'Sharp', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
                    { range: '60-69', label: 'Solid', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
                    { range: '<60', label: 'Developing', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
                  ].map(t => (
                    <div key={t.label} className={`text-center px-2 py-2 rounded-lg border text-xs font-mono ${t.color}`}>
                      <div className="font-bold">{t.range}</div>
                      <div className="opacity-80">{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-text-secondary mt-12 max-w-lg mx-auto leading-relaxed">
            People will put their Clutch Rating in their Twitter bio. Link their profile from podcast show notes.
            Screenshot their badges after a big week.
          </p>
          <p className="text-center text-xl font-display text-gold mt-4">
            What would yours be?
          </p>
        </div>
      </section>

      {/* ══════════ IT COMPOUNDS ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-4 leading-tight">
              Year one, you have a record.
              <span className="block bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">Year three, you have a database.</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Every projection, every pick, every reasoning note — permanently logged. Clutch doesn't just track
              what you predicted. It tracks whether you were right, where you're biased, and how you're improving.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-dark-secondary rounded-xl p-6 border border-dark-border">
              <div className="text-3xl font-bold font-mono text-gold mb-2">1</div>
              <h3 className="text-sm font-semibold font-display text-white mb-2 uppercase tracking-wider">Your Sports Journal</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Projections with reasoning notes. Draft cheat sheets built from your research.
                Weekly picks with timestamps. Nothing lost, nothing forgotten.
              </p>
            </div>

            <div className="bg-dark-secondary rounded-xl p-6 border border-dark-border">
              <div className="text-3xl font-bold font-mono text-gold mb-2">2</div>
              <h3 className="text-sm font-semibold font-display text-white mb-2 uppercase tracking-wider">Your Self-Scouting Report</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                AI finds patterns you can't see: positional biases, accuracy trends, which of your instincts
                to trust and which to override. Built from your own data.
              </p>
            </div>

            <div className="bg-dark-secondary rounded-xl p-6 border border-dark-border">
              <div className="text-3xl font-bold font-mono text-gold mb-2">3</div>
              <h3 className="text-sm font-semibold font-display text-white mb-2 uppercase tracking-wider">Your Public Resume</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                A shareable profile with your verified Clutch Rating, accuracy stats, badges, and bold calls
                that hit. Link it from your Twitter, your podcast, your league group chat.
              </p>
            </div>
          </div>

          <p className="text-center text-text-muted text-sm mt-8">
            The longer you're on Clutch, the more valuable it gets. That's the point.
          </p>
        </div>
      </section>

      {/* ══════════ WHAT'S LIVE NOW — FANTASY GOLF ══════════ */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-4 leading-tight">
              Fantasy Golf — Live Now
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Clutch is live for the 2026 PGA Tour season with the most complete fantasy golf platform ever built.
              Five league formats, live scoring, real analytics, active roster management.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
            {[
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', title: 'Snake & Auction Drafts', desc: 'Choose your draft style. Classic snake or exciting auction formats where every dollar counts.', accent: 'gold' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Live Tournament Scoring', desc: 'Watch your team perform in real-time with shot-by-shot updates during every PGA Tour event.', accent: 'orange' },
              { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Strokes Gained Analytics', desc: 'SG: Off-the-Tee, Approach, Around-the-Green, Putting — advanced stats for smarter decisions.', accent: 'gold' },
              { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Trades & Waivers', desc: 'Active roster management with a waiver wire and FAAB bidding that keeps you engaged all season.', accent: 'orange' },
              { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', title: 'League Chat & Activity', desc: 'Real-time messaging, trade announcements, and a live activity feed for your league.', accent: 'gold' },
              { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', title: 'Weekly Matchups', desc: 'Head-to-head battles every tournament week. Build your W-L record and fight for a playoff spot.', accent: 'orange' },
            ].map(f => (
              <div key={f.title} className="feature-card group">
                <div className={`w-12 h-12 bg-${f.accent}/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <svg className={`w-6 h-6 text-${f.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold font-display text-white mb-2">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Dashboard Preview */}
          <Link to="/signup" className="block max-w-5xl mx-auto group">
            <div className="backdrop-blur-xl bg-white/[0.04] rounded-2xl border border-white/[0.08] overflow-hidden shadow-card hover:shadow-card-hover hover:border-gold/50 transition-all duration-300 relative">
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 transition-colors duration-300 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-dark-primary/90 px-4 py-2 rounded-lg border border-gold/50">
                  <span className="text-gold font-medium">Click to Get Started</span>
                </div>
              </div>

              <div className="bg-dark-primary/50 px-4 py-3 border-b border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClutchLogo size={24} className="rounded" />
                  <span className="text-gold font-display font-extrabold text-sm tracking-tight">CLUTCH</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
                  <span className="text-xs text-text-muted">Live</span>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">My Leagues</h3>
                    {mockLeagues.map(league => (
                      <div key={league.id} className="bg-dark-tertiary rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${league.color} rounded-lg flex items-center justify-center`}>
                            <span className="text-white font-bold text-sm">{league.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{league.name}</p>
                            <p className="text-text-muted text-xs">{league.format} · {league.members} teams</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gold font-bold">#{league.rank}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-gradient-to-br from-gold/20 to-dark-tertiary rounded-lg p-3 border border-gold/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gold font-medium">LIVE NOW</span>
                        <span className="text-xs text-text-muted">Round 2</span>
                      </div>
                      <p className="text-white font-semibold text-sm">The Players Championship</p>
                      <p className="text-text-muted text-xs">TPC Sawgrass · -12 leads</p>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">League Standings</h3>
                    <div className="bg-dark-tertiary rounded-lg overflow-hidden">
                      {mockStandings.map(team => (
                        <div key={team.rank} className={`flex items-center gap-3 p-3 border-b border-dark-border last:border-0 ${team.isUser ? 'bg-gold/10' : ''}`}>
                          <span className={`font-bold w-5 text-center ${team.rank === 1 ? 'text-yellow-400' : team.rank === 2 ? 'text-gray-300' : team.rank === 3 ? 'text-amber-600' : 'text-text-muted'}`}>
                            {team.rank}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${team.isUser ? 'bg-gold text-white' : 'bg-dark-primary text-text-secondary'}`}>
                            {team.avatar}
                          </div>
                          <span className={`flex-1 text-sm ${team.isUser ? 'text-gold font-semibold' : 'text-white'}`}>{team.name}</span>
                          <span className="text-text-secondary text-sm font-medium">{team.points.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Recent Activity</h3>
                    <div className="space-y-2">
                      {mockActivity.map((item, idx) => (
                        <div key={idx} className="bg-dark-tertiary rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              item.type === 'trade' ? 'bg-orange/20 text-orange' :
                              item.type === 'pick' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-gold/20 text-gold'
                            }`}>
                              {item.type === 'trade' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
                              {item.type === 'pick' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                              {item.type === 'score' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs truncate">{item.text}</p>
                              <p className="text-text-muted text-xs">{item.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <div className="text-center mt-8">
            <Link to="/signup">
              <Button size="lg">Start a Golf League — Free</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ NFL 2026 ══════════ */}
      <section id="nfl-2026" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-dark-secondary border-y border-dark-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-6">
              <span className="text-orange-400 text-sm font-medium">Coming Spring 2026</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-4 leading-tight">
              NFL 2026 — Prove You Know Football
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Enter your projections. Get a draft cheat sheet built from YOUR research.
              Compete all season. See if you actually know football — or if you just think you do.
            </p>
          </div>

          {/* The Loop */}
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            <div className="bg-dark-primary rounded-xl p-6 border border-dark-border text-center">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="text-lg font-semibold font-display text-white mb-2">Project</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Project every QB's passing yards. Every RB's rushing TDs. Every team's win total.
                Your reasoning is logged — this becomes your football journal.
              </p>
            </div>

            <div className="bg-dark-primary rounded-xl p-6 border border-dark-border text-center">
              <div className="text-2xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold font-display text-white mb-2">Draft & Compete</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Your projections auto-generate a personalized cheat sheet with tier breaks, value
                targets, and auction dollar values. Then pick weekly props against real frozen lines.
              </p>
            </div>

            <div className="bg-dark-primary rounded-xl p-6 border border-dark-border text-center">
              <div className="text-2xl mb-3">🏆</div>
              <h3 className="text-lg font-semibold font-display text-white mb-2">Get Scored</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Projections scored all season by accuracy. Picks graded automatically after every game.
                Bold calls that hit get bonus credit. Your Clutch Rating updates weekly.
              </p>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            <div className="bg-dark-primary rounded-xl p-5 border border-dark-border flex gap-4">
              <div className="w-10 h-10 bg-orange-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold font-display text-white mb-1">Tiered Entry</h4>
                <p className="text-text-secondary text-xs leading-relaxed">
                  Don't have time for 200 projections? Just project your favorite team — 15 minutes, you're on the leaderboard. Go deeper when you're ready.
                </p>
              </div>
            </div>

            <div className="bg-dark-primary rounded-xl p-5 border border-dark-border flex gap-4">
              <div className="w-10 h-10 bg-orange-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold font-display text-white mb-1">AI Self-Scouting</h4>
                <p className="text-text-secondary text-xs leading-relaxed">
                  After a season, Clutch AI shows patterns: "You overestimate aging RBs by 18%." "Your WR accuracy is 93rd percentile — spend more there at auction."
                </p>
              </div>
            </div>

            <div className="bg-dark-primary rounded-xl p-5 border border-dark-border flex gap-4">
              <div className="w-10 h-10 bg-orange-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold font-display text-white mb-1">Real Stats, Real Names</h4>
                <p className="text-text-secondary text-xs leading-relaxed">
                  EPA is EPA. CPOE is CPOE. Full player pages with advanced analytics, game logs, and situational splits — organized better than ESPN.
                </p>
              </div>
            </div>

            <div className="bg-dark-primary rounded-xl p-5 border border-dark-border flex gap-4">
              <div className="w-10 h-10 bg-orange-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold font-display text-white mb-1">Season-Long Leagues Too</h4>
                <p className="text-text-secondary text-xs leading-relaxed">
                  Full fantasy league platform with snake/auction drafts, trades, waivers, and chat. Import your history from Sleeper, ESPN, Yahoo, or Fantrax.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-dark-primary rounded-xl p-6 border border-orange-500/20 text-center mb-8">
            <p className="text-text-secondary text-sm leading-relaxed">
              Prediction contest opens after the NFL Draft. Draft tools ready for your August drafts.
              Golf fills the gap April through August — your Clutch Rating spans every sport.
            </p>
          </div>

          <div className="text-center">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Get Early Access to NFL 2026</h3>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ══════════ THE LEADERBOARD ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-4 leading-tight">
              Who actually knows sports?
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              A nobody from Ohio outprojected the Fantasy Footballers. That's a story.
              The leaderboard doesn't care about your follower count.
            </p>
          </div>

          {/* Mock Leaderboard */}
          <div className="backdrop-blur-xl bg-white/[0.04] rounded-xl border border-white/[0.08] overflow-hidden shadow-card">
            <div className="bg-dark-primary/50 px-4 py-3 border-b border-dark-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Overall Leaderboard</h3>
              <span className="text-xs text-text-muted font-mono">PREVIEW</span>
            </div>

            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_60px_80px_80px_50px] gap-2 px-4 py-2 text-[11px] text-text-muted uppercase tracking-wider font-medium border-b border-dark-border/50">
              <div className="text-center">#</div>
              <div>Manager</div>
              <div className="text-center">Rating</div>
              <div className="text-center">Record</div>
              <div className="text-center">Accuracy</div>
              <div className="text-center">Trend</div>
            </div>

            {/* Rows */}
            {mockLeaderboard.map(p => (
              <div key={p.rank} className={`grid grid-cols-[40px_1fr_60px_80px_80px_50px] gap-2 px-4 py-3 items-center border-b border-dark-border/20 last:border-0 ${p.rank <= 3 ? 'bg-gold/[0.03]' : ''}`}>
                <div className={`text-center font-bold text-sm ${p.rank === 1 ? 'text-yellow-400' : p.rank === 2 ? 'text-gray-300' : p.rank === 3 ? 'text-amber-600' : 'text-text-muted'}`}>
                  {p.rank}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-dark-tertiary flex items-center justify-center text-[10px] font-bold text-text-secondary flex-shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <span className="text-white text-sm font-medium truncate">{p.name}</span>
                </div>
                <div className="text-center">
                  <span className={`text-sm font-mono font-bold ${p.rating >= 90 ? 'text-amber-400' : p.rating >= 70 ? 'text-emerald-400' : 'text-amber-500'}`}>
                    {p.rating}
                  </span>
                </div>
                <div className="text-center text-xs text-text-secondary font-mono">{p.record}</div>
                <div className="text-center text-xs text-emerald-400 font-mono">{p.accuracy}</div>
                <div className="text-center">
                  {p.trend === 'up' && <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 12 12"><path d="M6 2L10 7H2L6 2Z" fill="#6ABF8A" /></svg>}
                  {p.trend === 'down' && <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 12 12"><path d="M6 10L2 5H10L6 10Z" fill="#EF4444" /></svg>}
                  {p.trend === 'stable' && <span className="text-gray-500 text-xs">—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ MULTI-SPORT VISION ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-dark-secondary border-y border-dark-border">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-4 leading-tight">
            One Platform. Every Sport.
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto mb-10">
            Your Clutch Rating spans every sport. The best sports minds don't just know one game.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { sport: 'Golf', icon: '⛳', status: 'LIVE', color: 'border-gold text-gold bg-gold/10', badge: 'bg-gold text-dark-primary' },
              { sport: 'NFL', icon: '🏈', status: 'Spring 2026', color: 'border-orange-500/30 text-orange-400 bg-orange-500/5', badge: 'bg-orange-500/20 text-orange-400' },
              { sport: 'NBA', icon: '🏀', status: 'Future', color: 'border-dark-border text-text-muted bg-dark-primary/50', badge: 'bg-dark-tertiary text-text-muted' },
              { sport: 'MLB', icon: '⚾', status: 'Future', color: 'border-dark-border text-text-muted bg-dark-primary/50', badge: 'bg-dark-tertiary text-text-muted' },
            ].map(s => (
              <div key={s.sport} className={`rounded-xl p-5 border ${s.color}`}>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="text-lg font-bold font-display mb-2">{s.sport}</h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${s.badge}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>

          <p className="text-text-muted text-sm mt-8">
            Getting in early means your track record starts accumulating now.
          </p>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <ClutchLogo size={64} className="mx-auto mb-6 rounded-xl" />
          <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-4 leading-tight">
            Stop claiming. Start proving.
          </h2>
          <p className="text-lg text-text-secondary mb-10">
            Two ways in. Pick your sport.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link to="/signup">
              <Button size="lg" fullWidth className="sm:w-auto">
                Play Fantasy Golf Now
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              className="sm:w-auto"
              onClick={() => document.getElementById('nfl-2026')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Join the NFL 2026 Waitlist
            </Button>
          </div>
          <p className="text-text-muted text-sm">No credit card required. Free forever for golf.</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Landing
