import { loadTaxonomy, isIndividualType } from '../../../api/taxonomy'
import { formatPrice } from '../../../market/lib/format.js'

/*
 * Données de l'accueil du tableau de bord : uniquement des endpoints existants,
 * chargés en parallèle et tolérants aux erreurs (un service absent masque sa
 * carte, il ne casse pas la page). Aucune donnée inventée.
 */

export const txt = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')
export const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const list = (r, key) => {
  const l = Array.isArray(r) ? r : Array.isArray(r?.[key]) ? r[key] : Array.isArray(r?.items) ? r.items : []
  return l.filter((x) => x && typeof x === 'object')
}
// null = service indisponible (la carte correspondante est masquée).
const settle = (p) => Promise.resolve(p).then((v) => v ?? null, () => null)

export async function loadHome(api) {
  const [shopR, productsR, offersR, walletR, feesR, photosR, sumR, certsR, bataOffersR, bataPropsR, payR, inflR, taxonomy] =
    await Promise.all([
      settle(api.get('/v1/merchant/shop')),
      settle(api.get('/v1/merchant/products')),
      settle(api.get('/v1/merchant/offers')),
      settle(api.get('/v1/merchant/wallet')),
      settle(api.get('/v1/merchant/commissions')),
      settle(api.get('/v1/merchant/photos/proposed')),
      settle(api.get('/v1/merchant/certificates/summary')),
      settle(api.get('/v1/merchant/certificates')),
      settle(api.get('/v1/merchant/bata/offers')),
      settle(api.get('/v1/merchant/bata/proposals')),
      settle(api.get('/v1/merchant/commissions/payments')),
      settle(api.get('/v1/merchant/influencer')),
      loadTaxonomy().catch(() => null),
    ])

  const shop = shopR?.shop && typeof shopR.shop === 'object' ? shopR.shop : null
  const isPro = shop?.shopType ? isIndividualType(taxonomy, shop.shopType) : false
  const influencer = inflR && typeof inflR === 'object' ? inflR : null
  const enrolled = !!influencer?.enrolled && txt(influencer.status) !== 'pending'

  // 2e vague : seulement ce qui concerne ce compte.
  const [pro, proCert, shopCert, collections] = await Promise.all([
    shop && isPro ? settle(api.get('/v1/merchant/shop/pro')) : null,
    shop && isPro ? settle(api.get('/v1/merchant/certificates/pro')) : null,
    shop && !isPro ? settle(api.get('/v1/merchant/certificates/shop')) : null,
    enrolled ? settle(api.get('/v1/merchant/influencer/collections')) : null,
  ])

  const products = list(productsR, 'products')
  const offers = list(offersR, 'offers')
  const balances = Array.isArray(walletR?.balances) && walletR.balances.length
    ? walletR.balances.filter((b) => b && typeof b === 'object')
    : walletR?.balance
      ? [{ currency: walletR.currency || 'CDF', balance: walletR.balance }]
      : []

  return {
    shop,
    isPro,
    // Vendeur : établissement, ou déjà des produits / offres reçues.
    merchant: !!shop || products.length > 0 || offers.length > 0,
    blocked: shop?.status === 'blocked',
    products,
    offers,
    balances,
    transactions: list(walletR, 'transactions'),
    fees: feesR && typeof feesR === 'object' && !Array.isArray(feesR) ? feesR : null,
    photosToValidate: photosR ? num(photosR.count) : null,
    certSummary: sumR && typeof sumR === 'object' && !Array.isArray(sumR) ? sumR : null,
    certs: list(certsR, 'certificates'),
    bataOffers: bataOffersR ? list(bataOffersR, 'offers') : null,
    bataProps: bataPropsR ? list(bataPropsR, 'proposals') : [],
    feePayments: list(payR, 'payments'),
    influencer,
    selections: collections ? list(collections, 'collections').length : null,
    pro: pro && typeof pro === 'object' ? pro : null,
    proCert: proCert && typeof proCert === 'object' ? (proCert.certificate || null) : undefined,
    shopCert: shopCert && typeof shopCert === 'object' ? (shopCert.certificate || null) : undefined,
  }
}

/* ---------- Libellés ---------- */

export function money(amount, currency) {
  return formatPrice(num(amount), String(currency || 'CDF').toUpperCase() === 'USD' ? 'USD' : 'CDF') || '·'
}
export const usd = (v) => formatPrice(num(v), 'USD')

const OFFER = {
  ACCEPTED: { title: 'Vente conclue', tone: 'success', label: 'Conclue' },
  PENDING: { title: 'Offre reçue', tone: 'warn', label: 'À traiter' },
  NEGOTIATING: { title: 'Négociation en cours', tone: 'warn', label: 'En cours' },
  REJECTED: { title: 'Offre refusée', tone: 'danger', label: 'Refusée' },
  EXPIRED: { title: 'Offre expirée', tone: 'neutral', label: 'Expirée' },
}

const CERT_KIND = {
  asset: 'Certificat d’actif',
  pro: 'Certificat d’aptitude pro',
  shop: 'Certification de l’établissement',
}

