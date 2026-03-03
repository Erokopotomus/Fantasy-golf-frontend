import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NeuralCluster from '../common/NeuralCluster'
import api from '../../services/api'

// ── Confetti Piece ──────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#D4930D', '#F06820', '#0D9668', '#FFFFFF']

const ConfettiPiece = ({ index }) => {
  const style = useMemo(() => {
    const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length]
    const left = Math.random() * 100
    const size = 6 + Math.random() * 6
    const duration = 2 + Math.random() * 2
    const delay = Math.random() * 1
    const drift = (Math.random() - 0.5) * 200
    const isCircle = Math.random() > 0.5

    return {
      position: 'absolute',
      left: `${left}%`,
      top: '-20px',
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      borderRadius: isCircle ? '50%' : '2px',
      animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
      '--drift': `${drift}px`,
      opacity: 0,
    }
  }, [index])

  return <div style={style} />
}

// ── Grade Ring ──────────────────────────────────────────────────────────────
const gradeColor = (grade) => {
  if (!grade) return 'rgba(255,255,255,0.4)'
  const letter = grade.charAt(0).toUpperCase()
  if (letter === 'A') return '#D4930D'
  if (letter === 'B') return '#0D9668'
  if (letter === 'C') return '#F06820'
  return 'rgba(255,255,255,0.4)'
}

const gradeGradient = (grade) => {
  if (!grade) return 'rgba(255,255,255,0.15)'
  const letter = grade.charAt(0).toUpperCase()
  if (letter === 'A') return 'linear-gradient(135deg, #D4930D, #F0C850)'
  if (letter === 'B') return 'linear-gradient(135deg, #0D9668, #34D399)'
  if (letter === 'C') return 'linear-gradient(135deg, #F06820, #FB923C)'
  return 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))'
}

const gradeMessage = (grade) => {
  if (!grade) return ''
  const g = grade.toUpperCase()
  if (g === 'A+') return 'Legendary. Your league is shaking.'
  if (g === 'A' || g === 'A-') return 'Elite draft. Your coach is impressed.'
  if (g === 'B+' || g === 'B') return 'Strong roster. Built to compete.'
  if (g === 'B-') return 'Solid foundation. Room to grow.'
  if (g.startsWith('C')) return 'Workable. Your coach sees a path.'
  return 'Bold strategy. Let\'s prove them wrong.'
}

const GradeRing = ({ grade }) => {
  const color = gradeColor(grade)
  const gradient = gradeGradient(grade)

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 120, height: 120 }}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full opacity-30 blur-xl"
        style={{ background: gradient }}
      />
      {/* Border ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient,
          padding: 4,
        }}
      >
        <div className="w-full h-full rounded-full bg-black/90" />
      </div>
      {/* Grade letter */}
      <span
        className="relative font-display font-bold text-4xl"
        style={{ color }}
      >
        {grade}
      </span>
    </div>
  )
}

