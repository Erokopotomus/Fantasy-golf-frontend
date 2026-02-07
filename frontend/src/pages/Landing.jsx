import { Link } from 'react-router-dom'
import Footer from '../components/layout/Footer'
import ClutchLogo from '../components/common/ClutchLogo'
import Button from '../components/common/Button'

// Mock data for dashboard preview
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

const Landing = () => {
  return (
    <div className="min-h-screen bg-dark-primary">

      {/* Hero Section - Golf focused */}
      <section className="relative pt-20 sm:pt-28 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-72 h-72 bg-gold/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          {/* Sport badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full">
              <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
              <span className="text-gold text-sm font-medium">2026 PGA Tour Season is Live</span>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold font-display text-text-primary mb-6 leading-tight tracking-tight">
              Fantasy Sports,
              <span className="block bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">Redefined.</span>
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              Draft your roster, compete in head-to-head matchups, and dominate your league
              all season long. The most complete fantasy golf platform ever built.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link to="/signup">
                <Button size="lg" fullWidth className="sm:w-auto">
                  Start Playing Free
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                className="sm:w-auto"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </div>
            <p className="text-text-muted text-sm">No credit card required. Free forever for golf.</p>
          </div>

          {/* Dashboard Preview */}
          <Link to="/signup" className="block max-w-5xl mx-auto mt-12 sm:mt-16 group">
            <div className="backdrop-blur-xl bg-white/[0.04] rounded-2xl border border-white/[0.08] overflow-hidden shadow-card hover:shadow-card-hover hover:border-gold/50 transition-all duration-300 relative">
              {/* Click overlay hint */}
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 transition-colors duration-300 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-dark-primary/90 px-4 py-2 rounded-lg border border-gold/50">
                  <span className="text-gold font-medium">Click to Get Started</span>
                </div>
              </div>

              {/* Mini Dashboard Header */}
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

              {/* Dashboard Content */}
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left: My Leagues */}
                  <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">My Leagues</h3>
                    {mockLeagues.map(league => (
                      <div key={league.id} className="bg-dark-tertiary rounded-lg p-3 hover:bg-dark-tertiary/70 transition-colors">
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

                    {/* Tournament Card */}
                    <div className="bg-gradient-to-br from-gold/20 to-dark-tertiary rounded-lg p-3 border border-gold/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gold font-medium">LIVE NOW</span>
                        <span className="text-xs text-text-muted">Round 2</span>
                      </div>
                      <p className="text-white font-semibold text-sm">The Players Championship</p>
                      <p className="text-text-muted text-xs">TPC Sawgrass · -12 leads</p>
                    </div>
                  </div>

                  {/* Center: Standings */}
                  <div className="lg:col-span-1">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">League Standings</h3>
                    <div className="bg-dark-tertiary rounded-lg overflow-hidden">
                      {mockStandings.map(team => (
                        <div
                          key={team.rank}
                          className={`flex items-center gap-3 p-3 border-b border-dark-border last:border-0 ${team.isUser ? 'bg-gold/10' : ''}`}
                        >
                          <span className={`font-bold w-5 text-center ${team.rank === 1 ? 'text-yellow-400' : team.rank === 2 ? 'text-gray-300' : team.rank === 3 ? 'text-amber-600' : 'text-text-muted'}`}>
                            {team.rank}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${team.isUser ? 'bg-gold text-white' : 'bg-dark-primary text-text-secondary'}`}>
                            {team.avatar}
                          </div>
                          <span className={`flex-1 text-sm ${team.isUser ? 'text-gold font-semibold' : 'text-white'}`}>
                            {team.name}
                          </span>
                          <span className="text-text-secondary text-sm font-medium">{team.points.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Activity */}
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
                              {item.type === 'trade' && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              )}
                              {item.type === 'pick' && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              )}
                              {item.type === 'score' && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                              )}
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
        </div>
      </section>

      {/* Sport Selector / Multi-Sport Teaser */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-dark-secondary border-y border-dark-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white mb-3">One Platform, Every Sport</h2>
            <p className="text-text-secondary">Golf is live now. Football and basketball are coming this fall.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Golf - Active */}
            <div className="relative bg-dark-primary rounded-xl p-6 border-2 border-gold shadow-glow-gold group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-gold text-white text-xs font-bold rounded-full uppercase tracking-wide">Live Now</span>
              </div>
              <div className="text-center pt-2">
                <div className="w-16 h-16 mx-auto mb-4 bg-gold/20 rounded-2xl flex items-center justify-center">
                  {/* Golf flag icon */}
                  <svg className="w-8 h-8 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="3" x2="12" y2="20" />
                    <path d="M12 3 L12 3 Q10 5, 7 4.5 Q5 4, 4 5.5 L4 10 Q5 8.5, 7 9 Q10 9.5, 12 7.5" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="21" r="1.5" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold font-display text-white mb-1">Golf</h3>
                <p className="text-gold text-sm font-medium mb-3">2026 PGA Tour Season</p>
                <p className="text-text-secondary text-sm">Snake drafts, auction drafts, head-to-head matchups, survivor, and more.</p>
                <Link to="/signup" className="inline-block mt-4 px-5 py-2 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-bright transition-colors">
                  Play Now
                </Link>
              </div>
            </div>

            {/* Football - Coming Soon */}
            <div className="relative bg-dark-primary rounded-xl p-6 border border-dark-border opacity-80 group hover:opacity-100 transition-opacity">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-dark-tertiary text-text-secondary text-xs font-bold rounded-full uppercase tracking-wide">Fall 2026</span>
              </div>
              <div className="text-center pt-2">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                  {/* Football icon */}
                  <svg className="w-8 h-8 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-30 12 12)" />
                    <path d="M6.5 6.5 L17.5 17.5" />
                    <path d="M10 9 L14 9" />
                    <path d="M10 15 L14 15" />
                    <path d="M9 12 L15 12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold font-display text-white mb-1">Football</h3>
                <p className="text-orange-400 text-sm font-medium mb-3">NFL Season</p>
                <p className="text-text-muted text-sm">Same great platform. Snake, auction, dynasty, and best ball leagues.</p>
                <div className="mt-4 px-5 py-2 bg-dark-tertiary text-text-muted text-sm font-medium rounded-lg inline-block">
                  Coming Soon
                </div>
              </div>
            </div>

            {/* Basketball - Coming Soon */}
            <div className="relative bg-dark-primary rounded-xl p-6 border border-dark-border opacity-80 group hover:opacity-100 transition-opacity">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-dark-tertiary text-text-secondary text-xs font-bold rounded-full uppercase tracking-wide">Fall 2026</span>
              </div>
              <div className="text-center pt-2">
                <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                  {/* Basketball icon */}
                  <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12 L22 12" />
                    <path d="M12 2 C8 6, 8 18, 12 22" />
                    <path d="M12 2 C16 6, 16 18, 12 22" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold font-display text-white mb-1">Basketball</h3>
                <p className="text-amber-400 text-sm font-medium mb-3">NBA Season</p>
                <p className="text-text-muted text-sm">Head-to-head categories, points leagues, and dynasty formats.</p>
                <div className="mt-4 px-5 py-2 bg-dark-tertiary text-text-muted text-sm font-medium rounded-lg inline-block">
                  Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Golf Features Section */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Built for Golf Fans
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Every feature designed around the PGA Tour schedule, real tournaments,
              and the way golf fans actually watch and follow the game.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-2">Snake & Auction Drafts</h3>
              <p className="text-text-secondary leading-relaxed">
                Choose your draft style. Classic snake drafts or exciting auction formats
                where every dollar counts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-orange/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-2">Live Tournament Scoring</h3>
              <p className="text-text-secondary leading-relaxed">
                Watch your team perform in real-time with shot-by-shot updates
                during every PGA Tour event.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-2">Strokes Gained Analytics</h3>
              <p className="text-text-secondary leading-relaxed">
                Advanced stats including SG: Off-the-Tee, Approach, Around-the-Green, and Putting
                for smarter decisions.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-orange/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-2">Trades & Waivers</h3>
              <p className="text-text-secondary leading-relaxed">
                Active roster management with a waiver wire and trade system
                that keeps you engaged all season.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-2">League Chat & Activity</h3>
              <p className="text-text-secondary leading-relaxed">
                Real-time messaging, trade announcements, and a live activity feed
                to keep your league buzzing.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-orange/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-2">Weekly Matchups</h3>
              <p className="text-text-secondary leading-relaxed">
                Head-to-head battles every tournament week. Build your W-L record
                and fight for a playoff spot.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* League Formats Section */}
      <section id="formats" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-dark-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              5 Ways to Play
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Choose your competition style. From classic season-long leagues to unique formats
              you won't find anywhere else.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Full League */}
            <div className="bg-dark-primary rounded-xl p-6 border border-dark-border hover:border-gold/50 transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gold/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white">Full League</h3>
                  <span className="text-xs text-gold font-medium">CLASSIC</span>
                </div>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                Draft your team and accumulate points all season. Highest total points wins.
                The traditional fantasy experience.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Snake Draft</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Auction Draft</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Trades</span>
              </div>
            </div>

            {/* Head-to-Head */}
            <div className="bg-dark-primary rounded-xl p-6 border border-dark-border hover:border-orange/50 transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-orange/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white">Head-to-Head</h3>
                  <span className="text-xs text-orange font-medium">COMPETITIVE</span>
                </div>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                Face off against a different opponent each week. Build your W-L record and
                compete for a playoff spot.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Weekly Matchups</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Playoffs</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">W-L Record</span>
              </div>
            </div>

            {/* Roto */}
            <div className="bg-dark-primary rounded-xl p-6 border border-dark-border hover:border-purple-500/50 transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white">Roto</h3>
                  <span className="text-xs text-purple-400 font-medium">STRATEGIC</span>
                </div>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                Compete across multiple statistical categories. Your rank in each category
                adds up to your total roto score.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">6-10 Categories</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Balanced Teams</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Deep Strategy</span>
              </div>
            </div>

            {/* Survivor */}
            <div className="bg-dark-primary rounded-xl p-6 border border-dark-border hover:border-red-500/50 transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white">Survivor</h3>
                  <span className="text-xs text-red-400 font-medium">INTENSE</span>
                </div>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                The lowest-scoring team each week is eliminated. Last team standing wins.
                High stakes every tournament.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Elimination</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Buy-Backs</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Last Standing</span>
              </div>
            </div>

            {/* One-and-Done */}
            <div className="bg-dark-primary rounded-xl p-6 border border-dark-border hover:border-yellow-500/50 transition-all duration-300 group sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white">One-and-Done</h3>
                  <span className="text-xs text-yellow-400 font-medium">UNIQUE</span>
                </div>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                Pick one golfer per tournament - but you can only use each player once all season.
                No draft required. Tier multipliers reward bold picks.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">No Draft</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Tier Multipliers</span>
                <span className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-muted">Use Once</span>
              </div>
            </div>

            {/* Coming Soon Teaser */}
            <div className="bg-dark-primary/50 rounded-xl p-6 border border-dashed border-dark-border flex items-center justify-center">
              <div className="text-center">
                <p className="text-text-muted text-sm mb-1">More formats coming soon</p>
                <p className="text-text-secondary text-xs">Best Ball, Salary Cap, and more...</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Tee Off in 3 Steps
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Get started in minutes and compete all season long.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-8">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-white shadow-glow-gold group-hover:scale-110 transition-transform duration-300">
                1
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-2">Create or Join a League</h3>
              <p className="text-text-secondary leading-relaxed">
                Start your own league with custom scoring and settings, or join one
                your friends already created.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-white shadow-glow-gold group-hover:scale-110 transition-transform duration-300">
                2
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-2">Draft Your Roster</h3>
              <p className="text-text-secondary leading-relaxed">
                Build your team through a real-time snake or auction draft. Every pick
                matters from round one.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-white shadow-glow-gold group-hover:scale-110 transition-transform duration-300">
                3
              </div>
              <h3 className="text-xl font-semibold font-display text-white mb-2">Compete Every Week</h3>
              <p className="text-text-secondary leading-relaxed">
                Set lineups, make trades, trash talk in the chat, and climb the standings
                throughout the PGA Tour season.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-dark-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <ClutchLogo size={64} className="mx-auto mb-6 rounded-xl" />
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            The Season is Underway.
          </h2>
          <p className="text-lg sm:text-xl text-text-secondary mb-8 leading-relaxed">
            Create a league, invite your friends, and make your clutch moves before it's too late.
          </p>
          <Link to="/signup">
            <Button size="lg">
              Start Playing Free
            </Button>
          </Link>
          <p className="text-text-muted text-sm mt-4">Golf is live now. Football & basketball coming Fall 2026.</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Landing
