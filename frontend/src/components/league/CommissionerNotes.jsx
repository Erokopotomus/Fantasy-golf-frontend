import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import api from '../../services/api'
import Card from '../common/Card'
import PostEditor from './PostEditor'

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'rule_change', label: 'Rule Change', color: 'bg-red-500/20 text-red-400' },
  { value: 'trade_analysis', label: 'Trade Analysis', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'draft_recap', label: 'Draft Recap', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'reminder', label: 'Reminder', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'weekly_update', label: 'Weekly Update', color: 'bg-gold/20 text-gold' },
]

const EMOJIS = ['❤️', '🔥', '👍', '😂', '💀', '🏆']

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

// Configure DOMPurify to allow TipTap's HTML output
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'hr', 'img', 'a', 'br', 'div', 'span'],
  ALLOWED_ATTR: ['src', 'alt', 'href', 'target', 'rel', 'style', 'class'],
}

const sanitize = (html) => DOMPurify.sanitize(html || '', SANITIZE_CONFIG)

const CONTENT_CLASSES = 'text-text-secondary text-sm leading-relaxed [&_p]:mb-2 [&_strong]:text-text-primary [&_em]:text-gold/80 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_li]:text-text-secondary [&_h2]:text-lg [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-text-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-display [&_h3]:font-semibold [&_h3]:text-text-primary [&_h3]:mt-3 [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-gold/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-muted [&_blockquote]:my-3 [&_hr]:border-[var(--card-border)] [&_hr]:my-4 [&_img]:rounded-lg [&_img]:my-3 [&_img]:max-w-full [&_a]:text-gold [&_a]:underline [&_a]:hover:text-gold/80'

