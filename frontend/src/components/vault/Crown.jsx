// Crown SVG icon — used for #1 ranked owner
// Optional bob animation via `animated` prop

export default function Crown({ size = 20, color = '#D4A853', animated = true }) {
  return (
    <>
      {animated && (
        <style>{`
          @keyframes crownBob {
            0%, 100% { transform: translateY(0) rotate(-3deg); }
            50% { transform: translateY(-3px) rotate(3deg); }
          }
        `}</style>
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          filter: `drop-shadow(0 0 6px ${color}60)`,
          animation: animated ? 'crownBob 3s ease-in-out infinite' : 'none',
        }}
      >
        <path
          d="M2 18h20v2H2zM3.5 16L2 8l5.5 4L12 4l4.5 8L22 8l-1.5 8z"
          fill={color}
        />
      </svg>
    </>
  )
}
