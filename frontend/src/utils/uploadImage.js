/**
 * Shared Cloudinary image upload utility.
 * Used by ImageUpload (avatars — square crop) and PostEditor (post images — aspect-ratio preserved).
 */

/**
 * Resize an image file, preserving aspect ratio or center-cropping to square.
 * @param {File} file - Image file to resize
 * @param {Object} options
 * @param {number} [options.maxWidth=1200] - Maximum width in pixels
 * @param {number} [options.maxHeight=1200] - Maximum height in pixels
 * @param {boolean} [options.squareCrop=false] - If true, center-crop to square
 * @param {number} [options.quality=0.85] - JPEG quality (0-1)
 * @returns {Promise<Blob>} Resized image blob
 */
export function resizeImage(file, options = {}) {
  const { maxWidth = 1200, maxHeight = 1200, squareCrop = false, quality = 0.85 } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (squareCrop) {
          // Center crop to square
          const size = Math.min(maxWidth, maxHeight)
          canvas.width = size
          canvas.height = size
          const minDim = Math.min(img.width, img.height)
          const sx = (img.width - minDim) / 2
          const sy = (img.height - minDim) / 2
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
        } else {
          // Preserve aspect ratio, fit within maxWidth × maxHeight
          let w = img.width
          let h = img.height
          if (w > maxWidth) {
            h = Math.round(h * (maxWidth / w))
            w = maxWidth
          }
          if (h > maxHeight) {
            w = Math.round(w * (maxHeight / h))
            h = maxHeight
          }
          canvas.width = w
          canvas.height = h
          ctx.drawImage(img, 0, 0, w, h)
        }

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Upload a blob to Cloudinary (or fallback to base64 data URL).
 * @param {Blob} blob - Image blob to upload
 * @param {Object} options
 * @param {string} [options.folder='clutch-posts'] - Cloudinary folder
 * @returns {Promise<string>} Uploaded image URL
 */
export async function uploadToCloudinary(blob, options = {}) {
  const { folder = 'clutch-posts' } = options
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
  formData.append('folder', folder)

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

/**
 * Validate + resize + upload an image file.
 * @param {File} file - Image file
 * @param {Object} options
 * @param {string} [options.folder] - Cloudinary folder
 * @param {number} [options.maxWidth] - Max width
 * @param {number} [options.maxHeight] - Max height
 * @param {boolean} [options.squareCrop] - Square crop mode
 * @param {number} [options.quality] - JPEG quality
 * @returns {Promise<string>} Uploaded image URL
 */
export async function uploadImage(file, options = {}) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Please select an image file')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image must be less than 10MB')
  }

  const blob = await resizeImage(file, options)
  return uploadToCloudinary(blob, { folder: options.folder })
}
