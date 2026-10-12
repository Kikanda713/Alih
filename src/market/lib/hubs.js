// Centres (commerciaux / agricoles) et cycle de déploiement du Wi-Fi Starlink.
// Les ids doivent rester alignés avec le backend (apps/market/src/hubs).

export const HUB_KINDS = [
  { id: 'urban', label: 'Zone urbaine' },
  { id: 'rural', label: 'Zone rurale' },
]

export const HUB_TYPES = [
  { id: 'centre_commercial', label: 'Centre commercial' },
  { id: 'marche', label: 'Marché' },
  { id: 'galerie', label: 'Galerie / immeuble commercial' },
  { id: 'cooperative', label: 'Coopérative agricole' },
  { id: 'zone_agricole', label: 'Bassin de production agricole' },
  { id: 'point_relais', label: 'Point relais / logistique' },
]

// Étapes ordonnées (maintenance = hors cycle, signalée à part).
export const WIFI_STEPS = [
  { id: 'planned', label: 'Planifié', short: 'Planifié', tone: 'neutral' },
  { id: 'survey', label: 'Étude du site', short: 'Étude', tone: 'warn' },
  { id: 'installing', label: 'Installation', short: 'Installation', tone: 'warn' },
  { id: 'live', label: 'Wi-Fi en service', short: 'En service', tone: 'success' },
]
export const WIFI_MAINTENANCE = { id: 'maintenance', label: 'En maintenance', short: 'Maintenance', tone: 'danger' }
export const WIFI_STATUSES = [...WIFI_STEPS, WIFI_MAINTENANCE]

export function wifiInfo(status) {
  return WIFI_STATUSES.find((s) => s.id === status) || WIFI_STEPS[0]
}
export function wifiStepIndex(status) {
  if (status === 'maintenance') return WIFI_STEPS.length - 1
  return Math.max(0, WIFI_STEPS.findIndex((s) => s.id === status))
}
export const hubKindLabel = (id) => HUB_KINDS.find((k) => k.id === id)?.label || ''
export const hubTypeLabel = (id) => HUB_TYPES.find((t) => t.id === id)?.label || 'Centre'
