import { Link } from 'react-router-dom'
import Footer from '../components/layout/Footer'
import Button from '../components/common/Button'

const Landing = () => {
  return (
    <div className="min-h-screen bg-dark-primary">

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Season-Long Fantasy Golf
            <span className="block text-accent-green">Like Never Before</span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Draft your dream team, compete with friends all season, and experience
            fantasy golf the way it should be played.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" fullWidth className="sm:w-auto">
                Get Started Free
              </Button>
            </Link>
            <Link to="/#how-it-works">
              <Button variant="outline" size="lg" fullWidth className="sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Image Placeholder */}
        <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
          <div className="bg-dark-secondary rounded-2xl border border-dark-border p-6 sm:p-8 aspect-video flex items-center justify-center shadow-card hover:shadow-card-hover transition-all duration-300">
            <div className="text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-text-secondary">Dashboard Preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-dark-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Everything You Need to Win
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Built by golf fans, for golf fans. Experience the most comprehensive
              fantasy golf platform available.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-accent-green/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Snake & Auction Drafts</h3>
              <p className="text-text-secondary leading-relaxed">
                Choose your draft style. Classic snake drafts or exciting auction formats
                where every dollar counts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-accent-blue/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Live Scoring</h3>
              <p className="text-text-secondary leading-relaxed">
                Watch your team perform in real-time with shot-by-shot updates
                during every tournament.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-accent-green/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Advanced Analytics</h3>
              <p className="text-text-secondary leading-relaxed">
                Make informed decisions with strokes gained stats, course history,
                and AI-powered insights.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-accent-blue/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Trades & Waivers</h3>
              <p className="text-text-secondary leading-relaxed">
                Active roster management with a waiver wire and trade system
                that keeps you engaged all season.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-accent-green/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">League Chat</h3>
              <p className="text-text-secondary leading-relaxed">
                Talk trash, discuss trades, and stay connected with your league
                through built-in messaging.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="feature-card group">
              <div className="w-12 h-12 bg-accent-blue/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Season Trophies</h3>
              <p className="text-text-secondary leading-relaxed">
                Earn achievements and trophies throughout the season. Show off
                your fantasy golf dominance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              How It Works
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Get started in minutes and compete all season long.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-8">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-accent-green rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-glow-green group-hover:scale-110 transition-transform duration-300">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Create or Join a League</h3>
              <p className="text-text-secondary leading-relaxed">
                Start your own league with custom settings or join an existing
                one with friends.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-accent-green rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-glow-green group-hover:scale-110 transition-transform duration-300">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Draft Your Team</h3>
              <p className="text-text-secondary leading-relaxed">
                Build your roster through a snake or auction draft. Strategy
                matters from pick one.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-accent-green rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-glow-green group-hover:scale-110 transition-transform duration-300">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Compete All Season</h3>
              <p className="text-text-secondary leading-relaxed">
                Set lineups, make trades, and climb the leaderboard throughout
                the PGA Tour season.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-dark-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Ready to Dominate Your League?
          </h2>
          <p className="text-lg sm:text-xl text-text-secondary mb-8 leading-relaxed">
            Join thousands of players competing in the best fantasy golf experience.
          </p>
          <Link to="/signup">
            <Button size="lg">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Landing
