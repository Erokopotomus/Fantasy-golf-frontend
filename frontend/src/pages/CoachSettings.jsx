import { useState } from 'react'
import Card from '../components/common/Card'
import NeuralCluster from '../components/common/NeuralCluster'
import { useCoachMemory } from '../hooks/useCoachMemory'

const TONE_OPTIONS = [
  { value: 'encouraging', label: 'Encouraging' },
  { value: 'direct', label: 'Direct' },
  { value: 'analytical', label: 'Analytical' },
]

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'on_demand', label: 'On Demand' },
]

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'aggressive', label: 'Aggressive' },
]

const PHILOSOPHY_OPTIONS = [
  { value: 'best_available', label: 'Best Available' },
  { value: 'positional_need', label: 'Positional Need' },
  { value: 'upside_swing', label: 'Upside Swing' },
  { value: 'safe_floor', label: 'Safe Floor' },
  { value: 'contrarian', label: 'Contrarian' },
  { value: 'stars_and_scrubs', label: 'Stars & Scrubs' },
]

function PillGroup({ label, options, value, onChange }) {
  return (
    <div className="mb-5">
      <p className="font-body text-sm text-[var(--text-3)] mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-body font-medium transition-all duration-200 ${
                active
                  ? 'bg-blaze text-white shadow-sm'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--text-3)]'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MultiPillGroup({ label, options, values, onChange }) {
  const toggle = (val) => {
    const next = values.includes(val)
      ? values.filter(v => v !== val)
      : [...values, val]
    onChange(next)
  }

  return (
    <div className="mb-5">
      <p className="font-body text-sm text-[var(--text-3)] mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = values.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-body font-medium transition-all duration-200 ${
                active
                  ? 'bg-blaze text-white shadow-sm'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--text-3)]'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InteractionCard({ interaction, onReact }) {
  const date = new Date(interaction.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="py-4 border-b border-[var(--border)] last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm text-[var(--text-1)] leading-relaxed">
            {interaction.summary || 'Coach interaction'}
          </p>
          <p className="font-body text-xs text-[var(--text-3)] mt-1">{date}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onReact(interaction.id, interaction.userReaction === 'helpful' ? null : 'helpful')}
            className={`p-1.5 rounded-md text-sm transition-colors ${
              interaction.userReaction === 'helpful'
                ? 'bg-field text-white'
                : 'text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-2)]'
            }`}
            title="Helpful"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
            </svg>
          </button>
          <button
            onClick={() => onReact(interaction.id, interaction.userReaction === 'not_useful' ? null : 'not_useful')}
            className={`p-1.5 rounded-md text-sm transition-colors ${
              interaction.userReaction === 'not_useful'
                ? 'bg-live-red text-white'
                : 'text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-2)]'
            }`}
            title="Not useful"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

const CoachSettings = () => {
  const {
    identity, interactions, loading, saving, error,
    updateIdentity, addNote, deleteNote, reactToInteraction,
  } = useCoachMemory()

  const [noteText, setNoteText] = useState('')

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center gap-3">
          <NeuralCluster size="sm" intensity="thinking" />
          <p className="font-body text-[var(--text-3)]">Loading coach settings...</p>
        </div>
      </div>
    )
  }

  const handleFieldChange = (field, value) => {
    updateIdentity({ ...identity, [field]: value })
  }

  const handleAddNote = () => {
    const text = noteText.trim()
    if (!text) return
    addNote(text)
    setNoteText('')
  }

  const handleNoteKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <NeuralCluster size="sm" intensity="calm" />
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-1)]">Coach Settings</h1>
          <p className="font-body text-sm text-[var(--text-3)]">
            Customize how your AI coach communicates and coaches you.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-live-red/10 border border-live-red/20 text-live-red text-sm font-body">
          {error}
        </div>
      )}

      {/* Section 1: Coaching Style */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="font-display text-lg font-bold text-[var(--text-1)]">Coaching Style</h2>
          {saving && (
            <span className="text-xs font-body text-[var(--text-3)]">Saving...</span>
          )}
        </div>

        <PillGroup
          label="Tone"
          options={TONE_OPTIONS}
          value={identity?.coachingTone || 'encouraging'}
          onChange={(v) => handleFieldChange('coachingTone', v)}
        />

        <PillGroup
          label="Frequency"
          options={FREQUENCY_OPTIONS}
          value={identity?.coachingFrequency || 'daily'}
          onChange={(v) => handleFieldChange('coachingFrequency', v)}
        />

        <PillGroup
          label="Risk Appetite"
          options={RISK_OPTIONS}
          value={identity?.riskAppetite || 'balanced'}
          onChange={(v) => handleFieldChange('riskAppetite', v)}
        />

        <MultiPillGroup
          label="Draft Philosophy"
          options={PHILOSOPHY_OPTIONS}
          values={identity?.draftPhilosophy || ['best_available']}
          onChange={(v) => handleFieldChange('draftPhilosophy', v)}
        />
      </Card>

      {/* Section 2: Tell Your Coach */}
      <Card className="mb-6">
        <h2 className="font-display text-lg font-bold text-[var(--text-1)] mb-4">Tell Your Coach</h2>
        <p className="font-body text-sm text-[var(--text-3)] mb-4">
          Add notes about your preferences, biases, or anything you want your coach to remember.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleNoteKeyDown}
            placeholder="e.g. I always want to roster Scottie Scheffler"
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-1)] font-body text-sm placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-blaze/40 focus:border-blaze transition-colors"
          />
          <button
            onClick={handleAddNote}
            disabled={!noteText.trim()}
            className="px-4 py-2.5 rounded-lg bg-blaze text-white font-body text-sm font-medium hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {identity?.userNotes?.length > 0 ? (
          <div className="space-y-2">
            {identity.userNotes.map((note, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-body text-sm text-[var(--text-1)]">{note.text}</span>
                  {note.addedAt && (
                    <p className="font-body text-xs text-[var(--text-3)] mt-0.5">
                      {new Date(note.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteNote(i)}
                  className="p-1 text-[var(--text-3)] hover:text-live-red transition-colors flex-shrink-0"
                  title="Remove note"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-body text-sm text-[var(--text-3)] italic">
            No notes yet. Your coach learns from what you tell it.
          </p>
        )}
      </Card>

      {/* Section 3: Coaching History */}
      <Card>
        <h2 className="font-display text-lg font-bold text-[var(--text-1)] mb-4">Coaching History</h2>
        <p className="font-body text-sm text-[var(--text-3)] mb-4">
          Recent coaching interactions. Reactions help your coach learn what works for you.
        </p>

        {interactions.length > 0 ? (
          <div>
            {interactions.map(interaction => (
              <InteractionCard
                key={interaction.id}
                interaction={interaction}
                onReact={reactToInteraction}
              />
            ))}
          </div>
        ) : (
          <p className="font-body text-sm text-[var(--text-3)] italic py-4">
            No coaching history yet. As your coach gives you advice, it will appear here.
          </p>
        )}
      </Card>
    </div>
  )
}

export default CoachSettings
