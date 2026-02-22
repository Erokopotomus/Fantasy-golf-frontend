import { useEffect, useRef } from 'react'

// 8 nodes in a loose organic cluster within a 100x100 viewBox
const NODES = [
  { cx: 50, cy: 20, speed: 0.3, amp: 3 },
  { cx: 25, cy: 35, speed: 0.25, amp: 4 },
  { cx: 75, cy: 30, speed: 0.35, amp: 3.5 },
  { cx: 15, cy: 55, speed: 0.2, amp: 3 },
  { cx: 85, cy: 55, speed: 0.28, amp: 4 },
  { cx: 35, cy: 70, speed: 0.32, amp: 3 },
  { cx: 65, cy: 75, speed: 0.22, amp: 3.5 },
  { cx: 50, cy: 50, speed: 0.18, amp: 2.5 },
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

const NeuralCluster = ({ size = 'sm', intensity = 'calm', className = '' }) => {
  const nodeRefs = useRef([])
  const lineRefs = useRef([])
  const px = SIZES[size] || SIZES.sm
  const speedMult = SPEED_MULT[intensity] || 1

  useEffect(() => {
    let frame = 0
    const interval = setInterval(() => {
      frame += 1
      const t = frame * 0.02

      // Update node positions
      const positions = NODES.map((node, i) => {
        const x = node.cx + Math.sin(t * node.speed * speedMult) * node.amp
        const y = node.cy + Math.cos(t * node.speed * speedMult * 0.7) * node.amp
        const el = nodeRefs.current[i]
        if (el) {
          el.setAttribute('cx', x)
          el.setAttribute('cy', y)
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
        el.setAttribute('stroke-dashoffset', (frame * speedMult * 0.5) % 20)
      })
    }, 50)

    return () => clearInterval(interval)
  }, [speedMult])

  // How many edges are "active" (visually lit)
  const activeEdgeCount = intensity === 'calm' ? 7 : intensity === 'active' ? 11 : EDGES.length

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      className={className}
      style={{ willChange: 'transform' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="neural-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="var(--crown, #D4930D)" />
        </linearGradient>
        <filter id="neural-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
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
          stroke="url(#neural-gradient)"
          strokeWidth={size === 'lg' ? 0.8 : 0.6}
          strokeDasharray="4 3"
          strokeDashoffset="0"
          opacity={i < activeEdgeCount ? 0.5 : 0.12}
          style={{ transition: 'opacity 0.5s ease' }}
        />
      ))}

      {/* Glow circles (behind nodes) */}
      {NODES.map((node, i) => (
        <circle
          key={`glow-${i}`}
          cx={node.cx}
          cy={node.cy}
          r={size === 'lg' ? 5 : 3.5}
          fill="var(--crown, #D4930D)"
          opacity={0.15}
          filter="url(#neural-glow)"
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
          r={size === 'lg' ? 2.5 : size === 'md' ? 2 : 1.8}
          fill="var(--crown, #D4930D)"
          opacity={0.7}
          style={{ willChange: 'transform' }}
        />
      ))}
    </svg>
  )
}

export default NeuralCluster
