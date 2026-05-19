import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { TEAM_COLORS, hexToRgba } from '../utils/nflTeamColors'

/**
 * Lab → Prep → Daily Quiz (DS-16).
 *
 * The session page: one card at a time, SUBJECT TEAM color drives the
 * card identity (Bills card = royal blue, Chiefs card = red), two-stage
 * interaction — pick a choice (reveals correct answer), then self-rate
 * Again/Hard/Good/Easy to feed SM-2 + advance.
 *
 * Streak display in the masthead is the daily-quiz hero metric. Settings
 * gear opens a tight focus/cards-per-day editor that PATCHes
 * /prep/quiz/settings.
 */

const FOCUS_MODES = [
  { value: '', label: 'All 32 teams' },
  { value: 'AFC', label: 'AFC only' },
  { value: 'NFC', label: 'NFC only' },
  { value: 'AFC_EAST', label: 'AFC East' },
  { value: 'AFC_NORTH', label: 'AFC North' },
  { value: 'AFC_SOUTH', label: 'AFC South' },
  { value: 'AFC_WEST', label: 'AFC West' },
  { value: 'NFC_EAST', label: 'NFC East' },
  { value: 'NFC_NORTH', label: 'NFC North' },
  { value: 'NFC_SOUTH', label: 'NFC South' },
  { value: 'NFC_WEST', label: 'NFC West' },
]

const QUALITY_BUTTONS = [
  {
    quality: 0,
    label: 'Again',
    sub: 'Missed it',
    bg: 'bg-live-red',
    bgHover: 'hover:bg-live-red/90',
    text: 'text-white',
  },
  {
    quality: 1,
    label: 'Hard',
    sub: 'Barely',
    bg: 'bg-slate',
    bgHover: 'hover:bg-slate-mid',
    text: 'text-white',
  },
  {
    quality: 2,
    label: 'Good',
    sub: 'Solid',
    bg: 'bg-field',
    bgHover: 'hover:bg-field-bright',
    text: 'text-white',
  },
  {
    quality: 3,
    label: 'Easy',
    sub: 'Knew it cold',
    bg: 'bg-crown',
    bgHover: 'hover:bg-crown-bright',
    text: 'text-white',
  },
]

function classNames(...c) {
  return c.filter(Boolean).join(' ')
}

/**
 * Deterministic-ish shuffle so option order stays stable while a single
 * card is on screen but rerolls per card. Fisher-Yates over a copy.
 */