const CommissionerNotes = ({ leagueId, isCommissioner, leagueName }) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [expandedPost, setExpandedPost] = useState(null)
  const [comments, setComments] = useState({})
  const [commentInput, setCommentInput] = useState('')
  const [commentsLoading, setCommentsLoading] = useState({})

  // View tracking — Set of post IDs already recorded this session
  const viewedRef = useRef(new Set())

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
    setEditingPost(post || null)
    setShowEditor(true)
  }

  const closeEditor = () => {
    setShowEditor(false)
    setEditingPost(null)
  }

  const handleSave = async (postData) => {
    if (editingPost) {
      const data = await api.updateLeaguePost(leagueId, editingPost.id, postData)
      setPosts(prev => prev.map(p => p.id === editingPost.id ? data.post : p))
    } else {
      const data = await api.createLeaguePost(leagueId, postData)
      setPosts(prev => [data.post, ...prev])
    }
    closeEditor()
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

  // Record view when user expands a post
  const recordView = useCallback(async (postId) => {
    if (viewedRef.current.has(postId)) return
    viewedRef.current.add(postId)
    try {
      const data = await api.recordPostView(leagueId, postId)
      if (data.viewCount !== undefined) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, viewCount: data.viewCount } : p))
      }
    } catch (e) { /* silent — view tracking is non-critical */ }
  }, [leagueId])

  // Expand post and record view
  const [expandedContent, setExpandedContent] = useState(null)
  const toggleContent = (postId) => {
    if (expandedContent === postId) {
      setExpandedContent(null)
    } else {
      setExpandedContent(postId)
      recordView(postId)
    }
  }

  const getCategoryStyle = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat)
    return found ? found.color : 'bg-[var(--bg-alt)] text-text-muted'
  }

  const getCategoryLabel = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat)
    return found ? found.label : cat
  }

  // Check if content is long enough to need "Read more"
  const isLongContent = (content) => {
    const text = (content || '').replace(/<[^>]*>/g, '')
    return text.length > 200 || (content || '').includes('<img') || (content || '').includes('<h2') || (content || '').includes('<h3')
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="text-base font-display font-bold text-text-primary">Commissioner Blog</h3>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-base font-display font-bold text-text-primary">Commissioner Blog</h3>
          </div>
          {isCommissioner && (
            <button
              onClick={() => openEditor()}
              className="text-xs font-medium text-gold hover:text-gold/80 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Post
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
              {isCommissioner ? 'Share weekly takeaways and league updates' : 'No posts yet. Check back soon!'}
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
            <div key={post.id} className="bg-[var(--surface)] rounded-lg border border-[var(--card-border)] overflow-hidden">
              {/* Cover image */}
              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt=""
                  className="w-full h-36 object-cover"
                />
              )}

              <div className="p-4">
                {/* Post header badges */}
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

                {/* Title — larger blog style */}
                <h4 className="text-text-primary font-display font-bold text-lg mb-1.5 leading-tight">{post.title}</h4>

                {/* Content preview or full content */}
                {expandedContent === post.id ? (
                  <div>
                    <div
                      className={CONTENT_CLASSES}
                      dangerouslySetInnerHTML={{ __html: sanitize(post.content) }}
                    />
                    <button
                      onClick={() => setExpandedContent(null)}
                      className="text-xs text-gold hover:text-gold/80 mt-2 font-medium"
                    >
                      Show less
                    </button>
                  </div>
                ) : isLongContent(post.content) ? (
                  <div>
                    <div
                      className={`${CONTENT_CLASSES} line-clamp-3`}
                      dangerouslySetInnerHTML={{ __html: sanitize(post.content) }}
                    />
                    <button
                      onClick={() => toggleContent(post.id)}
                      className="text-xs text-gold hover:text-gold/80 mt-1 font-medium"
                    >
                      Read more →
                    </button>
                  </div>
                ) : (
                  <div
                    className={CONTENT_CLASSES}
                    dangerouslySetInnerHTML={{ __html: sanitize(post.content) }}
                  />
                )}

                {/* Meta row — author + view count */}
                <div className="flex items-center gap-2 mt-3 text-[11px] text-text-muted">
                  {/* Author avatar */}
                  {post.author?.avatar ? (
                    <img src={post.author.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-[9px] font-semibold text-text-secondary">
                      {(post.author?.name || 'C').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{post.author?.name || 'Commissioner'}</span>
                  <span>&middot;</span>
                  <span>{timeAgo(post.createdAt)}</span>
                  {(post.viewCount || 0) > 0 && (
                    <>
                      <span>&middot;</span>
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {post.viewCount}
                      </span>
                    </>
                  )}
                </div>

                {/* Reactions */}
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {EMOJIS.map(emoji => {
                    const data = post.reactions?.[emoji]
                    const count = data?.count || 0
                    const active = data?.userReacted
                    const isHeart = emoji === '❤️'
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(post.id, emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                          active
                            ? isHeart
                              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                              : 'bg-gold/20 border border-gold/40 text-gold'
                            : count > 0
                              ? 'bg-[var(--bg-alt)] border border-[var(--card-border)] text-text-secondary hover:border-gold/30'
                              : 'bg-[var(--surface)] border border-transparent text-text-muted hover:bg-[var(--stone)] hover:text-text-secondary'
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
                  <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
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
                              {comment.user?.avatar ? (
                                <img src={comment.user.avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                              ) : (
                                <div className="w-6 h-6 bg-[var(--bg-alt)] rounded-full flex items-center justify-center text-[10px] font-semibold text-text-secondary flex-shrink-0 mt-0.5">
                                  {(comment.user?.name || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-text-primary">{comment.user?.name || 'Member'}</span>
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
                            className="flex-1 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
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
            </div>
          ))}
        </div>
      </Card>

      {/* Post Editor Modal */}
      <PostEditor
        isOpen={showEditor}
        onClose={closeEditor}
        onSave={handleSave}
        editingPost={editingPost}
        leagueId={leagueId}
        leagueName={leagueName}
      />
    </>
  )
}

export default CommissionerNotes
