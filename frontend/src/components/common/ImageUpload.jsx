import { useState, useRef } from 'react'
import Button from './Button'
import { uploadImage } from '../../utils/uploadImage'

const ImageUpload = ({
  currentImage,
  onUpload,
  size = 200,
  className = ''
}) => {
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return

    setError(null)
    setUploading(true)

    try {
      const imageUrl = await uploadImage(file, {
        maxWidth: size,
        maxHeight: size,
        squareCrop: true,
        folder: 'clutch-avatars',
      })

      setPreview(imageUrl)
      onUpload(imageUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload image. Please try again.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const displayImage = preview || currentImage

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Drop zone / Preview */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all
          ${dragOver
            ? 'border-gold bg-gold/10'
            : 'border-[var(--card-border)] hover:border-gold/50 bg-[var(--bg-alt)]'
          }
          ${displayImage ? 'p-2' : 'p-8'}
        `}
      >
        {displayImage ? (
          <div className="relative">
            <img
              src={displayImage}
              alt="Avatar preview"
              className="w-full aspect-square object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <span className="text-text-primary text-sm font-medium">Change Image</span>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-[var(--bg)]/80 flex items-center justify-center rounded-lg">
                <div className="w-8 h-8 border-3 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            {uploading ? (
              <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-3" />
            ) : (
              <svg className="w-12 h-12 text-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            <p className="text-text-secondary text-sm mb-1">
              {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-text-muted text-xs">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}

      {/* Remove button */}
      {displayImage && !uploading && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={(e) => {
            e.stopPropagation()
            setPreview(null)
            onUpload(null)
          }}
        >
          Remove Image
        </Button>
      )}
    </div>
  )
}

export default ImageUpload
