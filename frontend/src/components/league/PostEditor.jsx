import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { uploadImage } from '../../utils/uploadImage'
import api from '../../services/api'

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'rule_change', label: 'Rule Change', color: 'bg-red-500/20 text-red-400' },
  { value: 'trade_analysis', label: 'Trade Analysis', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'draft_recap', label: 'Draft Recap', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'reminder', label: 'Reminder', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'weekly_update', label: 'Weekly Update', color: 'bg-gold/20 text-gold' },
]

const TONES = [
  { value: 'hype', label: 'Hype' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'trash_talk', label: 'Trash Talk' },
  { value: 'professional', label: 'Professional' },
]

// Toolbar button component
const ToolBtn = ({ onClick, active, disabled, title, children, className = '' }) => (
  <button
    onMouseDown={e => { e.preventDefault(); onClick?.() }}
    className={`p-1.5 rounded transition-colors ${
      active ? 'bg-gold/20 text-gold' : 'text-text-muted hover:text-text-primary'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${className}`}
    title={title}
    disabled={disabled}
  >
    {children}
  </button>
)

const Separator = () => <div className="w-px h-5 bg-dark-border mx-0.5" />

const PostEditor = ({ isOpen, onClose, onSave, editingPost, leagueId, leagueName }) => {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [isPinned, setIsPinned] = useState(false)
  const [coverImage, setCoverImage] = useState(null)
  const [images, setImages] = useState([])
  const [saving, setSaving] = useState(false)

  // Image popover
  const [showImagePopover, setShowImagePopover] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const imageFileRef = useRef(null)
  const coverFileRef = useRef(null)

  // Link popover
  const [showLinkPopover, setShowLinkPopover] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  // AI state
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState('professional')
  const [aiGenerating, setAiGenerating] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg my-3 max-w-full' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Write your post...',
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-gold underline hover:text-gold/80' },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-sm text-text-primary leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text-primary [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_strong]:text-text-primary [&_em]:text-gold/80 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_li]:text-text-secondary [&_blockquote]:border-l-2 [&_blockquote]:border-gold/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-muted [&_blockquote]:my-3 [&_hr]:border-dark-border/50 [&_hr]:my-4 [&_img]:rounded-lg [&_img]:my-3 [&_img]:max-w-full [&_a]:text-gold [&_a]:underline',
      },
    },
    content: '',
  })

  // Initialize editor with editing post data
  useEffect(() => {
    if (!editor) return
    if (editingPost) {
      setTitle(editingPost.title || '')
      setCategory(editingPost.category || 'general')
      setIsPinned(editingPost.isPinned || false)
      setCoverImage(editingPost.coverImage || null)
      setImages(editingPost.images || [])
      editor.commands.setContent(editingPost.content || '')
    } else {
      setTitle('')
      setCategory('general')
      setIsPinned(false)
      setCoverImage(null)
      setImages([])
      editor.commands.setContent('')
    }
  }, [editor, editingPost])

  // Handle image file upload (inline)
  const handleImageUpload = useCallback(async (file) => {
    if (!file || !editor) return
    setImageUploading(true)
    try {
      const url = await uploadImage(file, { folder: 'clutch-posts', maxWidth: 1200 })
      editor.chain().focus().setImage({ src: url }).run()
      setImages(prev => [...prev, url])
      setShowImagePopover(false)
    } catch (err) {
      console.error('Image upload failed:', err)
    } finally {
      setImageUploading(false)
    }
  }, [editor])

  // Insert image from URL
  const handleImageUrl = useCallback(() => {
    if (!imageUrl.trim() || !editor) return
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run()
    setImages(prev => [...prev, imageUrl.trim()])
    setImageUrl('')
    setShowImagePopover(false)
  }, [editor, imageUrl])

  // Handle cover image upload
  const handleCoverUpload = useCallback(async (file) => {
    if (!file) return
    setImageUploading(true)
    try {
      const url = await uploadImage(file, { folder: 'clutch-posts', maxWidth: 1200, maxHeight: 600 })
      setCoverImage(url)
    } catch (err) {
      console.error('Cover upload failed:', err)
    } finally {
      setImageUploading(false)
    }
  }, [])

  // Handle link
  const handleAddLink = useCallback(() => {
    if (!linkUrl.trim() || !editor) return
    const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run()
    setLinkUrl('')
    setShowLinkPopover(false)
  }, [editor, linkUrl])

  // AI generation
  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return
    setAiGenerating(true)
    try {
      const data = await api.generatePostDraft(leagueId, {
        category,
        topic: aiTopic.trim(),
        tone: aiTone,
      })
      if (data.draft) {
        if (data.draft.title) setTitle(data.draft.title)
        if (data.draft.content && editor) {
          editor.commands.setContent(data.draft.content)
        }
      }
      if (data.aiDisabled) {
        alert('AI is currently disabled. Write your post manually.')
      }
      setShowAiPanel(false)
    } catch (e) { alert(e.message) }
    setAiGenerating(false)
  }

  // Save handler
  const handleSave = async () => {
    if (!title.trim() || !editor) return
    const html = editor.getHTML()
    if (!html || html === '<p></p>') return

    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        content: html,
        category,
        isPinned,
        coverImage,
        images,
        aiGenerated: !!showAiPanel,
      })
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1F1B17] border border-[#3A342D] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-5">
          {/* Modal header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold text-text-primary">
              {editingPost ? 'Edit Post' : 'New Post'}
            </h3>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cover image */}
          <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleCoverUpload(e.target.files?.[0])} />
          {coverImage ? (
            <div className="relative mb-4 rounded-lg overflow-hidden">
              <img src={coverImage} alt="Cover" className="w-full h-40 object-cover" />
              <button
                onClick={() => setCoverImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-text-primary hover:bg-black/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => coverFileRef.current?.click()}
              className="w-full mb-4 py-3 border border-dashed border-dark-border rounded-lg text-text-muted text-xs hover:border-gold/40 hover:text-gold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add Cover Image
            </button>
          )}

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title..."
            className="w-full bg-dark-primary border border-dark-border rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-gold/50 mb-3"
          />

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  category === cat.value
                    ? cat.color + ' ring-1 ring-current'
                    : 'bg-dark-tertiary text-text-muted hover:text-text-secondary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Formatting toolbar */}
          {editor && (
            <div className="border border-dark-border rounded-t-lg bg-dark-primary/50 px-2 py-1.5">
              {/* Row 1 */}
              <div className="flex items-center gap-0.5 flex-wrap">
                <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M10 4h4m-2 0l-4 16m0 0h4" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M16 4H9a3 3 0 00-3 3v0a3 3 0 003 3h6a3 3 0 013 3v0a3 3 0 01-3 3H6M4 12h16" /></svg>
                </ToolBtn>

                <Separator />

                <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
                  <span className="text-xs font-bold w-4 text-center">H2</span>
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
                  <span className="text-xs font-bold w-4 text-center">H3</span>
                </ToolBtn>

                <Separator />

                <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" d="M10 6h11M10 12h11M10 18h11M3 5l2 1V11M3 11h4M5 15H3v2a2 2 0 002 2h2" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" /></svg>
                </ToolBtn>

                <Separator />

                <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" d="M3 6h18M3 12h12M3 18h16" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" d="M3 6h18M6 12h12M4 18h16" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" d="M3 6h18M9 12h12M5 18h16" /></svg>
                </ToolBtn>

                <Separator />

                <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" d="M3 12h18" /></svg>
                </ToolBtn>

                {/* Link button */}
                <div className="relative">
                  <ToolBtn
                    onClick={() => { setShowLinkPopover(!showLinkPopover); setShowImagePopover(false) }}
                    active={editor.isActive('link') || showLinkPopover}
                    title="Add link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  </ToolBtn>
                  {showLinkPopover && (
                    <div className="absolute top-full left-0 mt-1 bg-dark-primary border border-dark-border rounded-lg p-3 z-10 w-64 shadow-xl">
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={e => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-dark-tertiary border border-dark-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50 mb-2"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                      />
                      <div className="flex gap-1.5">
                        <button onClick={handleAddLink} className="flex-1 px-2 py-1 bg-gold/20 text-gold text-xs rounded hover:bg-gold/30">Add</button>
                        {editor.isActive('link') && (
                          <button onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkPopover(false) }} className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30">Remove</button>
                        )}
                        <button onClick={() => setShowLinkPopover(false)} className="px-2 py-1 text-text-muted text-xs hover:text-text-primary">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image button */}
                <div className="relative">
                  <ToolBtn
                    onClick={() => { setShowImagePopover(!showImagePopover); setShowLinkPopover(false) }}
                    active={showImagePopover}
                    title="Insert image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </ToolBtn>
                  {showImagePopover && (
                    <div className="absolute top-full right-0 mt-1 bg-dark-primary border border-dark-border rounded-lg p-3 z-10 w-64 shadow-xl">
                      <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files?.[0])} />
                      <button
                        onClick={() => imageFileRef.current?.click()}
                        disabled={imageUploading}
                        className="w-full mb-2 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-gold/30 transition-colors flex items-center justify-center gap-2"
                      >
                        {imageUploading ? (
                          <><div className="w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /> Uploading...</>
                        ) : (
                          <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Upload Image</>
                        )}
                      </button>
                      <div className="relative">
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={e => setImageUrl(e.target.value)}
                          placeholder="Or paste image URL..."
                          className="w-full bg-dark-tertiary border border-dark-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
                          onKeyDown={e => e.key === 'Enter' && handleImageUrl()}
                        />
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={handleImageUrl} disabled={!imageUrl.trim()} className="flex-1 px-2 py-1 bg-gold/20 text-gold text-xs rounded hover:bg-gold/30 disabled:opacity-40">Insert</button>
                        <button onClick={() => setShowImagePopover(false)} className="px-2 py-1 text-text-muted text-xs hover:text-text-primary">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m16-7l-4-4m4 4l-4 4" /></svg>
                </ToolBtn>

                {/* AI Draft button */}
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
            </div>
          )}

          {/* AI Panel */}
          {showAiPanel && (
            <div className="p-3 bg-purple-500/10 border-x border-dark-border">
              <p className="text-xs text-purple-300 font-medium mb-2">Describe what you want to post about</p>
              <input
                type="text"
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="e.g., New trade deadline rule, Week 5 recap, Draft prep reminder..."
                className="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2 text-text-primary text-xs placeholder-text-muted focus:outline-none focus:border-purple-500/50 mb-2"
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
                    <><div className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" /> Generating...</>
                  ) : 'Generate'}
                </button>
              </div>
            </div>
          )}

          {/* TipTap editor content area */}
          <div className="bg-dark-primary border border-dark-border border-t-0 rounded-b-lg min-h-[200px] max-h-[350px] overflow-y-auto">
            <EditorContent editor={editor} />
          </div>

          {/* Pin toggle + actions */}
          <div className="flex items-center justify-between mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded border-dark-border bg-dark-tertiary text-gold focus:ring-gold"
              />
              <span className="text-xs text-text-secondary">Pin to top</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="px-4 py-2 bg-gradient-to-r from-gold to-accent-orange text-slate text-xs font-bold rounded-lg hover:shadow-gold/30 hover:shadow-lg transition-all disabled:opacity-40"
              >
                {saving ? 'Saving...' : editingPost ? 'Save Changes' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostEditor
