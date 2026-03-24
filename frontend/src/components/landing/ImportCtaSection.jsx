import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Particles } from '@/components/ui/particles'

export default function ImportCtaSection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section
      className="relative py-24 md:py-32 bg-slate dark:bg-[#0A0C10] overflow-hidden"
      aria-label="Import your league"
    >
      {/* Radial crown glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse,rgba(212,147,13,0.1)_0%,transparent_65%)]" />
      </div>

      {/* Particles */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={30}
        color={isDark ? '#D4930D' : '#F0B429'}
        staticity={60}
        ease={60}
        size={0.4}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5 text-center">
        <BlurFade delay={0} inView>
          <p className="font-editorial italic text-[#EEEAE2] text-2xl sm:text-4xl md:text-[48px] leading-[1.2]">
            &ldquo;You&apos;ve always been good.
            <br />
            Now you&apos;ll know exactly what to fix.&rdquo;
          </p>
        </BlurFade>

        <BlurFade delay={0.15} inView>
          <p className="mt-8 font-body text-[15px] text-[#908C84] max-w-md mx-auto leading-relaxed">
            Import from ESPN, Yahoo, Sleeper, Fantrax, or MFL.
            Your co-pilot starts learning from day one.
          </p>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <div className="mt-8">
            <Link to="/import">
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
          <p className="mt-6 font-mono text-[11px] text-[#5C5952] tracking-wider">
            Free &middot; Takes 2 minutes &middot; All seasons preserved
          </p>
        </BlurFade>
      </div>
    </section>
  )
}
