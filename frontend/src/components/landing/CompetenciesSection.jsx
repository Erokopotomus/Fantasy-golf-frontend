import { BlurFade } from '@/components/ui/blur-fade'
import { MagicCard } from '@/components/ui/magic-card'

const competencies = [
  {
    title: 'Draft Intelligence',
    accent: '#F06820',
    description: 'Mock drafts, ADP study, board refinement, post-draft review',
    signal: 'Watched 14 mock drafts \u2192 Board getting sharper',
  },
  {
    title: 'Roster Management',
    accent: '#0D9668',
    description: 'Lineup decisions, waiver timing, injury response speed',
    signal: 'Responded to injury within 4 hours \u2192 Top 10%',
  },
  {
    title: 'Trade Acumen',
    accent: '#D4930D',
    description: 'Buy-low timing, trade frequency, negotiation behavior',
    signal: '3 trades won out of 4 this season',
  },
  {
    title: 'Research Depth',
    accent: '#1E2A3A',
    description: 'Lab time, call accuracy, off-season engagement',
    signal: 'Call accuracy up 8% since October',
  },
  {
    title: 'Decision Quality',
    accent: '#F06820',
    description: 'Process consistency, confidence calibration, post-mortem habit',
    signal: 'Stayed disciplined at 1-5 \u2192 Better than 90% of managers',
  },
]

export default function CompetenciesSection() {
  return (
    <section className="py-24 md:py-32 bg-[var(--bg)] px-5" aria-label="Five competencies">
      <div className="max-w-6xl mx-auto">
        <BlurFade delay={0} inView>
          <p className="font-mono text-[11px] text-[var(--text-3)] tracking-[0.2em] uppercase mb-4">
            What Your Co-Pilot Watches
          </p>
        </BlurFade>

        <BlurFade delay={0.1} inView>
          <h2 className="font-display font-extrabold text-[var(--text-1)] text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight max-w-3xl mb-12">
            Five competencies. All behavioral.
            <br />
            <span className="text-[var(--text-2)]">Wins and losses don&apos;t move these numbers.</span>
          </h2>
        </BlurFade>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible scrollbar-hide">
          {competencies.map((c, i) => (
            <BlurFade key={c.title} delay={0.15 + i * 0.1} inView className="shrink-0 w-[260px] md:w-auto">
              <MagicCard
                gradientFrom={c.accent}
                gradientTo={c.accent}
                gradientColor={`${c.accent}10`}
                gradientOpacity={0.8}
                className="rounded-2xl border border-[var(--card-border)] h-full"
              >
                <div className="p-5 flex flex-col h-full min-h-[220px]">
                  <div
                    className="w-8 h-1 rounded-full mb-4"
                    style={{ backgroundColor: c.accent }}
                  />
                  <h3 className="font-display font-bold text-[var(--text-1)] text-sm mb-2">
                    {c.title}
                  </h3>
                  <p className="font-body text-xs text-[var(--text-3)] leading-relaxed mb-4 flex-1">
                    {c.description}
                  </p>
                  <div className="rounded-lg bg-[var(--glass)] px-3 py-2">
                    <p className="font-mono text-[10px] text-[var(--text-2)] leading-relaxed">
                      {c.signal}
                    </p>
                  </div>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
