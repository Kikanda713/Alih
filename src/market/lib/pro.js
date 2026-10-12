// Profil pro (technicien / artisan indépendant) : valeurs vides, contrôles côté
// client (le serveur revalide) et libellés des éléments manquants.

export const EMPTY_PRO = { trades: [], zones: [], experienceYears: null, photos: [], videos: [], available: true }

export function normalizePro(p) {
  return {
    trades: Array.isArray(p?.trades) ? p.trades.map((t) => (typeof t === 'string' ? t : t?.id)).filter(Boolean) : [],
    zones: Array.isArray(p?.zones) ? p.zones.filter(Boolean) : [],
    experienceYears: Number.isFinite(Number(p?.experienceYears)) && p?.experienceYears !== null && p?.experienceYears !== '' ? Number(p.experienceYears) : null,
    photos: Array.isArray(p?.photos) ? p.photos.filter(Boolean) : [],
    videos: Array.isArray(p?.videos) ? p.videos.filter((v) => v?.url) : [],
    available: p?.available !== false,
  }
}

/** Erreur lisible ou '' ; `parts` limite le contrôle à certains blocs. */
export function validatePro(pro, limits, parts = ['trades', 'zones', 'experience', 'photos', 'videos']) {
  if (parts.includes('trades')) {
    if (!pro.trades.length) return 'Choisissez au moins un métier.'
    if (pro.trades.length > limits.maxTrades) return `${limits.maxTrades} métiers au maximum.`
  }
  if (parts.includes('zones')) {
    if (!pro.zones.length) return 'Indiquez au moins une commune ou un quartier où vous intervenez.'
    if (pro.zones.length > limits.maxZones) return `${limits.maxZones} zones au maximum.`
  }
  if (parts.includes('experience') && pro.experienceYears != null) {
    if (!Number.isInteger(pro.experienceYears) || pro.experienceYears < 0 || pro.experienceYears > 70) return 'Années d’expérience : un nombre entre 0 et 70.'
  }
  if (parts.includes('photos')) {
    if (pro.photos.length < limits.minPhotos) return `Ajoutez au moins ${limits.minPhotos} photos de vos réalisations.`
    if (pro.photos.length > limits.maxPhotos) return `${limits.maxPhotos} photos au maximum.`
  }
  if (parts.includes('videos') && pro.videos.length > limits.maxVideos) return `${limits.maxVideos} vidéos au maximum.`
  return ''
}

const MISSING_LABELS = {
  trades: 'vos métiers',
  zones: 'vos zones d’intervention',
  photos: 'les photos de vos réalisations',
  experienceYears: 'vos années d’expérience',
  experience: 'vos années d’expérience',
  name: 'le nom',
  city: 'la ville',
  phone: 'le contact',
  description: 'la présentation',
}

/** Libellés français des éléments manquants renvoyés par l'API (`missing`). */
export function missingLabels(missing = []) {
  return [...new Set(missing.map((m) => MISSING_LABELS[m]).filter(Boolean))]
}
