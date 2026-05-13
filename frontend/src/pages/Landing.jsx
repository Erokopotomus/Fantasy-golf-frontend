import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import Footer from '../components/layout/Footer'
import ClutchLogo from '../components/common/ClutchLogo'
import Button from '../components/common/Button'

// ─── Brand Colors ────────────────────────────────────────────
const BZ = '#F06820', BZ_H = '#FF8828', BZ_D = '#D45A10'
const SL = '#1E2A3A', SL_M = '#2C3E50', SL_L = '#3D5166'
const FD = '#0D9668', FD_B = '#14B880'
const CR = '#D4930D', CR_B = '#F0B429'
const LV = '#E83838', INK = '#131118'

// Mock data still used by the Two Sports section's dashboard preview
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

const SectionLabel = ({ children, color = SL_L }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="w-5 h-[2px] rounded-sm" style={{ background: color }} />
    <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em]" style={{ color }}>{children}</span>
  </div>
)

// ─── Feature pill (used in hero) ────────────────────────────
const FeaturePill = ({ icon, label, color }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all bg-[var(--surface)] hover:-translate-y-0.5"
    style={{
      border: '1px solid var(--card-border)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
      color: 'var(--text-2)',
    }}
  >
    <span style={{ color }} className="inline-flex">{icon}</span>
    {label}
  </span>
)

// ─── Hero pool card player row ──────────────────────────────
const PlayerRow = ({ initials, headshotGradient, name, flag, tour, owgr, statLabel, cpiValue, cpiPercent, cpiSide, picked }) => {
  const isLight = useTheme().theme === 'light'
  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{
        background: picked ? (isLight ? 'rgba(240,104,32,0.04)' : 'rgba(240,104,32,0.08)') : 'transparent',
        borderBottom: `1px solid var(--card-border)`,
        borderLeft: picked ? `3px solid ${BZ}` : '3px solid transparent',
        paddingLeft: picked ? 15 : 18,
        paddingRight: 18,
      }}
    >
      <div
        className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white font-display font-bold text-[12px] shrink-0"
        style={{ background: headshotGradient }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-semibold truncate"
          style={{ color: picked ? BZ_D : 'var(--text-1)' }}
        >
          {name}
        </div>
        <div className="font-mono text-[10px] tracking-[0.04em] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
          <span>{flag} </span>
          <span>{tour}</span>
          <span> · </span>
          <span style={{ color: 'var(--text-2)' }}>#{owgr}</span>
          <span> · {statLabel}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="relative w-9 h-1 rounded-sm overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          <div className="absolute top-0 bottom-0 w-px" style={{ left: '50%', background: 'var(--card-border)' }} />
          <div
            className="absolute top-0 bottom-0"
            style={{
              [cpiSide === 'right' ? 'left' : 'right']: '50%',
              width: `${cpiPercent}%`,
              background: cpiSide === 'right' ? FD : 'rgba(232,56,56,0.45)',
            }}
          />
        </div>
        <span className="font-mono text-[10px] font-bold" style={{ color: cpiSide === 'right' ? FD : 'var(--text-3)' }}>
          {cpiValue}
        </span>
      </div>
      <span
        className="font-mono text-[11px] font-bold px-2.5 py-1.5 rounded-md tracking-[0.05em] shrink-0"
        style={{
          background: picked ? BZ : 'var(--surface-2)',
          color: picked ? '#fff' : 'var(--text-2)',
        }}
      >
        {picked ? '✓ PICKED' : '+ Pick'}
      </span>
    </div>
  )
}

