import { useState } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { MagicCard } from '@/components/ui/magic-card'

function CoachView() {
  return (
    <div className="p-6 sm:p-8">
      <p className="font-body text-xs text-[var(--text-3)] mb-6">
        No numbers. No gamification. Just the breakdown.
      </p>
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-crown mt-2 shrink-0" />
          <div>
            <p className="font-display font-semibold text-sm text-[var(--text-1)]">
              Your strongest competency
            </p>
            <p className="font-body text-sm text-crown">Trade Acumen</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-live-red mt-2 shrink-0" />
          <div>
            <p className="font-display font-semibold text-sm text-[var(--text-1)]">
              Your biggest gap
            </p>
            <p className="font-body text-sm text-[var(--text-2)]">Off-season research depth</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-blaze mt-2 shrink-0" />
          <div>
            <p className="font-display font-semibold text-sm text-[var(--text-1)]">
              One action this week
            </p>
            <p className="font-body text-sm text-[var(--text-2)]">Run 2 mock drafts</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-[var(--glass)] p-4">
          <p className="font-editorial italic text-sm text-[var(--text-2)] leading-relaxed">
            &ldquo;Your trades have been your edge for 3 years.
            Your draft prep has been inconsistent.&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}

function GamifiedView() {
  return (
    <div className="p-6 sm:p-8">
      <p className="font-body text-xs text-[var(--text-3)] mb-6">
        XP. Tiers. Challenges. Same coaching, dopamine-friendly.
      </p>
      <div className="space-y-5">
        {/* Overall tier */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-display font-bold text-sm text-[var(--text-1)]">Overall</span>
            <span className="font-mono text-[11px] text-crown">Gold III &rarr; Clutch</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--glass-bright)] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-crown to-crown-bright" style={{ width: '72%' }} />
          </div>
          <p className="font-mono text-[10px] text-[var(--text-3)] mt-1">72% to next tier</p>
        </div>

        {/* Draft Intelligence bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-body text-xs text-[var(--text-2)]">Draft Intelligence</span>
            <span className="font-mono text-[10px] text-[var(--text-3)]">Silver II</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--glass-bright)] overflow-hidden">
            <div className="h-full rounded-full bg-blaze" style={{ width: '48%' }} />
          </div>
        </div>

        {/* Weekly challenge */}
        <div className="rounded-xl border border-blaze/20 bg-blaze/5 p-4">
          <p className="font-display font-semibold text-xs text-blaze mb-1">
            Weekly Challenge
          </p>
          <p className="font-body text-sm text-[var(--text-1)]">
            Complete 2 mock drafts
          </p>
          <p className="font-mono text-[10px] text-[var(--text-3)] mt-1">+150 XP</p>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2">
          <span className="text-base">&#128293;</span>
          <span className="font-mono text-sm text-[var(--text-1)] font-bold">4 weeks active</span>
        </div>
      </div>
    </div>
  )
}

export default function ViewToggleSection() {
  const [view, setView] = useState('coach')

  return (
    <section className="py-24 md:py-32 bg-[var(--bg-alt)] px-5" aria-label="Choose your view">
      <div className="max-w-4xl mx-auto">
        <BlurFade delay={0} inView>
          <p className="font-mono text-[11px] text-[var(--text-3)] tracking-[0.2em] uppercase mb-4 text-center">
            Your Choice
          </p>
        </BlurFade>

        <BlurFade delay={0.1} inView>
          <h2 className="font-display font-extrabold text-[var(--text-1)] text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight text-center mb-10">
            Pick your style. Same intelligence underneath.
          </h2>
        </BlurFade>

        {/* Toggle */}
        <BlurFade delay={0.2} inView>
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-xl bg-[var(--glass-bright)] p-1">
              <button
                onClick={() => setView('coach')}
                className={`px-5 py-2 rounded-lg text-sm font-display font-semibold transition-all ${
                  view === 'coach'
                    ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-card'
                    : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                }`}
              >
                Coach View
              </button>
              <button
                onClick={() => setView('gamified')}
                className={`px-5 py-2 rounded-lg text-sm font-display font-semibold transition-all ${
                  view === 'gamified'
                    ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-card'
                    : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                }`}
              >
                Gamified View
              </button>
            </div>
          </div>
        </BlurFade>

        {/* View cards */}
        <BlurFade delay={0.3} inView>
          <div className="max-w-lg mx-auto">
            <MagicCard
              gradientFrom={view === 'coach' ? '#D4930D' : '#F06820'}
              gradientTo={view === 'coach' ? '#F06820' : '#D4930D'}
              gradientColor={view === 'coach' ? 'rgba(212,147,13,0.06)' : 'rgba(240,104,32,0.06)'}
              gradientOpacity={0.8}
              className="rounded-2xl border border-[var(--card-border)]"
            >
              {view === 'coach' ? <CoachView /> : <GamifiedView />}
            </MagicCard>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