// ── Main Overlay ────────────────────────────────────────────────────────────
const DraftCompletionOverlay = ({ draftId, leagueId, leagueName, visible }) => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Timed phase progression
  const [phase, setPhase] = useState(0) // 0=hidden, 1=bg, 2=confetti, 3=text, 4=neural, 5=grade, 6=cta
  const [grade, setGrade] = useState(null)
  const [gradeLoading, setGradeLoading] = useState(false)
  const pollCountRef = useRef(0)
  const pollTimerRef = useRef(null)
  const redirectTimerRef = useRef(null)
  const hasClickedRef = useRef(false)

  // Phase timing sequence
  useEffect(() => {
    if (!visible) {
      setPhase(0)
      return
    }

    // T+0ms — background dims
    setPhase(1)

    const timers = [
      setTimeout(() => setPhase(2), 300),    // T+300ms — confetti
      setTimeout(() => setPhase(3), 500),     // T+500ms — text
      setTimeout(() => setPhase(4), 1500),    // T+1500ms — neural cluster
      setTimeout(() => setPhase(5), 3000),    // T+3000ms — grade reveal
      setTimeout(() => setPhase(6), 4000),    // T+4000ms — CTA buttons
    ]

    return () => timers.forEach(clearTimeout)
  }, [visible])

  // Fetch grade when phase 5 triggers
  useEffect(() => {
    if (phase < 5 || !draftId) return

    const fetchGrade = async () => {
      setGradeLoading(true)
      try {
        const grades = await api.getDraftGrades(draftId)
        // Find the current user's grade
        const userGrade = grades.find(g => g.teamUserId === user?.id)
        if (userGrade?.overallGrade) {
          setGrade(userGrade.overallGrade)
          setGradeLoading(false)
          return true
        }
        return false
      } catch {
        return false
      }
    }

    const startPolling = async () => {
      const found = await fetchGrade()
      if (found) return

      // Poll every 2s up to 5 times
      pollCountRef.current = 0
      pollTimerRef.current = setInterval(async () => {
        pollCountRef.current++
        const found = await fetchGrade()
        if (found || pollCountRef.current >= 5) {
          clearInterval(pollTimerRef.current)
          setGradeLoading(false)
        }
      }, 2000)
    }

    startPolling()

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [phase, draftId, user?.id])

  // Auto-redirect after 20 seconds
  useEffect(() => {
    if (phase < 6 || !draftId) return

    redirectTimerRef.current = setTimeout(() => {
      if (!hasClickedRef.current) {
        navigate(`/draft/history/${draftId}`)
      }
    }, 20000)

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [phase, draftId, navigate])

  const handleClick = () => {
    hasClickedRef.current = true
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
  }

  if (!visible) return null

  return (
    <>
      {/* CSS Keyframes — injected once */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) translateX(0) rotate(0deg);
            opacity: 1;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(var(--drift, 0px)) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes overlay-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes title-spring {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          60% {
            transform: scale(1.05);
          }
          80% {
            transform: scale(0.98);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes slide-up-fade {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes gentle-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes grade-pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.15);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Overlay Container */}
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          animation: 'overlay-fade-in 400ms ease-out forwards',
        }}
      >
        {/* Dark background */}
        <div className="absolute inset-0 bg-black/80" />

        {/* Confetti layer */}
        {phase >= 2 && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 30 }, (_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
          </div>
        )}

        {/* Content stack */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full">

          {/* Title + League Name */}
          {phase >= 3 && (
            <div
              style={{
                animation: 'title-spring 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }}
            >
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-white tracking-tight">
                DRAFT COMPLETE
              </h1>
              {leagueName && (
                <p className="font-editorial italic text-crown text-lg sm:text-xl mt-2">
                  {leagueName}
                </p>
              )}
            </div>
          )}

          {/* Neural Cluster + coaching message */}
          {phase >= 4 && (
            <div
              className="mt-8 flex flex-col items-center"
              style={{
                animation: 'slide-up-fade 500ms ease-out forwards',
              }}
            >
              <NeuralCluster size="lg" intensity="active" />
              <p className="text-text-primary/60 text-sm mt-3 font-body">
                Your AI coach is grading every pick...
              </p>
            </div>
          )}

          {/* Grade reveal */}
          {phase >= 5 && (
            <div
              className="mt-8 flex flex-col items-center"
              style={{
                animation: 'grade-pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }}
            >
              {gradeLoading && !grade ? (
                <div className="flex flex-col items-center">
                  <div
                    className="w-[120px] h-[120px] rounded-full border-4 border-white/20 flex items-center justify-center"
                  >
                    <span
                      className="font-mono text-white/50 text-sm"
                      style={{ animation: 'gentle-pulse 1.5s ease-in-out infinite' }}
                    >
                      Grading...
                    </span>
                  </div>
                  <p className="text-text-primary/40 text-xs mt-3 font-mono">
                    Grading in progress...
                  </p>
                </div>
              ) : grade ? (
                <div className="flex flex-col items-center">
                  <GradeRing grade={grade} />
                  <p className="text-white/80 text-base font-body mt-4 max-w-xs">
                    {gradeMessage(grade)}
                  </p>
                </div>
              ) : (
                /* Grade never resolved after polling */
                <div className="flex flex-col items-center">
                  <div className="w-[120px] h-[120px] rounded-full border-4 border-white/20 flex items-center justify-center">
                    <span className="font-mono text-white/40 text-lg">--</span>
                  </div>
                  <p className="text-white/50 text-sm font-body mt-3">
                    Grade will be ready on your recap page.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CTA Buttons */}
          {phase >= 6 && (
            <div
              className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full"
              style={{
                animation: 'slide-up-fade 500ms ease-out forwards',
              }}
            >
              <Link
                to={`/draft/history/${draftId}`}
                onClick={handleClick}
                className="flex-1 w-full sm:w-auto text-center px-8 py-4 rounded-xl font-display font-bold text-lg text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-crown/30"
                style={{
                  background: 'linear-gradient(135deg, #D4930D, #F0C850)',
                }}
              >
                View Your Full Draft Recap &rarr;
              </Link>
              <Link
                to={`/leagues/${leagueId}`}
                onClick={handleClick}
                className="text-center px-6 py-3 rounded-xl font-body text-sm text-white/60 hover:text-white/90 border border-white/10 hover:border-white/25 transition-all"
              >
                Back to League
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default DraftCompletionOverlay
