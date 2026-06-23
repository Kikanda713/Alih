/* ============================================================
 * MODE DÉMO — mock API en mémoire (persistée en localStorage).
 * Imite les endpoints /v1/merchant/* et /v1/wanzo/* du backend pour que
 * le dashboard soit pleinement utilisable sans serveur. À SUPPRIMER en prod.
 * ============================================================ */

const STORE_KEY = 'tindisa_demo_store'

function uid() {
  return 'demo-' + Math.random().toString(36).slice(2, 10)
}

function seed() {
  return {
    shop: { id: 'demo-shop', name: 'Ma boutique démo', source: 'LOCAL', ownerId: 'demo-merchant' },
    products: [
      {
        id: uid(), sku: 'DEMO-SAV', name: 'Savon de Marseille (lot de 4)', category: 'maison',
        description: 'Savon doux, fabrication artisanale.', imageUrl: 'https://picsum.photos/seed/savon/200',
        shopId: 'demo-shop', pricing: { displayPrice: 3500, minPrice: 2800 }, quantity: 48,
      },
      {
        id: uid(), sku: 'DEMO-SAM', name: 'Samsung Galaxy A14', category: 'téléphone',
        description: 'Smartphone 4G, 128 Go, double SIM.', imageUrl: 'https://picsum.photos/seed/phone/200',
        shopId: 'demo-shop', pricing: { displayPrice: 185000, minPrice: 160000 }, quantity: 6,
      },
      {
        id: uid(), sku: 'DEMO-PAG', name: 'Pagne wax (6 yards)', category: 'mode',
        description: 'Tissu wax premium, motifs assortis.', imageUrl: 'https://picsum.photos/seed/wax/200',
        shopId: 'demo-shop', pricing: { displayPrice: 22000, minPrice: 18000 }, quantity: 0,
      },
    ],
    offers: [
      { id: uid(), productId: 'demo-sam', buyerOffer: 170000, counterOffer: 175000, currency: 'CDF', status: 'NEGOTIATING', createdAt: '2026-06-22T09:30:00Z' },
      { id: uid(), productId: 'demo-sav', buyerOffer: 3200, counterOffer: null, currency: 'CDF', status: 'ACCEPTED', createdAt: '2026-06-21T14:05:00Z' },
    ],
    wanzoLinked: false,
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const s = seed()
  save(s)
  return s
}

function save(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

const delay = (v) => new Promise((res) => setTimeout(() => res(v), 250))

function route(method, path, body) {
  const d = load()

  // ---- Catalogue marchand ----
  if (path === '/v1/merchant/products' && method === 'GET') {
    return { shop: d.shop, products: d.products }
  }
  if (path === '/v1/merchant/products' && method === 'POST') {
    const p = {
      id: uid(), sku: body.sku || `DEMO-${Date.now()}`, name: body.name,
      description: body.description, category: body.category, imageUrl: body.imageUrl,
      shopId: d.shop.id,
      pricing: { displayPrice: body.displayPrice ?? null, minPrice: body.minPrice ?? null },
      quantity: body.quantity ?? 0,
    }
    d.products.push(p); save(d); return p
  }
  if (path.startsWith('/v1/merchant/products/') && method === 'PUT') {
    const id = path.split('/').pop()
    const p = d.products.find((x) => x.id === id)
    if (p) {
      Object.assign(p, {
        name: body.name ?? p.name, description: body.description ?? p.description,
        category: body.category ?? p.category, imageUrl: body.imageUrl ?? p.imageUrl,
        quantity: body.quantity ?? p.quantity,
        pricing: {
          displayPrice: body.displayPrice ?? p.pricing?.displayPrice ?? null,
          minPrice: body.minPrice ?? p.pricing?.minPrice ?? null,
        },
      })
      save(d)
    }
    return p
  }
  if (path.startsWith('/v1/merchant/products/') && method === 'DELETE') {
    const id = path.split('/').pop()
    d.products = d.products.filter((x) => x.id !== id); save(d)
    return { deleted: true, id }
  }
  if (path === '/v1/merchant/shop' && method === 'PUT') {
    d.shop.name = body.name; save(d); return d.shop
  }
  if (path === '/v1/merchant/shop' && method === 'GET') {
    return { shop: d.shop }
  }
  if (path === '/v1/merchant/offers' && method === 'GET') {
    return { offers: d.offers }
  }
  if (path === '/v1/merchant/wanzo/products' && method === 'GET') {
    return { linked: d.wanzoLinked, products: [] }
  }

  // ---- Wanzo ----
  if (path === '/v1/wanzo/link' && method === 'GET') {
    return { linked: d.wanzoLinked, link: d.wanzoLinked ? { verified: true, externalCompanyId: 'WANZO-DEMO' } : null }
  }
  if (path === '/v1/wanzo/link' && method === 'POST') {
    d.wanzoLinked = true; save(d); return { linked: true }
  }
  if (path === '/v1/wanzo/sync' && method === 'POST') {
    return { synced: 0, reason: 'demo' }
  }

  return {}
}

export const mockApi = {
  get: (path) => delay(route('GET', path)),
  post: (path, body) => delay(route('POST', path, body || {})),
  put: (path, body) => delay(route('PUT', path, body || {})),
  del: (path) => delay(route('DELETE', path)),
}
