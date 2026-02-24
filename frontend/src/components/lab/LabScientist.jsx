import { useEffect, useRef } from 'react'

/**
 * Animated lab scientist (Einstein-esque character in a lab coat)
 * Subtle idle animation: slight floating + blinking
 */
const LabScientist = ({ className = '' }) => {
  const svgRef = useRef(null)
  const eyeLeftRef = useRef(null)
  const eyeRightRef = useRef(null)

  useEffect(() => {
    let frame = 0
    const interval = setInterval(() => {
      frame++
      const t = frame * 0.02

      // Gentle floating
      if (svgRef.current) {
        const float = Math.sin(t * 0.8) * 2
        svgRef.current.style.transform = `translateY(${float}px)`
      }

      // Blinking every ~4 seconds
      const blinkCycle = (frame % 120)
      const isBlinking = blinkCycle >= 0 && blinkCycle <= 3
      const eyeScaleY = isBlinking ? 0.1 : 1

      if (eyeLeftRef.current) {
        eyeLeftRef.current.setAttribute('ry', isBlinking ? 0.3 : 2.5)
      }
      if (eyeRightRef.current) {
        eyeRightRef.current.setAttribute('ry', isBlinking ? 0.3 : 2.5)
      }
    }, 33)

    return () => clearInterval(interval)
  }, [])

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 120 160"
      className={className}
      style={{ willChange: 'transform' }}
      aria-hidden="true"
    >
      {/* Lab Coat / Body */}
      <rect x="30" y="70" width="60" height="80" rx="8" fill="#F0F0F0" stroke="#E0E0E0" strokeWidth="1" />
      {/* Coat collar */}
      <path d="M 40 70 L 60 82 L 80 70" fill="none" stroke="#E0E0E0" strokeWidth="1.5" />
      {/* Coat pockets */}
      <rect x="36" y="110" width="16" height="12" rx="2" fill="none" stroke="#D0D0D0" strokeWidth="0.8" />
      <rect x="68" y="110" width="16" height="12" rx="2" fill="none" stroke="#D0D0D0" strokeWidth="0.8" />
      {/* Pocket pen */}
      <rect x="40" y="106" width="2" height="8" rx="1" fill="#3B82F6" />
      <circle cx="41" cy="106" r="1.2" fill="#3B82F6" />

      {/* Neck */}
      <rect x="52" y="62" width="16" height="12" rx="3" fill="#F5D0B0" />

      {/* Head */}
      <ellipse cx="60" cy="42" rx="22" ry="26" fill="#F5D0B0" />

      {/* Wild Einstein hair */}
      <path d="M 38 35 Q 30 20 36 12 Q 42 4 50 10 Q 55 2 62 6 Q 68 2 74 8 Q 82 4 86 14 Q 92 22 84 34"
        fill="#D1D5DB" stroke="#B0B5BD" strokeWidth="0.8" />
      {/* Side hair tufts */}
      <path d="M 38 35 Q 28 32 30 42 Q 26 48 34 50" fill="#D1D5DB" stroke="#B0B5BD" strokeWidth="0.5" />
      <path d="M 84 34 Q 92 30 92 42 Q 96 48 88 50" fill="#D1D5DB" stroke="#B0B5BD" strokeWidth="0.5" />

      {/* Eyebrows (bushy) */}
      <path d="M 44 32 Q 48 28 54 31" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 66 31 Q 72 28 76 32" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse ref={eyeLeftRef} cx="50" cy="38" rx="3" ry="2.5" fill="#374151" />
      <ellipse ref={eyeRightRef} cx="70" cy="38" rx="3" ry="2.5" fill="#374151" />
      {/* Eye highlights */}
      <circle cx="51.5" cy="37" r="1" fill="white" />
      <circle cx="71.5" cy="37" r="1" fill="white" />

      {/* Nose */}
      <path d="M 59 42 Q 56 48 58 50 Q 60 52 64 50 Q 66 48 63 42" fill="#E8C4A0" />

      {/* Gentle smile */}
      <path d="M 52 54 Q 60 60 68 54" fill="none" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />

      {/* Mustache */}
      <path d="M 50 50 Q 55 54 60 51 Q 65 54 70 50" fill="#C0C5CD" stroke="#B0B5BD" strokeWidth="0.5" />

      {/* Arms holding beaker */}
      <path d="M 30 80 Q 18 95 22 110" fill="none" stroke="#F0F0F0" strokeWidth="8" strokeLinecap="round" />
      <path d="M 90 80 Q 102 95 98 110" fill="none" stroke="#F0F0F0" strokeWidth="8" strokeLinecap="round" />

      {/* Hands */}
      <circle cx="22" cy="112" r="5" fill="#F5D0B0" />
      <circle cx="98" cy="112" r="5" fill="#F5D0B0" />

      {/* Beaker in right hand */}
      <path d="M 92 100 L 88 90 L 88 82 L 108 82 L 108 90 L 104 100 Z" fill="none" stroke="#60A5FA" strokeWidth="1.2" />
      {/* Liquid in beaker */}
      <path d="M 93 98 L 89.5 90.5 L 106.5 90.5 L 103 98 Z" fill="#60A5FA" opacity="0.3" />
      {/* Bubbles */}
      <circle cx="95" cy="92" r="1.5" fill="#60A5FA" opacity="0.4" />
      <circle cx="100" cy="88" r="1" fill="#60A5FA" opacity="0.3" />
      <circle cx="102" cy="94" r="1.2" fill="#60A5FA" opacity="0.35" />

      {/* Glasses */}
      <circle cx="50" cy="38" r="7" fill="none" stroke="#6B7280" strokeWidth="1.2" />
      <circle cx="70" cy="38" r="7" fill="none" stroke="#6B7280" strokeWidth="1.2" />
      <path d="M 57 38 L 63 38" stroke="#6B7280" strokeWidth="1" />
      <path d="M 43 36 L 38 34" stroke="#6B7280" strokeWidth="1" />
      <path d="M 77 36 L 82 34" stroke="#6B7280" strokeWidth="1" />
    </svg>
  )
}

export default LabScientist
