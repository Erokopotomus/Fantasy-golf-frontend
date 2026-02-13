import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'
import Card from '../common/Card'

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'rule_change', label: 'Rule Change', color: 'bg-red-500/20 text-red-400' },
  { value: 'trade_analysis', label: 'Trade Analysis', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'draft_recap', label: 'Draft Recap', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'reminder', label: 'Reminder', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'weekly_update', label: 'Weekly Update', color: 'bg-gold/20 text-gold' },
]

const EMOJIS = ['🔥', '👍', '😂', '💀', '🏆', '📢']

const TONES = [
  { value: 'hype', label: 'Hype' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'trash_talk', label: 'Trash Talk' },
  { value: 'professional', label: 'Professional' },
]

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CommissionerNotes = ({ leagueId, isCommissioner, leagueName }) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [expandedPost, setExpandedPost] = useState(null)
  const [comments, setComments] = useState({})
  const [commentInput, setCommentInput] = useState('')
  const [commentsLoading, setCommentsLoading] = useState({})

  // Editor state
  const [editorTitle, setEditorTitle] = useState('')
  const [editorContent, setEditorContent] = useState('')
  const [editorCategory, setEditorCategory] = useState('general')
  const [editorPinned, setEditorPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  // AI generation state
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState('professional')
  const [aiGenerating, setAiGenerating] = useState(false)

  const contentRef = useRef(null)

  const fetchPosts = useCallback(async () => {
    try {
      const data = await api.getLeaguePosts(leagueId)
      setPosts(data.posts || [])
    } catch (e) {
      console.error('Failed to load posts:', e)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const openEditor = (post = null) => {
    if (post) {
      setEditingPost(post)
      setEditorTitle(post.title)
      setEditorContent(post.content)
      setEditorCategory(post.category)
      setEditorPinned(post.isPinned)
    } else {
      setEditingPost(null)
      setEditorTitle('')
      setEditorContent('')
      setEditorCategory('general')
      setEditorPinned(false)
    }
    setShowAiPanel(false)
    setShowEditor(true)
  }

  const closeEditor = () => {
    setShowEditor(false)
    setEditingPost(null)
    setEditorTitle('')
    setEditorContent('')
    setShowAiPanel(false)
  }

  const handleSave = async () => {
    if (!editorTitle.trim() || !editorContent.trim()) return
    setSaving(true)
    try {
      // Get content from contentEditable div
      const htmlContent = contentRef.current ? contentRef.current.innerHTML : editorContent
      if (editingPost) {
        const data = await api.updateLeaguePost(leagueId, editingPost.id, {
          title: editorTitle.trim(),
          content: htmlContent,
          category: editorCategory,
          isPinned: editorPinned,
        })
        setPosts(prev => prev.map(p => p.id === editingPost.id ? data.post : p))
      } else {
        const data = await api.createLeaguePost(leagueId, {
          title: editorTitle.trim(),
          content: htmlContent,
          category: editorCategory,
          isPinned: editorPinned,
          aiGenerated: !!showAiPanel,
        })
        setPosts(prev => [data.post, ...prev])
      }
      closeEditor()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await api.deleteLeaguePost(leagueId, postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (e) { alert(e.message) }
  }

  const handlePin = async (post) => {
    try {
      const data = await api.updateLeaguePost(leagueId, post.id, { isPinned: !post.isPinned })
      setPosts(prev => prev.map(p => p.id === post.id ? data.post : p))
    } catch (e) { alert(e.message) }
  }

  const handleReaction = async (postId, emoji) => {
    try {
      const result = await api.togglePostReaction(leagueId, postId, emoji)
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        const reactions = { ...p.reactions }
        if (result.toggled === 'added') {
          if (!reactions[emoji]) reactions[emoji] = { count: 0, userReacted: false }
          reactions[emoji] = { count: reactions[emoji].count + 1, userReacted: true }
        } else {
          if (reactions[emoji]) {
            reactions[emoji] = { count: reactions[emoji].count - 1, userReacted: false }
            if (reactions[emoji].count <= 0) delete reactions[emoji]
          }
        }
        return { ...p, reactions }
      }))
    } catch (e) { console.error(e) }
  }

  const toggleComments = async (postId) => {
    if (expandedPost === postId) {
      setExpandedPost(null)
      return
    }
    setExpandedPost(postId)
    if (!comments[postId]) {
      setCommentsLoading(prev => ({ ...prev, [postId]: true }))
      try {
        const data = await api.getPostComments(leagueId, postId)
        setComments(prev => ({ ...prev, [postId]: data.comments || [] }))
      } catch (e) { console.error(e) }
      setCommentsLoading(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handleAddComment = async (postId) => {
    if (!commentInput.trim()) return
    try {
      const data = await api.addPostComment(leagueId, postId, commentInput.trim())
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data.comment] }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))
      setCommentInput('')
    } catch (e) { alert(e.message) }
  }

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await api.deletePostComment(leagueId, postId, commentId)
      setComments(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) } : p))
    } catch (e) { alert(e.message) }
  }

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return
    setAiGenerating(true)
    try {
      const data = await api.generatePostDraft(leagueId, {
        category: editorCategory,
        topic: aiTopic.trim(),
        tone: aiTone,
      })
      if (data.draft) {
        if (data.draft.title) setEditorTitle(data.draft.title)
        if (data.draft.content) {
          setEditorContent(data.draft.content)
          if (contentRef.current) contentRef.current.innerHTML = data.draft.content
        }
      }
      if (data.aiDisabled) {
        alert('AI is currently disabled. Write your post manually.')
      }
      setShowAiPanel(false)
    } catch (e) { alert(e.message) }
    setAiGenerating(false)
  }

  const execFormat = (cmd) => {
    document.execCommand(cmd, false, null)
    contentRef.current?.focus()
  }

  const getCategoryStyle = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat)
    return found ? found.color : 'bg-dark-tertiary text-text-muted'
  }

  const getCategoryLabel = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat)
    return found ? found.label : cat
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h3 className="text-base font-display font-bold text-white">Commissioner Notes</h3>
        </div>
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h3 className="text-base font-display font-bold text-white">Commissioner Notes</h3>
          </div>
          {isCommissioner && (
            <button
              onClick={() => openEditor()}
              className="text-xs font-medium text-gold hover:text-gold/80 transition-colors"
            >
              + New Post
            </button>
          )}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-6">
            <svg className="w-10 h-10 text-text-muted/40 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-text-muted text-sm">
              {isCommissioner ? 'Share updates with your league' : 'No posts yet. Check back soon!'}
            </p>
            {isCommissioner && (
              <button
                onClick={() => openEditor()}
                className="mt-3 px-4 py-1.5 bg-gold/20 text-gold text-xs font-medium rounded-lg hover:bg-gold/30 transition-colors"
              >
                Create First Post
              </button>
            )}
          </div>
        )}

        {/* Post List */}
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-dark-primary/50 rounded-lg p-4 border border-dark-border/30">
              {/* Post header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.isPinned && (
                    <span className="text-yellow-400 text-xs" title="Pinned">
                      <svg className="w-3.5 h-3.5 inline" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.8L9 4.323V3a1 1 0 011-1z" />
                      </svg>
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryStyle(post.category)}`}>
                    {getCategoryLabel(post.category)}
                  </span>
                  {post.aiGenerated && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-400">AI</span>
                  )}
                </div>
                {isCommissioner && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handlePin(post)} className="p-1 text-text-muted hover:text-yellow-400 transition-colors" title={post.isPinned ? 'Unpin' : 'Pin'}>
                      <svg className="w-3.5 h-3.5" fill={post.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    <button onClick={() => openEditor(post)} className="p-1 text-text-muted hover:text-gold transition-colors" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Title + content */}
              <h4 className="text-white font-display font-bold text-sm mb-1">{post.title}</h4>
              <div
                className="text-text-secondary text-sm leading-relaxed line-clamp-3 prose-sm [&_p]:mb-1 [&_strong]:text-white [&_em]:text-gold/80 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:text-text-secondary"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Meta */}
              <div className="flex items-center gap-2 mt-2 text-[11px] text-text-muted">
                <span>{post.author?.name || 'Commissioner'}</span>
                <span>&middot;</span>
                <span>{timeAgo(post.createdAt)}</span>
              </div>

              {/* Reactions */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {EMOJIS.map(emoji => {
                  const data = post.reactions?.[emoji]
                  const count = data?.count || 0
                  const active = data?.userReacted
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(post.id, emoji)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                        active
                          ? 'bg-gold/20 border border-gold/40 text-gold'
                          : count > 0
                            ? 'bg-dark-tertiary border border-dark-border text-text-secondary hover:border-gold/30'
                            : 'bg-dark-tertiary/50 border border-transparent text-text-muted hover:bg-dark-tertiary hover:text-text-secondary'
                      }`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="font-mono text-[10px]">{count}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Comment toggle */}
              <button
                onClick={() => toggleComments(post.id)}
                className="mt-2 text-[11px] text-text-muted hover:text-gold transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {post.commentCount || 0} comment{post.commentCount !== 1 ? 's' : ''}
                <svg className={`w-3 h-3 transition-transform ${expandedPost === post.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Comments section */}
              {expandedPost === post.id && (
                <div className="mt-3 pt-3 border-t border-dark-border/30">
                  {commentsLoading[post.id] ? (
                    <div className="flex justify-center py-3">
                      <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {(comments[post.id] || []).length === 0 && (
                        <p className="text-xs text-text-muted text-center py-2">No comments yet</p>
                      )}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(comments[post.id] || []).map(comment => (
                          <div key={comment.id} className="flex gap-2">
                            <div className="w-6 h-6 bg-dark-tertiary rounded-full flex items-center justify-center text-[10px] font-semibold text-text-secondary flex-shrink-0 mt-0.5">
                              {(comment.user?.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-white">{comment.user?.name || 'Member'}</span>
                                <span className="text-[10px] text-text-muted">{timeAgo(comment.createdAt)}</span>
                                {(comment.user?.id === post.authorId || isCommissioner) && (
                                  <button
                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                    className="text-text-muted hover:text-red-400 transition-colors ml-auto"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary leading-relaxed">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Add comment */}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-dark-tertiary border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-gold/50"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInput.trim()}
                          className="px-3 py-1.5 bg-gold/20 text-gold text-xs font-medium rounded-lg hover:bg-gold/30 transition-colors disabled:opacity-40"
                        >
                          Send
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEditor} />
          <div className="relative bg-[#1F1B17] border border-[#3A342D] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5">
              {/* Modal header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-white">
                  {editingPost ? 'Edit Post' : 'New Post'}
                </h3>
                <button onClick={closeEditor} className="text-text-muted hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Title */}
              <input
                type="text"
                value={editorTitle}
                onChange={e => setEditorTitle(e.target.value)}
                placeholder="Post title..."
                className="w-full bg-dark-primary border border-dark-border rounded-lg px-4 py-2.5 text-white text-sm placeholder-text-muted focus:outline-none focus:border-gold/50 mb-3"
              />

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setEditorCategory(cat.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      editorCategory === cat.value
                        ? cat.color + ' ring-1 ring-current'
                        : 'bg-dark-tertiary text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Formatting toolbar */}
              <div className="flex items-center gap-1 mb-2 border-b border-dark-border pb-2">
                <button onClick={() => execFormat('bold')} className="p-1.5 text-text-muted hover:text-white rounded transition-colors" title="Bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  </svg>
                </button>
                <button onClick={() => execFormat('italic')} className="p-1.5 text-text-muted hover:text-white rounded transition-colors" title="Italic">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M10 4h4m-2 0l-4 16m0 0h4" />
                  </svg>
                </button>
                <button onClick={() => execFormat('insertUnorderedList')} className="p-1.5 text-text-muted hover:text-white rounded transition-colors" title="Bullet list">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                </button>
                <div className="ml-auto">
                  {!editingPost && (
                    <button
                      onClick={() => setShowAiPanel(!showAiPanel)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        showAiPanel ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-tertiary text-text-muted hover:text-purple-400'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AI Draft
                    </button>
                  )}
                </div>
              </div>

              {/* AI Panel */}
              {showAiPanel && (
                <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs text-purple-300 font-medium mb-2">Describe what you want to post about</p>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    placeholder="e.g., New trade deadline rule, Week 5 recap, Draft prep reminder..."
                    className="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2 text-white text-xs placeholder-text-muted focus:outline-none focus:border-purple-500/50 mb-2"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {TONES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setAiTone(t.value)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            aiTone === t.value ? 'bg-purple-500/30 text-purple-300' : 'bg-dark-tertiary text-text-muted'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleAiGenerate}
                      disabled={!aiTopic.trim() || aiGenerating}
                      className="px-3 py-1 bg-purple-500/30 text-purple-300 text-xs font-medium rounded-lg hover:bg-purple-500/40 transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                      {aiGenerating ? (
                        <>
                          <div className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : 'Generate'}
                    </button>
                  </div>
                </div>
              )}

              {/* Content editor (contentEditable) */}
              <div
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: editorContent }}
                className="w-full bg-dark-primary border border-dark-border rounded-lg px-4 py-3 text-white text-sm min-h-[150px] max-h-[300px] overflow-y-auto focus:outline-none focus:border-gold/50 [&_p]:mb-2 [&_strong]:font-bold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                data-placeholder="Write your post..."
                onInput={() => {
                  if (contentRef.current) setEditorContent(contentRef.current.innerHTML)
                }}
                style={{ minHeight: '150px' }}
              />

              {/* Pin toggle + actions */}
              <div className="flex items-center justify-between mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editorPinned}
                    onChange={e => setEditorPinned(e.target.checked)}
                    className="w-4 h-4 rounded border-dark-border bg-dark-tertiary text-gold focus:ring-gold"
                  />
                  <span className="text-xs text-text-secondary">Pin to top</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={closeEditor}
                    className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editorTitle.trim() || !editorContent.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-gold to-accent-orange text-dark-primary text-xs font-bold rounded-lg hover:shadow-gold/30 hover:shadow-lg transition-all disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : editingPost ? 'Save Changes' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CommissionerNotes
