import { Link } from 'react-router-dom'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Particles } from '@/components/ui/particles'
import { DotPattern } from '@/components/ui/dot-pattern'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { WordRotate } from '@/components/ui/word-rotate'

export default function HeroSection() {
  return (
    <section
      className="relative min-h-[85vh] flex flex-col items-center bg-[#07080C] overflow-hidden"
      aria-label="Hero"
    >
      {/* Dot pattern — very faint grid behind everything */}
      <DotPattern
        className="opacity-[0.07] text-[#D4930D]"
        glow={true}
      />

      {/* Animated gradient orb */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full blur-[120px] opacity-40"
        style={{
          background: 'radial-gradient(circle, #F06820 0%, #D4930D 35%, #7C3AED 70%, #F06820 100%)',
          backgroundSize: '200% 200%',
          animation: 'orbShift 8s ease-in-out infinite',
        }}
      />

      {/* Particles */}
      <Particles
        className="absolute inset-0 z-[1]"
        quantity={80}
        color="#F06820"
        staticity={30}
        ease={50}
        size={1.0}
      />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center text-center px-5 pt-32 md:pt-40 pb-20 md:pb-24 max-w-4xl mx-auto">
        {/* Headline */}
        <BlurFade delay={0} inView>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-[70px] leading-[1.08] tracking-tight">
            <AnimatedGradientText
              colorFrom="#F06820"
              colorTo="#D4930D"
            >
              The more you put in,
              <br className="hidden sm:block" />
              the further ahead you get.
            </AnimatedGradientText>
          </h1>
        </BlurFade>

        {/* Subhead with word rotate */}
        <BlurFade delay={0.15} inView>
          <p className="mt-6 font-body text-[#908C84] text-base sm:text-lg max-w-xl leading-relaxed">
            A private AI co-pilot that learns{' '}
            <WordRotate
              words={[
                'your draft tendencies',
                'your roster habits',
                'your blind spots',
                'your trading patterns',
              ]}
              className="inline-block font-semibold text-[#F0EDE6]"
            />
            — and gets sharper every season.
          </p>
        </BlurFade>

        {/* CTAs */}
        <BlurFade delay={0.3} inView>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/register"
              className="shadow-[0_0_40px_rgba(240,104,32,0.3)] rounded-xl"
            >
              <ShimmerButton
                background="linear-gradient(135deg, #F06820 0%, #D4930D 100%)"
                shimmerColor="rgba(255,255,255,0.3)"
                borderRadius="12px"
                className="text-base font-display font-bold px-8 py-3.5"
              >
                Start Building Your Edge
              </ShimmerButton>
            </Link>
            <Link
              to="/import"
              className="text-sm font-body text-[#908C84] hover:text-[#F0EDE6] transition-colors underline underline-offset-4 decoration-[#5C5952]"
            >
              Already have a league? Import it &rarr;
            </Link>
          </div>
        </BlurFade>

        {/* Mono tag */}
        <BlurFade delay={0.45} inView>
          <p className="mt-8 font-mono text-[11px] text-[#5C5952] tracking-wider uppercase">
            Season-long fantasy &middot; Golf live &middot; NFL Fall 2026
          </p>
        </BlurFade>
      </div>

      {/* Orb animation keyframes */}
      <style>{`
        @keyframes orbShift {
          0% {
            background-position: 0% 50%;
            transform: translate(-50%, -50%) scale(1);
          }
          33% {
            background-position: 100% 50%;
            transform: translate(-50%, -50%) scale(1.05);
          }
          66% {
            background-position: 50% 100%;
            transform: translate(-50%, -50%) scale(0.95);
          }
          100% {
            background-position: 0% 50%;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </section>
  )
}
