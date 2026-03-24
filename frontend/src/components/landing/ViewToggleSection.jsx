import { BlurFade } from '@/components/ui/blur-fade'

function CoachCard() {
  return (
    <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#D4930D]" />
        <h3 className="font-display font-bold text-lg text-[#F0EDE6]">Coach View</h3>
      </div>
      <p className="text-xs text-[#5C5952] mb-6">
        No numbers. No gamification. Just the breakdown.
      </p>

      {/* Content items */}
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4930D] mt-2 shrink-0" />
          <div>
            <p className="font-display font-semibold text-sm text-[#F0EDE6]">
              Your strongest competency
            </p>
            <p className="font-body text-sm text-[#D4930D]">Trade Acumen</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#E83838] mt-2 shrink-0" />
          <div>
            <p className="font-display font-semibold text-sm text-[#F0EDE6]">
              Your biggest gap
            </p>
            <p className="font-body text-sm text-[#908C84]">Off-season research depth</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F06820] mt-2 shrink-0" />
          <div>
            <p className="font-display font-semibold text-sm text-[#F0EDE6]">
              One action this week
            </p>
            <p className="font-body text-sm text-[#908C84]">Run 2 mock drafts</p>
          </div>
        </div>
      </div>

      {/* Quote box */}
      <div className="mt-6 bg-white/[0.03] rounded-xl p-4">
        <p className="font-editorial italic text-sm text-[#908C84] leading-relaxed">
          &ldquo;Your trades have been your edge for 3 years. Your draft prep has been inconsistent.&rdquo;
        </p>
      </div>
    </div>
  )
}

function GamifiedCard() {
  return (
    <div className="backdrop-blur-xl bg-white/[0.04] border border-[rgba(240,104,32,0.15)] rounded-2xl p-6 sm:p-8 shadow-[0_0_30px_rgba(240,104,32,0.06)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#F06820]" />
        <h3 className="font-display font-bold text-lg text-[#F0EDE6]">Gamified View</h3>
      </div>
      <p className="text-xs text-[#5C5952] mb-6">
        XP. Tiers. Challenges. Same coaching, dopamine-friendly.
      </p>

      <div className="space-y-5">
        {/* Overall tier */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-display font-bold text-sm text-[#F0EDE6]">Overall</span>
            <span className="font-mono text-[11px] text-[#D4930D]">Gold III &rarr; Clutch</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D4930D] to-[#F0B429] animate-shimmer relative overflow-hidden"
              style={{ width: '72%' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer-band" />
            </div>
          </div>
          <p className="font-mono text-[10px] text-[#5C5952] mt-1">72% to next tier</p>
        </div>

        {/* Draft Intelligence bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-body text-xs text-[#908C84]">Draft Intelligence</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-[#F06820]" style={{ width: '48%' }} />
          </div>
        </div>

        {/* Weekly Challenge */}
        <div className="border border-[rgba(240,104,32,0.15)] bg-[rgba(240,104,32,0.04)] rounded-xl p-4">
          <p className="font-display font-semibold text-xs text-[#F06820] mb-1">
            Weekly Challenge
          </p>
          <p className="font-body text-sm text-[#F0EDE6]">
            Complete 2 mock drafts
          </p>
          <p className="font-mono text-[10px] text-[#5C5952] mt-1">+150 XP</p>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2">
          <span className="text-base">&#128293;</span>
          <span className="font-mono text-sm font-bold text-[#F0EDE6]">4 weeks active</span>
        </div>
      </div>

      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-band {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  )
}

export default function ViewToggleSection() {
  return (
    <section className="py-24 md:py-32 px-5" style={{ backgroundColor: '#0C0E14' }} aria-label="Choose your view">
      <div className="max-w-4xl mx-auto">
        <BlurFade delay={0} inView>
          <p className="font-mono text-[11px] tracking-[0.2em] text-[#5C5952] text-center uppercase mb-4">
            Your Choice
          </p>
        </BlurFade>

        <BlurFade delay={0.1} inView>
          <h2 className="font-display font-extrabold text-[#F0EDE6] text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight text-center mb-10">
            Pick your style. Same intelligence underneath.
          </h2>
        </BlurFade>

        {/* Side-by-side cards with VS divider */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
          <BlurFade delay={0.2} inView>
            <CoachCard />
          </BlurFade>

          <BlurFade delay={0.3} inView>
            <GamifiedCard />
          </BlurFade>

          {/* VS divider — desktop only */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
              <span className="font-mono text-[10px] font-bold text-[#5C5952]">VS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
