import { useEffect, useRef, useState } from 'react'

/**
 * Colorful Lab Neural Cluster — multi-color variant with breathing/expanding animation
 * Uses warm lab colors (gold, teal, coral, blue) instead of the standard purple
 */

const makeSphereNodes = (count, radius) => {
  const nodes = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = goldenAngle * i
    nodes.push({
      x: r * Math.cos(theta) * radius,
      y: y * radius,
      z: r * Math.sin(theta) * radius,
    })
  }
  return nodes
}

const makeEdges = (nodes, maxDist) => {
  const edges = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const dz = nodes[i].z - nodes[j].z
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < maxDist) {
        edges.push([i, j])
      }
    }
  }
  return edges
}

const SPHERE_RADIUS = 38
const NODE_COUNT = 28
const BASE_NODES = makeSphereNodes(NODE_COUNT, SPHERE_RADIUS)
const BASE_EDGES = makeEdges(BASE_NODES, SPHERE_RADIUS * 0.8)
const PERSPECTIVE = 110

// Color palette — assign each node a color from the lab palette
const NODE_COLORS = [
  '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6',
  '#F97316', '#06B6D4', '#EC4899', '#14B8A6', '#D97706',
  '#6366F1', '#22C55E', '#F43F5E', '#0EA5E9', '#A855F7',
  '#FB923C', '#2DD4BF', '#E879F9', '#34D399', '#FBBF24',
  '#818CF8', '#4ADE80', '#FB7185', '#38BDF8', '#C084FC',
  '#FCA5A5', '#67E8F9', '#FDE68A',
]

let instanceCounter = 0

const rotY = (x, y, z, angle) => ({
  x: x * Math.cos(angle) + z * Math.sin(angle),
  y,
  z: -x * Math.sin(angle) + z * Math.cos(angle),
})

const rotX = (x, y, z, angle) => ({
  x,
  y: y * Math.cos(angle) - z * Math.sin(angle),
  z: y * Math.sin(angle) + z * Math.cos(angle),
})

const project = (x, y, z) => {
  const scale = PERSPECTIVE / (PERSPECTIVE + z)
  return { px: x * scale + 50, py: y * scale + 50, scale, z }
}

const LabNeuralCluster = ({ className = '' }) => {
  const nodeRefs = useRef([])
  const glowRefs = useRef([])
  const lineRefs = useRef([])
  const svgRef = useRef(null)
  const [uid] = useState(() => `lnc-${++instanceCounter}`)

  useEffect(() => {
    let frame = 0
    const interval = setInterval(() => {
      frame += 1
      const t = frame * 0.012

      // Breathing scale — expands and contracts
      const breathe = 1 + Math.sin(t * 0.4) * 0.06
      if (svgRef.current) {
        svgRef.current.style.transform = `scale(${breathe})`
      }

      // Slow rotation
      const angleY = t * 0.35
      const angleX = Math.sin(t * 0.12) * 0.35

      const projected = BASE_NODES.map((node, i) => {
        const r1 = rotY(node.x, node.y, node.z, angleY)
        const r2 = rotX(r1.x, r1.y, r1.z, angleX)
        const p = project(r2.x, r2.y, r2.z)

        const nodeRadius = 1.4 + p.scale * 2.2
        const nodeOpacity = 0.35 + p.scale * 0.55

        const nodeEl = nodeRefs.current[i]
        if (nodeEl) {
          nodeEl.setAttribute('cx', p.px)
          nodeEl.setAttribute('cy', p.py)
          nodeEl.setAttribute('r', nodeRadius)
          nodeEl.setAttribute('opacity', nodeOpacity)
        }

        const glowEl = glowRefs.current[i]
        if (glowEl) {
          glowEl.setAttribute('cx', p.px)
          glowEl.setAttribute('cy', p.py)
          const glowPulse = 0.08 + Math.sin(t * 0.6 + i * 0.9) * 0.08
          glowEl.setAttribute('opacity', glowPulse * p.scale)
        }

        return p
      })

      // Update edges
      BASE_EDGES.forEach((edge, i) => {
        const el = lineRefs.current[i]
        if (!el) return
        const [a, b] = edge
        const pa = projected[a]
        const pb = projected[b]
        el.setAttribute('x1', pa.px)
        el.setAttribute('y1', pa.py)
        el.setAttribute('x2', pb.px)
        el.setAttribute('y2', pb.py)

        const avgScale = (pa.scale + pb.scale) / 2
        const edgePulse = 0.18 + Math.sin(t * 0.5 + i * 0.6) * 0.15
        el.setAttribute('opacity', edgePulse * avgScale)
        el.setAttribute('stroke-dashoffset', (frame * 0.5) % 16)
      })
    }, 33)

    return () => clearInterval(interval)
  }, [])

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      className={className}
      style={{ willChange: 'transform' }}
      aria-hidden="true"
    >
      <defs>
        {/* Multi-color gradients for edges */}
        <linearGradient id={`${uid}-grad-warm`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id={`${uid}-grad-cool`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <filter id={`${uid}-blur`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
      </defs>

      {/* Edges — alternating warm/cool gradients */}
      {BASE_EDGES.map((edge, i) => (
        <line
          key={`e-${i}`}
          ref={el => lineRefs.current[i] = el}
          x1={50} y1={50} x2={50} y2={50}
          stroke={`url(#${uid}-grad-${i % 2 === 0 ? 'warm' : 'cool'})`}
          strokeWidth={0.7}
          strokeDasharray="3 2.5"
          strokeLinecap="round"
          opacity={0}
        />
      ))}

      {/* Glow circles */}
      {BASE_NODES.map((_, i) => (
        <circle
          key={`g-${i}`}
          ref={el => glowRefs.current[i] = el}
          cx={50} cy={50}
          r={7}
          fill={NODE_COLORS[i]}
          opacity={0}
          filter={`url(#${uid}-blur)`}
          style={{ pointerEvents: 'none' }}
        />
      ))}

      {/* Nodes — each with its own color */}
      {BASE_NODES.map((_, i) => (
        <circle
          key={`n-${i}`}
          ref={el => nodeRefs.current[i] = el}
          cx={50} cy={50} r={1.5}
          fill={NODE_COLORS[i]}
          opacity={0}
        />
      ))}
    </svg>
  )
}

export default LabNeuralCluster