function shuffleOptions(answer, distractors, seed) {
  const arr = [answer, ...(distractors ?? [])].filter(Boolean)
  // Seeded LCG so repeated renders of the SAME card keep the same order.
  let s = (seed || 1) >>> 0
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function hashStr(str) {
  let h = 0
  for (let i = 0; i < (str?.length ?? 0); i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return h >>> 0
}

function prettyCategory(cat) {
  if (!cat) return ''
  return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()
}

/**
 * The active card. Subject team color washes the whole card — this is the
 * shareability moment.
 */
function ActiveCard({ card, onAnswered }) {
  const [picked, setPicked] = useState(null)
  // Reset internal state any time the card identity changes.
  useEffect(() => {
    setPicked(null)
  }, [card?.id])

  const subjectColor = TEAM_COLORS[card.subject] ?? '#1E2A3A'
  const options = useMemo(
    () => shuffleOptions(card.answer, card.distractors, hashStr(card.id)),
    [card.id, card.answer, card.distractors],
  )

  const revealed = picked != null

  return (
    <div
      key={card.id}
      className="relative rounded-card-lg overflow-hidden shadow-card animate-[fadeIn_220ms_ease-out]"
      style={{
        background: `linear-gradient(160deg, ${hexToRgba(subjectColor, 0.14)} 0%, ${hexToRgba(subjectColor, 0.04)} 60%, var(--surface) 100%)`,
        border: `1px solid ${hexToRgba(subjectColor, 0.34)}`,
      }}
    >
      {/* Team-color top band — owns the card's identity */}
      <div className="h-2 w-full" style={{ backgroundColor: subjectColor }} />
      <div className="p-6 md:p-9">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span
              className="font-mono font-extrabold text-lg tracking-tight px-2 py-0.5 rounded"
              style={{ color: subjectColor, backgroundColor: hexToRgba(subjectColor, 0.12) }}
            >
              {card.subject}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
              · {prettyCategory(card.category)}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
            Difficulty {card.difficulty ?? 1}/5
          </span>
        </div>

        <h2 className="font-editorial italic text-2xl md:text-[32px] leading-snug text-[var(--text-1)]">
          “{card.question}”
        </h2>

        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {options.map((choice) => {
            const isAnswer = choice === card.answer
            const isPicked = choice === picked
            return (
              <button
                key={choice}
                type="button"
                disabled={revealed}
                onClick={() => setPicked(choice)}
                className={classNames(
                  'text-left px-4 py-3 rounded-button border font-body text-sm transition-all bg-white/60 min-h-[48px]',
                  !revealed && 'border-[var(--color-border)] hover:bg-white cursor-pointer',
                  revealed && isAnswer && 'border-field bg-field/10 text-field font-bold',
                  revealed && !isAnswer && isPicked && 'border-live-red bg-live-red/10 text-live-red font-bold',
                  revealed && !isAnswer && !isPicked && 'border-[var(--color-border)] opacity-40',
                )}
                style={!revealed ? { borderColor: hexToRgba(subjectColor, 0.28) } : undefined}
              >
                {choice}
              </button>
            )
          })}
        </div>

        {/* SM-2 self-rating row — appears only after a choice is made */}
        {revealed && (
          <div className="mt-7 animate-[fadeIn_180ms_ease-out]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted mb-2.5">
              How hard was that?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUALITY_BUTTONS.map((q) => (
                <button
                  key={q.quality}
                  type="button"
                  onClick={() => onAnswered(card.id, q.quality, picked === card.answer)}
                  className={classNames(
                    'px-3 py-3 rounded-button font-display font-extrabold tracking-tight transition-all shadow-button hover:-translate-y-0.5',
                    q.bg,
                    q.bgHover,
                    q.text,
                  )}
                >
                  <span className="block text-base leading-none">{q.label}</span>
                  <span className="block font-body font-medium text-[10px] uppercase tracking-[0.16em] opacity-80 mt-1">
                    {q.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CLUTCH attribution footer — screenshot identity */}
        <div className="mt-7 pt-5 border-t border-[var(--color-border)]/60 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-1)] font-bold">⚡ CLUTCH</span>
            <span className="text-text-muted">· NFL Prep</span>
          </div>
          <span className="text-text-muted">Daily quiz</span>
        </div>
      </div>
    </div>
  )
}

function SettingsModal({ open, onClose, settings, onSave, saving }) {
  const [focus, setFocus] = useState(settings?.focusMode ?? '')
  const [cardsPerDay, setCardsPerDay] = useState(settings?.cardsPerDay ?? 10)

  useEffect(() => {
    if (open) {
      setFocus(settings?.focusMode ?? '')
      setCardsPerDay(settings?.cardsPerDay ?? 10)
    }
  }, [open, settings])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-card-lg shadow-card bg-[var(--surface)] border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 bg-blaze" />
        <div className="p-6">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-display font-extrabold text-xl tracking-tight">Quiz settings</h3>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted hover:text-[var(--text-1)] transition-colors"
            >
              Close
            </button>
          </div>
          <p className="font-body text-sm text-text-secondary mb-5">
            Tune what shows up tomorrow.
          </p>

          <label className="block mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
              Focus mode
            </span>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="mt-1.5 w-full rounded-button border border-[var(--color-border)] bg-[var(--bg)] px-3 py-2.5 font-body text-sm text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-blaze/40"
            >
              {FOCUS_MODES.map((m) => (
                <option key={m.value || 'all'} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block mb-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
              Cards per day
            </span>
            <div className="mt-1.5 flex items-baseline gap-3">
              <input
                type="number"
                min={5}
                max={25}
                value={cardsPerDay}
                onChange={(e) => setCardsPerDay(parseInt(e.target.value || '0', 10))}
                className="w-24 rounded-button border border-[var(--color-border)] bg-[var(--bg)] px-3 py-2.5 font-mono text-base font-bold text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-blaze/40"
              />
              <span className="font-body text-xs text-text-muted">5–25 recommended</span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-button font-mono text-xs uppercase tracking-[0.16em] text-text-secondary hover:text-[var(--text-1)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave({ focusMode: focus === '' ? null : focus, cardsPerDay })}
              className="px-5 py-2 rounded-button font-mono text-xs uppercase tracking-[0.16em] font-bold bg-blaze text-white hover:bg-blaze-hot transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PrepQuiz() {
  const [cards, setCards] = useState([])
  const [index, setIndex] = useState(0)
  const [settings, setSettings] = useState({
    focusMode: null,
    cardsPerDay: 10,
    currentStreak: 0,
    longestStreak: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 })
  const submittingRef = useRef(false)

  // Load deck + settings on mount.
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await api.request('/prep/quiz/due')
        if (cancel) return
        setCards(res.cards ?? [])
        setSettings(res.settings ?? settings)
      } catch (e) {
        if (!cancel) setError(e?.message ?? 'Failed to load')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = cards.length
  const currentCard = cards[index]
  const isComplete = !loading && total > 0 && index >= total

  const handleAnswered = useCallback(
    async (cardId, quality, wasCorrect) => {
      if (submittingRef.current) return
      submittingRef.current = true
      try {
        const res = await api.request('/prep/quiz/review', {
          method: 'POST',
          body: JSON.stringify({ cardId, quality }),
        })
        // Bump streak display in real time.
        if (res?.settings) {
          setSettings((prev) => ({
            ...prev,
            currentStreak: res.settings.currentStreak ?? prev.currentStreak,
            longestStreak: res.settings.longestStreak ?? prev.longestStreak,
          }))
        }
        setSessionStats((s) => ({
          reviewed: s.reviewed + 1,
          correct: s.correct + (wasCorrect ? 1 : 0),
        }))
        setIndex((i) => i + 1)
      } catch (e) {
        setError(e?.message ?? 'Failed to record review')
      } finally {
        submittingRef.current = false
      }
    },
    [],
  )

  const handleSaveSettings = useCallback(async ({ focusMode, cardsPerDay }) => {
    setSettingsSaving(true)
    try {
      const res = await api.request('/prep/quiz/settings', {
        method: 'PATCH',
        body: JSON.stringify({ focusMode, cardsPerDay }),
      })
      setSettings((prev) => ({ ...prev, ...res }))
      setSettingsOpen(false)
      // Reload deck so new focus mode takes effect immediately.
      setLoading(true)
      setIndex(0)
      setSessionStats({ reviewed: 0, correct: 0 })
      const due = await api.request('/prep/quiz/due')
      setCards(due.cards ?? [])
      if (due.settings) {
        setSettings((prev) => ({ ...prev, ...due.settings }))
      }
    } catch (e) {
      setError(e?.message ?? 'Failed to save settings')
    } finally {
      setSettingsSaving(false)
      setLoading(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Local keyframes for the card-fade — no global CSS additions */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Broadcast-style ticker — streak is the hero metric here */}
      <div className="h-0.5 bg-blaze" aria-hidden="true" />
      <div className="bg-slate-mid text-white border-b border-black/20">
        <div className="mx-auto max-w-4xl px-6 py-2.5 flex items-center justify-between gap-6 font-mono text-[11px] uppercase tracking-[0.22em] flex-wrap">
          <Link to="/lab/prep" className="text-white/60 hover:text-white transition-colors shrink-0">
            ← The Lab
          </Link>
          <div className="flex items-center gap-5 shrink-0">
            <div className="flex items-baseline gap-2">
              <span className="font-display font-extrabold text-blaze text-2xl leading-none tabular-nums tracking-tight">
                {settings.currentStreak ?? 0}
              </span>
              <span className="text-blaze font-bold text-[11px]">day streak</span>
            </div>
            <span className="text-white/40">·</span>
            <span className="text-white/60">
              best <span className="text-white font-bold">{settings.longestStreak ?? 0}</span>
            </span>
            <span className="text-white/40">·</span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Quiz settings"
              className="text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-6 pb-16">
        {/* Compressed hero */}
        <header className="mb-6">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-3xl md:text-4xl">
                Today’s deck.
                <span className="font-editorial italic font-normal text-blaze"> Until they stick.</span>
              </h1>
              <p className="mt-2 font-body text-sm text-text-secondary">
                One card at a time. Self-rate each so the system schedules the next pass.
              </p>
            </div>
            {!loading && total > 0 && !isComplete && (
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-3xl font-extrabold tabular-nums tracking-tight text-[var(--text-1)]">
                  {Math.min(index + 1, total)}
                </span>
                <span className="text-text-muted text-base">/ {total}</span>
              </div>
            )}
          </div>
          {error && (
            <div className="mt-3 font-mono text-xs text-live-red">
              {error}
            </div>
          )}
        </header>

        {/* Body states */}
        {loading ? (
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-16 text-center">
            Building today’s deck…
          </div>
        ) : total === 0 ? (
          // Empty state — nothing due
          <div className="rounded-card-lg border border-[var(--color-border)] bg-[var(--surface)] shadow-card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-field via-blaze to-crown" />
            <div className="p-8 md:p-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
                All caught up
              </p>
              <h2 className="mt-2 font-display font-extrabold text-3xl md:text-4xl tracking-tight">
                Nothing due today.
              </h2>
              <p className="mt-2 font-editorial italic text-xl text-text-secondary">
                Streak intact. See you tomorrow.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="px-5 py-2.5 rounded-button bg-slate text-white font-mono text-xs uppercase tracking-[0.18em] font-bold hover:bg-slate-mid transition-colors"
                >
                  Adjust focus
                </button>
                <Link
                  to="/lab/prep"
                  className="px-5 py-2.5 rounded-button border border-[var(--color-border)] font-mono text-xs uppercase tracking-[0.18em] font-bold text-[var(--text-1)] hover:bg-[var(--glass)] transition-colors"
                >
                  Back to Prep
                </Link>
              </div>
            </div>
          </div>
        ) : isComplete ? (
          // Session complete
          <div className="rounded-card-lg border border-[var(--color-border)] bg-[var(--surface)] shadow-card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blaze via-crown to-field" />
            <div className="p-8 md:p-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
                Session complete
              </p>
              <h2 className="mt-2 font-display font-extrabold text-3xl md:text-4xl tracking-tight">
                Deck complete.
              </h2>
              <p className="mt-2 font-editorial italic text-xl text-text-secondary">
                See you tomorrow.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm mx-auto">
                <div className="rounded-card border border-[var(--color-border)] bg-[var(--bg)] py-3">
                  <div className="font-mono font-extrabold text-2xl tabular-nums text-[var(--text-1)]">
                    {sessionStats.reviewed}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted mt-0.5">
                    Cards
                  </div>
                </div>
                <div className="rounded-card border border-[var(--color-border)] bg-[var(--bg)] py-3">
                  <div className="font-mono font-extrabold text-2xl tabular-nums text-field">
                    {sessionStats.correct}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted mt-0.5">
                    Correct
                  </div>
                </div>
                <div className="rounded-card border border-[var(--color-border)] bg-[var(--bg)] py-3">
                  <div className="font-mono font-extrabold text-2xl tabular-nums text-blaze">
                    {settings.currentStreak ?? 0}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted mt-0.5">
                    Streak
                  </div>
                </div>
              </div>
              <div className="mt-7">
                <Link
                  to="/lab/prep"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button bg-blaze text-white font-mono text-xs uppercase tracking-[0.18em] font-bold hover:bg-blaze-hot transition-colors"
                >
                  Back to Prep →
                </Link>
              </div>
            </div>
          </div>
        ) : currentCard ? (
          <ActiveCard card={currentCard} onAnswered={handleAnswered} />
        ) : null}

        <footer className="mt-10 pt-5 border-t border-[var(--color-border)] flex items-baseline justify-between gap-4 flex-wrap">
          <p className="font-body text-sm text-text-muted max-w-[52ch]">
            Spaced repetition. Cards you nail show up less often; ones you miss come back fast.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-blaze font-bold">
            ⚡ Clutch · NFL Prep
          </p>
        </footer>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        saving={settingsSaving}
      />
    </div>
  )
}
