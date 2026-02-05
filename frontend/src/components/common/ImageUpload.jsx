import { useState, useRef } from 'react'
import Button from './Button'

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

  const resizeImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size

          const ctx = canvas.getContext('2d')

          // Calculate crop to make square (center crop)
          const minDim = Math.min(img.width, img.height)
          const sx = (img.width - minDim) / 2
          const sy = (img.height - minDim) / 2

          // Draw resized and cropped image
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)

          // Convert to blob
          canvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/jpeg', 0.85)
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const uploadToCloudinary = async (blob) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      // Fallback: convert to base64 data URL if Cloudinary not configured
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    }

    const formData = new FormData()
    formData.append('file', blob)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'clutch-avatars')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    )

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const data = await response.json()
    return data.secure_url
  }

  const handleFile = async (file) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB before resize)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Resize image
      const resizedBlob = await resizeImage(file)

      // Create preview
      const previewUrl = URL.createObjectURL(resizedBlob)
      setPreview(previewUrl)

      // Upload
      const imageUrl = await uploadToCloudinary(resizedBlob)

      onUpload(imageUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload image. Please try again.')
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
            ? 'border-accent-green bg-accent-green/10'
            : 'border-dark-border hover:border-accent-green/50 bg-dark-tertiary'
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
              <span className="text-white text-sm font-medium">Change Image</span>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-dark-primary/80 flex items-center justify-center rounded-lg">
                <div className="w-8 h-8 border-3 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            {uploading ? (
              <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-3" />
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
