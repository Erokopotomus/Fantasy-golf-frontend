import { useRef, useEffect, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import Card from '../common/Card'

const ChatPanel = ({
  leagueId,
  leagueName,
  memberCount,
  className = '',
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const { messages, loading, sending, sendMessage } = useChat(leagueId)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [autoScroll, setAutoScroll] = useState(true)

  // Scroll to bottom when new messages arrive (if auto-scroll is enabled)
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, autoScroll])

  // Detect if user has scrolled up
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setAutoScroll(isAtBottom)
    }
  }

  const handleSend = async (content) => {
    await sendMessage(content)
    setAutoScroll(true)
  }

  if (collapsible && isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={`
          w-full flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl
          hover:bg-[var(--surface-alt)] transition-colors ${className}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-text-primary font-medium">League Chat</p>
            <p className="text-text-muted text-sm">{messages.length} messages</p>
          </div>
        </div>
        <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    )
  }

  return (
    <div className={`flex flex-col bg-[var(--surface)] border border-[var(--card-border)] rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)] bg-[var(--surface)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <p className="text-text-primary font-medium text-sm">{leagueName || 'League Chat'}</p>
            {memberCount && (
              <p className="text-text-muted text-xs">{memberCount} members</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true)
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-2 py-1 bg-gold/20 text-gold text-xs rounded-lg hover:bg-gold/30 transition-colors"
            >
              New messages
            </button>
          )}
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-[var(--surface-alt)] rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0 scrollbar-thin"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-2" />
              <p className="text-text-muted text-sm">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-text-secondary font-medium mb-1">No messages yet</p>
              <p className="text-text-muted text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={sending}
        placeholder="Message the league..."
      />
    </div>
  )
}

export default ChatPanel
