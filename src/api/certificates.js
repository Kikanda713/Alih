import { apiBaseUrl } from '../auth/config'

/**
 * Vérification PUBLIQUE de l'authenticité d'un certificat produit Tindisa.
 *
 * Aucune authentification : n'importe qui peut vérifier un certificat.
 * La source de vérité est la chaîne (smart-contract) : le backend résout le
 * certificat à partir d'un identifiant, puis lit/valide l'ancrage on-chain.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * CONTRAT BACKEND (à implémenter côté gateway) — l'équipe backend consomme ceci :
 *
 *   POST {apiBaseUrl}/v1/certificates/verify           (PUBLIC, pas de token)
 *   body (un seul des trois) :
 *     { "hash": "0x…"   }   // identifiant/hash du certificat (saisi ou collé)
 *     { "qr":   "…"     }   // contenu brut décodé d'un QR code
 *     { "fileHash": "…", "fileName": "cert.pdf" }  // SHA-256 du PDF importé
 *
 *   réponse 200 :
 *     {
 *       "found": true,
 *       "certificate": {
 *         "status": "authentic" | "revoked" | "expired",
 *         "productName": "…",
 *         "productId": "…",            // pour lien vers la fiche marché (option)
 *         "sellerName": "…",
 *         "category": "…",
 *         "condition": "neuf|occasion…",
 *         "issuedAt": "2026-05-12T…",
 *         "issuer": "Wanzo / Tindisa",
 *         "hash": "0x…",               // hash du document ancré
 *         "chain": "polygon" | "…",    // réseau blockchain
 *         "txHash": "0x…",             // transaction d'ancrage
 *         "explorerUrl": "https://…",  // lien vérifiable public
 *         "controlSheetUrl": "https://…" // fiche de contrôle technique (option)
 *       }
 *     }
 *   réponse 200 si introuvable : { "found": false }
 * ──────────────────────────────────────────────────────────────────────────
 */
const ENDPOINT = '/v1/certificates/verify'

export async function verifyCertificate(payload) {
  const res = await fetch(`${apiBaseUrl}${ENDPOINT}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const err = new Error(data?.message || `Vérification indisponible (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

/** SHA-256 d'un fichier (le hash du document = clé d'ancrage on-chain). */
export async function sha256File(file) {
  const buf = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Décode un QR depuis une image importée, via l'API native BarcodeDetector
 * (Chrome/Edge/Android). Renvoie le contenu brut, ou null si non décodable /
 * non supporté (l'utilisateur peut alors coller le code à la main).
 */
export async function decodeQrImage(file) {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null
  try {
    const bitmap = await createImageBitmap(file)
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    const codes = await detector.detect(bitmap)
    return codes && codes.length ? codes[0].rawValue : null
  } catch {
    return null
  }
}
