import { useEffect, useRef, useState } from 'react'

// 8 nodes in a loose organic cluster within a 100x100 viewBox
const NODES = [
  { cx: 50, cy: 18, speed: 0.3, amp: 4 },
  { cx: 24, cy: 34, speed: 0.25, amp: 5 },
  { cx: 76, cy: 28, speed: 0.35, amp: 4.5 },
  { cx: 14, cy: 56, speed: 0.2, amp: 4 },
  { cx: 86, cy: 54, speed: 0.28, amp: 5 },
  { cx: 34, cy: 72, speed: 0.32, amp: 4 },
  { cx: 66, cy: 76, speed: 0.22, amp: 4.5 },
  { cx: 50, cy: 50, speed: 0.18, amp: 3 },
]

// Connections between nearby nodes (index pairs)
const EDGES = [
  [0, 1], [0, 2], [0, 7],
  [1, 3], [1, 7],
  [2, 4], [2, 7],
  [3, 5], [3, 7],
  [4, 6], [4, 7],
  [5, 6], [5, 7],
  [6, 7],
]

const SIZES = { sm: 80, md: 120, lg: 200 }
const SPEED_MULT = { calm: 1, active: 2.2, thinking: 3.5 }

let instanceCounter = 0

const NeuralCluster = ({ size = 'sm', intensity = 'calm', className = '' }) => {
  const nodeRefs = useRef([])
  const glowRefs = useRef([])
  const lineRefs = useRef([])
  const svgRef = useRef(null)
  const [uid] = useState(() => `nc-${++instanceCounter}`)
  const px = SIZES[size] || SIZES.sm
  const speedMult = SPEED_MULT[intensity] || 1
  const activeEdgeCount = intensity === 'calm' ? 8 : intensity === 'active' ? 12 : EDGES.length

  useEffect(() => {
    let frame = 0
    const interval = setInterval(() => {
      frame += 1
      const t = frame * 0.02

      // Slow rotation + breathing scale on the whole SVG
      const rotation = t * speedMult * 1.2
      const breathe = 1 + Math.sin(t * 0.4 * speedMult) * 0.04
      if (svgRef.current) {
        svgRef.current.style.transform = `rotate(${rotation % 360}deg) scale(${breathe})`
      }

      // Update node + glow positions
      const positions = NODES.map((node, i) => {
        const phaseX = t * node.speed * speedMult + i * 0.8
        const phaseY = t * node.speed * speedMult * 0.7 + i * 0.5
        const x = node.cx + Math.sin(phaseX) * node.amp
        const y = node.cy + Math.cos(phaseY) * node.amp

        const nodeEl = nodeRefs.current[i]
        if (nodeEl) {
          nodeEl.setAttribute('cx', x)
          nodeEl.setAttribute('cy', y)
        }
        const glowEl = glowRefs.current[i]
        if (glowEl) {
          glowEl.setAttribute('cx', x)
          glowEl.setAttribute('cy', y)
          // Pulse glow opacity
          const glowPulse = 0.1 + Math.sin(t * 0.6 + i * 1.2) * 0.08
          glowEl.setAttribute('opacity', glowPulse)
        }
        return { x, y }
      })

      // Update line positions + dash offset for "data flowing" effect
      EDGES.forEach((edge, i) => {
        const el = lineRefs.current[i]
        if (!el) return
        const [a, b] = edge
        el.setAttribute('x1', positions[a].x)
        el.setAttribute('y1', positions[a].y)
        el.setAttribute('x2', positions[b].x)
        el.setAttribute('y2', positions[b].y)
        el.setAttribute('stroke-dashoffset', (frame * speedMult * 0.8) % 20)

        // Pulse edge opacity for "firing" effect
        const edgePulse = 0.25 + Math.sin(t * 0.5 + i * 0.9) * 0.25
        el.setAttribute('opacity', i < activeEdgeCount ? edgePulse : 0.06)
      })
    }, 33) // ~30fps for smoother animation

    return () => clearInterval(interval)
  }, [speedMult, activeEdgeCount])

  return (
    <svg
      ref={svgRef}
      width={px}
      height={px}
      viewBox="0 0 100 100"
      className={className}
      style={{ willChange: 'transform', transition: 'transform 0.1s linear' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="var(--crown, #D4930D)" />
        </linearGradient>
        <radialGradient id={`${uid}-glow-grad`}>
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-glow`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
      </defs>

      {/* Edges */}
      {EDGES.map((edge, i) => (
        <line
          key={`edge-${i}`}
          ref={el => lineRefs.current[i] = el}
          x1={NODES[edge[0]].cx}
          y1={NODES[edge[0]].cy}
          x2={NODES[edge[1]].cx}
          y2={NODES[edge[1]].cy}
          stroke={`url(#${uid}-grad)`}
          strokeWidth={size === 'lg' ? 1 : 0.7}
          strokeDasharray="4 3"
          strokeDashoffset="0"
          opacity={i < activeEdgeCount ? 0.5 : 0.08}
          strokeLinecap="round"
        />
      ))}

      {/* Glow circles (behind nodes) — these move with the nodes now */}
      {NODES.map((node, i) => (
        <circle
          key={`glow-${i}`}
          ref={el => glowRefs.current[i] = el}
          cx={node.cx}
          cy={node.cy}
          r={size === 'lg' ? 7 : size === 'md' ? 5 : 4}
          fill={`url(#${uid}-glow-grad)`}
          opacity={0.15}
          filter={`url(#${uid}-glow)`}
          style={{ pointerEvents: 'none' }}
        />
      ))}

      {/* Nodes */}
      {NODES.map((node, i) => (
        <circle
          key={`node-${i}`}
          ref={el => nodeRefs.current[i] = el}
          cx={node.cx}
          cy={node.cy}
          r={size === 'lg' ? 2.8 : size === 'md' ? 2.2 : 2}
          fill="var(--crown, #D4930D)"
          opacity={0.85}
        />
      ))}
    </svg>
  )
}

export default NeuralCluster
