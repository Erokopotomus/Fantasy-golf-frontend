import { BlurFade } from '@/components/ui/blur-fade'
import { MagicCard } from '@/components/ui/magic-card'
import { NumberTicker } from '@/components/ui/number-ticker'

const yourStats = [
  { label: 'Mock drafts completed', value: 14 },
  { label: 'Lab sessions this month', value: 23 },
  { label: 'Draft board refined', value: 8, suffix: ' times' },
  { label: 'Blind spots identified', value: 3 },
]

const theirStats = [
  { label: 'Mock drafts completed', value: '0' },
  { label: 'Lab sessions this month', value: '2' },
  { label: 'Draft board refined', value: '0 times' },
  { label: 'Blind spots identified', value: '—' },
]

export default function AiReframeSection() {
  return (
    <section className="py-24 md:py-32 bg-[var(--bg)] px-5" aria-label="AI reframe">
      <div className="max-w-6xl mx-auto">
        <BlurFade delay={0} inView>
          <p className="font-mono text-[11px] text-[var(--text-3)] tracking-[0.2em] uppercase mb-4">
            The AI Question
          </p>
        </BlurFade>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left — copy */}
          <div>
            <BlurFade delay={0.1} inView>
              <h2 className="font-display font-extrabold text-[var(--text-1)] text-2xl sm:text-3xl md:text-[44px] leading-[1.15] tracking-tight">
                Everyone in your league gets the same platform.
                <br />
                <span className="text-blaze">Nobody gets the same co-pilot.</span>
              </h2>
            </BlurFade>

            <BlurFade delay={0.2} inView>
              <p className="mt-6 font-body text-[15px] text-[var(--text-2)] max-w-[520px] leading-relaxed">
                Your co-pilot is built from you — every mock draft, every
                trade review, every Lab session. Theirs is built from them.
                If they half-ass it, their co-pilot half-asses it back.
              </p>
            </BlurFade>
          </div>

          {/* Right — comparison cards */}
          <div className="flex flex-col sm:flex-row gap-4">
            <BlurFade delay={0.25} inView className="flex-1">
              <MagicCard
                gradientFrom="#F06820"
                gradientTo="#D4930D"
                gradientColor="rgba(240, 104, 32, 0.06)"
                gradientOpacity={0.8}
                className="rounded-2xl border border-[var(--card-border)]"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-2 h-2 rounded-full bg-blaze" />
                    <span className="font-display font-bold text-[var(--text-1)] text-sm">
                      Your Co-Pilot
                    </span>
                  </div>
                  <div className="space-y-4">
                    {yourStats.map((stat) => (
                      <div key={stat.label}>
                        <p className="font-body text-xs text-[var(--text-3)]">{stat.label}</p>
                        <p className="font-mono text-lg text-[var(--text-1)] font-bold">
                          <NumberTicker
                            value={stat.value}
                            delay={0.4}
                            className="text-[var(--text-1)]"
                          />
                          {stat.suffix || ''}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 font-body text-xs text-blaze italic">
                    Your co-pilot knows your tendencies.
                  </p>
                </div>
              </MagicCard>
            </BlurFade>

            <BlurFade delay={0.35} inView className="flex-1">
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6 opacity-60">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-2 h-2 rounded-full bg-[var(--stone)]" />
                  <span className="font-display font-bold text-[var(--text-3)] text-sm">
                    Their Co-Pilot
                  </span>
                </div>
                <div className="space-y-4">
                  {theirStats.map((stat) => (
                    <div key={stat.label}>
                      <p className="font-body text-xs text-[var(--text-3)]">{stat.label}</p>
                      <p className="font-mono text-lg text-[var(--text-3)] font-bold">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 font-body text-xs text-[var(--text-3)] italic">
                  Their co-pilot has nothing to work with.
                </p>
              </div>
            </BlurFade>
          </div>
        </div>

        {/* Pull quote */}
        <BlurFade delay={0.45} inView>
          <p className="mt-12 text-center font-editorial italic text-lg text-[var(--text-2)]">
            &ldquo;Same software. Completely different weapons.&rdquo;
          </p>
        </BlurFade>
      </div>
    </section>
  )
}
