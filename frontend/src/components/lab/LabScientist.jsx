import { useEffect, useRef } from 'react'

/**
 * Chibi Lab Scientist — cute cartoon Einstein character
 * Inspired by 3D chibi style: oversized head, huge expressive eyes,
 * wild fluffy white hair, round glasses, bushy mustache, lab coat,
 * holding a bubbling beaker. Floating idle animation.
 */
const LabScientist = ({ className = '' }) => {
  const svgRef = useRef(null)
  const bubble1Ref = useRef(null)
  const bubble2Ref = useRef(null)
  const bubble3Ref = useRef(null)
  const eyeShineRef = useRef(null)
  const eyeShine2Ref = useRef(null)

  useEffect(() => {
    let frame = 0
    const interval = setInterval(() => {
      frame++
      const t = frame * 0.025

      // Gentle floating bob
      if (svgRef.current) {
        const float = Math.sin(t * 0.7) * 3
        svgRef.current.style.transform = `translateY(${float}px)`
      }

      // Bubbles rising in beaker
      const bubbleY1 = 128 - ((frame * 0.5) % 25)
      const bubbleY2 = 132 - ((frame * 0.35 + 8) % 22)
      const bubbleY3 = 130 - ((frame * 0.6 + 16) % 28)
      const wobble1 = Math.sin(t * 2.2) * 1.5
      const wobble2 = Math.sin(t * 2.8 + 1) * 1.2
      const wobble3 = Math.sin(t * 1.9 + 2) * 1

      if (bubble1Ref.current) {
        bubble1Ref.current.setAttribute('cy', bubbleY1)
        bubble1Ref.current.setAttribute('cx', 108 + wobble1)
        bubble1Ref.current.setAttribute('opacity', bubbleY1 > 106 ? 0.6 : 0)
      }
      if (bubble2Ref.current) {
        bubble2Ref.current.setAttribute('cy', bubbleY2)
        bubble2Ref.current.setAttribute('cx', 114 + wobble2)
        bubble2Ref.current.setAttribute('opacity', bubbleY2 > 106 ? 0.5 : 0)
      }
      if (bubble3Ref.current) {
        bubble3Ref.current.setAttribute('cy', bubbleY3)
        bubble3Ref.current.setAttribute('cx', 104 + wobble3)
        bubble3Ref.current.setAttribute('opacity', bubbleY3 > 106 ? 0.4 : 0)
      }

      // Eye shine twinkle
      const twinkle = 0.7 + Math.sin(t * 1.5) * 0.3
      if (eyeShineRef.current) eyeShineRef.current.setAttribute('opacity', twinkle)
      if (eyeShine2Ref.current) eyeShine2Ref.current.setAttribute('opacity', twinkle)
    }, 33)

    return () => clearInterval(interval)
  }, [])

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 140 180"
      className={className}
      style={{ willChange: 'transform' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sci-coat" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E8ECF0" />
        </linearGradient>
        <linearGradient id="sci-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="sci-hair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F3F4F6" />
          <stop offset="40%" stopColor="#E5E7EB" />
          <stop offset="100%" stopColor="#D1D5DB" />
        </linearGradient>
        <linearGradient id="sci-skin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBBF68" />
          <stop offset="100%" stopColor="#F59E42" />
        </linearGradient>
        <radialGradient id="sci-eye-bg" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0F0F0" />
        </radialGradient>
        <radialGradient id="sci-iris" cx="45%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="60%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </radialGradient>
        <radialGradient id="sci-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
        </radialGradient>
        <filter id="sci-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* === CHIBI BODY (small & stubby) === */}
      {/* Legs — brown pants, short & stubby */}
      <ellipse cx="55" cy="168" rx="8" ry="6" fill="#78563A" />
      <ellipse cx="75" cy="168" rx="8" ry="6" fill="#78563A" />
      {/* Shoes — rounded */}
      <ellipse cx="53" cy="173" rx="10" ry="5" fill="#5C3D2E" />
      <ellipse cx="77" cy="173" rx="10" ry="5" fill="#5C3D2E" />
      {/* Shoe shine */}
      <ellipse cx="50" cy="171" rx="4" ry="2" fill="#7C5540" opacity="0.5" />
      <ellipse cx="74" cy="171" rx="4" ry="2" fill="#7C5540" opacity="0.5" />

      {/* Lab coat body — white, puffy, chibi-short */}
      <path d="M 38 105 Q 35 108 35 115 L 35 152 Q 35 160 42 160 L 88 160 Q 95 160 95 152 L 95 115 Q 95 108 92 105"
        fill="url(#sci-coat)" stroke="#CBD5E1" strokeWidth="0.8" filter="url(#sci-shadow)" />
      {/* Coat center line */}
      <line x1="65" y1="112" x2="65" y2="157" stroke="#D1D5DB" strokeWidth="0.6" />
      {/* Buttons */}
      <circle cx="65" cy="120" r="2" fill="#CBD5E1" />
      <circle cx="65" cy="132" r="2" fill="#CBD5E1" />
      <circle cx="65" cy="144" r="2" fill="#CBD5E1" />
      {/* Collar — V-neck lab coat */}
      <path d="M 50 105 L 65 120 L 80 105" fill="none" stroke="#CBD5E1" strokeWidth="1" />
      {/* Lapel shading */}
      <path d="M 50 105 L 58 114 L 65 108" fill="#EEF1F5" opacity="0.6" />
      <path d="M 80 105 L 72 114 L 65 108" fill="#EEF1F5" opacity="0.6" />
      {/* Breast pocket with pen */}
      <rect x="72" y="112" width="10" height="8" rx="1.5" fill="none" stroke="#CBD5E1" strokeWidth="0.5" />
      <rect x="75" y="108" width="2" height="8" rx="1" fill="#3B82F6" />
      <circle cx="76" cy="108" r="1.5" fill="#60A5FA" />

      {/* Shirt underneath — bright yellow */}
      <path d="M 52 100 L 52 112 L 65 120 L 78 112 L 78 100" fill="#FDE68A" />

      {/* === LEFT ARM — swinging slightly, holding clipboard === */}
      <path d="M 38 110 Q 28 125 22 140 Q 18 148 22 150"
        fill="none" stroke="url(#sci-coat)" strokeWidth="12" strokeLinecap="round" />
      {/* Left hand */}
      <circle cx="22" cy="150" r="6" fill="url(#sci-skin)" />
      {/* Clipboard */}
      <rect x="10" y="138" width="18" height="22" rx="2" fill="#F5D68A" stroke="#D4A030" strokeWidth="0.6" />
      <rect x="15" y="136" width="8" height="4" rx="1" fill="#D4A030" opacity="0.7" />
      <line x1="14" y1="145" x2="24" y2="145" stroke="#C4922A" strokeWidth="0.5" opacity="0.4" />
      <line x1="14" y1="148" x2="22" y2="148" stroke="#C4922A" strokeWidth="0.5" opacity="0.4" />
      <line x1="14" y1="151" x2="24" y2="151" stroke="#C4922A" strokeWidth="0.5" opacity="0.4" />
      <line x1="14" y1="154" x2="20" y2="154" stroke="#C4922A" strokeWidth="0.5" opacity="0.4" />

      {/* === RIGHT ARM — holding beaker up proudly === */}
      <path d="M 92 110 Q 105 115 112 108 Q 118 102 116 96"
        fill="none" stroke="url(#sci-coat)" strokeWidth="12" strokeLinecap="round" />
      {/* Right hand */}
      <circle cx="115" cy="96" r="6" fill="url(#sci-skin)" />

      {/* === BEAKER (Erlenmeyer flask) === */}
      <path d="M 104 78 L 104 95 L 96 115 Q 94 120 98 120 L 126 120 Q 130 120 128 115 L 120 95 L 120 78 Z"
        fill="rgba(200,225,255,0.3)" stroke="#60A5FA" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Flask rim */}
      <ellipse cx="112" cy="78" rx="9" ry="2.5" fill="none" stroke="#60A5FA" strokeWidth="1" />
      {/* Liquid — warm gradient */}
      <path d="M 99 108 L 104 98 L 120 98 L 125 108 Q 127 113 125 115 L 99 115 Q 97 113 99 108 Z"
        fill="url(#sci-liquid)" />
      {/* Animated bubbles */}
      <circle ref={bubble1Ref} cx="108" cy="108" r="2.2" fill="#4ADE80" opacity="0.6" />
      <circle ref={bubble2Ref} cx="114" cy="112" r="1.6" fill="#FBBF24" opacity="0.5" />
      <circle ref={bubble3Ref} cx="104" cy="110" r="1.3" fill="#4ADE80" opacity="0.4" />
      {/* Flask highlight */}
      <path d="M 106 82 L 106 94" stroke="white" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />

      {/* === OVERSIZED HEAD (chibi proportion ~60% of body) === */}
      {/* Head base — warm orange-gold skin */}
      <ellipse cx="65" cy="55" rx="32" ry="36" fill="url(#sci-skin)" />

      {/* === WILD FLUFFY HAIR — big & voluminous === */}
      {/* Main hair cloud on top */}
      <path d="M 30 42 Q 22 25 32 12 Q 38 4 48 10 Q 52 2 60 5 Q 65 0 72 5 Q 78 2 85 10 Q 92 4 98 14 Q 108 25 100 42"
        fill="url(#sci-hair)" stroke="#C9CDD4" strokeWidth="0.5" />
      {/* Hair volume bumps on top */}
      <path d="M 38 20 Q 35 10 42 8 Q 48 5 50 14" fill="url(#sci-hair)" />
      <path d="M 55 12 Q 58 3 65 5 Q 72 3 75 12" fill="url(#sci-hair)" />
      <path d="M 80 14 Q 85 5 92 10 Q 96 14 92 22" fill="url(#sci-hair)" />
      {/* Left side poof — wild & fluffy */}
      <path d="M 30 42 Q 18 35 18 45 Q 14 50 18 56 Q 14 62 22 66 Q 20 72 28 72 Q 30 76 34 74"
        fill="url(#sci-hair)" stroke="#C9CDD4" strokeWidth="0.4" />
      {/* Right side poof — wild & fluffy */}
      <path d="M 100 42 Q 112 35 112 45 Q 116 50 112 56 Q 116 62 108 66 Q 110 72 102 72 Q 100 76 96 74"
        fill="url(#sci-hair)" stroke="#C9CDD4" strokeWidth="0.4" />
      {/* Extra wispy strands sticking up */}
      <path d="M 44 12 Q 40 2 45 0" fill="none" stroke="#D4D8DE" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 65 5 Q 66 -4 70 -2" fill="none" stroke="#D4D8DE" strokeWidth="1" strokeLinecap="round" />
      <path d="M 86 10 Q 92 2 95 6" fill="none" stroke="#D4D8DE" strokeWidth="1" strokeLinecap="round" />
      {/* Hair texture lines */}
      <path d="M 25 50 Q 22 46 26 44" fill="none" stroke="#C0C4CA" strokeWidth="0.6" opacity="0.5" />
      <path d="M 105 48 Q 108 44 104 42" fill="none" stroke="#C0C4CA" strokeWidth="0.6" opacity="0.5" />

      {/* === FACE === */}

      {/* Big round glasses frames — thick black */}
      <circle cx="50" cy="55" r="14" fill="url(#sci-eye-bg)" stroke="#374151" strokeWidth="2.5" />
      <circle cx="80" cy="55" r="14" fill="url(#sci-eye-bg)" stroke="#374151" strokeWidth="2.5" />
      {/* Bridge */}
      <path d="M 64 53 Q 65 49 66 53" fill="none" stroke="#374151" strokeWidth="2.2" />
      {/* Temple arms — go into hair */}
      <path d="M 36 53 Q 28 50 24 54" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 94 53 Q 102 50 106 54" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" />
      {/* Lens shine */}
      <path d="M 42 48 Q 45 44 49 46" fill="none" stroke="white" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
      <path d="M 72 48 Q 75 44 79 46" fill="none" stroke="white" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />

      {/* === HUGE EXPRESSIVE EYES === */}
      {/* Left eye — big bright blue iris */}
      <circle cx="50" cy="56" r="8" fill="url(#sci-iris)" />
      {/* Left pupil */}
      <circle cx="50" cy="56" r="4.5" fill="#0F172A" />
      {/* Left eye big shine */}
      <circle ref={eyeShineRef} cx="47" cy="53" r="3" fill="white" opacity="0.85" />
      {/* Left eye small shine */}
      <circle cx="53" cy="58" r="1.2" fill="white" opacity="0.5" />

      {/* Right eye — big bright blue iris */}
      <circle cx="80" cy="56" r="8" fill="url(#sci-iris)" />
      {/* Right pupil */}
      <circle cx="80" cy="56" r="4.5" fill="#0F172A" />
      {/* Right eye big shine */}
      <circle ref={eyeShine2Ref} cx="77" cy="53" r="3" fill="white" opacity="0.85" />
      {/* Right eye small shine */}
      <circle cx="83" cy="58" r="1.2" fill="white" opacity="0.5" />

      {/* Eyebrows — thick, expressive, raised */}
      <path d="M 38 38 Q 46 32 58 37" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 72 37 Q 84 32 92 38" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />

      {/* Rosy cheeks */}
      <circle cx="36" cy="66" r="6" fill="url(#sci-cheek)" />
      <circle cx="94" cy="66" r="6" fill="url(#sci-cheek)" />

      {/* Nose — round, cute, reddish-orange */}
      <ellipse cx="65" cy="67" rx="5" ry="4.5" fill="#E8844A" />
      <ellipse cx="65" cy="66" rx="4" ry="3.5" fill="#F09860" />
      {/* Nose shine */}
      <ellipse cx="63.5" cy="64.5" rx="1.5" ry="1" fill="white" opacity="0.4" />

      {/* === BUSHY MUSTACHE === */}
      <path d="M 44 74 Q 48 80 55 76 Q 58 78 62 76 Q 65 79 68 76 Q 72 78 75 76 Q 82 80 86 74"
        fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="0.5" />
      {/* Mustache volume — second layer */}
      <path d="M 47 75 Q 52 79 57 76 Q 60 78 63 76 Q 66 78 69 76 Q 74 79 79 75"
        fill="#DDE0E4" />

      {/* Smile — friendly, slightly open */}
      <path d="M 54 80 Q 60 85 65 85 Q 70 85 76 80"
        fill="none" stroke="#C08050" strokeWidth="1.2" strokeLinecap="round" />

      {/* Neck (tiny, chibi style) */}
      <rect x="58" y="88" width="14" height="12" rx="5" fill="url(#sci-skin)" />
    </svg>
  )
}

export default LabScientist