// ─── Hero Pool Entry Card ───────────────────────────────────
const PoolEntryCard = () => {
  const isLight = useTheme().theme === 'light'
  return (
    <div
      className="w-full max-w-[460px] rounded-[20px] overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
        boxShadow: isLight ? '0 24px 70px rgba(30,42,58,0.15)' : '0 24px 70px rgba(0,0,0,0.5)',
        animation: 'float 6s ease-in-out infinite',
      }}
    >
      {/* Hero strip */}
      <div
        className="relative px-5 py-4 text-white"
        style={{
          minHeight: 130,
          background: `
            linear-gradient(180deg, rgba(30,42,58,0.35) 0%, rgba(30,42,58,0.92) 100%),
            linear-gradient(135deg, #4F6F52 0%, #88AA70 40%, #5A7842 70%, #3C5A2E 100%)
          `,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">Buckeye PGA Championship</div>
            <div className="font-display font-extrabold text-[24px] tracking-[-0.02em] mt-1.5 leading-tight">PGA Championship</div>
            <div className="font-editorial italic text-[13px] opacity-85 mt-0.5">Aronimink · Newtown Sq, PA</div>
          </div>
          <div className="flex flex-col gap-1.5 items-end shrink-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[10px] uppercase tracking-[0.1em] font-semibold text-white"
              style={{ background: 'rgba(232,56,56,0.85)', border: '1px solid rgba(232,56,56,0.4)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
              Accepting entries
            </div>
            <div
              className="inline-flex items-center px-2.5 py-1 rounded-md font-mono text-[10px] uppercase tracking-[0.1em] font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              Locks 1d 13h
            </div>
          </div>
        </div>
      </div>

      {/* Tier 1 header */}
      <div
        className="px-[18px] py-2.5 flex justify-between items-center"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--card-border)' }}
      >
        <span
          className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-md text-white"
          style={{ background: BZ }}
        >
          T1
        </span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-2)' }}>
          <span style={{ color: FD, fontWeight: 700 }}>1</span> / 10 picked · pick 1
        </span>
      </div>

      {/* Player rows */}
      <PlayerRow
        initials="SS" headshotGradient="linear-gradient(135deg, #C49C7A, #8B6B4A)"
        name="Scottie Scheffler" flag="🇺🇸" tour="PGA" owgr="1" statLabel="SG +2.9"
        cpiValue="+2.0" cpiPercent={30} cpiSide="right" picked
      />
      <PlayerRow
        initials="JR" headshotGradient="linear-gradient(135deg, #B85450, #8B3530)"
        name="Jon Rahm" flag="🇪🇸" tour="LIV" owgr="20" statLabel="Form 100"
        cpiValue="+0.8" cpiPercent={12} cpiSide="right"
      />
      <PlayerRow
        initials="RM" headshotGradient="linear-gradient(135deg, #D49060, #A56830)"
        name="Rory McIlroy" flag="🇬🇧" tour="PGA" owgr="2" statLabel="SG +1.4"
        cpiValue="+1.5" cpiPercent={22} cpiSide="right"
      />
      <PlayerRow
        initials="CY" headshotGradient="linear-gradient(135deg, #6E8DB8, #4A6C92)"
        name="Cameron Young" flag="🇺🇸" tour="PGA" owgr="3" statLabel="Form 88"
        cpiValue="−0.4" cpiPercent={8} cpiSide="left"
      />

      {/* Footer strip */}
      <div
        className="px-[18px] py-2.5 flex justify-between items-center font-mono text-[11px]"
        style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--card-border)', color: 'var(--text-2)' }}
      >
        <span>+ 6 more · 5 tiers below</span>
        <span><span style={{ color: BZ_D, fontWeight: 700 }}>1</span> of 6 picked</span>
      </div>

      {/* CTA */}
      <Link
        to="/pools/t6c9h2"
        className="block text-center py-3 px-4 font-display font-bold text-[14px] tracking-[0.02em] text-white transition-colors"
        style={{ background: BZ }}
        onMouseEnter={(e) => { e.currentTarget.style.background = BZ_H }}
        onMouseLeave={(e) => { e.currentTarget.style.background = BZ }}
      >
        Lock in your picks →
      </Link>
    </div>
  )
}

// ─── Mini-mockup: Player Drawer ─────────────────────────────
const MiniPlayerDrawer = () => (
  <div className="p-4">
    <div className="flex items-center gap-3 pb-3 mb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
      <div className="w-9 h-9 rounded-full" style={{ background: 'linear-gradient(135deg, #C49C7A, #8B6B4A)' }} />
      <div className="min-w-0">
        <div className="font-display font-bold text-sm" style={{ color: 'var(--text-1)' }}>Scottie Scheffler</div>
        <div className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>#1 OWGR · PGA · 🇺🇸</div>
      </div>
    </div>
    <div className="grid grid-cols-4 gap-2 mb-3">
      {[
        { v: '+2.9', l: 'SG Total' },
        { v: '#1', l: 'OWGR' },
        { v: '8', l: 'Avg Fin' },
        { v: '12', l: 'Events' },
      ].map((s, i) => (
        <div key={i} className="text-center p-1.5 rounded-md" style={{ background: 'var(--surface-2)' }}>
          <div className="font-mono font-bold text-[13px]" style={{ color: FD }}>{s.v}</div>
          <div className="font-mono text-[8px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-3)' }}>{s.l}</div>
        </div>
      ))}
    </div>
    {[
      { l: 'Drv', w: 82, v: '+0.82' },
      { l: 'App', w: 95, v: '+1.08' },
      { l: 'ARG', w: 42, v: '+0.42' },
      { l: 'Putt', w: 55, v: '+0.55' },
    ].map((b, i) => (
      <div key={i} className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-[9px] w-7" style={{ color: 'var(--text-2)' }}>{b.l}</span>
        <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          <div className="h-full rounded" style={{ width: `${b.w}%`, background: FD }} />
        </div>
        <span className="font-mono text-[9px] font-bold w-10 text-right" style={{ color: FD }}>{b.v}</span>
      </div>
    ))}
  </div>
)

