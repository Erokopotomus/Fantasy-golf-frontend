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
  { id: 1, name: 'Weekend Warriors', rank: 2, members: 10, format: 'Full League', color: 'bg-[#D4930D]' },
  { id: 2, name: 'Masters Mania', rank: 1, members: 8, format: 'Head-to-Head', color: 'bg-[#F06820]' },
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
  const [status, setStatus] = useState('idle')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      await api.request('/waitlist', { method: 'POST', body: JSON.stringify({ email, sport: 'nfl' }), headers: { 'Content-Type': 'application/json' } })
      setStatus('success')
    } catch {
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <div className={`flex items-center gap-2 ${variant === 'inline' ? '' : 'justify-center'}`}>
        <svg className="w-5 h-5 text-[#0D9668]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-[#0D9668] font-medium text-sm">You're on the list. We'll be in touch.</span>
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
        className="flex-1 px-4 py-2.5 rounded-button bg-[var(--surface)] border border-[var(--stone)] text-[var(--text-1)] placeholder-[var(--text-3)] text-sm focus:outline-none focus:ring-2 focus:ring-[#F06820]/50 focus:border-[#F06820]/50"
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
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ══════════ HERO — Always dark slate ══════════ */}
      <section className="relative pt-20 sm:pt-28 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#1E2A3A]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#F06820]/5 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-72 h-72 bg-[#D4930D]/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-12 lg:gap-16">
            {/* Left: Copy + CTAs */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D9668]/15 border border-[#0D9668]/30 rounded-full mb-8">
                <span className="w-2 h-2 bg-[#0D9668] rounded-full animate-pulse" />
                <span className="text-[#14B880] text-sm font-medium">2026 PGA Tour is Live</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-white mb-6 leading-tight tracking-tight">
                Prove You Know
                <span className="block text-[#F06820] font-editorial italic">Sports.</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-xl mb-4 leading-relaxed">
                Lock in your predictions. Track your accuracy.
                <br className="hidden sm:block" />
                <strong className="text-white">The platform where sports knowledge meets accountability.</strong>
              </p>
              <p className="text-sm text-white/40 font-mono max-w-xl mb-10">
                Fantasy leagues · AI research · Prediction tracking
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-4">
                <Link to="/signup">
                  <Button size="lg" fullWidth className="sm:w-auto">
                    Play Fantasy Golf
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    className="sm:w-auto !border-white/20 !text-white hover:!bg-white/10"
                  >
                    NFL — Early Access
                  </Button>
                </Link>
              </div>
              <p className="text-white/40 text-sm">Golf is live now. NFL predictions launch Spring 2026.</p>
            </div>

            {/* Right: Gauge + Sport Badges */}
            <div className="flex-1 flex items-center justify-center gap-8 lg:gap-10">
              <div className="flex-shrink-0 flex flex-col items-center">
                <p className="text-[#D4930D] text-sm font-display font-bold uppercase tracking-widest mb-4">Your Clutch Rating</p>
                <div style={{ width: 280, height: 280 }}>
                  <div className="origin-top-left scale-[1.4]">
                    <ClutchRatingGauge rating={84} size="xl" animated />
                  </div>
                </div>
              </div>
              {/* Sport badges */}
              <div className="flex flex-col gap-5">
                <div className="rounded-xl px-6 py-4 border border-[#0D9668]/40 bg-[#0D9668]/10 flex items-center gap-3">
                  <span className="text-3xl">⛳</span>
                  <div>
                    <span className="text-white font-display font-bold text-base block">Golf</span>
                    <span className="text-[11px] font-mono font-bold text-[#14B880] uppercase">Live</span>
                  </div>
                </div>
                <div className="rounded-xl px-6 py-4 border border-[#F06820]/30 bg-[#F06820]/10 flex items-center gap-3">
                  <span className="text-3xl">🏈</span>
                  <div>
                    <span className="text-white font-display font-bold text-base block">NFL</span>
                    <span className="text-[11px] font-mono font-bold text-[#F06820] uppercase">Spring 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SOCIAL PROOF BANNER — dark teal/slate ══════════ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#2C3E50]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-editorial italic text-white/90 mb-3 leading-tight">
            Everyone's got <span className="text-[#F06820]">opinions.</span>
            <br />
            We've got <span className="text-[#F06820]">receipts.</span>
          </h2>
          <p className="text-white/40 text-xs font-mono uppercase tracking-[0.2em]">
            Clutch Rating — One number for everything you know
          </p>
        </div>
      </section>

      {/* ══════════ WHY CLUTCH — Cream background ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-alt)]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-[2px] bg-[var(--text-3)]" />
              <span className="text-xs font-mono font-bold text-[var(--text-3)] uppercase tracking-widest">Why Clutch</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-[var(--text-1)] mb-4 leading-tight">
              One number for everything
              <br />you <span className="text-[#F06820] font-editorial italic">know.</span>
            </h2>
            <p className="text-[var(--text-2)] max-w-xl leading-relaxed">
              Your Clutch Rating captures league performance, prediction accuracy,
              draft intelligence, and consistency.
            </p>
          </div>

          {/* Feature cards — white bg with colored left borders */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '📊', title: 'Clutch Rating', desc: 'One score proving your sports IQ. Every pick, every bold call feeds it.', borderColor: 'border-l-[#E83838]' },
              { icon: '⚡', title: 'Live Tournaments', desc: 'Real-time leaderboards as PGA events unfold. Shot by shot.', borderColor: 'border-l-[#0D9668]' },
              { icon: '🧠', title: 'Year-Round', desc: "Not a September app. Your brain stays sharp and your rating builds all year.", borderColor: 'border-l-[#D4930D]' },
              { icon: '🎯', title: 'Prediction Tracking', desc: 'Lock in your calls. Track accuracy. Build your reputation over time.', borderColor: 'border-l-[#F06820]' },
              { icon: '🤖', title: 'AI Research', desc: 'Scout reports, matchup sims, and personalized coaching powered by AI.', borderColor: 'border-l-[#6366F1]' },
              { icon: '🏆', title: 'League Vault', desc: 'Import your history from ESPN, Yahoo, Sleeper, or Fantrax. Nothing gets lost.', borderColor: 'border-l-[#0D9668]' },
            ].map(f => (
              <div key={f.title} className={`bg-[var(--surface)] rounded-xl p-6 border border-[var(--card-border)] border-l-4 ${f.borderColor} hover:shadow-lg transition-all duration-300`}>
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-lg font-semibold font-display text-[var(--text-1)] mb-2">{f.title}</h3>
                <p className="text-[var(--text-2)] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ THE CLUTCH RATING ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-1)] mb-4 leading-tight">
              One number for everything you know.
            </h2>
            <p className="text-[var(--text-2)] max-w-xl mx-auto leading-relaxed">
              Your Clutch Rating is the single score that captures it all — league performance, prediction accuracy,
              draft intelligence, consistency across sports. Like a credit score for sports knowledge.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-shrink-0">
              <ClutchRatingGauge rating={84} size="xl" animated />
            </div>

            <div className="flex-1 space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-3)] uppercase tracking-wider mb-4">What builds your score</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Prediction Accuracy', pct: 82, color: 'bg-[#0D9668]' },
                    { label: 'Pick Record', pct: 76, color: 'bg-[#D4930D]' },
                    { label: 'Draft Intelligence', pct: 70, color: 'bg-[#F06820]' },
                    { label: 'Consistency', pct: 88, color: 'bg-[#3B82F6]' },
                    { label: 'Bold Calls Rewarded', pct: 65, color: 'bg-[#8B5CF6]' },
                  ].map(c => (
                    <div key={c.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--text-2)]">{c.label}</span>
                        <span className="text-[var(--text-1)] font-mono font-medium">{c.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[var(--stone)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">Score Tiers</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { range: '90-100', label: 'Elite', color: 'text-[#D4930D] bg-[#D4930D]/10 border-[#D4930D]/20' },
                    { range: '80-89', label: 'Expert', color: 'text-[#0D9668] bg-[#0D9668]/10 border-[#0D9668]/20' },
                    { range: '70-79', label: 'Sharp', color: 'text-[#0D9668] bg-[#0D9668]/10 border-[#0D9668]/20' },
                    { range: '60-69', label: 'Solid', color: 'text-[#F06820] bg-[#F06820]/10 border-[#F06820]/20' },
                    { range: '<60', label: 'Developing', color: 'text-[var(--text-3)] bg-[var(--glass)] border-[var(--stone)]' },
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

          <p className="text-center text-[var(--text-2)] mt-12 max-w-lg mx-auto leading-relaxed">
            Every league you play, every projection you make, every bold call that hits — it all feeds your rating.
            Put it in your bio. Link your profile from your podcast. It's the number that proves you're not just talking.
          </p>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-alt)] border-y border-[var(--card-border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-1)] mb-4 leading-tight">
              How It Works
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-10">
            {[
              { num: '1', title: 'Play', desc: 'Run your season-long league on the most modern fantasy platform built. Snake or auction drafts, trades, waivers, live scoring, in-league chat. Import your history from ESPN, Yahoo, Sleeper, or Fantrax.' },
              { num: '2', title: 'Track', desc: "Lock in projections and weekly picks. Everything gets logged — your reasoning, your accuracy, your draft decisions. Over time, Clutch becomes your sports brain." },
              { num: '3', title: 'Prove', desc: "Your Clutch Rating builds from everything you do — league results, prediction accuracy, bold calls, draft intelligence. Share your profile. This is your sports resume." },
            ].map(step => (
              <div key={step.num} className="text-center group">
                <div className="w-16 h-16 bg-[#F06820] rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {step.num}
                </div>
                <h3 className="text-xl font-semibold font-display text-[var(--text-1)] mb-3">{step.title}</h3>
                <p className="text-[var(--text-2)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
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
        </div>
      </section>

      {/* ══════════ WHAT'S LIVE NOW — FANTASY GOLF ══════════ */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-1)] mb-4 leading-tight">
              Fantasy Golf — Live Now
            </h2>
            <p className="text-[var(--text-2)] max-w-2xl mx-auto leading-relaxed">
              Clutch is live for the 2026 PGA Tour season with the most complete fantasy golf platform ever built.
              Five league formats, live scoring, real analytics, active roster management.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
            {[
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', title: 'Snake & Auction Drafts', desc: 'Choose your draft style. Classic snake or exciting auction formats where every dollar counts.', color: '#D4930D' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Live Tournament Scoring', desc: 'Watch your team perform in real-time with shot-by-shot updates during every PGA Tour event.', color: '#F06820' },
              { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Strokes Gained Analytics', desc: 'SG: Off-the-Tee, Approach, Around-the-Green, Putting — advanced stats for smarter decisions.', color: '#0D9668' },
              { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Trades & Waivers', desc: 'Active roster management with a waiver wire and FAAB bidding that keeps you engaged all season.', color: '#F06820' },
              { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', title: 'League Chat & Activity', desc: 'Real-time messaging, trade announcements, and a live activity feed for your league.', color: '#D4930D' },
              { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', title: 'Weekly Matchups', desc: 'Head-to-head battles every tournament week. Build your W-L record and fight for a playoff spot.', color: '#0D9668' },
            ].map(f => (
              <div key={f.title} className="bg-[var(--surface)] rounded-xl p-6 border border-[var(--card-border)] hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${f.color}20` }}>
                  <svg className="w-6 h-6" style={{ color: f.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold font-display text-[var(--text-1)] mb-2">{f.title}</h3>
                <p className="text-[var(--text-2)] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Dashboard Preview */}
          <Link to="/signup" className="block max-w-5xl mx-auto group">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--card-border)] overflow-hidden shadow-lg hover:shadow-xl hover:border-[#D4930D]/30 transition-all duration-300 relative">
              <div className="absolute inset-0 bg-[#D4930D]/0 group-hover:bg-[#D4930D]/5 transition-colors duration-300 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-[#1E2A3A]/90 px-4 py-2 rounded-lg border border-[#D4930D]/50">
                  <span className="text-[#D4930D] font-medium">Click to Get Started</span>
                </div>
              </div>

              <div className="bg-[#1E2A3A] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClutchLogo size={24} className="rounded" />
                  <span className="text-[#F06820] font-display font-extrabold text-sm tracking-tight">CLUTCH</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#D4930D] rounded-full animate-pulse" />
                  <span className="text-xs text-white/50">Live</span>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">My Leagues</h3>
                    {mockLeagues.map(league => (
                      <div key={league.id} className="bg-[var(--surface-alt)] rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${league.color} rounded-lg flex items-center justify-center`}>
                            <span className="text-white font-bold text-sm">{league.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-1)] font-medium text-sm truncate">{league.name}</p>
                            <p className="text-[var(--text-3)] text-xs">{league.format} · {league.members} teams</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#D4930D] font-bold">#{league.rank}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-[#D4930D]/10 rounded-lg p-3 border border-[#D4930D]/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#D4930D] font-medium">LIVE NOW</span>
                        <span className="text-xs text-[var(--text-3)]">Round 2</span>
                      </div>
                      <p className="text-[var(--text-1)] font-semibold text-sm">The Players Championship</p>
                      <p className="text-[var(--text-3)] text-xs">TPC Sawgrass · -12 leads</p>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <h3 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">League Standings</h3>
                    <div className="bg-[var(--surface-alt)] rounded-lg overflow-hidden">
                      {mockStandings.map(team => (
                        <div key={team.rank} className={`flex items-center gap-3 p-3 border-b border-[var(--card-border)] last:border-0 ${team.isUser ? 'bg-[#D4930D]/10' : ''}`}>
                          <span className={`font-bold w-5 text-center ${team.rank === 1 ? 'text-[#D4930D]' : team.rank === 2 ? 'text-gray-400' : team.rank === 3 ? 'text-amber-700' : 'text-[var(--text-3)]'}`}>
                            {team.rank}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${team.isUser ? 'bg-[#D4930D] text-white' : 'bg-[var(--stone)] text-[var(--text-2)]'}`}>
                            {team.avatar}
                          </div>
                          <span className={`flex-1 text-sm ${team.isUser ? 'text-[#D4930D] font-semibold' : 'text-[var(--text-1)]'}`}>{team.name}</span>
                          <span className="text-[var(--text-2)] text-sm font-medium">{team.points.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <h3 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">Recent Activity</h3>
                    <div className="space-y-2">
                      {mockActivity.map((item, idx) => (
                        <div key={idx} className="bg-[var(--surface-alt)] rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              item.type === 'trade' ? 'bg-[#F06820]/20 text-[#F06820]' :
                              item.type === 'pick' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' :
                              'bg-[#D4930D]/20 text-[#D4930D]'
                            }`}>
                              {item.type === 'trade' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
                              {item.type === 'pick' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                              {item.type === 'score' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[var(--text-1)] text-xs truncate">{item.text}</p>
                              <p className="text-[var(--text-3)] text-xs">{item.time}</p>
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

      {/* ══════════ IT COMPOUNDS ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-alt)] border-y border-[var(--card-border)]">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center mb-16">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-1)] mb-4 leading-tight">
                Year one, you have a record.
                <span className="block text-[#F06820] font-editorial italic">Year three, you have a database.</span>
              </h2>
              <p className="text-[var(--text-2)] leading-relaxed mb-6">
                Every projection, every pick, every reasoning note — permanently logged. Clutch doesn't just track
                what you predicted. It tracks whether you were right, where you were biased, and how you're improving.
                This is the home for how you think about sports — and no one else is building it.
              </p>
              <p className="text-[#F06820] font-display font-semibold text-lg">
                One place for everything you know. One score to prove it.
              </p>
            </div>

            <div>
              <svg viewBox="0 0 500 500" className="w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(240,104,32,0.12)" />
                    <stop offset="100%" stopColor="rgba(240,104,32,0)" />
                  </radialGradient>
                  <marker id="flowArrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                    <polygon points="0 1, 9 4, 0 7" fill="rgba(212,147,13,0.5)" />
                  </marker>
                </defs>
                <circle cx="250" cy="250" r="120" fill="url(#coreGlow)" />
                <circle cx="250" cy="250" r="190" fill="none" stroke="var(--stone)" strokeWidth="50" opacity="0.3" />
                <circle cx="250" cy="250" r="190" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.3" />
                {[
                  { from: -90, to: -18, color: '#D4930D' },
                  { from: -18, to: 54, color: '#F06820' },
                  { from: 54, to: 126, color: '#0D9668' },
                  { from: 126, to: 198, color: '#6366F1' },
                  { from: 198, to: 270, color: '#D4930D' },
                ].map((arc, i) => {
                  const r1 = (arc.from + 16) * Math.PI / 180
                  const r2 = (arc.to - 16) * Math.PI / 180
                  const x1 = 250 + 190 * Math.cos(r1)
                  const y1 = 250 + 190 * Math.sin(r1)
                  const x2 = 250 + 190 * Math.cos(r2)
                  const y2 = 250 + 190 * Math.sin(r2)
                  return (
                    <path key={i} d={`M ${x1} ${y1} A 190 190 0 0 1 ${x2} ${y2}`}
                      fill="none" stroke={arc.color} strokeWidth="2.5" strokeLinecap="round"
                      opacity="0.5" markerEnd="url(#flowArrow)" />
                  )
                })}
                {[
                  { angle: -90, label: 'Research', color: '#D4930D' },
                  { angle: -18, label: 'Project', color: '#F06820' },
                  { angle: 54, label: 'Draft', color: '#0D9668' },
                  { angle: 126, label: 'Compete', color: '#6366F1' },
                  { angle: 198, label: 'Learn', color: '#D4930D' },
                ].map((node, i) => {
                  const rad = node.angle * Math.PI / 180
                  const nx = 250 + 190 * Math.cos(rad)
                  const ny = 250 + 190 * Math.sin(rad)
                  return (
                    <g key={i}>
                      <circle cx={nx} cy={ny} r="32" fill="var(--surface)" stroke={node.color} strokeWidth="2" />
                      <text x={nx} y={ny + 4} textAnchor="middle" fill="var(--text-1)" fontSize="12"
                        fontFamily="'DM Sans', sans-serif" fontWeight="700">{node.label}</text>
                    </g>
                  )
                })}
                <circle cx="250" cy="250" r="65" fill="rgba(240,104,32,0.06)" stroke="rgba(240,104,32,0.2)" strokeWidth="1.5" />
                <text x="250" y="233" textAnchor="middle" fill="#F06820" fontSize="18" fontFamily="'DM Sans', sans-serif" fontWeight="800">&#x2726;</text>
                <text x="250" y="252" textAnchor="middle" fill="#D4930D" fontSize="11" fontFamily="'DM Sans', sans-serif" fontWeight="700" letterSpacing="2">CLUTCH RATING</text>
                <text x="250" y="268" textAnchor="middle" fill="var(--text-1)" fontSize="10" fontFamily="'DM Sans', sans-serif" fontWeight="700" letterSpacing="1.5">SPORTS BRAIN</text>
                <text x="250" y="283" textAnchor="middle" fill="var(--text-3)" fontSize="9" fontFamily="'DM Sans', sans-serif" fontWeight="500" letterSpacing="1">AI INSIGHTS</text>
              </svg>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { num: '1', title: 'Your Sports Journal', desc: 'Projections with reasoning notes. Draft cheat sheets built from your research. Weekly picks with timestamps. Nothing lost, nothing forgotten.' },
              { num: '2', title: 'Your Self-Scouting Report', desc: "AI surfaces patterns you can't see yourself: positional biases, accuracy trends, draft tendencies. Evaluate your own thinking over time." },
              { num: '3', title: 'Your Public Resume', desc: 'A shareable profile with your verified Clutch Rating, accuracy stats, badges, and bold calls that hit. Link it from your Twitter, your podcast.' },
            ].map(card => (
              <div key={card.num} className="bg-[var(--surface)] rounded-xl p-6 border border-[var(--card-border)]">
                <div className="text-3xl font-bold font-mono text-[#F06820] mb-2">{card.num}</div>
                <h3 className="text-sm font-semibold font-display text-[var(--text-1)] mb-2 uppercase tracking-wider">{card.title}</h3>
                <p className="text-[var(--text-2)] text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-[var(--text-3)] text-sm mt-8">
            The longer you're on Clutch, the more valuable it gets. That's the point.
          </p>
        </div>
      </section>

      {/* ══════════ NFL 2026 ══════════ */}
      <section id="nfl-2026" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F06820]/10 border border-[#F06820]/20 rounded-full mb-6">
              <span className="text-[#F06820] text-sm font-medium">Coming Spring 2026</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-1)] mb-4 leading-tight">
              NFL 2026 — Prove You Know Football
            </h2>
            <p className="text-[var(--text-2)] max-w-2xl mx-auto leading-relaxed">
              Enter your projections. Get a draft cheat sheet built from YOUR research.
              Compete all season. See if you actually know football — or if you just think you do.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { emoji: '📊', title: 'Project', desc: "Project every QB's passing yards. Every RB's rushing TDs. Every team's win total. Your reasoning is logged — this becomes your football journal." },
              { emoji: '🎯', title: 'Draft & Compete', desc: 'Your projections auto-generate a personalized cheat sheet with tier breaks, value targets, and auction dollar values. Then pick weekly props against real frozen lines.' },
              { emoji: '🏆', title: 'Get Scored', desc: 'Projections scored all season by accuracy. Picks graded automatically after every game. Bold calls that hit get bonus credit. Your Clutch Rating updates weekly.' },
            ].map(card => (
              <div key={card.title} className="bg-[var(--surface)] rounded-xl p-6 border border-[var(--card-border)] text-center">
                <div className="text-2xl mb-3">{card.emoji}</div>
                <h3 className="text-lg font-semibold font-display text-[var(--text-1)] mb-2">{card.title}</h3>
                <p className="text-[var(--text-2)] text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {[
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', title: 'Tiered Entry', desc: "Don't have time for 200 projections? Just project your favorite team — 15 minutes, you're on the leaderboard." },
              { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', title: 'AI Self-Scouting', desc: 'After a season, Clutch AI shows patterns: "You overestimate aging RBs by 18%."' },
              { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', title: 'Real Stats, Real Names', desc: 'EPA is EPA. CPOE is CPOE. Full player pages with advanced analytics and game logs.' },
              { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Season-Long Leagues Too', desc: 'Full fantasy league platform with snake/auction drafts, trades, waivers, and chat.' },
            ].map(card => (
              <div key={card.title} className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--card-border)] flex gap-4">
                <div className="w-10 h-10 bg-[#F06820]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#F06820]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold font-display text-[var(--text-1)] mb-1">{card.title}</h4>
                  <p className="text-[var(--text-2)] text-xs leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[var(--surface)] rounded-xl p-6 border border-[#F06820]/20 text-center mb-8">
            <p className="text-[var(--text-2)] text-sm leading-relaxed">
              Prediction contest opens after the NFL Draft. Draft tools ready for your August drafts.
              Golf fills the gap April through August — your Clutch Rating spans every sport.
            </p>
          </div>

          <div className="text-center">
            <h3 className="text-lg font-display font-semibold text-[var(--text-1)] mb-4">Get Early Access to NFL 2026</h3>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ══════════ THE LEADERBOARD ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-alt)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-4xl font-bold font-display text-[var(--text-1)] mb-4 leading-tight">
              Who actually knows sports?
            </h2>
            <p className="text-[var(--text-2)] max-w-xl mx-auto">
              A nobody from Ohio outprojected the Fantasy Footballers. That's a story.
              The leaderboard doesn't care about your follower count.
            </p>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--card-border)] overflow-hidden shadow-lg">
            <div className="bg-[#1E2A3A] px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Overall Leaderboard</h3>
              <span className="text-xs text-white/50 font-mono">PREVIEW</span>
            </div>

            <div className="grid grid-cols-[40px_1fr_60px_80px_80px_50px] gap-2 px-4 py-2 text-[11px] text-[var(--text-3)] uppercase tracking-wider font-medium border-b border-[var(--card-border)]">
              <div className="text-center">#</div>
              <div>Manager</div>
              <div className="text-center">Rating</div>
              <div className="text-center">Record</div>
              <div className="text-center">Accuracy</div>
              <div className="text-center">Trend</div>
            </div>

            {mockLeaderboard.map(p => (
              <div key={p.rank} className={`grid grid-cols-[40px_1fr_60px_80px_80px_50px] gap-2 px-4 py-3 items-center border-b border-[var(--card-border)] last:border-0 ${p.rank <= 3 ? 'bg-[#D4930D]/5' : ''}`}>
                <div className={`text-center font-bold text-sm ${p.rank === 1 ? 'text-[#D4930D]' : p.rank === 2 ? 'text-gray-400' : p.rank === 3 ? 'text-amber-700' : 'text-[var(--text-3)]'}`}>
                  {p.rank}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[var(--stone)] flex items-center justify-center text-[10px] font-bold text-[var(--text-2)] flex-shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <span className="text-[var(--text-1)] text-sm font-medium truncate">{p.name}</span>
                </div>
                <div className="text-center">
                  <span className={`text-sm font-mono font-bold ${p.rating >= 90 ? 'text-[#D4930D]' : p.rating >= 70 ? 'text-[#0D9668]' : 'text-[#F06820]'}`}>
                    {p.rating}
                  </span>
                </div>
                <div className="text-center text-xs text-[var(--text-2)] font-mono">{p.record}</div>
                <div className="text-center text-xs text-[#0D9668] font-mono">{p.accuracy}</div>
                <div className="text-center">
                  {p.trend === 'up' && <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 12 12"><path d="M6 2L10 7H2L6 2Z" fill="#0D9668" /></svg>}
                  {p.trend === 'down' && <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 12 12"><path d="M6 10L2 5H10L6 10Z" fill="#E83838" /></svg>}
                  {p.trend === 'stable' && <span className="text-[var(--text-3)] text-xs">—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA — Dark background ══════════ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#111318]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold font-display text-white mb-4 leading-tight">
            Ready to prove <span className="text-[#F06820] font-editorial italic">it?</span>
          </h2>
          <p className="text-lg text-white/60 mb-10">
            Golf season is live. Get in before your friends do.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link to="/signup">
              <Button size="lg" fullWidth className="sm:w-auto">
                Start Playing — Free
              </Button>
            </Link>
            <button
              onClick={() => document.getElementById('nfl-2026')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center font-semibold rounded-button px-6 py-3 text-base border border-white/20 text-white hover:bg-white/10 active:scale-[0.98] transition-all duration-300"
            >
              Learn More
            </button>
          </div>
          <p className="text-white/40 text-sm">No credit card required. Free forever for golf.</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Landing
