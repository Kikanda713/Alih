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
      { id: uid(), productId: 'demo-sav', buyerOffer: 3200, counterOffer: null, currency: 'CDF', status: 'ACCEPTED', createdAt: '2026-06-21T14:05:00Z', delivery: { status: 'CONFIRMED' } },
    ],
    wallet: {
      balance: 188200,
      currency: 'CDF',
      transactions: [
        { id: uid(), type: 'CREDIT', amount: 175000, description: 'Vente Samsung Galaxy A14 (escrow libéré)', createdAt: '2026-06-22T16:40:00Z' },
        { id: uid(), type: 'CREDIT', amount: 3200, description: 'Vente Savon de Marseille', createdAt: '2026-06-21T15:10:00Z' },
        { id: uid(), type: 'DEBIT', amount: 4000, description: 'Frais de livraison', createdAt: '2026-06-21T15:12:00Z' },
      ],
    },
    wanzoLinked: false,
    adminUsers: [
      { id: uid(), firstname: 'Sarah', lastname: 'Tshibanda', email: 'sarah@boutiquekin.cd', phone: '+243990000001', type: 'merchant', status: 'active', createdAt: '2026-05-02T09:00:00Z' },
      { id: uid(), firstname: 'Jean', lastname: 'Mwamba', email: 'jean.mwamba@gmail.com', phone: '+243991111002', type: 'merchant', status: 'active', createdAt: '2026-05-10T11:30:00Z' },
      { id: uid(), firstname: 'Esther', lastname: 'Kalala', email: 'esther.kalala@gmail.com', phone: '+243992222003', type: 'buyer', status: 'active', createdAt: '2026-05-15T14:10:00Z' },
      { id: uid(), firstname: 'Patrick', lastname: 'Ilunga', email: '', phone: '+243993333004', type: 'buyer', status: 'guest', createdAt: '2026-06-01T08:45:00Z' },
      { id: uid(), firstname: 'Aline', lastname: 'Mukendi', email: 'aline.m@boutique.cd', phone: '+243994444005', type: 'merchant', status: 'suspended', createdAt: '2026-04-20T16:20:00Z' },
      { id: uid(), firstname: 'David', lastname: 'Kabeya', email: 'david.kabeya@gmail.com', phone: '+243995555006', type: 'buyer', status: 'active', createdAt: '2026-06-08T10:05:00Z' },
      { id: uid(), firstname: 'Grace', lastname: 'Nsimba', email: 'grace.nsimba@gmail.com', phone: '+243996666007', type: 'buyer', status: 'active', createdAt: '2026-06-12T13:40:00Z' },
      { id: uid(), firstname: 'Olivier', lastname: 'Banza', email: 'olivier@shopgombe.cd', phone: '+243997777008', type: 'merchant', status: 'active', createdAt: '2026-05-28T09:15:00Z' },
      { id: uid(), firstname: 'Christelle', lastname: 'Mbuyi', email: '', phone: '+243998888009', type: 'buyer', status: 'guest', createdAt: '2026-06-18T17:55:00Z' },
      { id: uid(), firstname: 'Yannick', lastname: 'Tshisekedi', email: 'yannick.t@gmail.com', phone: '+243999999010', type: 'buyer', status: 'active', createdAt: '2026-06-20T12:00:00Z' },
      { id: uid(), firstname: 'Nadège', lastname: 'Lukusa', email: 'nadege@maisonwax.cd', phone: '+243990101011', type: 'merchant', status: 'active', createdAt: '2026-05-19T15:30:00Z' },
      { id: uid(), firstname: 'Samuel', lastname: 'Kasongo', email: 'samuel.kasongo@gmail.com', phone: '+243990202012', type: 'buyer', status: 'active', createdAt: '2026-06-22T08:20:00Z' },
    ],
    conversations: [
      {
        id: 'conv-demo-1',
        title: 'Recherche Samsung',
        updatedAt: '2026-06-22T10:02:00Z',
        messages: [
          { id: uid(), role: 'user', content: 'Trouve-moi un Samsung pas cher', at: '2026-06-22T10:00:00Z' },
          { id: uid(), role: 'assistant', content: "J'ai trouvé le Samsung Galaxy A14 à 185 000 CDF (6 en stock). Voulez-vous que je négocie pour un acheteur ou que j'ajuste votre prix ?", at: '2026-06-22T10:02:00Z' },
        ],
      },
    ],
  }
}

function nowIso() {
  return new Date().toISOString()
}