// ─── Mini-mockup: Live Scoring ──────────────────────────────
const MiniLiveScoring = () => (
  <div className="p-4">
    <div className="flex justify-between items-center mb-3">
      <span className="font-display font-bold text-[13px]" style={{ color: 'var(--text-1)' }}>Truist Championship · R4</span>
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold text-white tracking-[0.05em]"
        style={{ background: LV }}
      >
        <span className="w-1 h-1 rounded-full bg-white" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
        LIVE
      </span>
    </div>
    {[
      { p: '1', n: 'Justin Rose', t: 'F', s: '-13' },
      { p: '2', n: 'Scottie Scheffler', t: 'F', s: '-12' },
      { p: 'T3', n: 'Akshay Bhatia', t: 'F', s: '-9' },
      { p: 'T3', n: 'Sam Stevens', t: '17', s: '-9' },
      { p: '5', n: 'Keegan Bradley', t: '15', s: '-7' },
    ].map((r, i) => (
      <div
        key={i}
        className="flex items-center gap-2 py-1.5 text-[12px]"
        style={{ borderBottom: i < 4 ? '1px solid var(--card-border)' : 'none' }}
      >
        <span className="font-mono font-bold w-7" style={{ color: 'var(--text-2)' }}>{r.p}</span>
        <span className="flex-1 truncate" style={{ color: 'var(--text-1)' }}>{r.n}</span>
        <span className="font-mono w-7 text-right" style={{ color: 'var(--text-3)' }}>{r.t}</span>
        <span className="font-mono font-bold w-9 text-right" style={{ color: FD }}>{r.s}</span>
      </div>
    ))}
  </div>
)

// ─── Mini-mockup: Draft Recap radar ─────────────────────────
const MiniDraftRecap = () => (
  <div className="p-3">
    <div className="flex items-center gap-2 mb-1">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold text-white"
        style={{ background: FD }}
      >
        A−
      </span>
      <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>
        <strong style={{ color: 'var(--text-1)' }}>Your draft</strong> vs. <span style={{ color: SL_L }}>league avg</span>
      </span>
    </div>
    <svg className="w-full" viewBox="-95 -68 190 142" style={{ maxHeight: 140 }}>
      <polygon points="0,-50 47.6,-15.5 29.4,40.5 -29.4,40.5 -47.6,-15.5" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" />
      <polygon points="0,-33.3 31.7,-10.3 19.6,27 -19.6,27 -31.7,-10.3" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" />
      <polygon points="0,-16.7 15.9,-5.2 9.8,13.5 -9.8,13.5 -15.9,-5.2" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="0.6" />
      <line x1="0" y1="0" x2="0" y2="-50" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" />
      <line x1="0" y1="0" x2="47.6" y2="-15.5" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" />
      <line x1="0" y1="0" x2="29.4" y2="40.5" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" />
      <line x1="0" y1="0" x2="-29.4" y2="40.5" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" />
      <line x1="0" y1="0" x2="-47.6" y2="-15.5" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" />
      <polygon points="0,-30 28,-9 17,23.4 -22,30.2 -30,-9.8" fill="rgba(61,81,102,0.12)" stroke="#3D5166" strokeWidth="1.5" strokeDasharray="3 2" />
      <polygon points="0,-44 40,-13 23,32 -22,30 -34,-11" fill="rgba(240,104,32,0.35)" stroke="#F06820" strokeWidth="2" />
      <circle cx="0" cy="-44" r="2.8" fill="#F06820" stroke="white" strokeWidth="1" />
      <circle cx="40" cy="-13" r="2.8" fill="#F06820" stroke="white" strokeWidth="1" />
      <circle cx="23" cy="32" r="2.8" fill="#F06820" stroke="white" strokeWidth="1" />
      <circle cx="-22" cy="30" r="2.8" fill="#F06820" stroke="white" strokeWidth="1" />
      <circle cx="-34" cy="-11" r="2.8" fill="#F06820" stroke="white" strokeWidth="1" />
      <text x="0" y="-58" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill="#6B6862" letterSpacing="0.06em">OFF TEE</text>
      <text x="55" y="-13" textAnchor="start" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill="#6B6862" letterSpacing="0.06em">APPROACH</text>
      <text x="36" y="51" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill="#6B6862" letterSpacing="0.06em">SHORT GAME</text>
      <text x="-36" y="51" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill="#6B6862" letterSpacing="0.06em">PUTTING</text>
      <text x="-55" y="-13" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill="#6B6862" letterSpacing="0.06em">FORM</text>
    </svg>
    <div className="flex items-center gap-3 justify-center text-[10px] mt-1">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm" style={{ background: BZ }} />
        <span style={{ color: BZ_D, fontWeight: 700 }}>Your draft</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(61,81,102,0.5)', border: '1px dashed #3D5166' }} />
        <span style={{ color: SL_L }}>League avg</span>
      </span>
    </div>
  </div>
)

