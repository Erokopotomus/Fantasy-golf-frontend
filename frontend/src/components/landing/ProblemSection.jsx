import { BlurFade } from '@/components/ui/blur-fade'
import { TypingAnimation } from '@/components/ui/typing-animation'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'

export default function ProblemSection() {
  return (
    <section
      className="relative py-20 md:py-28 bg-[#0C0E14] overflow-hidden"
      aria-label="The problem"
    >
      {/* Large pulsing glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className="w-[700px] h-[500px] bg-[radial-gradient(ellipse,rgba(240,104,32,0.12)_0%,transparent_60%)] animate-[pulseGlow_4s_ease_infinite]"
        />
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="relative z-10 max-w-2xl mx-auto px-5 text-center">
        <BlurFade delay={0} inView>
          <TypingAnimation
            className="font-editorial italic text-[#F0EDE6] text-3xl sm:text-4xl md:text-5xl"
            duration={60}
            showCursor={true}
            cursorStyle="line"
          >
            The best manager in your league might not have the ring.
          </TypingAnimation>
        </BlurFade>

        <BlurFade delay={0.15} inView>
          <p className="mt-8 font-body text-[15px] text-[#908C84] max-w-[560px] mx-auto leading-relaxed">
            Fantasy rewards luck as much as skill. You can make the right
            call every week and still lose to the schedule. Clutch doesn&apos;t
            fix variance — but it finds the specific edges that tilt it
            back in your favor.
          </p>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <AnimatedGradientText
            colorFrom="#D4930D"
            colorTo="#F06820"
            className="mt-10 font-mono text-[11px] tracking-[0.2em] uppercase"
          >
            BUILT FOR THE MANAGER WHO DOES THE WORK
          </AnimatedGradientText>
        </BlurFade>
      </div>
    </section>
  )
}
