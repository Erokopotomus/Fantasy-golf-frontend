const ClutchLogo = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1ed882"/>
          <stop offset="100%" stopColor="#14a36a"/>
        </linearGradient>
      </defs>
      {/* Rounded square */}
      <rect width="512" height="512" rx="108" fill="url(#logoBg)"/>
      {/* Flag pole */}
      <line x1="330" y1="100" x2="330" y2="400" stroke="white" strokeWidth="14" strokeLinecap="round"/>
      {/* Flag */}
      <path d="M330 100 Q290 125, 250 115 Q210 105, 185 130 L185 195 Q210 170, 250 180 Q290 190, 330 165 Z" fill="white" opacity="0.95"/>
      {/* C on flag */}
      <path d="M275 134 C260 126, 225 128, 218 147 C211 166, 228 180, 248 175" stroke="url(#logoBg)" strokeWidth="11" strokeLinecap="round" fill="none"/>
      {/* Golf ball */}
      <circle cx="330" cy="410" r="42" fill="white"/>
      <circle cx="315" cy="400" r="4" fill="rgba(0,0,0,0.08)"/>
      <circle cx="330" cy="395" r="4" fill="rgba(0,0,0,0.08)"/>
      <circle cx="345" cy="400" r="4" fill="rgba(0,0,0,0.08)"/>
      <circle cx="322" cy="415" r="4" fill="rgba(0,0,0,0.08)"/>
      <circle cx="338" cy="415" r="4" fill="rgba(0,0,0,0.08)"/>
      <circle cx="330" cy="430" r="4" fill="rgba(0,0,0,0.08)"/>
      {/* Ground line */}
      <line x1="300" y1="452" x2="360" y2="452" stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.4"/>
    </svg>
  )
}

export default ClutchLogo
