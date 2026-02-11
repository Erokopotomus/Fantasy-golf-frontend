import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import CaptureFormModal from './CaptureFormModal'

export default function FloatingCaptureButton() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (!user) return null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-12 h-12 rounded-full bg-gold text-dark-primary shadow-lg shadow-gold/20 hover:bg-gold/90 hover:scale-105 transition-all flex items-center justify-center group"
        title="Quick Capture"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span className="absolute right-full mr-2 px-2 py-1 rounded-md bg-dark-secondary border border-white/10 text-[10px] font-medium text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Quick Note
        </span>
      </button>
      {showModal && (
        <CaptureFormModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {}}
        />
      )}
    </>
  )
}
