import { BlurFade } from '@/components/ui/blur-fade'
import { AnimatedList, AnimatedListItem } from '@/components/ui/animated-list'

const leaderboardEntries = [
  { name: 'ChaseTheTrophy', accuracy: '82.6%', record: '147-31', emoji: '\uD83C\uDFC6' },
  { name: 'StatSurgeon', accuracy: '81.5%', record: '128-29', emoji: '\uD83D\uDCCA' },
  { name: 'ClutchCallKing', accuracy: '78.7%', record: '122-33', emoji: '\uD83D\uDD25' },
  { name: 'GridironGuru', accuracy: '80.3%', record: '139-34', emoji: '\u26A1' },
  { name: 'BoldCallBrian', accuracy: '76.6%', record: '118-36', emoji: '\uD83C\uDFAF' },
]

const edgeInsights = [
  { icon: '\uD83C\uDFAF', label: 'Draft Intelligence', detail: 'You reach in rounds 3-5' },
  { icon: '\uD83D\uDCCA', label: 'Roster Gaps', detail: 'Slow to react after injuries' },
  { icon: '\uD83E\uDDE0', label: 'Research Depth', detail: 'Off-season engagement is your gap' },
  { icon: '\u26A1', label: 'One Action', detail: 'Run 2 mock drafts this week' },
]

export default function TwoLayersSection() {
  return (
    <section className="py-24 md:py-32 bg-[var(--bg-alt)] px-5" aria-label="How it works">
      <div className="max-w-6xl mx-auto">
        <BlurFade delay={0} inView>
          <p className="font-mono text-[11px] text-[var(--text-3)] tracking-[0.2em] uppercase mb-4">
            How It Works
          </p>
        </BlurFade>

        <BlurFade delay={0.1} inView>
          <h2 className="font-display font-extrabold text-[var(--text-1)] text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight mb-12">
            Two layers. Two jobs. Never mixed.
          </h2>
        </BlurFade>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Public layer — 3 cols */}
          <BlurFade delay={0.2} inView className="md:col-span-3">
            <div className="h-full rounded-2xl border border-field/20 bg-[var(--surface)] p-6 sm:p-8 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-field" />
                <span className="font-display font-bold text-field text-lg">
                  The Scoreboard
                </span>
              </div>
              <p className="font-mono text-[11px] text-[var(--text-3)] tracking-wider uppercase mb-6">
                Public &middot; Competitive &middot; Bragging rights
              </p>

              <div className="h-[240px] overflow-hidden">
                <AnimatedList delay={1200} className="gap-2">
                  {leaderboardEntries.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center gap-3 rounded-xl bg-[var(--bg)] border border-[var(--card-border)] px-4 py-3"
                    >
                      <span className="text-lg">{entry.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm text-[var(--text-1)] truncate">
                          {entry.name}
                        </p>
                        <p className="font-mono text-[11px] text-[var(--text-3)]">
                          {entry.accuracy} accuracy &middot; {entry.record}
                        </p>
                      </div>
                    </div>
                  ))}
                </AnimatedList>
              </div>

              <p className="mt-6 font-body text-xs text-[var(--text-3)] leading-relaxed">
                Win rates. Head-to-head records. Call accuracy.
                Everyone sees this. This is where you talk trash.
              </p>
            </div>
          </BlurFade>

          {/* Private layer — 2 cols */}
          <BlurFade delay={0.3} inView className="md:col-span-2">
            <div className="h-full rounded-2xl border border-crown/20 bg-slate dark:bg-[#0F1118] p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-crown" />
                <span className="font-display font-bold text-crown text-lg">
                  Your Edge
                </span>
              </div>
              <p className="font-mono text-[11px] text-[#908C84] tracking-wider uppercase mb-6">
                Private &middot; Personal &middot; Compounding
              </p>

              <div className="space-y-4">
                {edgeInsights.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="text-base mt-0.5">{item.icon}</span>
                    <div>
                      <p className="font-display font-semibold text-sm text-[#EEEAE2]">
                        {item.label}
                      </p>
                      <p className="font-body text-xs text-[#908C84]">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-8 font-body text-xs text-[#5C5952] leading-relaxed">
                Only you see this. This is what you do
                before you show up and beat them.
              </p>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}
