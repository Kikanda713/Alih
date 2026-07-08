import { useEffect, useState } from 'react'
import { apiBaseUrl } from '../auth/config'

// Taxonomie marketplace (catégories/sous-catégories/attributs, conditions, villes
// RDC, types de boutique…) servie par le backend : GET /v1/catalog/taxonomy.
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
  cities: [],
  provinces: [],
  maxImages: 4,
}