// ─── Mini-mockup: Pool Entry ───────────────────────────────
const MiniPoolEntry = () => (
  <div className="p-4 space-y-1.5">
    {[
      { l: 'Tier 1', pick: '🇺🇸 Scheffler' },
      { l: 'Tier 2', pick: '🇬🇧 Rose' },
      { l: 'Tier 3', pick: '🇦🇺 Scott' },
      { l: 'Tier 4', pick: '🇺🇸 Bhatia' },
      { l: 'Tiebreaker', pick: '−12', crown: true },
    ].map((r, i) => (
      <div
        key={i}
        className="flex items-center justify-between px-3 py-2 rounded-lg"
        style={{ background: 'var(--surface-2)' }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>{r.l}</span>
        <span
          className="text-[13px] font-semibold"
          style={{ color: r.crown ? CR : 'var(--text-1)' }}
        >
          {r.pick}
        </span>
      </div>
    ))}
  </div>
)

// ─── Mini-mockup: Vault Reveal ─────────────────────────────
const MiniVaultReveal = () => (
  <div className="p-4" style={{ background: 'linear-gradient(135deg, #F7E9B8, #FAF2D3)', height: '100%' }}>
    <div className="text-center font-mono text-[9px] tracking-[0.2em] mb-2" style={{ color: CR }}>
      ◆ ◆ ◆ Vault unlocked ◆ ◆ ◆
    </div>
    <div className="text-center font-display font-bold text-[13px] mb-3" style={{ color: SL }}>
      The Sunday Crew · 12 years
    </div>
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(30,42,58,0.92)' }}>
      {[
        { r: '1', n: 'Mike B', p: '142 W · 4 chips', first: true },
        { r: '2', n: 'Sam D', p: '131 W · 3 chips' },
        { r: '3', n: 'Chris P', p: '125 W · 2 chips' },
        { r: '4', n: 'Jen K', p: '119 W · 1 chip' },
      ].map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-1.5 text-[11px]"
          style={{
            borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            background: row.first ? 'rgba(212,147,13,0.15)' : 'transparent',
          }}
        >
          <span className="font-mono font-bold w-3" style={{ color: row.first ? CR_B : 'rgba(255,255,255,0.5)' }}>{row.r}</span>
          <span className="flex-1" style={{ color: row.first ? CR_B : 'rgba(255,255,255,0.85)' }}>{row.n}</span>
          <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{row.p}</span>
        </div>
      ))}
    </div>
  </div>
)

