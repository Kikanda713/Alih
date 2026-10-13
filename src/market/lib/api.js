import { apiFetch } from '../../api/client'

// Marketplace PUBLIQUE (sans connexion) : GET /v1/market/* sur la gateway.
// Projection publique côté serveur : jamais de prix plancher ni de contact vendeur.

function qs(params = {}) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== false) sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const marketApi = {
  listings: (params) => apiFetch(`/v1/market/listings${qs(params)}`),
  listing: (id) => apiFetch(`/v1/market/listings/${encodeURIComponent(id)}`),
  shop: (id) => apiFetch(`/v1/market/shops/${encodeURIComponent(id)}`),
  shopListings: (id, params) => apiFetch(`/v1/market/shops/${encodeURIComponent(id)}/listings${qs(params)}`),
  // Techniciens et artisans indépendants (profils pro) : ?family=&trade=&city=&q=&limit=&offset=
  pros: (params) => apiFetch(`/v1/market/pros${qs(params)}`),
  hubs: (params) => apiFetch(`/v1/market/hubs${qs(params)}`),
  hub: (id) => apiFetch(`/v1/market/hubs/${encodeURIComponent(id)}`),
  // BATA (échange de biens certifiés) : ?family=vehicule|appareil&city=&minValue=&maxValue=&q=&limit=&offset=
  bata: (params) => apiFetch(`/v1/market/bata${qs(params)}`),
}
