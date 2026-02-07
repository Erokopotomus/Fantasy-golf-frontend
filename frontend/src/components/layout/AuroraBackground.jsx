import { useEffect, useRef } from 'react'

const AuroraBackground = () => {
  const orb1Ref = useRef(null)
  const orb2Ref = useRef(null)
  const orb3Ref = useRef(null)

  useEffect(() => {
    let frame = 0
    const interval = setInterval(() => {
      frame += 1
      const t = frame * 0.02

      if (orb1Ref.current) {
        const x = Math.sin(t * 0.3) * 15
        const y = Math.cos(t * 0.2) * 10
        orb1Ref.current.style.transform = `translate(${x}px, ${y}px)`
      }
      if (orb2Ref.current) {
        const x = Math.cos(t * 0.25) * 20
        const y = Math.sin(t * 0.35) * 12
        orb2Ref.current.style.transform = `translate(${x}px, ${y}px)`
      }
      if (orb3Ref.current) {
        const x = Math.sin(t * 0.4) * 10
        const y = Math.cos(t * 0.15) * 18
        orb3Ref.current.style.transform = `translate(${x}px, ${y}px)`
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Gold orb — top right */}
      <div
        ref={orb1Ref}
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, #E8B84D 0%, transparent 70%)',
          transition: 'transform 0.3s ease-out',
        }}
      />
      {/* Orange orb — bottom left */}
      <div
        ref={orb2Ref}
        className="absolute -bottom-48 -left-48 w-[700px] h-[700px] rounded-full opacity-[0.05]"
        style={{
          background: 'radial-gradient(circle, #E07838 0%, transparent 70%)',
          transition: 'transform 0.3s ease-out',
        }}
      />
      {/* Rose orb — center */}
      <div
        ref={orb3Ref}
        className="absolute top-1/3 left-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #D4607A 0%, transparent 70%)',
          transition: 'transform 0.3s ease-out',
        }}
      />
    </div>
  )
}

export default AuroraBackground