export function certStatus(c) {
  const st = txt(c?.status)
  if (!c || !st || st === 'none') return { tone: 'neutral', label: 'Non demandé' }
  if (st === 'issued') return c.expired ? { tone: 'danger', label: 'Expiré' } : { tone: 'success', label: 'Délivré' }
  if (st === 'requested') return c.paid ? { tone: 'info', label: 'En vérification' } : { tone: 'warn', label: 'Paiement attendu' }
  if (st === 'paid') return { tone: 'info', label: 'En vérification' }
  if (st === 'info_requested') return { tone: 'warn', label: 'Complément demandé' }
  if (st === 'rejected') return { tone: 'danger', label: 'Refusé' }
  if (st === 'revoked') return { tone: 'danger', label: 'Révoqué' }
  return { tone: 'neutral', label: st }
}

const PROPOSAL = {
  proposed: { tone: 'warn', label: 'Proposée' },
  accepted: { tone: 'success', label: 'Acceptée' },
  declined: { tone: 'danger', label: 'Refusée' },
  agreed: { tone: 'success', label: 'Accord conclu' },
  paid: { tone: 'success', label: 'En séquestre' },
  completed: { tone: 'neutral', label: 'Terminée' },
  cancelled: { tone: 'neutral', label: 'Annulée' },
}

const time = (d) => {
  const t = d ? new Date(d).getTime() : NaN
  return Number.isFinite(t) ? t : 0
}

/**
 * Fil d'activité récente : ventes / négociations, mouvements du portefeuille,
 * frais réglés, certificats, échanges BATA. Trié du plus récent au plus ancien.
 */
export function buildActivity(d, limit = 8) {
  const names = new Map(d.products.map((p) => [txt(p.id), txt(p.name)]))
  const items = []

  for (const o of d.offers) {
    const s = OFFER[o.status] || { title: 'Offre', tone: 'neutral', label: txt(o.status) || '·' }
    const amount = o.counterOffer ?? o.buyerOffer
    items.push({
      key: `o-${txt(o.id)}`,
      kind: o.status === 'ACCEPTED' ? 'sale' : 'offer',
      title: s.title,
      sub: [names.get(txt(o.productId)) || 'Article', amount != null ? money(amount, o.currency) : ''].filter(Boolean).join(' · '),
      date: o.createdAt,
      tone: s.tone,
      label: s.label,
      to: '/dashboard/ventes',
    })
  }

  for (const tx of d.transactions) {
    const credit = String(tx.type || '').toUpperCase().includes('CREDIT')
    items.push({
      key: `t-${txt(tx.id) || items.length}`,
      kind: credit ? 'credit' : 'debit',
      title: credit ? 'Argent reçu' : 'Paiement effectué',
      sub: [txt(tx.description), `${credit ? '+' : '−'} ${money(tx.amount, tx.currency)}`].filter(Boolean).join(' · '),
      date: tx.createdAt,
      tone: credit ? 'success' : 'neutral',
      label: credit ? 'Crédit' : 'Débit',
      to: '/dashboard/wallet',
    })
  }

  for (const fp of d.feePayments) {
    if (!fp || typeof fp !== 'object') continue
    const ok = fp.status === 'success' || fp.status === 'paid'
    items.push({
      key: `f-${txt(fp.id) || items.length}`,
      kind: 'fee',
      title: 'Frais de commission',
      sub: usd(fp.amountUsd),
      date: fp.settledAt || fp.createdAt,
      tone: ok ? 'success' : 'warn',
      label: ok ? 'Réglés' : 'En attente',
      to: '/dashboard/abonnement',
    })
  }

  for (const c of d.certs) {
    const s = certStatus(c)
    const kind = c.kind === 'pro' || c.kind === 'shop' ? c.kind : 'asset'
    items.push({
      key: `c-${txt(c.certId) || txt(c.serial) || items.length}`,
      kind: 'cert',
      title: CERT_KIND[kind],
      sub: txt(c.name) || txt(c.productName) || '',
      date: c.updatedAt || c.issuedAt || c.requestedAt || c.paidAt,
      tone: s.tone,
      label: s.label,
      to: kind === 'pro' ? '/dashboard/certificat-pro' : kind === 'shop' ? '/dashboard/certificat-etablissement' : '/dashboard/catalogue',
    })
  }

  for (const p of d.bataProps) {
    const s = PROPOSAL[p.status] || { tone: 'neutral', label: txt(p.status) || '·' }
    items.push({
      key: `b-${txt(p.id) || items.length}`,
      kind: 'bata',
      title: p.direction === 'received' ? 'Proposition d’échange reçue' : 'Proposition d’échange envoyée',
      sub: 'BATA',
      date: p.createdAt,
      tone: s.tone,
      label: s.label,
      to: '/dashboard/bata',
    })
  }

  return items.sort((a, b) => time(b.date) - time(a.date)).slice(0, limit)
}

export function relDate(d) {
  const t = time(d)
  if (!t) return ''
  const diff = Date.now() - t
  const min = Math.round(diff / 60000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const days = Math.round(h / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} jours`
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
