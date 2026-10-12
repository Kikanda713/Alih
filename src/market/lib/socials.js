import { FaFacebook, FaTiktok, FaInstagram, FaYoutube, FaGlobe } from 'react-icons/fa'

// Réseaux sociaux d'une boutique (validés côté serveur : apps/market/src/shop-socials).
export const SOCIAL_NETWORKS = [
  { id: 'facebook', label: 'Facebook', icon: FaFacebook, placeholder: 'facebook.com/maboutique ou @maboutique' },
  { id: 'tiktok', label: 'TikTok', icon: FaTiktok, placeholder: '@maboutique' },
  { id: 'instagram', label: 'Instagram', icon: FaInstagram, placeholder: '@maboutique' },
  { id: 'youtube', label: 'YouTube', icon: FaYoutube, placeholder: '@machaine ou lien d’une vidéo' },
  { id: 'website', label: 'Site web', icon: FaGlobe, placeholder: 'maboutique.cd' },
]

/** Pseudo TikTok d'une URL de profil (pour l'intégration « créateur »). */
export function tiktokHandle(url) {
  return /tiktok\.com\/@([\w.-]+)/i.exec(url || '')?.[1] || null
}

/** URL d'intégration YouTube (vidéo ou playlist), sinon null (une chaîne ne s'intègre pas). */
export function youtubeEmbed(url) {
  if (!url) return null
  const id = /youtu\.be\/([\w-]{6,})/i.exec(url)?.[1] || /[?&]v=([\w-]{6,})/i.exec(url)?.[1] || /\/shorts\/([\w-]{6,})/i.exec(url)?.[1]
  if (id) return `https://www.youtube-nocookie.com/embed/${id}`
  const list = /[?&]list=([\w-]+)/i.exec(url)?.[1]
  return list ? `https://www.youtube-nocookie.com/embed/videoseries?list=${list}` : null
}

/** Fil d'une page Facebook (plugin officiel « Page »). */
export function facebookEmbed(url) {
  if (!url) return null
  const q = new URLSearchParams({ href: url, tabs: 'timeline', width: '500', height: '560', small_header: 'true', adapt_container_width: 'true' })
  return `https://www.facebook.com/plugins/page.php?${q}`
}
