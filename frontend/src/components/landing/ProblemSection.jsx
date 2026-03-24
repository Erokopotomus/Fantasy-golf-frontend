import { BlurFade } from '@/components/ui/blur-fade'

export default function ProblemSection() {
  return (
    <section
      className="relative py-24 md:py-32 bg-slate dark:bg-[#0A0C10] overflow-hidden"
      aria-label="The problem"
    >
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(212,147,13,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 text-center">
        <BlurFade delay={0} inView>
          <p className="font-editorial italic text-[#EEEAE2] text-2xl sm:text-4xl md:text-[48px] leading-[1.2]">
            &ldquo;The best manager in your league
            <br className="hidden sm:block" />
            might not have the ring.&rdquo;
          </p>
        </BlurFade>

        <BlurFade delay={0.15} inView>
          <p className="mt-8 font-body text-[15px] text-[#908C84] max-w-[560px] mx-auto leading-relaxed">
            Fantasy rewards luck as much as skill. You can make the right
            call every week and still lose to the schedule. Clutch doesn't
            fix variance — but it finds the specific edges that tilt it
            back in your favor.
          </p>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <p className="mt-10 font-mono text-[11px] text-crown tracking-[0.2em] uppercase">
            Built for the manager who does the work
          </p>
        </BlurFade>
      </div>
    </section>
  )
}
