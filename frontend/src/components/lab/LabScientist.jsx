import { useEffect, useRef, useState } from 'react'

/**
 * Animated lab scientist — flat/modern illustration style
 * Think: Notion-style character, not realistic portrait
 * Subtle idle animation: floating + bubbling beaker
 */
const LabScientist = ({ className = '' }) => {
  const svgRef = useRef(null)
  const bubble1Ref = useRef(null)
  const bubble2Ref = useRef(null)
  const bubble3Ref = useRef(null)

  useEffect(() => {
    let frame = 0
    const interval = setInterval(() => {
      frame++
      const t = frame * 0.025

      // Gentle floating
      if (svgRef.current) {
        const float = Math.sin(t * 0.7) * 2.5
        svgRef.current.style.transform = `translateY(${float}px)`
      }

      // Animated bubbles rising in the beaker
      const bubbleY1 = 108 - ((frame * 0.4) % 30)
      const bubbleY2 = 112 - ((frame * 0.3 + 10) % 28)
      const bubbleY3 = 110 - ((frame * 0.5 + 20) % 32)
      const wobble1 = Math.sin(t * 2) * 1.5
      const wobble2 = Math.sin(t * 2.5 + 1) * 1.5
      const wobble3 = Math.sin(t * 1.8 + 2) * 1

      if (bubble1Ref.current) {
        bubble1Ref.current.setAttribute('cy', bubbleY1)
        bubble1Ref.current.setAttribute('cx', 93 + wobble1)
        bubble1Ref.current.setAttribute('opacity', bubbleY1 > 82 ? 0.5 : 0)
      }
      if (bubble2Ref.current) {
        bubble2Ref.current.setAttribute('cy', bubbleY2)
        bubble2Ref.current.setAttribute('cx', 98 + wobble2)
        bubble2Ref.current.setAttribute('opacity', bubbleY2 > 82 ? 0.4 : 0)
      }
      if (bubble3Ref.current) {
        bubble3Ref.current.setAttribute('cy', bubbleY3)
        bubble3Ref.current.setAttribute('cx', 88 + wobble3)
        bubble3Ref.current.setAttribute('opacity', bubbleY3 > 82 ? 0.35 : 0)
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
      <defs>
        <linearGradient id="coat-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="beaker-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="hair-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5E7EB" />
          <stop offset="100%" stopColor="#D1D5DB" />
        </linearGradient>
      </defs>

      {/* === BODY / LAB COAT === */}
      {/* Coat body */}
      <path d="M 35 76 L 35 148 Q 35 152 39 152 L 81 152 Q 85 152 85 148 L 85 76 Q 85 72 78 70 L 60 65 L 42 70 Q 35 72 35 76 Z"
        fill="url(#coat-grad)" stroke="#CBD5E1" strokeWidth="0.8" />
      {/* Coat lapels */}
      <path d="M 50 70 L 60 82 L 52 76" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
      <path d="M 70 70 L 60 82 L 68 76" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
      {/* Center button line */}
      <line x1="60" y1="85" x2="60" y2="145" stroke="#CBD5E1" strokeWidth="0.5" strokeDasharray="0" />
      {/* Buttons */}
      <circle cx="60" cy="92" r="1.5" fill="#CBD5E1" />
      <circle cx="60" cy="106" r="1.5" fill="#CBD5E1" />
      <circle cx="60" cy="120" r="1.5" fill="#CBD5E1" />
      {/* Breast pocket */}
      <rect x="64" y="78" width="12" height="9" rx="1.5" fill="none" stroke="#CBD5E1" strokeWidth="0.6" />
      {/* Pen in pocket */}
      <rect x="68" y="74" width="1.8" height="9" rx="0.9" fill="#F59E0B" />
      <circle cx="68.9" cy="74" r="1.2" fill="#F59E0B" />

      {/* === NECK & SHIRT === */}
      <rect x="52" y="60" width="16" height="14" rx="4" fill="#FDE68A" opacity="0.4" />
      {/* Shirt collar visible */}
      <path d="M 50 68 L 55 74 L 60 69 L 65 74 L 70 68" fill="none" stroke="#D97706" strokeWidth="0.6" opacity="0.4" />

      {/* === HEAD === */}
      <ellipse cx="60" cy="40" rx="20" ry="23" fill="#D2A679" />

      {/* === HAIR — wild Einstein style === */}
      {/* Main hair mass on top */}
      <path d="M 40 32 Q 35 18 42 10 Q 48 4 55 12 Q 58 6 64 8 Q 70 4 76 12 Q 82 6 84 16 Q 90 22 82 32"
        fill="url(#hair-grad)" />
      {/* Left side poof */}
      <path d="M 40 32 Q 32 28 34 38 Q 30 42 36 46 Q 34 48 38 48" fill="url(#hair-grad)" />
      {/* Right side poof */}
      <path d="M 82 32 Q 88 26 88 36 Q 92 40 86 44 Q 88 48 84 48" fill="url(#hair-grad)" />
      {/* A few wispy strands */}
      <path d="M 45 14 Q 42 8 46 6" fill="none" stroke="#C8CCD3" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M 72 10 Q 76 4 78 8" fill="none" stroke="#C8CCD3" strokeWidth="0.8" strokeLinecap="round" />

      {/* === FACE === */}
      {/* Glasses — round frames */}
      <circle cx="51" cy="38" r="8" fill="none" stroke="#64748B" strokeWidth="1.4" />
      <circle cx="69" cy="38" r="8" fill="none" stroke="#64748B" strokeWidth="1.4" />
      {/* Glasses bridge */}
      <path d="M 59 37 Q 60 35 61 37" fill="none" stroke="#64748B" strokeWidth="1.2" />
      {/* Temple arms */}
      <path d="M 43 36 Q 38 34 36 36" fill="none" stroke="#64748B" strokeWidth="1" />
      <path d="M 77 36 Q 82 34 84 36" fill="none" stroke="#64748B" strokeWidth="1" />
      {/* Lens shine */}
      <path d="M 46 34 Q 48 32 50 33" fill="none" stroke="white" strokeWidth="0.6" opacity="0.5" strokeLinecap="round" />
      <path d="M 64 34 Q 66 32 68 33" fill="none" stroke="white" strokeWidth="0.6" opacity="0.5" strokeLinecap="round" />

      {/* Eyes — simple friendly dots */}
      <circle cx="51" cy="39" r="2.5" fill="#1E293B" />
      <circle cx="69" cy="39" r="2.5" fill="#1E293B" />
      {/* Eye highlights */}
      <circle cx="52" cy="38" r="0.9" fill="white" />
      <circle cx="70" cy="38" r="0.9" fill="white" />

      {/* Eyebrows — expressive, slightly raised */}
      <path d="M 45 30 Q 49 27 56 30" fill="none" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M 64 30 Q 71 27 75 30" fill="none" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />

      {/* Nose — simple */}
      <path d="M 60 42 Q 57 47 59 49 Q 61 50 63 49 Q 65 47 62 42" fill="#C08A5C" opacity="0.6" />

      {/* Mustache — bushy */}
      <path d="M 50 50 Q 53 53 57 51 Q 60 53 63 51 Q 67 53 70 50"
        fill="#D1D5DB" stroke="#C0C5CD" strokeWidth="0.6" />

      {/* Smile */}
      <path d="M 53 54 Q 60 59 67 54" fill="none" stroke="#94A3B8" strokeWidth="0.9" strokeLinecap="round" />

      {/* === ARMS === */}
      {/* Left arm — resting at side */}
      <path d="M 35 80 Q 24 95 20 115 Q 18 120 22 122"
        fill="none" stroke="url(#coat-grad)" strokeWidth="10" strokeLinecap="round" />
      {/* Left hand */}
      <circle cx="22" cy="122" r="5.5" fill="#D2A679" />

      {/* Right arm — holding beaker up */}
      <path d="M 85 80 Q 92 88 96 95 Q 100 100 98 105"
        fill="none" stroke="url(#coat-grad)" strokeWidth="10" strokeLinecap="round" />
      {/* Right hand */}
      <circle cx="96" cy="107" r="5.5" fill="#D2A679" />

      {/* === BEAKER (Erlenmeyer flask shape) === */}
      <path d="M 86 82 L 86 100 L 78 118 Q 76 122 80 122 L 108 122 Q 112 122 110 118 L 102 100 L 102 82 Z"
        fill="none" stroke="#60A5FA" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Flask neck ring */}
      <ellipse cx="94" cy="82" rx="9" ry="2" fill="none" stroke="#60A5FA" strokeWidth="0.8" />
      {/* Liquid */}
      <path d="M 82 110 L 86 102 L 102 102 L 106 110 Q 108 114 106 116 L 82 116 Q 80 114 82 110 Z"
        fill="url(#beaker-liquid)" />

      {/* Animated bubbles */}
      <circle ref={bubble1Ref} cx="93" cy="108" r="2" fill="#34D399" opacity="0.5" />
      <circle ref={bubble2Ref} cx="98" cy="112" r="1.5" fill="#34D399" opacity="0.4" />
      <circle ref={bubble3Ref} cx="88" cy="110" r="1.2" fill="#34D399" opacity="0.35" />

      {/* === CLIPBOARD IN LEFT HAND === */}
      <rect x="10" y="110" width="18" height="24" rx="2" fill="#FDE68A" stroke="#D97706" strokeWidth="0.6" opacity="0.7" />
      <rect x="15" y="108" width="8" height="4" rx="1" fill="#D97706" opacity="0.5" />
      {/* Clipboard lines */}
      <line x1="14" y1="117" x2="24" y2="117" stroke="#D97706" strokeWidth="0.5" opacity="0.3" />
      <line x1="14" y1="120" x2="22" y2="120" stroke="#D97706" strokeWidth="0.5" opacity="0.3" />
      <line x1="14" y1="123" x2="24" y2="123" stroke="#D97706" strokeWidth="0.5" opacity="0.3" />
      <line x1="14" y1="126" x2="20" y2="126" stroke="#D97706" strokeWidth="0.5" opacity="0.3" />
    </svg>
  )
}

export default LabScientist
