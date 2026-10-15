/*
 * BATA : échange d'un bien CERTIFIÉ contre un autre (valeur supérieure ou
 * inférieure), la différence étant réglée en cash via le séquestre Tindisa ou
 * directement entre les parties. Helpers partagés (marché public, espace
 * commerçant, back-office). Tout est défensif : le backend peut évoluer, on
 * n'affiche jamais un objet tel quel.
 */

// Familles éligibles (catégorie/sous-catégorie de la taxonomie).
export const BATA_FAMILIES = [
  { id: 'vehicule', label: 'Véhicules', one: 'véhicule', subs: { automobile: ['vehicules', 'motos'] } },
  { id: 'appareil', label: 'Téléphones et ordinateurs', one: 'téléphone ou ordinateur', subs: { 'electronique-info': ['smartphones', 'ordinateurs'] } },
]

const FAMILY_WORDS = {
  vehicule: 'véhicule', vehicules: 'voiture', motos: 'moto', automobile: 'véhicule',
  appareil: 'téléphone ou ordinateur', smartphones: 'téléphone', ordinateurs: 'ordinateur',
}

/** Famille BATA d'un article (null si non éligible). */
export function bataFamilyOf(category, subcategory) {
  const c = String(category || '').toLowerCase()
  const s = String(subcategory || '').toLowerCase()
  for (const f of BATA_FAMILIES) {
    if (f.subs[c]?.includes(s)) return f.id
  }
  return null
}

/** Texte sûr : chaîne ou nombre uniquement, sinon ''. */
export function txt(v) {
  return typeof v === 'string' || typeof v === 'number' ? String(v) : ''
}
const list = (v) => (Array.isArray(v) ? v.map(txt).filter(Boolean) : txt(v) ? [txt(v)] : [])

export function usd(v) {
  const n = Number(v)
  if (v == null || v === '' || !Number.isFinite(n)) return null
  return `${Math.round(n).toLocaleString('fr-FR')} $`
}

/**
 * Séquestre Tindisa ouvert ? Coupé tant que les paiements réels ne sont pas branchés
 * (même interrupteur que le serveur : BATA_ESCROW_ENABLED / VITE_BATA_ESCROW).
 */
export const ESCROW_OPEN = import.meta.env.VITE_BATA_ESCROW === '1'

export const CASH_MODE_LABEL = {
  escrow: ESCROW_OPEN ? 'Différence en séquestre Tindisa' : 'Séquestre Tindisa (bientôt disponible)',
  direct: 'Différence réglée entre vous',
  both: ESCROW_OPEN ? 'Au choix' : 'Différence réglée entre vous (séquestre bientôt)',
}
export const cashModeLabel = (m) => CASH_MODE_LABEL[m] || CASH_MODE_LABEL.both

/** Résumé lisible de ce que cherche le propriétaire (« une moto Honda, 800 à 1 500 $ »). */
export function wantsSummary(wants) {
  if (!wants || typeof wants !== 'object') return ''
  const fam = list(wants.families).map((f) => FAMILY_WORDS[f] || f)
  const what = [...list(wants.brands), ...list(wants.models)]
  const parts = []
  const head = [fam.join(' ou '), what.join(', ')].filter(Boolean).join(' ')
  if (head) parts.push(head)
  const min = usd(wants.minValueUsd)
  const max = usd(wants.maxValueUsd)
  if (min && max) parts.push(`entre ${min} et ${max}`)
  else if (min) parts.push(`à partir de ${min}`)
  else if (max) parts.push(`jusqu’à ${max}`)
  const notes = txt(wants.notes).trim()
  if (notes) parts.push(notes)
  return parts.join(', ')
}

/** Qui paie la différence, du point de vue du commerçant connecté. */
export function payerText(payer, difference) {
  const d = usd(Math.abs(Number(difference) || 0))
  if (payer === 'you') return `Vous payez la différence${d ? ` de ${d}` : ''}`
  if (payer === 'them') return `L’autre partie vous paie${d ? ` ${d}` : ' la différence'}`
  return 'Valeurs équivalentes, pas de différence à payer'
}

/** Ce que l'échange coûte ou rapporte (différence > 0 : vous ajoutez). */
export function cashDiffText(d) {
  const n = Number(d)
  if (d == null || d === '' || !Number.isFinite(n)) return ''
  if (n > 0) return `vous ajoutez ${usd(n)}`
  if (n < 0) return `vous recevez ${usd(-n)}`
  return 'même valeur'
}
