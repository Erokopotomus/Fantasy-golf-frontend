import { NavLink } from 'react-router-dom'

/**
 * Shared section nav for the Lab → Prep rooms. Renders four pills that
 * route between the hub, team browser, what-changed, and daily quiz.
 *
 * Drop this in directly below the dark ticker masthead on every Prep page.
 */

const ROOMS = [
  { label: 'Overview', to: '/lab/prep', end: true },
  { label: 'Teams', to: '/lab/prep/teams', end: false },
  { label: 'What Changed', to: '/lab/prep/changes', end: false },
  { label: "Today's Quiz", to: '/lab/prep/quiz', end: false },
]

export default function PrepSectionNav() {
  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-2.5 flex items-center gap-1 overflow-x-auto font-mono text-[11px] uppercase tracking-[0.2em]">
        {ROOMS.map((room) => (
          <NavLink
            key={room.to}
            to={room.to}
            end={room.end}
            className={({ isActive }) =>
              [
                'px-3.5 py-1.5 rounded-button transition-colors font-bold whitespace-nowrap',
                isActive
                  ? 'bg-slate text-white'
                  : 'text-text-secondary hover:text-[var(--text-1)] hover:bg-[var(--glass)]',
              ].join(' ')
            }
          >
            {room.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
