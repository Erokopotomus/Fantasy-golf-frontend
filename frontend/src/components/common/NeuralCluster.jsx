import { useEffect, useRef, useState } from 'react'

// Fibonacci sphere distribution — evenly spaces N points on a sphere surface
const makeSphereNodes = (count, radius) => {
  const nodes = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2 // -1 to 1
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

// Build edges between nodes that are close in 3D space
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

const SPHERE_RADIUS = 35
const NODE_COUNT = 22
const BASE_NODES = makeSphereNodes(NODE_COUNT, SPHERE_RADIUS)
const BASE_EDGES = makeEdges(BASE_NODES, SPHERE_RADIUS * 0.85)
const PERSPECTIVE = 120 // distance from camera — lower = more perspective

const SIZES = { sm: 80, md: 120, lg: 200 }
const SPEED_MULT = { calm: 0.6, active: 1.4, thinking: 2.5 }

let instanceCounter = 0

// Rotate point around Y axis
const rotY = (x, y, z, angle) => ({
  x: x * Math.cos(angle) + z * Math.sin(angle),
  y,
  z: -x * Math.sin(angle) + z * Math.cos(angle),
})

// Rotate point around X axis
const rotX = (x, y, z, angle) => ({
  x,
  y: y * Math.cos(angle) - z * Math.sin(angle),
  z: y * Math.sin(angle) + z * Math.cos(angle),
})

// Project 3D → 2D with perspective
const project = (x, y, z) => {
  const scale = PERSPECTIVE / (PERSPECTIVE + z)
  return { px: x * scale + 50, py: y * scale + 50, scale, z }
}

const NeuralCluster = ({ size = 'sm', intensity = 'calm', className = '' }) => {
  const nodeRefs = useRef([])
  const glowRefs = useRef([])
  const lineRefs = useRef([])
  const svgRef = useRef(null)
  const [uid] = useState(() => `nc-${++instanceCounter}`)
  const px = SIZES[size] || SIZES.sm
  const speedMult = SPEED_MULT[intensity] || 0.6

  useEffect(() => {
    let frame = 0
    const interval = setInterval(() => {
      frame += 1
      const t = frame * 0.015

      // Slow breathing on the whole SVG
      const breathe = 1 + Math.sin(t * 0.5) * 0.03
      if (svgRef.current) {
        svgRef.current.style.transform = `scale(${breathe})`
      }

      // Rotate all nodes
      const angleY = t * speedMult * 0.4
      const angleX = Math.sin(t * 0.15) * 0.3 // gentle wobble

      const projected = BASE_NODES.map((node, i) => {
        const r1 = rotY(node.x, node.y, node.z, angleY)
        const r2 = rotX(r1.x, r1.y, r1.z, angleX)
        const p = project(r2.x, r2.y, r2.z)

        // Node size based on depth (closer = bigger)
        const nodeRadius = size === 'lg'
          ? 1.2 + p.scale * 1.8
          : size === 'md'
            ? 0.9 + p.scale * 1.4
            : 0.7 + p.scale * 1.2
        const nodeOpacity = 0.3 + p.scale * 0.6

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
          const glowPulse = 0.06 + Math.sin(t * 0.7 + i * 1.1) * 0.06
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

        // Depth-based opacity (average of both endpoints)
        const avgScale = (pa.scale + pb.scale) / 2
        const edgePulse = 0.15 + Math.sin(t * 0.6 + i * 0.7) * 0.15
        el.setAttribute('opacity', edgePulse * avgScale)
        el.setAttribute('stroke-dashoffset', (frame * speedMult * 0.6) % 16)
      })
    }, 33) // ~30fps

    return () => clearInterval(interval)
  }, [speedMult, size])

  return (
    <svg
      ref={svgRef}
      width={px}
      height={px}
      viewBox="0 0 100 100"
      className={className}
      style={{ willChange: 'transform' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-blur`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Edges */}
      {BASE_EDGES.map((edge, i) => (
        <line
          key={`e-${i}`}
          ref={el => lineRefs.current[i] = el}
          x1={50} y1={50} x2={50} y2={50}
          stroke={`url(#${uid}-grad)`}
          strokeWidth={size === 'lg' ? 0.6 : 0.4}
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
          r={size === 'lg' ? 6 : size === 'md' ? 4.5 : 3.5}
          fill={`url(#${uid}-glow)`}
          opacity={0}
          filter={`url(#${uid}-blur)`}
          style={{ pointerEvents: 'none' }}
        />
      ))}

      {/* Nodes */}
      {BASE_NODES.map((_, i) => (
        <circle
          key={`n-${i}`}
          ref={el => nodeRefs.current[i] = el}
          cx={50} cy={50} r={1.5}
          fill="#8B5CF6"
          opacity={0}
        />
      ))}
    </svg>
  )
}

export default NeuralCluster
