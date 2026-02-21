import { useState, useRef, useEffect } from 'react'

const ChatInput = ({ onSend, disabled = false, placeholder = 'Type a message...' }) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [message])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message)
      setMessage('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 border-t border-dark-border bg-dark-secondary flex-shrink-0">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="
            w-full px-3 py-2.5 bg-dark-tertiary border border-dark-border rounded-xl
            text-sm text-text-primary placeholder-text-muted resize-none
            focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold
            disabled:opacity-50 disabled:cursor-not-allowed
            scrollbar-thin
          "
          style={{ minHeight: '40px', maxHeight: '100px' }}
        />
      </div>
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className="
          p-2.5 bg-gold rounded-xl text-text-primary flex-shrink-0
          hover:bg-gold-bright active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gold
          transition-all duration-200
        "
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  )
}

export default ChatInput
