import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import Footer from '../components/layout/Footer'
import ClutchLogo from '../components/common/ClutchLogo'
import ClutchRatingGauge from '../components/common/ClutchRatingGauge'
import Button from '../components/common/Button'

// ─── Brand Colors ────────────────────────────────────────────
const BZ = '#F06820', BZ_H = '#FF8828', BZ_D = '#D45A10'
const SL = '#1E2A3A', SL_M = '#2C3E50', SL_L = '#3D5166'
const FD = '#0D9668', FD_B = '#14B880'
const CR = '#D4930D', CR_B = '#F0B429'
const LV = '#E83838', INK = '#131118'

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

// ─── Decorative Ring ────────────────────────────────────────
const DecorativeRing = ({ size, top, right, bottom, left, color, opacity, speed, reverse }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size, height: size,
      ...(top != null && { top }), ...(right != null && { right }),
      ...(bottom != null && { bottom }), ...(left != null && { left }),
      border: `1px solid ${color}`,
      opacity,
      animation: `spin-slow ${speed}s linear infinite ${reverse ? 'reverse' : ''}`,
    }}
  />
)

// ─── Section Label (spec: 20px line + JetBrains Mono) ────────
const SectionLabel = ({ children, color = SL_L }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="w-5 h-[2px] rounded-sm" style={{ background: color }} />
    <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em]" style={{ color }}>{children}</span>
  </div>
)

// ─── Landing Page ───────────────────────────────────────────