// Réponse fictive de l'agent, sensible à quelques mots-clés (démo).
function agentReply(text) {
  const s = (text || '').toLowerCase()
  if (/(rupture|stock|épuis)/.test(s)) return 'Dans votre catalogue, « Pagne wax (6 yards) » est en rupture (0 en stock). Je peux le masquer des recherches ou vous aider à réapprovisionner.'
  if (/(vente|chiffre|gagn|résum|resum)/.test(s)) return "Aujourd'hui : 2 offres reçues, 1 vente conclue (Samsung Galaxy A14 à 175 000 CDF), livrée et payée. Solde disponible : 188 200 CDF."
  if (/(prix|négoci|negoci|plancher|marge)/.test(s)) return "Fixez un prix affiché et un prix plancher : je ne descends jamais sous le plancher en négociant, et il reste privé. Sur quel produit voulez-vous l'ajuster ?"
  if (/(transport|livr|colis)/.test(s)) return "Je peux trouver un transporteur et organiser la livraison après accord et paiement sous séquestre. Indiquez la destination."
  if (/(bonjour|salut|hello|aide|aider)/.test(s)) return "Bonjour 👋 Je suis l'assistant Tindisa. Je gère vos produits, négocie avec les acheteurs, et organise paiement et livraison — directement par message. Que voulez-vous faire ?"
  return "Bien reçu. Je m'en occupe via vos outils Tindisa (catalogue, négociation, paiement sécurisé, livraison). Donnez-moi un peu plus de détails et je lance l'action."
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
  if (path === '/v1/merchant/wallet' && method === 'GET') {
    return d.wallet || { balance: 0, currency: 'CDF', transactions: [] }
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

  // ---- Back-office admin ----
  if (path === '/v1/admin/stats' && method === 'GET') {
    const u = d.adminUsers || []
    return {
      users: u.length,
      merchants: u.filter((x) => x.type === 'merchant').length,
      buyers: u.filter((x) => x.type === 'buyer').length,
      pending: u.filter((x) => x.status === 'guest').length,
    }
  }
  if (path === '/v1/admin/users' && method === 'GET') {
    return { users: d.adminUsers || [], total: (d.adminUsers || []).length }
  }
  if (path.startsWith('/v1/admin/users/') && path.endsWith('/status') && method === 'PUT') {
    const id = path.split('/')[4]
    const u = (d.adminUsers || []).find((x) => x.id === id)
    if (u) { u.status = body.status; save(d) }
    return u || {}
  }

  // ---- Canal interne / agent conversationnel ----
  if (path === '/v1/agent/conversations' && method === 'GET') {
    return {
      conversations: (d.conversations || [])
        .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt }))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    }
  }
  if (path.startsWith('/v1/agent/conversations/') && method === 'GET') {
    const id = path.split('/').pop()
    return (d.conversations || []).find((c) => c.id === id) || { id, title: '', messages: [] }
  }
  if (path === '/v1/agent/conversations' && method === 'POST') {
    const conv = { id: uid(), title: 'Nouvelle conversation', messages: [], updatedAt: nowIso() }
    d.conversations = [conv, ...(d.conversations || [])]
    save(d)
    return conv
  }
  if (path.startsWith('/v1/agent/conversations/') && method === 'DELETE') {
    const id = path.split('/').pop()
    d.conversations = (d.conversations || []).filter((c) => c.id !== id)
    save(d)
    return { deleted: true, id }
  }
  if (path === '/v1/agent/chat' && method === 'POST') {
    let conv = (d.conversations || []).find((c) => c.id === body.conversationId)
    if (!conv) {
      conv = { id: uid(), title: 'Nouvelle conversation', messages: [], updatedAt: nowIso() }
      d.conversations = [conv, ...(d.conversations || [])]
    }
    const userMsg = {
      id: uid(), role: 'user', content: body.message || '',
      attachments: body.attachments || [], at: nowIso(),
    }
    const botMsg = { id: uid(), role: 'assistant', content: agentReply(body.message), at: nowIso() }
    conv.messages.push(userMsg, botMsg)
    if (conv.title === 'Nouvelle conversation' && body.message) {
      conv.title = body.message.slice(0, 40)
    }
    conv.updatedAt = nowIso()
    save(d)
    return { conversationId: conv.id, title: conv.title, reply: botMsg }
  }

  return {}
}

export const mockApi = {
  get: (path) => delay(route('GET', path)),
  post: (path, body) => delay(route('POST', path, body || {})),
  put: (path, body) => delay(route('PUT', path, body || {})),
  del: (path) => delay(route('DELETE', path)),
}
