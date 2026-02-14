// Animated counter — counts from 0 to target with ease-out cubic
// Shared component used in VaultReveal and VaultPersistent
// When animate=false, renders the target value instantly

import { useState, useEffect } from 'react'

export default function AnimatedNumber({
  target,
  duration = 1200,
  delay = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  animate = true,
}) {
  const [current, setCurrent] = useState(animate ? 0 : target)
  const [started, setStarted] = useState(!animate)

  useEffect(() => {
    if (!animate) {
      setCurrent(target)
      return
    }
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay, animate, target])

  useEffect(() => {
    if (!started || !animate) return
    const startTime = Date.now()
    let raf
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCurrent(target * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, target, duration, animate])

  const display = decimals > 0
    ? Number(current.toFixed(decimals)).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : Math.round(current).toLocaleString()

  return (
    <span>
      {prefix}{display}{suffix}
    </span>
  )
}