const Landing = () => {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ══════════ HERO — Gradient mesh background ══════════ */}
      <section
        className="relative pt-20 sm:pt-28 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 65% 50% at 70% 20%, ${BZ}${isLight ? '0C' : '10'}, transparent),
            radial-gradient(ellipse 45% 40% at 15% 75%, ${FD}${isLight ? '06' : '08'}, transparent),
            radial-gradient(ellipse 35% 30% at 85% 70%, ${CR}${isLight ? '06' : '08'}, transparent),
            linear-gradient(180deg, var(--bg) 0%, var(--bg-alt) 100%)
          `,
        }}
      >
        {/* Decorative spinning rings */}
        <DecorativeRing size={320} top="5%" right="3%" color={BZ} opacity={0.05} speed={45} />
        <DecorativeRing size={200} bottom="15%" left="2%" color={FD} opacity={0.04} speed={35} reverse />
        <DecorativeRing size={140} top="55%" right="18%" color={CR} opacity={0.03} speed={50} />

        <div className="max-w-7xl mx-auto relative z-[1]">
          <div className="flex flex-col lg:flex-row items-center lg:items-center gap-12 lg:gap-14">
            {/* Left: Copy + CTAs */}
            <div className="flex-1 text-center lg:text-left lg:flex-[1.15]">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
                style={{
                  background: `${FD}${isLight ? '0C' : '15'}`,
                  border: `1px solid ${FD}${isLight ? '20' : '30'}`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: FD_B, animation: 'pulse-dot 2s ease-in-out infinite' }} />
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: FD_B }}>2026 PGA Tour is Live</span>
              </div>

              <h1
                className="font-display font-extrabold leading-[1.02] mb-6 text-[var(--text-1)]"
                style={{ fontSize: 'clamp(42px, 5.5vw, 70px)', letterSpacing: '-0.035em' }}
              >
                Prove You<br />Know{' '}
                <span className="font-editorial italic" style={{ color: BZ, fontSize: '1.05em' }}>Sports.</span>
              </h1>

              <p className="text-lg text-[var(--text-2)] max-w-[460px] mb-2.5 leading-[1.7] mx-auto lg:mx-0">
                Lock in your predictions. Track your accuracy.{' '}
                <strong className="text-[var(--text-1)] font-semibold">The platform where sports knowledge meets accountability.</strong>
              </p>
              <p className="font-mono text-xs text-[var(--text-3)] mb-8 mx-auto lg:mx-0">
                Fantasy leagues · AI research · Prediction tracking
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/signup">
                  <Button size="lg" fullWidth className="sm:w-auto">
                    Play Fantasy Golf
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="secondary" size="lg" fullWidth className="sm:w-auto">
                    NFL — Early Access
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Floating Bold Rating Card */}
            <div className="flex-1 flex justify-center">
              <div
                className="relative w-[340px] p-8 rounded-3xl text-center"
                style={{
                  animation: 'float 6s ease-in-out infinite',
                  background: isLight
                    ? `linear-gradient(160deg, ${SL}, ${SL_M})`
                    : 'linear-gradient(160deg, #1E1B16, #252018)',
                  border: isLight ? '1px solid transparent' : '1px solid rgba(212,147,13,0.08)',
                  boxShadow: isLight
                    ? '0 24px 80px rgba(30,42,58,0.25)'
                    : `0 24px 80px rgba(0,0,0,0.4), 0 0 60px ${CR}08`,
                }}
              >
                {/* Rainbow top border */}
                <div className="absolute -top-px -left-px -right-px h-[3px] rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${BZ}, ${CR_B}, ${FD})` }} />
                {/* Internal glow */}
                <div className="absolute top-[5%] right-[5%] w-[200px] h-[200px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${CR}${isLight ? '12' : '18'}, transparent 60%)` }} />
                <div className="absolute bottom-[10%] left-[10%] w-[150px] h-[150px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${BZ}${isLight ? '08' : '10'}, transparent 60%)` }} />

                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: CR_B }}>Your Clutch Rating</p>
                <div className="relative z-[1]">
                  <ClutchRatingGauge rating={84} size="lg" animated />
                </div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] mt-1.5 mb-5" style={{ color: CR_B }}>Expert</p>

                {/* Stat grid */}
                <div className="grid grid-cols-2 gap-2 relative z-[1]">
                  {[
                    { label: 'Accuracy', value: '82' },
                    { label: 'Picks', value: '76' },
                    { label: 'Consistency', value: '88' },
                    { label: 'Bold Calls', value: '65' },
                  ].map((s, i) => (
                    <div key={i} className="p-2.5 rounded-[10px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="font-mono text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                      <p className="font-mono text-lg font-bold" style={{ color: '#F0EBE0' }}>{s.value}<span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>%</span></p>
                    </div>
                  ))}
                </div>

                {/* Floating Golf pill */}
                <div
                  className="absolute top-3.5 -right-5"
                  style={{
                    padding: '8px 14px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #0B1F15, #142E20)',
                    border: `1px solid ${FD}35`,
                    boxShadow: `0 6px 20px rgba(13,150,104,0.15), inset 0 1px 0 rgba(255,255,255,0.03)`,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 7,
                    color: '#E8F0EC',
                    animation: 'float 5s ease-in-out infinite', animationDelay: '-1.5s',
                  }}
                >
                  <span>⛳</span> <span style={{ color: FD_B }}>Golf</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: FD_B, animation: 'pulse-dot 2s ease-in-out infinite' }} />
                </div>

                {/* Floating NFL pill */}
                <div
                  className="absolute bottom-[30px] -right-6"
                  style={{
                    padding: '8px 14px', borderRadius: 10,
                    background: isLight
                      ? `linear-gradient(135deg, ${SL}, ${SL_M})`
                      : 'linear-gradient(135deg, #1F1812, #2A2018)',
                    border: isLight ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${BZ}25`,
                    boxShadow: isLight ? '0 6px 20px rgba(30,42,58,0.25)' : `0 6px 20px rgba(240,104,32,0.1)`,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 7,
                    color: isLight ? 'rgba(255,255,255,0.8)' : '#E8E0D6',
                    animation: 'float 5s ease-in-out infinite', animationDelay: '-3.5s',
                  }}
                >
                  <span>🏈</span> <span style={{ color: isLight ? '#fff' : BZ_H }}>NFL</span>
                  <span className="font-mono text-[8px] font-bold uppercase tracking-wider" style={{ color: BZ_H }}>SPRING '26</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ EDITORIAL — Dark in both modes ══════════ */}
      <section
        className="relative py-16 sm:py-[72px] px-4 sm:px-6 lg:px-8 text-center overflow-hidden"
        style={{
          background: isLight ? SL : `linear-gradient(135deg, #18140E, #1E1810)`,
        }}
      >
        {/* Radial glow */}
        <div className="absolute top-[-30%] left-[15%] w-[70%] h-[160%] pointer-events-none" style={{ background: `radial-gradient(ellipse, ${BZ}${isLight ? '12' : '18'}, transparent 55%)` }} />
        {/* Subtle accent lines */}
        <div className="absolute top-[50%] left-0 right-0 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${CR}${isLight ? '15' : '20'}, transparent)` }} />
        <div className="absolute top-[30%] left-0 right-0 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${BZ}08, transparent)` }} />
        <div className="absolute top-[70%] left-0 right-0 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${FD}06, transparent)` }} />

        <div className="relative z-[1] max-w-[680px] mx-auto">
          <h2 className="font-editorial italic leading-[1.15] text-[#F0EBE0] mb-4" style={{ fontSize: 'clamp(30px, 4.5vw, 52px)' }}>
            Everyone's got <span style={{ color: BZ_H }}>opinions.</span><br />
            We've got <span style={{ color: CR_B }}>receipts.</span>
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Clutch Rating — one number for everything you know
          </p>
        </div>
      </section>

      {/* ══════════ WHY CLUTCH — Tinted feature cards ══════════ */}
      <section
        className="py-16 sm:py-[72px] px-4 sm:px-6 lg:px-8"
        style={{
          background: `
            radial-gradient(ellipse 40% 30% at 80% 55%, ${BZ}${isLight ? '05' : '08'}, transparent),
            radial-gradient(ellipse 30% 25% at 15% 30%, ${FD}${isLight ? '04' : '06'}, transparent),
            linear-gradient(180deg, var(--bg-alt) 0%, var(--bg) 100%)
          `,
        }}
      >
        <div className="max-w-[1120px] mx-auto">
          <SectionLabel color={SL_L}>Why Clutch</SectionLabel>
          <h2
            className="font-display font-extrabold leading-[1.1] mb-3 text-[var(--text-1)]"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.025em' }}
          >
            One number for everything<br />you{' '}
            <span className="font-editorial italic" style={{ color: CR, fontSize: '1.05em' }}>know.</span>
          </h2>
          <p className="text-base text-[var(--text-2)] leading-[1.7] max-w-[500px] mb-10">
            Your Clutch Rating captures league performance, prediction accuracy, draft intelligence, and consistency.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { icon: '🎯', title: 'Prove It Predictions', desc: 'Lock in calls before kickoff. Your accuracy is tracked, rated, and public.', c: BZ, ltTint: '#FFF6F0', dkTint: `${BZ}08` },
              { icon: '✦', title: 'AI Research Lab', desc: 'Matchup analysis, trend detection, and draft strategy powered by AI.', c: SL_L, ltTint: '#F0F2F5', dkTint: 'rgba(61,81,102,0.1)' },
              { icon: '🏆', title: 'Fantasy Leagues', desc: 'Auction drafts, FAAB waivers, H2H. Golf live, NFL Spring 2026.', c: FD, ltTint: '#EEFAF4', dkTint: `${FD}08` },
              { icon: '📊', title: 'Clutch Rating', desc: 'One score proving your sports IQ. Every pick, every bold call feeds it.', c: CR, ltTint: '#FDF8EE', dkTint: `${CR}08` },
              { icon: '⚡', title: 'Live Tournaments', desc: 'Real-time leaderboards as PGA events unfold. Shot by shot.', c: FD, ltTint: '#EEFAF4', dkTint: `${FD}08` },
              { icon: '🧠', title: 'Year-Round', desc: 'Not a September app. Your brain stays sharp and your rating builds all year.', c: SL_L, ltTint: '#F0F2F5', dkTint: 'rgba(61,81,102,0.1)' },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-[14px] p-[26px] pl-[28px] cursor-default"
                style={{
                  background: isLight ? f.ltTint : 'var(--surface)',
                  borderLeft: `3px solid ${f.c}`,
                  border: `1px solid ${isLight ? `${f.c}10` : 'var(--card-border)'}`,
                  borderLeftWidth: 3,
                  borderLeftStyle: 'solid',
                  borderLeftColor: f.c,
                  boxShadow: 'var(--card-shadow)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = isLight ? '0 12px 40px rgba(0,0,0,0.07)' : '0 12px 40px rgba(0,0,0,0.3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--card-shadow)' }}
              >
                {/* Dark mode tint overlay */}
                {!isLight && <div className="absolute inset-0 pointer-events-none" style={{ background: f.dkTint }} />}
                <div className="relative z-[1]">
                  <div
                    className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[17px] mb-3.5"
                    style={{ background: `${f.c}${isLight ? '0D' : '18'}` }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-display text-[15px] font-bold text-[var(--text-1)] mb-1.5">{f.title}</h3>
                  <p className="text-[13px] text-[var(--text-2)] leading-[1.65]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ THE CLUTCH RATING ══════════ */}
      <section
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8"
        style={{
          background: `
            radial-gradient(ellipse 40% 28% at 25% 15%, ${CR}${isLight ? '06' : '0A'}, transparent),
            radial-gradient(ellipse 30% 20% at 80% 70%, ${FD}${isLight ? '04' : '06'}, transparent),
            var(--bg)
          `,
        }}
      >
        <div className="max-w-5xl mx-auto">
          <SectionLabel color={CR}>Clutch Rating</SectionLabel>
          <h2
            className="font-display font-extrabold leading-[1.1] mb-1.5 text-[var(--text-1)]"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.025em' }}
          >
            What builds your{' '}
            <span className="font-editorial italic" style={{ color: CR, fontSize: '1.05em' }}>score.</span>
          </h2>
          <p className="text-[15px] text-[var(--text-2)] leading-[1.7] mb-9">
            Every league you play, every bold call that hits — it all feeds your rating.
          </p>

          {/* Rating Hero — bold dark card */}
          <div
            className="flex flex-col sm:flex-row gap-8 items-center p-9 rounded-[20px] mb-7 relative overflow-hidden"
            style={{
              background: isLight ? `linear-gradient(135deg, ${SL}, ${SL_M})` : 'linear-gradient(135deg, #1E1B16, #252018)',
              color: '#F0EBE0',
              border: isLight ? 'none' : `1px solid ${CR}08`,
              boxShadow: isLight ? 'none' : `0 0 50px ${CR}06`,
            }}
          >
            <div className="absolute top-[-25%] right-[-8%] w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${CR}18, transparent 55%)` }} />
            <DecorativeRing size={160} top="-20%" left="-5%" color={CR} opacity={0.08} speed={40} />
            <div className="relative z-[1]">
              <ClutchRatingGauge rating={84} size="lg" animated />
            </div>
            <div className="relative z-[1] text-center sm:text-left">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] mb-1.5" style={{ color: CR_B }}>Your Rating</p>
              <p className="font-display text-[28px] font-extrabold mb-1">Eric Saylor</p>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: CR_B }}>Expert · 84</p>
            </div>
          </div>

          {/* Score breakdown card */}
          <div
            className="p-8 rounded-[18px]"
            style={{
              background: isLight ? '#FDFCF9' : 'var(--surface)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <h3 className="font-display text-lg font-extrabold text-[var(--text-1)] mb-6">Score Breakdown</h3>
            <div className="space-y-4">
              {[
                { label: 'Prediction Accuracy', pct: 82, c1: BZ, c2: BZ_H },
                { label: 'Pick Record', pct: 76, c1: FD, c2: FD_B },
                { label: 'Draft Intelligence', pct: 70, c1: CR, c2: CR_B },
                { label: 'Consistency', pct: 88, c1: FD, c2: FD_B },
                { label: 'Bold Calls Rewarded', pct: 65, c1: CR, c2: CR_B },
              ].map((b, i) => (
                <div key={i} className="grid grid-cols-[140px_1fr_44px] gap-3.5 items-center">
                  <span className="font-mono text-xs text-[var(--text-2)]">{b.label}</span>
                  <div className="h-2 rounded bg-[var(--bg-alt)] overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${b.pct}%`,
                        background: `linear-gradient(90deg, ${b.c1}, ${b.c2})`,
                        boxShadow: `0 0 10px ${b.c1}18`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--text-1)] text-right">{b.pct}%</span>
                </div>
              ))}
            </div>

            {/* Tier badges */}
            <div className="flex gap-1.5 mt-7 pt-5 border-t border-[var(--card-border)]">
              {[
                { range: '90-100', label: 'Elite', c: CR, active: false },
                { range: '80-89', label: 'Expert', c: CR, active: true },
                { range: '70-79', label: 'Sharp', c: FD, active: false },
                { range: '60-69', label: 'Solid', c: BZ, active: false },
                { range: '<60', label: 'Developing', c: 'var(--text-3)', active: false },
              ].map((x, i) => (
                <div
                  key={i}
                  className="flex-1 p-2.5 rounded-[10px] text-center font-mono text-[10px] font-semibold"
                  style={{
                    border: `1px solid ${x.active ? x.c : 'var(--stone)'}`,
                    background: x.active ? `${x.c}${isLight ? '0C' : '18'}` : 'transparent',
                    color: x.active ? x.c : 'var(--text-3)',
                  }}
                >
                  <span className="block text-[13px] font-bold mb-px">{x.range}</span>
                  {x.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section
        id="how-it-works"
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-[var(--card-border)]"
        style={{
          background: `
            radial-gradient(ellipse 35% 25% at 50% 20%, ${BZ}${isLight ? '04' : '06'}, transparent),
            linear-gradient(180deg, var(--bg-alt) 0%, var(--bg-alt) 100%)
          `,
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2
              className="font-display font-extrabold text-[var(--text-1)] mb-4 leading-tight"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.025em' }}
            >
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
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-white shadow-lg group-hover:scale-110 transition-transform duration-300"
                  style={{ background: `linear-gradient(135deg, ${BZ}, ${BZ_H})` }}
                >
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
          </div>
        </div>
      </section>

      {/* ══════════ WHAT'S LIVE NOW — FANTASY GOLF ══════════ */}
      <section
        id="features"
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8"
        style={{
          background: `
            radial-gradient(ellipse 35% 25% at 75% 30%, ${FD}${isLight ? '04' : '06'}, transparent),
            radial-gradient(ellipse 30% 20% at 20% 70%, ${CR}${isLight ? '03' : '05'}, transparent),
            var(--bg)
          `,
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h2
              className="font-display font-extrabold text-[var(--text-1)] mb-4 leading-tight"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.025em' }}
            >
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
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', title: 'Snake & Auction Drafts', desc: 'Choose your draft style. Classic snake or exciting auction formats where every dollar counts.', color: CR },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Live Tournament Scoring', desc: 'Watch your team perform in real-time with shot-by-shot updates during every PGA Tour event.', color: BZ },
              { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Strokes Gained Analytics', desc: 'SG: Off-the-Tee, Approach, Around-the-Green, Putting — advanced stats for smarter decisions.', color: FD },
              { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Trades & Waivers', desc: 'Active roster management with a waiver wire and FAAB bidding that keeps you engaged all season.', color: BZ },
              { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', title: 'League Chat & Activity', desc: 'Real-time messaging, trade announcements, and a live activity feed for your league.', color: CR },
              { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', title: 'Weekly Matchups', desc: 'Head-to-head battles every tournament week. Build your W-L record and fight for a playoff spot.', color: FD },
            ].map(f => (
              <div
                key={f.title}
                className="bg-[var(--surface)] rounded-[14px] p-6 border border-[var(--card-border)] cursor-pointer group"
                style={{ boxShadow: 'var(--card-shadow)', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = isLight ? '0 12px 40px rgba(0,0,0,0.07)' : '0 12px 40px rgba(0,0,0,0.3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--card-shadow)' }}
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${f.color}20` }}>
                  <svg className="w-6 h-6" style={{ color: f.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                </div>
                <h3 className="font-display text-[15px] font-bold text-[var(--text-1)] mb-2">{f.title}</h3>
                <p className="text-[var(--text-2)] text-[13px] leading-relaxed">{f.desc}</p>
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

              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--nav-bg)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-2">
                  <ClutchLogo size={24} className="rounded" />
                  <span className="text-[#F06820] font-display font-extrabold text-sm tracking-tight">CLUTCH</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: CR, animation: 'pulse-dot 2s ease-in-out infinite' }} />
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
      <section
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-[var(--card-border)]"
        style={{
          background: `
            radial-gradient(ellipse 30% 20% at 60% 30%, ${CR}${isLight ? '04' : '06'}, transparent),
            linear-gradient(180deg, var(--bg-alt) 0%, var(--bg-alt) 100%)
          `,
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center mb-16">
            <div className="text-center lg:text-left">
              <h2
                className="font-display font-extrabold text-[var(--text-1)] mb-4 leading-tight"
                style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.025em' }}
              >
                Year one, you have a record.
                <span className="block font-editorial italic" style={{ color: BZ, fontSize: '1.05em' }}>Year three, you have a database.</span>
              </h2>
              <p className="text-[var(--text-2)] leading-relaxed mb-6">
                Every projection, every pick, every reasoning note — permanently logged. Clutch doesn't just track
                what you predicted. It tracks whether you were right, where you were biased, and how you're improving.
                This is the home for how you think about sports — and no one else is building it.
              </p>
              <p style={{ color: BZ }} className="font-display font-semibold text-lg">
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
              <div key={card.num} className="bg-[var(--surface)] rounded-[14px] p-6 border border-[var(--card-border)]" style={{ boxShadow: 'var(--card-shadow)' }}>
                <div className="text-3xl font-bold font-mono mb-2" style={{ color: BZ }}>{card.num}</div>
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


      {/* ══════════ THE LEADERBOARD ══════════ */}
      <section
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8"
        style={{
          background: `
            radial-gradient(ellipse 35% 25% at 70% 30%, ${CR}${isLight ? '03' : '05'}, transparent),
            linear-gradient(180deg, var(--bg-alt) 0%, var(--bg-alt) 100%)
          `,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="font-display font-extrabold text-[var(--text-1)] mb-4 leading-tight"
              style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.025em' }}
            >
              Who actually knows sports?
            </h2>
            <p className="text-[var(--text-2)] max-w-xl mx-auto">
              A nobody from Ohio outprojected the Fantasy Footballers. That's a story.
              The leaderboard doesn't care about your follower count.
            </p>
          </div>

          <div className="bg-[var(--surface)] rounded-[14px] border border-[var(--card-border)] overflow-hidden" style={{ boxShadow: isLight ? '0 8px 32px rgba(0,0,0,0.06)' : '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between" style={{ background: 'var(--nav-bg)' }}>
              <h3 className="text-sm font-semibold text-white">Overall Leaderboard</h3>
              <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Preview</span>
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
                <div className="text-center text-xs font-mono" style={{ color: FD }}>{p.accuracy}</div>
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

      {/* ══════════ FINAL CTA — Dark with radial glows ══════════ */}
      <section
        className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{
          background: isLight ? INK : `linear-gradient(135deg, #18140E, #1E1810)`,
        }}
      >
        {/* Radial glow orbs */}
        <div className="absolute top-[-30%] left-[25%] w-[350px] h-[350px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${BZ}15, transparent 55%)` }} />
        <div className="absolute bottom-[-25%] right-[15%] w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${FD}0A, transparent 55%)` }} />
        <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${CR}08, transparent 55%)` }} />

        <div className="max-w-4xl mx-auto text-center relative z-[1]">
          <h2 className="font-display font-extrabold text-[#F0EBE0] mb-2.5" style={{ fontSize: 32 }}>
            Ready to prove{' '}
            <span className="font-editorial italic" style={{ color: BZ, fontSize: '1.05em' }}>it?</span>
          </h2>
          <p className="text-base mb-7 max-w-[400px] mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Golf season is live. Get in before your friends do.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link to="/signup">
              <Button size="lg" fullWidth className="sm:w-auto">
                Start Playing — Free
              </Button>
            </Link>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center font-display font-semibold rounded-button px-6 py-3 text-base transition-all duration-300 active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
              }}
            >
              Learn More
            </button>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>No credit card required. Free forever for golf.</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Landing
