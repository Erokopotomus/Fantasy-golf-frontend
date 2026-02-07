import { useState, useCallback, useRef } from 'react'

const STORAGE_KEY = 'draftSoundEnabled'

export default function useDraftSounds() {
  const ctxRef = useRef(null)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })
  const soundEnabledRef = useRef(soundEnabled)

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev
      soundEnabledRef.current = next
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const tone = useCallback((freq, duration, gain = 0.12) => {
    if (!soundEnabledRef.current) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.frequency.value = freq
      g.gain.setValueAtTime(gain, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch { /* ignore audio errors */ }
  }, [])

  const playPick = useCallback(() => {
    tone(600, 0.1)
  }, [tone])

  const playYourTurn = useCallback(() => {
    if (!soundEnabledRef.current) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(1000, ctx.currentTime + 0.3)
      g.gain.setValueAtTime(0.15, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    } catch { /* ignore audio errors */ }
  }, [])

  const playTimerWarning = useCallback(() => {
    tone(400, 0.15, 0.1)
  }, [tone])

  const playBid = useCallback(() => {
    tone(700, 0.08, 0.1)
  }, [tone])

  const playDraftComplete = useCallback(() => {
    if (!soundEnabledRef.current) return
    try {
      const ctx = getCtx()
      const times = [0, 0.15, 0.3]
      const freqs = [600, 800, 1000]
      times.forEach((t, i) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.connect(g)
        g.connect(ctx.destination)
        osc.frequency.value = freqs[i]
        g.gain.setValueAtTime(0.15, ctx.currentTime + t)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime + t + 0.2)
      })
    } catch { /* ignore audio errors */ }
  }, [])

  const initSounds = useCallback(() => {
    try { getCtx() } catch { /* ignore */ }
  }, [])

  return { soundEnabled, toggleSound, initSounds, playPick, playYourTurn, playTimerWarning, playBid, playDraftComplete }
}
