import { BlurFade } from '@/components/ui/blur-fade'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { NumberTicker } from '@/components/ui/number-ticker'

const yourStats = [
  { label: 'Mock drafts completed', value: 14 },
  { label: 'Lab sessions this month', value: 23 },
  { label: 'Draft board refined', value: 8, suffix: ' times' },
  { label: 'Blind spots identified', value: 3 },
]

const theirStats = [
  { label: 'Mock drafts completed', display: '0' },
  { label: 'Lab sessions this month', display: '2' },
  { label: 'Draft board refined', display: '0 times' },
  { label: 'Blind spots identified', display: '—' },
]

export default function AiReframeSection() {
  return (
    <section className="bg-[#07080C] py-24 md:py-32 px-5" aria-label="AI reframe">
      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <BlurFade delay={0} inView>
          <p className="font-mono text-[11px] tracking-[0.2em] text-[#5C5952] uppercase mb-4">
            The AI Question
          </p>
        </BlurFade>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left — copy */}
          <div>
            <BlurFade delay={0.1} inView>
              <h2 className="font-display font-extrabold text-[#F0EDE6] text-2xl sm:text-3xl md:text-[44px] leading-[1.15] tracking-tight">
                Everyone in your league gets the same platform.
                <br />
                <AnimatedGradientText colorFrom="#F06820" colorTo="#D4930D">
                  Nobody gets the same co-pilot.
                </AnimatedGradientText>
              </h2>
            </BlurFade>

            <BlurFade delay={0.2} inView>
              <p className="mt-6 text-[15px] text-[#908C84] max-w-[520px] leading-relaxed">
                Your co-pilot is built from you — every mock draft, every
                trade review, every Lab session. Theirs is built from them.
                If they half-ass it, their co-pilot half-asses it back.
              </p>
            </BlurFade>
          </div>

          {/* Right — comparison cards */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Your Co-Pilot — glassmorphic + alive */}
            <BlurFade delay={0.25} inView className="flex-1">
              <div className="bg-gradient-to-br from-[#F06820] via-[#D4930D] to-[#F06820] p-[1px] rounded-2xl shadow-[0_0_30px_rgba(240,104,32,0.15)]">
                <div className="bg-[#0D0F15] rounded-2xl backdrop-blur-xl">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-2 h-2 rounded-full bg-[#F06820] shadow-[0_0_8px_rgba(240,104,32,0.6)]" />
                      <span className="font-display font-bold text-[#F0EDE6] text-sm">
                        Your Co-Pilot
                      </span>
                    </div>
                    <div className="space-y-4">
                      {yourStats.map((stat) => (
                        <div key={stat.label}>
                          <p className="text-xs text-[#5C5952]">{stat.label}</p>
                          <p className="font-mono text-lg font-bold">
                            <NumberTicker
                              value={stat.value}
                              delay={0.4}
                              className="text-[#F0EDE6]"
                            />
                            {stat.suffix && (
                              <span className="text-[#F0EDE6]">{stat.suffix}</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-5 text-xs text-[#F06820] italic">
                      Your co-pilot knows your tendencies.
                    </p>
                  </div>
                </div>
              </div>
            </BlurFade>

            {/* Their Co-Pilot — dead/dim */}
            <BlurFade delay={0.35} inView className="flex-1">
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 sm:p-6 opacity-50">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-2 h-2 rounded-full bg-[#5C5952]" />
                  <span className="font-display font-bold text-[#5C5952] text-sm">
                    Their Co-Pilot
                  </span>
                </div>
                <div className="space-y-4">
                  {theirStats.map((stat) => (
                    <div key={stat.label}>
                      <p className="text-xs text-[#5C5952]">{stat.label}</p>
                      <p className="font-mono text-lg text-[#5C5952] font-bold">
                        {stat.display}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs text-[#5C5952] italic">
                  Their co-pilot has nothing to work with.
                </p>
              </div>
            </BlurFade>
          </div>
        </div>

        {/* Pull quote */}
        <BlurFade delay={0.45} inView>
          <p className="mt-12 text-center font-editorial italic text-lg text-[#908C84]">
            &ldquo;Same software. Completely different weapons.&rdquo;
          </p>
        </BlurFade>
      </div>
    </section>
  )
}
