import { useEffect, useState } from 'react'
import { apiBaseUrl } from '../auth/config'

// Taxonomie marketplace (catégories/sous-catégories/attributs, conditions, villes
// RDC, types d'activité…) servie par le backend : GET /v1/catalog/taxonomy.
// SOURCE UNIQUE partagée avec l'agent — on ne duplique pas les constantes côté front.
// Mise en cache mémoire (chargée une fois par session).

let cache = null
let inflight = null

export async function loadTaxonomy() {
  if (cache) return cache
  if (!inflight) {
    inflight = fetch(`${apiBaseUrl}/v1/catalog/taxonomy`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('taxonomy'))))
      .then((data) => {
        cache = data
        return data
      })
      .catch(() => {
        // Repli minimal si l'API n'est pas joignable : le formulaire reste utilisable.
        cache = EMPTY_TAXONOMY
        return cache
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function useTaxonomy() {
  const [taxonomy, setTaxonomy] = useState(cache)
  useEffect(() => {
    let alive = true
    if (!cache) loadTaxonomy().then((t) => alive && setTaxonomy(t))
    return () => {
      alive = false
    }
  }, [])
  return taxonomy
}

// Helpers
export function categoriesByType(taxonomy, type) {
  return (taxonomy?.categories || []).filter((c) => c.itemType === type)
}
export function findCategory(taxonomy, id) {
  return (taxonomy?.categories || []).find((c) => c.id === id) || null
}
export function attributesFor(taxonomy, categoryId, subcategoryId) {
  const cat = findCategory(taxonomy, categoryId)
  if (!cat) return []
  const sub = (cat.subcategories || []).find((s) => s.id === subcategoryId)
  return [...(cat.attributes || []), ...((sub && sub.attributes) || [])]
}

// Unités à proposer pour une catégorie : les unités PERTINENTES de la catégorie
// (cat.units) en tête, puis le reste de la liste globale (sans doublon). Repli =
// liste globale complète (comportement historique si la catégorie n'en définit pas).
export function unitsFor(taxonomy, categoryId, isService) {
  const global = (isService ? taxonomy?.billingUnits : taxonomy?.saleUnits) || []
  const cat = findCategory(taxonomy, categoryId)
  const ids = cat?.units || []
  if (!ids.length) return global
  const byId = new Map(global.map((u) => [u.id, u]))
  const preferred = ids.map((id) => byId.get(id)).filter(Boolean)
  const prefIds = new Set(ids)
  return [...preferred, ...global.filter((u) => !prefIds.has(u.id))]
}

// ---------- Type d'activité : nom à employer à la place de « boutique » ----------
// Miroir des règles backend : le libellé suit le type (« mon garage », « votre
// agence », « mon profil pro »…), « établissement » quand le type est inconnu.

const VOWEL_START = /^[aeiouyhàâäéèêëîïôöùûü]/i
const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function findShopType(taxonomy, shopType) {
  if (!shopType) return null
  return (taxonomy?.shopTypes || []).find((s) => s.id === shopType) || null
}

/** Activité exercée seul (technicien, artisan) : profil pro plutôt qu'établissement. */
export function isIndividualType(taxonomy, shopType) {
  if (!shopType) return false
  const t = findShopType(taxonomy, shopType)
  return t ? !!t.individual : shopType === 'technicien'
}

/**
 * Formes du nom de l'activité : { noun, my, your, the, this, My, Your, The, This }.
 * `fallbackNoun` (ex. champ `noun` renvoyé par l'API publique) sert si le type
 * n'est pas (encore) dans la taxonomie.
 */
export function businessNoun(taxonomy, shopType, fallbackNoun) {
  const t = findShopType(taxonomy, shopType)
  const noun = t?.noun || fallbackNoun || 'établissement'
  const fem = t?.noun ? t.gender === 'f' : false
  const vowel = VOWEL_START.test(noun)
  const my = `${fem && !vowel ? 'ma' : 'mon'} ${noun}`
  const your = `votre ${noun}`
  const the = vowel ? `l’${noun}` : `${fem ? 'la' : 'le'} ${noun}`
  const thisOne = `${fem ? 'cette' : vowel ? 'cet' : 'ce'} ${noun}`
  return {
    noun, my, your, the, this: thisOne,
    My: capFirst(my), Your: capFirst(your), The: capFirst(the), This: capFirst(thisOne),
  }
}

// Noms provisoires donnés par l'assistant à la création automatique : comptent comme « pas de nom ».
const PLACEHOLDER_NAMES = ['ma boutique', 'mon établissement', 'mon profil pro']
export function isPlaceholderShopName(name) {
  return !name || PLACEHOLDER_NAMES.includes(String(name).trim().toLowerCase())
}

export function tradeLabel(taxonomy, id) {
  if (!id) return null
  return (taxonomy?.trades || []).find((t) => t.id === id)?.label || id
}

/** Types d'activité groupés par famille (pour un <select> avec <optgroup>). */
export function shopTypeGroups(taxonomy, { exclude } = {}) {
  const types = (taxonomy?.shopTypes || []).filter((t) => !exclude || !exclude(t))
  const families = taxonomy?.shopTypeFamilies || []
  const groups = families
    .map((f) => ({ id: f.id, label: f.label, options: types.filter((t) => t.family === f.id) }))
    .filter((g) => g.options.length)
  const known = new Set(families.map((f) => f.id))
  const rest = types.filter((t) => !known.has(t.family))
  if (rest.length) groups.push({ id: '_other', label: groups.length ? 'Autres' : '', options: rest })
  return groups
}

export const PRO_PORTFOLIO_DEFAULTS = { minPhotos: 2, maxPhotos: 6, maxVideos: 3, maxTrades: 3, maxZones: 10 }
export function proLimits(taxonomy) {
  return { ...PRO_PORTFOLIO_DEFAULTS, ...(taxonomy?.proPortfolio || {}) }
}

const EMPTY_TAXONOMY = {
  itemTypes: [
    { id: 'product', label: 'Produit' },
    { id: 'service', label: 'Service' },
  ],
  categories: [],
  conditions: [
    { id: 'new', label: 'Neuf' },
    { id: 'used_imported', label: 'Occasion (importé)' },
    { id: 'used_local', label: 'Occasion (utilisé localement)' },
    { id: 'refurbished', label: 'Reconditionné' },
  ],
  billingUnits: [
    { id: 'item', label: "à l'unité" },
    { id: 'night', label: 'par nuit' },
    { id: 'hour', label: "à l'heure" },
    { id: 'service', label: 'par prestation' },
  ],
  saleUnits: [
    { id: 'piece', label: 'à la pièce' },
    { id: 'kg', label: 'au kilo (kg)' },
    { id: 'litre', label: 'au litre (L)' },
    { id: 'metre', label: 'au mètre (m)' },
    { id: 'sac', label: 'au sac' },
    { id: 'carton', label: 'au carton' },
    { id: 'paquet', label: 'au paquet' },
    { id: 'douzaine', label: 'à la douzaine' },
    { id: 'lot', label: 'au lot (ensemble)' },
  ],
  shopTypes: [],
  shopTypeFamilies: [],
  trades: [],
  proPortfolio: PRO_PORTFOLIO_DEFAULTS,
  cities: [],
  provinces: [],
  maxImages: 4,
}
