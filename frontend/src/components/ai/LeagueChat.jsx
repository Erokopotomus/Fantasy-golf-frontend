import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'

const DEFAULT_SUGGESTIONS = [
  "Who has the most championships?",
  "What's the all-time points leader?",
  "What's the closest game in league history?",
  "Who has the longest winning streak?",
]

const VAULT_SUGGESTIONS = [
  "What's the biggest blowout ever?",
  "Who has the best all-time record?",
  "What are the all-time records?",
  "Who's had the most points in a single season?",
]

const STANDINGS_SUGGESTIONS = [
  "Who's the most consistent team?",
  "What's the highest score this week across all seasons?",
  "Who has the most playoff appearances?",
  "Who's on the longest championship drought?",
]

function getSuggestions(pageContext) {
  if (pageContext === 'vault') return VAULT_SUGGESTIONS
  if (pageContext === 'standings') return STANDINGS_SUGGESTIONS
  return DEFAULT_SUGGESTIONS
}

export default function LeagueChat({ leagueId, leagueName, pageContext = 'home' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Keyboard dismiss
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return
    setError(null)

    const userMsg = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const result = await api.queryLeague(leagueId, text.trim(), sessionId)

      if (result.sessionId) setSessionId(result.sessionId)

      const aiMsg = {
        role: 'assistant',
        content: result.answer || "I couldn't find an answer for that.",
        sources: result.sources || [],
        suggestedFollowUps: result.suggestedFollowUps || [],
        data: result.data,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      setError(err.message || 'Failed to get a response')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't process that right now. Try again in a moment.",
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }, [leagueId, sessionId, loading])

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const startNewConversation = () => {
    setMessages([])
    setSessionId(null)
    setError(null)
  }

  if (!leagueId) return null

  const suggestions = getSuggestions(pageContext)

  return (
    <>
      {/* Floating Button — bottom-left to avoid FloatingCaptureButton on bottom-right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-40 w-12 h-12 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 hover:scale-105 transition-all flex items-center justify-center group"
          title="Ask about your league"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-dark-secondary border border-white/10 text-[10px] font-medium text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            League Intel
          </span>
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 md:bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Drawer */}
      {isOpen && (
        <div
          className="fixed z-50 bg-dark-primary border border-white/10 shadow-2xl flex flex-col
            bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl
            md:bottom-4 md:left-4 md:right-auto md:top-auto md:w-[400px] md:h-[600px] md:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">League Intelligence</p>
                <p className="text-[10px] text-white/40 truncate">{leagueName || 'Your League'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={startNewConversation}
                  className="text-[10px] text-white/40 hover:text-white/60 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                  title="New conversation"
                >
                  New
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !loading && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-sm text-white/60 mb-1">Ask anything about your league</p>
                <p className="text-xs text-white/30 mb-4">Powered by your imported league data</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-1.5 rounded-full bg-purple-600/10 border border-purple-500/20 text-purple-300 hover:bg-purple-600/20 hover:border-purple-500/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-purple-600/20 border border-purple-500/20 text-white'
                    : 'bg-white/5 border border-white/5 text-white/80'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <p className="text-[10px] text-white/30 mt-1">
                      Sources: {msg.sources.join(', ')}
                    </p>
                  )}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msg.suggestedFollowUps.map((s, j) => (
                        <button
                          key={j}
                          onClick={() => sendMessage(s)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600/10 border border-purple-500/20 text-purple-300 hover:bg-purple-600/20 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl px-3 py-2 bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-[10px] text-red-400 text-center">{error}</p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="shrink-0 px-4 py-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your league..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/40"
                maxLength={500}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            {messages.length > 0 && (
              <p className="text-[10px] text-white/20 mt-1 text-center">
                {messages.length} messages {sessionId ? '(session saved)' : ''}
              </p>
            )}
          </form>
        </div>
      )}
    </>
  )
}
