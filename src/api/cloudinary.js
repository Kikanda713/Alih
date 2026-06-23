import { cloudinary, isCloudinaryConfigured } from '../auth/config'

/**
 * Téléverse une image directement vers Cloudinary (preset non signé, comme
 * Wanzo) et renvoie l'URL sécurisée. Aucun passage par notre backend.
 */
export async function uploadImage(file) {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary non configuré (VITE_CLOUDINARY_*).')
  }
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', cloudinary.uploadPreset)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
    { method: 'POST', body: form },
  )
  if (!res.ok) {
    throw new Error("Échec du téléversement de l'image.")
  }
  const data = await res.json()
  return data.secure_url
}

export { isCloudinaryConfigured }
