import { useState, useRef, useCallback, useEffect } from 'react'

export default function ShareButton({ CardComponent, cardProps, label = 'Share' }) {
  const [showMenu, setShowMenu] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [renderCard, setRenderCard] = useState(false)
  const cardRef = useRef(null)
  const menuRef = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const captureCard = useCallback(async () => {
    setRenderCard(true)
    setCapturing(true)

    // Wait for next frame + fonts
    await new Promise(r => setTimeout(r, 100))
    await document.fonts?.ready

    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      backgroundColor: '#0A0908',
      useCORS: true,
      logging: false,
    })

    setCapturing(false)
    return canvas
  }, [])

  const handleDownload = async () => {
    setShowMenu(false)
    try {
      const canvas = await captureCard()
      const link = document.createElement('a')
      link.download = 'clutch-moment.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Share download failed:', err)
    } finally {
      setRenderCard(false)
    }
  }

  const handleCopy = async () => {
    setShowMenu(false)
    try {
      const canvas = await captureCard()
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        } catch {
          // Fallback — some browsers don't support clipboard image
          const link = document.createElement('a')
          link.download = 'clutch-moment.png'
          link.href = canvas.toDataURL('image/png')
          link.click()
        }
        setRenderCard(false)
      }, 'image/png')
    } catch (err) {
      console.error('Share copy failed:', err)
      setRenderCard(false)
    }
  }

  const handleNativeShare = async () => {
    setShowMenu(false)
    try {
      const canvas = await captureCard()
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'clutch-moment.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Clutch Moment' })
        } else {
          // Fallback to download
          const link = document.createElement('a')
          link.download = 'clutch-moment.png'
          link.href = canvas.toDataURL('image/png')
          link.click()
        }
        setRenderCard(false)
      }, 'image/png')
    } catch (err) {
      console.error('Native share failed:', err)
      setRenderCard(false)
    }
  }

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={capturing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 transition-colors disabled:opacity-50"
      >
        {capturing ? (
          <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
        {label}
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-[#1A1510] border border-stone/30 rounded-lg shadow-2xl py-1 z-50 min-w-[160px]">
          <button
            onClick={handleDownload}
            className="w-full text-left px-3 py-2 text-sm text-text-primary/80 hover:bg-dark-tertiary/5 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PNG
          </button>
          <button
            onClick={handleCopy}
            className="w-full text-left px-3 py-2 text-sm text-text-primary/80 hover:bg-dark-tertiary/5 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy to Clipboard
          </button>
          {supportsNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full text-left px-3 py-2 text-sm text-text-primary/80 hover:bg-dark-tertiary/5 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Share...
            </button>
          )}
        </div>
      )}

      {/* Offscreen card for capture */}
      {renderCard && (
        <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -1 }}>
          <CardComponent ref={cardRef} {...cardProps} />
        </div>
      )}
    </div>
  )
}
