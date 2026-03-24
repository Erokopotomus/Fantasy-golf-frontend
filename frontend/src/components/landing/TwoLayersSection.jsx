import { BlurFade } from '@/components/ui/blur-fade'
import { AnimatedList, AnimatedListItem } from '@/components/ui/animated-list'
import { DotPattern } from '@/components/ui/dot-pattern'

const leaderboardEntries = [
  { name: 'ChaseTheTrophy', accuracy: '82.6%', record: '147-31' },
  { name: 'StatSurgeon', accuracy: '81.5%', record: '128-29' },
  { name: 'ClutchCallKing', accuracy: '78.7%', record: '122-33' },
  { name: 'GridironGuru', accuracy: '80.3%', record: '139-34' },
  { name: 'BoldCallBrian', accuracy: '76.6%', record: '118-36' },
]

const edgeInsights = [
  { icon: '\uD83C\uDFAF', label: 'Draft Intelligence', detail: 'You reach in rounds 3-5' },
  { icon: '\uD83D\uDCCA', label: 'Roster Gaps', detail: 'Slow to react after injuries' },
  { icon: '\uD83E\uDDE0', label: 'Research Depth', detail: 'Off-season engagement is your gap' },
  { icon: '\u26A1', label: 'One Action', detail: 'Run 2 mock drafts this week' },
]

export default function TwoLayersSection() {
  return (
    <section className="relative py-24 md:py-32 bg-[#0C0E14] px-5 overflow-hidden" aria-label="How it works">
      <DotPattern className="opacity-[0.05]" />

      <div className="relative max-w-6xl mx-auto">
        <BlurFade delay={0} inView>
          <p className="font-mono text-[11px] tracking-[0.2em] text-[#5C5952] uppercase mb-4">
            How It Works
          </p>
        </BlurFade>

        <BlurFade delay={0.1} inView>
          <h2 className="font-display font-extrabold text-[#F0EDE6] text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight mb-12">
            Two layers. Two jobs. Never mixed.
          </h2>
        </BlurFade>

        <div className="grid md:grid-cols-5 gap-5">
          {/* LEFT — The Scoreboard (3 cols) */}
          <BlurFade delay={0.2} inView className="md:col-span-3">
            <div className="h-full backdrop-blur-xl bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#0D9668]" />
                <span className="font-display font-bold text-[#0D9668] text-lg">
                  The Scoreboard
                </span>
              </div>
              <p className="font-mono text-[11px] text-[#5C5952] tracking-wider uppercase mb-6">
                Public &middot; Competitive &middot; Bragging Rights
              </p>

              <div className="h-[240px] overflow-hidden">
                <AnimatedList delay={1200} className="gap-2">
                  {leaderboardEntries.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm text-[#F0EDE6] truncate">
                          {entry.name}
                        </p>
                        <p className="font-mono text-[11px] text-[#5C5952]">
                          {entry.accuracy} &middot; {entry.record}
                        </p>
                      </div>
                    </div>
                  ))}
                </AnimatedList>
              </div>

              <p className="mt-6 text-xs text-[#5C5952] leading-relaxed">
                Win rates. Head-to-head records. Call accuracy.
                Everyone sees this. This is where you talk trash.
              </p>
            </div>
          </BlurFade>

          {/* RIGHT — Your Edge (2 cols) */}
          <BlurFade delay={0.3} inView className="md:col-span-2">
            <div className="relative h-full backdrop-blur-xl bg-white/[0.04] border border-[rgba(212,147,13,0.2)] rounded-2xl shadow-[0_0_40px_rgba(212,147,13,0.08)] p-6 sm:p-8 overflow-hidden">
              {/* Scanning line animation */}
              <div
                className="pointer-events-none absolute inset-x-0 h-px bg-[#D4930D] opacity-30"
                style={{
                  animation: 'scanLine 8s linear infinite',
                }}
              />
              <style>{`
                @keyframes scanLine {
                  0% { transform: translateY(0); }
                  100% { transform: translateY(calc(100vh)); }
                }
              `}</style>

              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#D4930D]" />
                  <span className="font-display font-bold text-[#D4930D] text-lg">
                    Your Edge
                  </span>
                </div>
                <p className="font-mono text-[11px] text-[#5C5952] tracking-wider uppercase mb-6">
                  Private &middot; Personal &middot; Compounding
                </p>

                <div className="space-y-5">
                  {edgeInsights.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="text-base mt-0.5">{item.icon}</span>
                      <div>
                        <p className="font-display font-semibold text-sm text-[#F0EDE6]">
                          {item.label}
                        </p>
                        <p className="font-body text-xs text-[#908C84]">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-xs text-[#5C5952] leading-relaxed">
                  Only you see this. This is what you do
                  before you show up and beat them.
                </p>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}
