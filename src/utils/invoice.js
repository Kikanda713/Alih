/**
 * Génération de la FACTURE normalisée (abonnement Tindisa) au format i-kiotahub.
 * Le fournisseur légal est i-kiotahub (accélérateur derrière Tindisa) ; la facture
 * porte ses coordonnées officielles + la mention « Plateforme Tindisa ».
 * jsPDF est chargé en DYNAMIQUE (import()) → pas de surcharge du bundle principal.
 */

// Fournisseur légal (fixe) — repris de la facture i-kiotahub normalisée.
const SUPPLIER = {
  name: 'i-kiotahub',
  tagline: "Accélérateur d'entreprises",
  rccm: 'CD/GOMA/RCCM/23-B-00196',
  idnat: '19-H5300-N40995F',
  nif: 'A2321658S',
  email: 'ikiota@ikiotahub.com',
  tel: '+243 979 588 462',
  address:
    'RDC/Nord-Kivu/Goma, Commune de Goma, Quartier Lac Vert, Avenue Kabanda',
}
const TVA_RATE = 0.16
const BLUE = [37, 99, 235]
const DARK = [26, 26, 46]
const GRAY = [110, 110, 110]

function money(n) {
  return `${(Math.round(Number(n) * 100) / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`
}
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return '—'
  }
}

/** Réf. facture stable (format INV-AAMM-XXXX) dérivée de l'abonnement. */
export function invoiceRef(sub) {
  const d = sub?.currentPeriodEnd || sub?.updatedAt || sub?.createdAt || Date.now()
  const dt = new Date(d)
  const yy = String(dt.getFullYear()).slice(2)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const seq = String(sub?.id || '').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase() || '0001'
  return `INV-${yy}${mm}-${seq}`
}

/**
 * data: { ref, dateStr, clientName, paidBy, planName, priceTtc, status, method }
 * Le prix affiché (9/29/59) est traité comme TTC ; on rétro-calcule HT + TVA 16 %.
 */
export async function downloadInvoice(data) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 48
  let y = 44

  const ttc = Number(data.priceTtc) || 0
  const ht = Math.round((ttc / (1 + TVA_RATE)) * 100) / 100
  const tva = Math.round((ttc - ht) * 100) / 100

  // En-tête marque
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...BLUE)
  doc.text(SUPPLIER.name, W / 2, y, { align: 'center' })
  y += 14
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
  doc.text(SUPPLIER.tagline + '  ·  Plateforme Tindisa', W / 2, y, { align: 'center' })

  // Titre
  y += 40
  doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(...DARK)
  doc.text('FACTURE', W / 2, y, { align: 'center' })

  // Réf + date
  y += 34
  doc.setFontSize(11); doc.setTextColor(...DARK)
  doc.text(`Réf. ${data.ref}`, M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRAY)
  doc.text(`Date : ${data.dateStr}`, W - M, y, { align: 'right' })
  y += 10
  doc.setDrawColor(230); doc.line(M, y, W - M, y)

  // Fournisseur / Client
  y += 26
  doc.setFontSize(9); doc.setTextColor(...GRAY)
  doc.text('FOURNISSEUR', M, y)
  doc.text('CLIENT', W - M, y, { align: 'right' })
  y += 16
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...DARK)
  doc.text(SUPPLIER.name, M, y)
  doc.text(data.clientName || 'Client Tindisa', W - M, y, { align: 'right' })
  const supLines = [
    `RCCM: ${SUPPLIER.rccm}`, `ID NAT: ${SUPPLIER.idnat}`, `NIF: ${SUPPLIER.nif}`,
    `Email: ${SUPPLIER.email}`, `Tél: ${SUPPLIER.tel}`,
  ]
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
  let ys = y + 16
  supLines.forEach((l) => { doc.text(l, M, ys); ys += 13 })
  if (data.paidBy) doc.text(`Payé par : ${data.paidBy}`, W - M, y + 16, { align: 'right' })

  // Section plan
  y = ys + 18
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...BLUE)
  doc.text(`PLAN ${String(data.planName || '').toUpperCase()}`, M, y)

  // Tableau lignes
  y += 18
  doc.setFillColor(245, 246, 250); doc.rect(M, y, W - 2 * M, 26, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GRAY)
  doc.text('Libellé', M + 12, y + 17)
  doc.text('PU HT', W - M - 220, y + 17, { align: 'right' })
  doc.text('Qté', W - M - 120, y + 17, { align: 'right' })
  doc.text('Montant HT', W - M - 12, y + 17, { align: 'right' })
  y += 26
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...DARK)
  doc.text(`Abonnement Tindisa — Plan ${data.planName}`, M + 12, y + 18)
  doc.text(money(ht), W - M - 220, y + 18, { align: 'right' })
  doc.text('1', W - M - 120, y + 18, { align: 'right' })
  doc.text(money(ht), W - M - 12, y + 18, { align: 'right' })
  y += 30
  doc.setDrawColor(230); doc.line(M, y, W - M, y)

  // Totaux
  y += 24
  const lx = W - M - 200, rx = W - M
  doc.setFontSize(10); doc.setTextColor(...GRAY)
  doc.text('Total HT', lx, y); doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold')
  doc.text(money(ht), rx, y, { align: 'right' })
  y += 20
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
  doc.text('TVA (16%)', lx, y); doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold')
  doc.text(money(tva), rx, y, { align: 'right' })
  y += 10; doc.setDrawColor(230); doc.line(lx, y, rx, y); y += 22
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
  doc.text('Total TTC', lx, y)
  doc.setTextColor(...BLUE); doc.setFontSize(15)
  doc.text(money(ttc), rx, y, { align: 'right' })

  // Paiement / statut
  y += 34
  doc.setFillColor(248, 249, 251); doc.rect(M, y, W - 2 * M, 54, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...DARK)
  doc.text(`Méthode de paiement : ${data.method || '—'}`, M + 14, y + 22)
  doc.text('Statut : ', M + 14, y + 40)
  const paid = /pa(id|yé)|active|confirm/i.test(String(data.status || ''))
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...(paid ? [26, 158, 84] : GRAY))
  doc.text(paid ? 'Payé' : String(data.status || '—'), M + 58, y + 40)

  // Adresse
  y += 84
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GRAY)
  doc.text('Adresse : ', W / 2 - 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(SUPPLIER.address, W / 2 - 78, y)

  doc.save(`${data.ref}.pdf`)
}