// ─── Mini-mockup: Coach Briefing ───────────────────────────
const MiniCoachBriefing = () => (
  <div className="p-4">
    <div className="flex items-center gap-2.5 mb-3">
      <svg width="36" height="36" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="14" fill="none" stroke={BZ} strokeWidth="1" opacity="0.3" />
        <circle cx="20" cy="6" r="2" fill={BZ} />
        <circle cx="34" cy="20" r="2" fill={BZ} opacity="0.7" />
        <circle cx="20" cy="34" r="2" fill={BZ} />
        <circle cx="6" cy="20" r="2" fill={BZ} opacity="0.7" />
        <circle cx="29" cy="11" r="1.5" fill={BZ} opacity="0.5" />
        <circle cx="11" cy="29" r="1.5" fill={BZ} opacity="0.5" />
        <line x1="20" y1="6" x2="34" y2="20" stroke={BZ} strokeWidth="0.5" opacity="0.4" />
        <line x1="34" y1="20" x2="20" y2="34" stroke={BZ} strokeWidth="0.5" opacity="0.4" />
        <line x1="20" y1="34" x2="6" y2="20" stroke={BZ} strokeWidth="0.5" opacity="0.4" />
        <line x1="6" y1="20" x2="20" y2="6" stroke={BZ} strokeWidth="0.5" opacity="0.4" />
      </svg>
      <div>
        <div className="font-mono text-[10px] tracking-[0.1em]" style={{ color: BZ }}>YOUR COACH</div>
        <div className="font-bold text-[14px]" style={{ color: 'var(--text-1)' }}>Friday morning briefing</div>
      </div>
    </div>
    <p className="font-editorial italic text-[12px] leading-[1.55]" style={{ color: 'var(--text-2)' }}>
      "Scheffler tees off at 8:14 from the back nine. Course is firm — that helps Bhatia and Justin Rose more than Bradley. You're picked low on Rose in the pool, decent leverage if he repeats Truist."
    </p>
    <div className="flex gap-1.5 mt-2 flex-wrap">
      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(240,104,32,0.1)', color: BZ_D }}>Roster check</span>
      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(13,150,104,0.1)', color: FD }}>Pool leverage</span>
    </div>
  </div>
)

// ─── Gallery card wrapper ───────────────────────────────────
const GalleryCard = ({ annotation, preview, label, title, desc, previewBg }) => (
  <div
    className="rounded-[16px] overflow-hidden relative transition-all"
    style={{
      background: 'var(--surface)',
      border: '1px solid var(--card-border)',
      boxShadow: 'var(--card-shadow)',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover, 0 12px 40px rgba(0,0,0,0.08))' }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--card-shadow)' }}
  >
    <div className="relative" style={{ minHeight: 200, background: previewBg || 'var(--surface-2)' }}>
      <span
        className="absolute top-2.5 right-2.5 font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded font-semibold"
        style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--text-3)', border: '1px solid var(--card-border)' }}
      >
        {annotation}
      </span>
      {preview}
    </div>
    <div className="p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] mb-1.5" style={{ color: BZ }}>{label}</div>
      <div className="font-display text-base font-bold mb-1" style={{ color: 'var(--text-1)' }}>{title}</div>
      <div className="text-[13px] leading-[1.5]" style={{ color: 'var(--text-2)' }}>{desc}</div>
    </div>
  </div>
)

// ─── Landing Page ───────────────────────────────────────────

