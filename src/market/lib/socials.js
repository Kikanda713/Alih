import { FaFacebook, FaTiktok, FaInstagram, FaYoutube, FaGlobe } from 'react-icons/fa'

// Réseaux sociaux d'un établissement (validés côté serveur : apps/market/src/shop-socials).
export const SOCIAL_NETWORKS = [
  { id: 'facebook', label: 'Facebook', icon: FaFacebook, placeholder: 'facebook.com/monentreprise ou @monentreprise' },
  { id: 'tiktok', label: 'TikTok', icon: FaTiktok, placeholder: '@monentreprise' },
  { id: 'instagram', label: 'Instagram', icon: FaInstagram, placeholder: '@monentreprise' },
  { id: 'youtube', label: 'YouTube', icon: FaYoutube, placeholder: '@machaine ou lien d’une vidéo' },
  { id: 'website', label: 'Site web', icon: FaGlobe, placeholder: 'monentreprise.cd' },
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

/** Lecteur intégré d'une vidéo TikTok (lien complet …/video/<id>), sinon null (lien court). */
export function tiktokVideoEmbed(url) {
  const id = /tiktok\.com\/.*\/video\/(\d{6,})/i.exec(url || '')?.[1]
  return id ? `https://www.tiktok.com/embed/v2/${id}` : null
}

/**
 * Vidéo de démonstration (profil pro) : accepte un lien de VIDÉO TikTok ou YouTube.
 * Renvoie { network, url } normalisé, ou null si le lien n'est pas reconnu.
 */
export function parseDemoVideo(raw) {
  let url = String(raw || '').trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  let host
  try { host = new URL(url).hostname.toLowerCase() } catch { return null }
  if (/(^|\.)tiktok\.com$/.test(host)) {
    // Profil seul (@pseudo) refusé : on veut une vidéo précise.
    if (tiktokVideoEmbed(url) || /^(vm|vt)\.tiktok\.com$/.test(host) || /\/t\/\w+/.test(url)) return { network: 'tiktok', url }
    return null
  }
  if (/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(host)) {
    return /youtu\.be\/|[?&]v=|\/shorts\//i.test(url) ? { network: 'youtube', url } : null
  }
  return null
}

/** URL du lecteur intégré d'une vidéo de démonstration (null : simple lien). */
export function demoVideoEmbed(video) {
  if (!video?.url) return null
  return video.network === 'tiktok' ? tiktokVideoEmbed(video.url) : youtubeEmbed(video.url)
}

/** Fil d'une page Facebook (plugin officiel « Page »). */
export function facebookEmbed(url) {
  if (!url) return null
  const q = new URLSearchParams({ href: url, tabs: 'timeline', width: '500', height: '560', small_header: 'true', adapt_container_width: 'true' })
  return `https://www.facebook.com/plugins/page.php?${q}`
}
