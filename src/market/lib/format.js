// Formatage marketplace : prix, unités, images, libellés de taxonomie.

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

export function formatPrice(amount, currency = 'CDF') {
  if (amount == null || !Number.isFinite(Number(amount))) return null
  const n = nf.format(Number(amount))
  return String(currency).toUpperCase() === 'USD' ? `${n} $` : `${n} FC`
}

// Unité affichée après le prix : « / nuit », « / sac »… (rien pour la pièce/l'unité).
const SHORT_UNITS = {
  night: 'nuit', hour: 'heure', day: 'jour', week: 'semaine', month: 'mois',
  service: 'prestation', seance: 'séance', forfait: 'forfait', projet: 'projet',
  km: 'km', m2: 'm²', person: 'personne', couvert: 'couvert', kg: 'kg', g: 'g',
  tonne: 'tonne', litre: 'litre', ml: 'ml', metre: 'mètre', sac: 'sac', carton: 'carton',
  paquet: 'paquet', douzaine: 'douzaine', botte: 'botte', regime: 'régime', paire: 'paire',
  lot: 'lot', boite: 'boîte', plaquette: 'plaquette', flacon: 'flacon', bouteille: 'bouteille',
  bidon: 'bidon', cageot: 'cageot', bassin: 'bassin', sachet: 'sachet', tube: 'tube', pot: 'pot',
}
export function unitSuffix(billingUnit) {
  if (!billingUnit || billingUnit === 'piece' || billingUnit === 'item') return ''
  return SHORT_UNITS[billingUnit] ? `/ ${SHORT_UNITS[billingUnit]}` : `/ ${billingUnit}`
}
export function unitName(billingUnit, plural = false) {
  const base = SHORT_UNITS[billingUnit] || 'unité'
  if (!plural || /[sxz]$/.test(base) || base === 'm²' || base.length <= 2) return base
  return `${base}s`
}

// Miniatures Cloudinary (format/qualité auto, largeur bornée) : pages légères en 3G.
export function imageUrl(url, width = 480) {
  if (!url) return null
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/f_auto')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`)
  }
  return url
}

export function conditionLabel(taxonomy, id) {
  if (!id) return null
  return (taxonomy?.conditions || []).find((c) => c.id === id)?.label || null
}
export function categoryLabel(taxonomy, id) {
  if (!id) return null
  return (taxonomy?.categories || []).find((c) => c.id === String(id).toLowerCase())?.label || id
}
export function subcategoryLabel(taxonomy, catId, subId) {
  if (!subId) return null
  const cat = (taxonomy?.categories || []).find((c) => c.id === String(catId || '').toLowerCase())
  return cat?.subcategories?.find((s) => s.id === subId)?.label || null
}
export function cityLabel(taxonomy, value) {
  if (!value) return null
  const key = String(value).toLowerCase().replace(/\s+/g, '-')
  const found = (taxonomy?.cities || []).find((c) => c.id === key)?.name
  if (found) return found
  // Repli lisible (taxonomie pas encore chargée ou ville hors liste) : « goma » → « Goma ».
  return String(value).replace(/(^|[\s-])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase())
}
export function shopTypeLabel(taxonomy, id) {
  if (!id) return null
  return (taxonomy?.shopTypes || []).find((s) => s.id === id)?.label || null
}