const Landing = () => {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ══════════ HERO ══════════ */}
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
        <DecorativeRing size={320} top="5%" right="3%" color={BZ} opacity={0.05} speed={45} />
        <DecorativeRing size={200} bottom="15%" left="2%" color={FD} opacity={0.04} speed={35} reverse />
        <DecorativeRing size={140} top="55%" right="18%" color={CR} opacity={0.03} speed={50} />

        <div className="max-w-7xl mx-auto relative z-[1]">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-14">
            {/* Left: Copy */}
            <div className="flex-1 text-center lg:text-left lg:flex-[1.15]">
              {/* Live eyebrow pill */}
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
                style={{
                  background: 'rgba(232,56,56,0.08)',
                  border: '1px solid rgba(232,56,56,0.2)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: LV, animation: 'pulse-dot 2s ease-in-out infinite' }} />
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: LV }}>
                  Pools open — PGA Championship · Locks Thu
                </span>
              </div>

              <h1
                className="font-display font-extrabold leading-[1.02] mb-6 text-[var(--text-1)]"
                style={{ fontSize: 'clamp(44px, 5.5vw, 72px)', letterSpacing: '-0.035em' }}
              >
                The fantasy platform<br />that{' '}
                <span className="font-editorial italic font-normal" style={{ color: BZ, fontSize: '1.05em' }}>
                  knows your league.
                </span>
              </h1>

              <p className="text-lg text-[var(--text-2)] max-w-[460px] mb-8 leading-[1.6] mx-auto lg:mx-0">
                Twelve years of league memory. Real strokes-gained analytics. An AI coach that remembers what your buddy drafted in 2018.{' '}
                <strong className="text-[var(--text-1)] font-semibold">Built for leagues that take it seriously.</strong>
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mb-8 justify-center lg:justify-start">
                <FeaturePill
                  color={BZ}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>}
                  label="Deeper analytics"
                />
                <FeaturePill
                  color={FD}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" /></svg>}
                  label="AI coach"
                />
                <FeaturePill
                  color={CR}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v16M16 4v16M3 12h18" /></svg>}
                  label="League vault"
                />
                <FeaturePill
                  color={LV}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
                  label="Live scoring"
                />
                <FeaturePill
                  color={SL_L}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="12 7 14 11 18 12 14 13 12 17 10 13 6 12 10 11 12 7" /></svg>}
                  label="Pools"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/pools/new">
                  <Button size="lg" fullWidth className="sm:w-auto">
                    Run a Pool — Free
                  </Button>
                </Link>
                <Link to="/pools">
                  <Button variant="secondary" size="lg" fullWidth className="sm:w-auto">
                    Browse Pools
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Sport strip + Pool entry card */}
            <div className="flex-1 flex flex-col items-center gap-4 w-full">
              {/* Sport strip */}
              <div
                className="flex gap-2 px-3 py-2 rounded-[14px] w-full max-w-[460px]"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--card-border)',
                  boxShadow: isLight ? '0 8px 24px rgba(30,42,58,0.1)' : '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] font-mono text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{ background: 'rgba(13,150,104,0.08)', color: FD }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: FD_B, animation: 'pulse-dot 2s ease-in-out infinite' }} />
                  Golf · Live now
                </div>
                <div
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] font-mono text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{ color: 'var(--text-2)' }}
                >
                  NFL
                  <span className="font-medium text-[9px] tracking-[0.05em]" style={{ opacity: 0.6 }}>FALL '26</span>
                </div>
              </div>

              <PoolEntryCard />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ EDITORIAL ══════════ */}
      <section
        className="relative py-16 sm:py-[72px] px-4 sm:px-6 lg:px-8 text-center overflow-hidden"
        style={{ background: isLight ? SL : `linear-gradient(135deg, #18140E, #1E1810)` }}
      >
        <div className="absolute top-[-30%] left-[15%] w-[70%] h-[160%] pointer-events-none" style={{ background: `radial-gradient(ellipse, ${BZ}${isLight ? '12' : '18'}, transparent 55%)` }} />
        <div className="absolute top-[50%] left-0 right-0 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${CR}${isLight ? '15' : '20'}, transparent)` }} />
        <div className="absolute top-[30%] left-0 right-0 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${BZ}08, transparent)` }} />
        <div className="absolute top-[70%] left-0 right-0 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${FD}06, transparent)` }} />

        <div className="relative z-[1] max-w-[680px] mx-auto">
          <h2 className="font-editorial italic leading-[1.15] text-[#F0EBE0] mb-4" style={{ fontSize: 'clamp(30px, 4.5vw, 52px)' }}>
            Send the <span style={{ color: BZ_H }}>link.</span><br />
            Everyone's <span style={{ color: CR_B }}>in.</span>
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Five minutes from idea to invites out · No app to download
          </p>
        </div>
      </section>

      {/* ══════════ PRODUCT SURFACE GALLERY ══════════ */}
      <section
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8"
        style={{
          background: `
            radial-gradient(ellipse 40% 30% at 80% 55%, ${BZ}${isLight ? '04' : '06'}, transparent),
            radial-gradient(ellipse 30% 25% at 15% 30%, ${FD}${isLight ? '04' : '06'}, transparent),
            linear-gradient(180deg, var(--bg) 0%, var(--bg-alt) 100%)
          `,
        }}
      >
        <div className="max-w-[1180px] mx-auto">
          <SectionLabel color={BZ}>See the platform</SectionLabel>
          <h2
            className="font-display font-extrabold leading-[1.1] mb-3 text-[var(--text-1)]"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.025em' }}
          >
            Built for{' '}
            <span className="font-editorial italic font-normal" style={{ color: CR, fontSize: '1.05em' }}>how you actually watch sports.</span>
          </h2>
          <p className="text-base text-[var(--text-2)] leading-relaxed max-w-[600px] mb-10">
            Strokes Gained vs course DNA. Hole-by-hole scorecards. League vaults with 14 years of history. The kind of fantasy app you've been waiting for.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <GalleryCard
              annotation="PlayerDrawer"
              preview={<MiniPlayerDrawer />}
              previewBg="var(--surface-2)"
              label="Player Intel"
              title="Strokes Gained vs course DNA"
              desc="Tap any player. See their SG profile matched against the week's course. Recent results, season ranks, course history — all one tap deep."
            />
            <GalleryCard
              annotation="LiveScoringWidget"
              preview={<MiniLiveScoring />}
              previewBg={isLight ? 'rgba(232,56,56,0.05)' : 'rgba(232,56,56,0.08)'}
              label="Live Scoring"
              title="Hole-by-hole, every Sunday."
              desc="Real-time scorecards from ESPN's feed. Watch your roster move. Tap a player to see their card hole-by-hole as they play it."
            />
            <GalleryCard
              annotation="DraftRecap"
              preview={<MiniDraftRecap />}
              previewBg={isLight ? 'linear-gradient(180deg, #F7F3EA 0%, #FAFAF6 100%)' : 'linear-gradient(180deg, #1A1612 0%, #221C16 100%)'}
              label="Draft Recap"
              title="Letter grades. Stacked side-by-side."
              desc="Every draft auto-graded. Five SG dimensions rendered as a radar — your team vs. the league average. AI coach drops a paragraph on what you nailed and what's thin."
            />
            <GalleryCard
              annotation="PoolEntryDrawer"
              preview={<MiniPoolEntry />}
              previewBg={isLight ? 'rgba(240,104,32,0.04)' : 'rgba(240,104,32,0.08)'}
              label="Pools"
              title="Tier picks. Tiebreaker. Done."
              desc="Six tiers, one pick per tier, a tiebreaker for the winner's score. Locks Thursday morning. Live scoring kicks in automatically."
            />
            <GalleryCard
              annotation="VaultReveal"
              preview={<MiniVaultReveal />}
              previewBg="linear-gradient(135deg, #F7E9B8, #FAF2D3)"
              label="League Vault"
              title="Every season. Forever logged."
              desc="Import from ESPN, Yahoo, Sleeper, Fantrax, MFL. Owner aliases. Draft history. Championship rolls. Your league's story, always live."
            />
            <GalleryCard
              annotation="CoachBriefing"
              preview={<MiniCoachBriefing />}
              previewBg={isLight ? 'rgba(240,104,32,0.03)' : 'rgba(240,104,32,0.06)'}
              label="AI Coach"
              title="Knows your team. And the field."
              desc="A coach that's read every box score, watched every tournament, and remembers what you drafted three years ago. Writes you a brief every morning."
            />
          </div>
        </div>
      </section>

      {/* ══════════ WHY CLUTCH ══════════ */}
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
            className="font-display font-extrabold leading-[1.1] mb-10 text-[var(--text-1)]"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.025em' }}
          >
            Everything you need.<br />
            <span className="font-editorial italic font-normal" style={{ color: CR, fontSize: '1.05em' }}>Nothing you don't.</span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { icon: '🎯', title: 'Pools', badge: 'NEW', desc: 'Tier picks for any tournament. 5-minute setup. Send a link. Auto-locks Thursday morning. Live scoring built in.', c: BZ, ltTint: '#FDEBD8', dkTint: `${BZ}0A` },
              { icon: '🏆', title: 'Fantasy Leagues', desc: 'Auction or snake drafts. FAAB waivers. H2H or roto. Trades, chat, playoffs. Golf live, NFL launching Fall \'26.', c: FD, ltTint: '#D6F0E5', dkTint: `${FD}0A` },
              { icon: '⚡', title: 'Live Scoring', desc: 'Shot-by-shot during PGA events, play-by-play for NFL. Hole-by-hole scorecards. Pool standings update live.', c: CR, ltTint: '#F5EACC', dkTint: `${CR}0A` },
              { icon: '📊', title: 'Predictions', desc: 'Winner, top 5, top 10, make/miss cut, R1 leader, H2H matchups. Auto-resolves Monday. Track your accuracy over time.', c: BZ, ltTint: '#FDEBD8', dkTint: `${BZ}0A` },
              { icon: '🧠', title: 'AI Coach', desc: 'Reads your draft, your roster, your league. Surfaces leverage, flags bias, writes a Friday-morning briefing.', c: SL_L, ltTint: '#DFE3EC', dkTint: 'rgba(61,81,102,0.12)' },
              { icon: '📚', title: 'League Vault', desc: 'Import from ESPN, Yahoo, Sleeper, Fantrax, MFL. 14 years of league history, owner aliases, draft archives.', c: CR, ltTint: '#F5EACC', dkTint: `${CR}0A` },
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
                {!isLight && <div className="absolute inset-0 pointer-events-none" style={{ background: f.dkTint }} />}
                <div className="relative z-[1]">
                  <div
                    className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[17px] mb-3.5"
                    style={{ background: `${f.c}${isLight ? '0D' : '18'}` }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-display text-[15px] font-bold text-[var(--text-1)] mb-1.5 flex items-center gap-2">
                    {f.title}
                    {f.badge && (
                      <span
                        className="font-mono text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded text-white"
                        style={{ background: BZ }}
                      >
                        {f.badge}
                      </span>
                    )}
                  </h3>
                  <p className="text-[13px] text-[var(--text-2)] leading-[1.65]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Future pool types strip */}
          <div
            className="mt-7 p-5 rounded-[14px] flex flex-wrap items-center gap-3"
            style={{
              background: 'var(--surface)',
              border: `1px dashed rgba(240,104,32,0.25)`,
            }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: BZ }}>
              ◆ More pool types coming
            </span>
            {['Survivor', 'Eliminator', 'Bracket', "NFL Pick'em", '+ Custom'].map(chip => (
              <span
                key={chip}
                className="px-3 py-1.5 rounded-lg font-mono text-[11px] font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
              >
                {chip}
              </span>
            ))}
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
              { num: '1', title: 'Play', desc: 'Spin up a tournament pool in 5 minutes — or run a full season-long league. Snake or auction drafts, trades, waivers, live scoring, in-league chat. Import your history from ESPN, Yahoo, Sleeper, Fantrax, MFL.' },
              { num: '2', title: 'Track', desc: "Log projections and weekly calls. Everything gets tracked — your reasoning, your accuracy, your draft decisions. Over time, Clutch becomes your sports brain." },
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
            <Link to="/pools/new">
              <Button size="lg" fullWidth className="sm:w-auto">
                Run a Pool — Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ TWO SPORTS. ONE PLATFORM. ══════════ */}
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
              Two Sports. One Platform.
            </h2>
            <p className="text-[var(--text-2)] max-w-2xl mx-auto leading-relaxed">
              Fantasy Golf is live for the 2026 PGA Tour. Fantasy Football launches for the 2026 NFL season. Run a pool for one tournament, or a season-long league for the year.
            </p>
          </div>

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
                className="rounded-[14px] p-6 pl-[22px] cursor-pointer group"
                style={{
                  background: isLight ? `${f.color}14` : 'var(--surface)',
                  border: `1.5px solid ${isLight ? `${f.color}30` : 'var(--card-border)'}`,
                  borderLeft: `3.5px solid ${f.color}`,
                  boxShadow: isLight ? `0 2px 12px ${f.color}10` : 'var(--card-shadow)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = isLight ? `0 8px 30px ${f.color}1A` : 'var(--card-shadow-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isLight ? `0 2px 12px ${f.color}10` : 'var(--card-shadow)' }}
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

          {/* Dashboard preview (kept as-is) */}
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
              <Button size="lg">Start a League — Free</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section
        className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{ background: isLight ? INK : `linear-gradient(135deg, #18140E, #1E1810)` }}
      >
        <div className="absolute top-[-30%] left-[25%] w-[350px] h-[350px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${BZ}15, transparent 55%)` }} />
        <div className="absolute bottom-[-25%] right-[15%] w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${FD}0A, transparent 55%)` }} />
        <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${CR}08, transparent 55%)` }} />

        <div className="max-w-4xl mx-auto text-center relative z-[1]">
          <h2 className="font-display font-extrabold text-[#F0EBE0] mb-2.5" style={{ fontSize: 'clamp(28px, 3.5vw, 38px)' }}>
            Golf is live.{' '}
            <span className="font-editorial italic font-normal" style={{ color: BZ, fontSize: '1.05em' }}>Pools open.</span>
          </h2>
          <p className="text-base mb-7 max-w-[440px] mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Five minutes to your first pool. Whole season once you're hooked.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link to="/pools/new">
              <Button size="lg" fullWidth className="sm:w-auto">
                Run a Pool — Free
              </Button>
            </Link>
            <Link
              to="/pools"
              className="inline-flex items-center justify-center font-display font-semibold rounded-button px-6 py-3 text-base transition-all duration-300 active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
              }}
            >
              Browse Leagues
            </Link>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>No credit card required. Free to play.</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Landing
