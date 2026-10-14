import { channels } from '../../auth/config'
import { formatPrice, unitName } from './format'

/*
 * Passerelle site → messagerie. Le site prépare (panier, dates, réception) ;
 * la transaction se conclut avec l'assistant Tindisa (disponibilité, négociation,
 * paiement séquestre, livraison). Les réf. « TND-XXXXXXXX » sont résolues par
 * l'agent (get_product) : ne pas changer ce format sans adapter le backend.
 */

const fmtDate = (d) => {
  if (!d) return ''
  const [y, m, day] = String(d).split('-')
  return day ? `${day}/${m}/${y}` : d
}

export function lineTotal(item) {
  if (item.price == null) return null
  return item.price * (item.qty || 1) * (item.booking?.units || 1)
}

export function bookingSummary(item) {
  const b = item.booking
  if (!b) return ''
  const parts = []
  if (b.mode === 'stay' && b.start) {
    parts.push(`du ${fmtDate(b.start)} au ${fmtDate(b.end)} (${b.units} ${unitName(item.billingUnit, b.units > 1)})`)
  } else if (b.mode === 'slot' && b.start) {
    parts.push(`le ${fmtDate(b.start)} à ${b.time || '?'} (${b.units} h)`)
  } else if (b.mode === 'job') {
    if (b.start) parts.push(`souhaité le ${fmtDate(b.start)}`)
    if (b.units > 1) parts.push(`${b.units} ${unitName(item.billingUnit, true)}`)
  }
  if (b.guests) parts.push(`${b.guests} pers.`)
  if (b.place) parts.push(`lieu : ${b.place}`)
  if (b.note) parts.push(`« ${b.note} »`)
  return parts.join(', ')
}

export function totalsByCurrency(items) {
  const totals = {}
  for (const it of items) {
    const t = lineTotal(it)
    if (t == null) continue
    totals[it.currency] = (totals[it.currency] || 0) + t
  }
  return Object.entries(totals).map(([cur, v]) => formatPrice(v, cur))
}

function itemLine(item, i) {
  const total = lineTotal(item)
  const head = item.type === 'service'
    ? `${i}. ${item.name}`
    : `${i}. ${item.name} × ${item.qty}`
  const booking = bookingSummary(item)
  const price = total != null ? ` ≈ ${formatPrice(total, item.currency)}` : ' (prix à confirmer)'
  return `${head}${booking ? `, ${booking}` : ''}${price} (réf. ${item.ref})`
}

const PAY_LABELS = {
  cash: 'cash à la réception',
  mpesa: 'M-Pesa',
  airtel: 'Airtel Money',
  orange: 'Orange Money',
}

/** Message de commande complet (panier). */
export function buildOrderMessage(items, info = {}) {
  const lines = ['🛒 Commande depuis tindisa.com', '']
  items.forEach((it, i) => lines.push(itemLine(it, i + 1)))
  const totals = totalsByCurrency(items)
  if (totals.length) lines.push('', `Total estimé : ${totals.join(' + ')}`)
  const hasProducts = items.some((it) => it.type !== 'service')
  if (hasProducts && info.reception) {
    const where = [info.city, info.address].filter(Boolean).join(', ')
    lines.push(info.reception === 'delivery'
      ? `Réception : livraison${where ? ` à ${where}` : ''}`
      : 'Réception : retrait sur place')
  } else if (info.city) {
    lines.push(`Ville : ${info.city}`)
  }
  if (info.payment) lines.push(`Paiement souhaité : ${PAY_LABELS[info.payment] || info.payment}`)
  if (info.negotiate) lines.push('Je souhaite négocier les prix.')
  if (info.name) lines.push(`Nom : ${info.name}`)
  if (info.note) lines.push(`Note : ${info.note}`)
  // Code d'influenceur : l'assistant le transmet à la conclusion de la vente.
  if (info.promoCode) lines.push(`Code promo : ${info.promoCode}`)
  lines.push('', 'Merci de confirmer la disponibilité pour que je puisse commander.')
  return lines.join('\n')
}

/** Message court pour une seule annonce (question, négociation, commande directe). */
export function buildItemMessage(item, intent = 'order') {
  const price = item.price != null ? ` (${formatPrice(item.price, item.currency)})` : ''
  const ref = `réf. ${item.ref}`
  if (intent === 'negotiate') {
    return `🛒 Commande depuis tindisa.com\nBonjour Tindisa, je souhaite négocier le prix avant de commander : ${item.name}${price}, ${ref}.`
  }
  if (intent === 'question') {
    return `Bonjour Tindisa, j'ai une question avant de commander : ${item.name}${price}, ${ref}.`
  }
  return `🛒 Commande depuis tindisa.com\nBonjour Tindisa, je veux commander : ${item.name}${price}, ${ref}. Est-ce disponible ?`
}

export function whatsappLink(text) {
  const base = channels.whatsapp.split('?')[0]
  return `${base}?text=${encodeURIComponent(text)}`
}

/** Telegram n'accepte pas de texte pré-rempli vers un bot : on copie puis on ouvre. */
export async function openTelegram(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch { /* presse-papiers indisponible : l'utilisateur recopiera l'aperçu */ }
  window.open(channels.telegram, '_blank', 'noopener')
}
