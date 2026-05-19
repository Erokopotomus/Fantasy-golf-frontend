import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

/**
 * Lab → Prep hub (DS-13).
 *
 * Aesthetic: "The Athletic × Topps offseason annual." Editorial typography
 * with Instrument Serif italics for hero pulls, JetBrains Mono for stats,
 * Bricolage Grotesque for display headers. Generous typographic flexes,
 * page-number-style chrome, asymmetric layout.
 */

const ROOMS = [
  {
    slug: 'team-browser',
    eyebrow: 'I.',
    title: 'Team Browser',
    pull: 'All 32 teams, the way an almanac would show them.',
    body: 'Coaching staffs, depth charts, OL/DL ranks, projected starters. The room you live in when you want to know everything about a team without opening fifteen tabs.',
    cta: 'Browse all 32',
    href: '/lab/prep/teams',
  },
  {
    slug: 'what-changed',
    eyebrow: 'II.',
    title: 'What Changed',
    pull: 'The offseason, in one place.',
    body: 'Coordinator carousel. Free-agent destinations. OL units that moved up or fell off. Year-over-year delta on every team that matters for fantasy.',
    cta: 'Read the offseason',
    href: '/lab/prep/changes',
  },
  {
    slug: 'daily-quiz',
    eyebrow: 'III.',
    title: 'Daily Quiz',
    pull: 'Until it sticks.',
    body: 'Spaced-repetition cards. Ten a day. By August your draft knowledge is automatic and you sound like the smartest person in the room.',
    cta: 'Start today’s deck',
    href: '/lab/prep/quiz',
  },
]

function StatChip({ label, value, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'text-slate',
    accent: 'text-blaze',
    field: 'text-field',
    crown: 'text-crown',
  }[tone] ?? 'text-slate'
  return (
    <div className="flex flex-col items-start">
      <span className={`font-mono text-3xl md:text-4xl font-bold leading-none ${toneClass}`}>
        {value}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-text-muted">
        {label}
      </span>
    </div>
  )
}

export default function PrepHub() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pull a tiny summary off /api/prep/teams to seed the page chrome with
  // real numbers. We don't render a team grid here — that's DS-14.
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await api.get('/api/prep/teams')
        if (cancel) return
        const teams = res.data?.teams ?? []
        const olRanked = teams.filter((t) => Number.isFinite(t.olRank)).length
        const headCoaches = teams.filter((t) => t.hcName).length
        setStats({
          teamCount: teams.length,
          headCoaches,
          olRanked,
          updatedAt: new Date(),
        })
      } catch (e) {
        if (!cancel) setError(e?.response?.data?.error ?? e.message)
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  const issueLabel = useMemo(() => {
    const d = new Date()
    const m = d.toLocaleString('en-US', { month: 'long' }).toUpperCase()
    return `${m} ${d.getFullYear()} — OFFSEASON ISSUE`
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Page chrome — almanac header */}
      <div className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">
          <Link to="/lab" className="hover:text-blaze transition-colors">
            ← The Lab
          </Link>
          <span>{issueLabel}</span>
          <span>Volume I</span>
        </div>
      </div>

      {/* Hero — magazine title spread */}
      <header className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="font-mono text-xs uppercase tracking-[0.32em] text-blaze mb-6">
              Section / Prep
            </div>
            <h1 className="font-display font-extrabold leading-[0.92] tracking-tight text-[clamp(3.5rem,9vw,7rem)]">
              The
              <br />
              Offseason
              <br />
              <span className="font-editorial italic font-normal text-blaze">
                annual.
              </span>
            </h1>
          </div>
          <div className="col-span-12 md:col-span-4 md:pb-4">
            <p className="font-editorial italic text-2xl md:text-3xl leading-snug text-text-secondary">
              Every staff. Every depth chart. Every offseason move that’ll cost
              you a fantasy season if you walk into draft day cold.
            </p>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-14 border-t border-b border-[var(--color-border)] py-6 grid grid-cols-3 md:grid-cols-4 gap-6">
          <StatChip
            label="Teams covered"
            value={loading ? '—' : stats?.teamCount ?? '—'}
          />
          <StatChip
            label="Head coaches"
            value={loading ? '—' : stats?.headCoaches ?? '—'}
            tone="accent"
          />
          <StatChip
            label="OL ranks (2025)"
            value={loading ? '—' : stats?.olRanked ?? '—'}
            tone="field"
          />
          <StatChip
            label="Issue"
            value={
              <span className="font-editorial italic text-2xl md:text-3xl normal-case tracking-normal">
                Vol. I
              </span>
            }
            tone="crown"
          />
        </div>

        {error && (
          <div className="mt-6 font-mono text-xs text-live-red">
            Couldn’t load Prep summary: {error}
          </div>
        )}
      </header>

      {/* The three rooms — editorial table of contents */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-text-muted mb-8">
          — The three rooms
        </div>
        <ul className="space-y-12">
          {ROOMS.map((room) => (
            <li key={room.slug} className="group">
              <Link
                to={room.href}
                className="block border-t border-[var(--color-border)] pt-8 hover:bg-[var(--glass)] transition-colors -mx-6 px-6 rounded-card"
              >
                <div className="grid grid-cols-12 gap-6 items-start">
                  <div className="col-span-12 md:col-span-1">
                    <span className="font-editorial italic text-4xl md:text-5xl text-blaze">
                      {room.eyebrow}
                    </span>
                  </div>
                  <div className="col-span-12 md:col-span-7">
                    <h2 className="font-display font-extrabold text-3xl md:text-5xl leading-tight tracking-tight">
                      {room.title}
                    </h2>
                    <p className="mt-4 font-editorial italic text-xl md:text-2xl text-text-secondary leading-snug">
                      “{room.pull}”
                    </p>
                    <p className="mt-5 font-body text-base md:text-lg text-text-secondary leading-relaxed max-w-[52ch]">
                      {room.body}
                    </p>
                  </div>
                  <div className="col-span-12 md:col-span-4 md:pt-4 flex md:justify-end">
                    <span className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.24em] text-blaze group-hover:text-blaze-hot transition-colors">
                      {room.cta}
                      <span aria-hidden="true" className="text-lg leading-none transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer — colophon */}
      <footer className="mx-auto max-w-6xl px-6 py-10 border-t border-[var(--color-border)]">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-8">
            <p className="font-editorial italic text-lg md:text-xl text-text-muted leading-snug max-w-[60ch]">
              Built from the data spine that powers Clutch’s prep stack —
              daily Sleeper rosters, ESPN unit ranks, FantasyPros projections,
              the season’s coordinator shuffle. Refreshed every morning
              before you wake up.
            </p>
          </div>
          <div className="col-span-12 md:col-span-4 md:text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-muted">
              {stats?.updatedAt
                ? `Updated ${stats.updatedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`
                : ''}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
