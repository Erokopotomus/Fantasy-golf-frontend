import { Link } from 'react-router-dom'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Particles } from '@/components/ui/particles'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'

export default function ImportCtaSection() {
  return (
    <section
      className="relative py-24 md:py-32 bg-[#07080C] overflow-hidden"
      aria-label="Import your league"
    >
      {/* Aggressive gradient orb with pulse */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse,rgba(212,147,13,0.15)_0%,rgba(240,104,32,0.08)_40%,transparent_70%)] animate-[pulse-orb_5s_ease-in-out_infinite]"
        />
      </div>

      {/* Inline keyframes for orb pulse */}
      <style>{`
        @keyframes pulse-orb {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Particles */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={50}
        color="#D4930D"
        size={0.8}
        staticity={40}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5 text-center">
        <BlurFade delay={0} inView>
          <AnimatedGradientText colorFrom="#D4930D" colorTo="#F06820">
            <span className="font-editorial italic text-3xl sm:text-4xl md:text-5xl leading-[1.2]">
              &ldquo;You&apos;ve always been good. Now you&apos;ll know exactly what to fix.&rdquo;
            </span>
          </AnimatedGradientText>
        </BlurFade>

        <BlurFade delay={0.15} inView>
          <p className="mt-8 font-body text-[15px] text-[#908C84] max-w-md mx-auto leading-relaxed">
            Import from ESPN, Yahoo, Sleeper, Fantrax, or MFL.
            Your co-pilot starts learning from day one.
          </p>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <div className="mt-8">
            <Link to="/import" className="inline-block shadow-[0_0_50px_rgba(212,147,13,0.25)]">
              <ShimmerButton
                background="linear-gradient(135deg, #D4930D 0%, #F0B429 100%)"
                shimmerColor="rgba(255,255,255,0.4)"
                borderRadius="12px"
                className="text-base font-display font-bold px-8 py-3.5"
              >
                Import Your League History
              </ShimmerButton>
            </Link>
          </div>
        </BlurFade>

        <BlurFade delay={0.4} inView>
          <div className="mt-8 flex items-center justify-center gap-8">
            {['ESPN', 'Yahoo', 'Sleeper', 'Fantrax', 'MFL'].map((platform) => (
              <span
                key={platform}
                className="font-mono text-[11px] text-[#5C5952] tracking-wider uppercase"
              >
                {platform}
              </span>
            ))}
          </div>
        </BlurFade>

        <BlurFade delay={0.5} inView>
          <p className="mt-6 font-mono text-[11px] text-[#5C5952] tracking-wider">
            Free &middot; Takes 2 minutes &middot; All seasons preserved
          </p>
        </BlurFade>
      </div>
    </section>
  )
}
