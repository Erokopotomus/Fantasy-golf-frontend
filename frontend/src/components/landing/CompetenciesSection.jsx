import { BlurFade } from '@/components/ui/blur-fade'
import { MagicCard } from '@/components/ui/magic-card'
import { DotPattern } from '@/components/ui/dot-pattern'

const competencies = [
  {
    title: 'Draft Intelligence',
    color: '#F06820',
    description: 'Mock drafts, ADP study, board refinement, post-draft review',
    signal: 'Watched 14 mock drafts → Board getting sharper',
    pos: { cx: 200, cy: 40, labelX: 200, labelY: 12, anchor: 'middle' },
  },
  {
    title: 'Roster Management',
    color: '#0D9668',
    description: 'Lineup decisions, waiver timing, injury response speed',
    signal: 'Responded to injury within 4 hours → Top 10%',
    pos: { cx: 360, cy: 160, labelX: 396, labelY: 164, anchor: 'start' },
  },
  {
    title: 'Trade Acumen',
    color: '#D4930D',
    description: 'Buy-low timing, trade frequency, negotiation behavior',
    signal: '3 trades won out of 4 this season',
    pos: { cx: 300, cy: 330, labelX: 330, labelY: 354, anchor: 'start' },
  },
  {
    title: 'Research Depth',
    color: '#6B7280',
    description: 'Lab time, call accuracy, off-season engagement',
    signal: 'Call accuracy up 8% since October',
    pos: { cx: 100, cy: 330, labelX: 70, labelY: 354, anchor: 'end' },
  },
  {
    title: 'Decision Quality',
    color: '#F06820',
    description: 'Process consistency, confidence calibration, post-mortem habit',
    signal: 'Stayed disciplined at 1-5 → Better than 90% of managers',
    pos: { cx: 40, cy: 160, labelX: 4, labelY: 164, anchor: 'end' },
  },
]

// Adjacent edges of the pentagon (node indices)
const adjacentEdges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 0],
]

// All possible edges (diagonals)
const allEdges = []
for (let i = 0; i < 5; i++) {
  for (let j = i + 1; j < 5; j++) {
    const isAdjacent = adjacentEdges.some(
      ([a, b]) => (a === i && b === j) || (a === j && b === i)
    )
    if (!isAdjacent) allEdges.push([i, j])
  }
}

const pulseKeyframes = `
@keyframes pentagonPulse {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50% { transform: scale(1.3); opacity: 0.08; }
}
`

export default function CompetenciesSection() {
  return (
    <section
      className="relative py-24 md:py-32 px-5 overflow-hidden"
      style={{ backgroundColor: '#07080C' }}
      aria-label="Five competencies"
    >
      <style>{pulseKeyframes}</style>

      {/* Dot pattern background */}
      <DotPattern className="opacity-[0.05]" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section label */}
        <BlurFade delay={0} inView>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase mb-4 text-[#5C5952]">
            What Your Co-Pilot Watches
          </p>
        </BlurFade>

        {/* Headline */}
        <BlurFade delay={0.1} inView>
          <h2 className="font-display font-extrabold text-[#F0EDE6] text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight max-w-3xl mb-16">
            Five competencies. All behavioral.
            <br />
            <span className="text-[#908C84]">
              Wins and losses don&apos;t move these numbers.
            </span>
          </h2>
        </BlurFade>

        {/* Pentagon Visualization */}
        <BlurFade delay={0.2} inView>
          <div className="max-w-[400px] mx-auto mb-16">
            <svg viewBox="0 0 400 380" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Diagonal lines (non-adjacent) */}
              {allEdges.map(([i, j]) => (
                <line
                  key={`diag-${i}-${j}`}
                  x1={competencies[i].pos.cx}
                  y1={competencies[i].pos.cy}
                  x2={competencies[j].pos.cx}
                  y2={competencies[j].pos.cy}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              ))}

              {/* Adjacent lines */}
              {adjacentEdges.map(([i, j]) => (
                <line
                  key={`adj-${i}-${j}`}
                  x1={competencies[i].pos.cx}
                  y1={competencies[i].pos.cy}
                  x2={competencies[j].pos.cx}
                  y2={competencies[j].pos.cy}
                  stroke="rgba(240,104,32,0.2)"
                  strokeWidth="1.5"
                />
              ))}

              {/* Nodes */}
              {competencies.map((c, i) => (
                <g key={c.title}>
                  {/* Glow ring */}
                  <circle
                    cx={c.pos.cx}
                    cy={c.pos.cy}
                    r="16"
                    fill={c.color}
                    opacity="0.15"
                    style={{
                      transformOrigin: `${c.pos.cx}px ${c.pos.cy}px`,
                      animation: `pentagonPulse 3s ease-in-out infinite`,
                      animationDelay: `${i * 0.6}s`,
                    }}
                  />
                  {/* Core node */}
                  <circle
                    cx={c.pos.cx}
                    cy={c.pos.cy}
                    r="6"
                    fill={c.color}
                  />
                  {/* Label */}
                  <text
                    x={c.pos.labelX}
                    y={c.pos.labelY}
                    textAnchor={c.pos.anchor}
                    className="font-mono"
                    style={{
                      fontSize: '10px',
                      fill: '#908C84',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {c.title}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </BlurFade>

        {/* 5 Compact Cards */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible scrollbar-hide">
          {competencies.map((c, i) => (
            <BlurFade
              key={c.title}
              delay={0.3 + i * 0.1}
              inView
              className="shrink-0 min-w-[200px] md:min-w-0 md:w-auto"
            >
              <MagicCard
                gradientColor={`${c.color}0D`}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] h-full"
              >
                <div className="h-full flex flex-col">
                  {/* Top accent border */}
                  <div
                    className="h-[2px] rounded-t-xl"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-display font-bold text-xs text-[#F0EDE6] mb-2">
                      {c.title}
                    </h3>
                    <p className="font-body text-[11px] text-[#5C5952] leading-relaxed mb-3 flex-1">
                      {c.description}
                    </p>
                    <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                      <p className="font-mono text-[10px] text-[#908C84] leading-relaxed">
                        {c.signal}
                      </p>
                    </div>
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
