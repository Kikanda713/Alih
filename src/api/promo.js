import { apiBaseUrl } from "../auth/config";

/*
 * Codes promo des influenceurs Tindisa.
 * - Un lien partagé « https://tindisa.com/?promo=CODE » pré-remplit le code :
 *   il est mémorisé pour la session (sessionStorage, protégé par try/catch).
 * - Le code est demandé à CHAQUE transaction (vente conclue, paiement de
 *   certificat). Sur un certificat, il donne une remise au demandeur.
 *
 *   GET /v1/promo/:code/check?kind=cert|sale  (public)
 *   → { valid, reason?, discountRate, influencerName }
 */

const KEY = "tindisa_promo";
export const PROMO_SHARE_BASE = "https://tindisa.com/?promo=";

/** Code normalisé : majuscules, lettres/chiffres/tiret/souligné, 32 caractères au plus. */
export function normalizePromo(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
}

export function getStoredPromo() {
  try {
    return normalizePromo(sessionStorage.getItem(KEY));
  } catch {
    return "";
  }
}

export function storePromo(code) {
  try {
    const c = normalizePromo(code);
    if (c) sessionStorage.setItem(KEY, c);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible (mode privé) : sans conséquence */
  }
}

/** À appeler au démarrage : mémorise ?promo=CODE de l'URL courante. */
export function capturePromoFromUrl() {
  try {
    const code = normalizePromo(new URLSearchParams(window.location.search).get("promo"));
    if (code) storePromo(code);
  } catch {
    /* URL illisible : ignoré */
  }
}

export const promoShareLink = (code) => PROMO_SHARE_BASE + encodeURIComponent(normalizePromo(code));

/** Taux accepté en fraction (0.1) ou en pourcentage (10). Renvoie une fraction. */
export function toRate(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1 ? n / 100 : n;
}

/** Montant après remise, arrondi au centime. */
export function discounted(amountUsd, rate) {
  const a = Number(amountUsd);
  if (!Number.isFinite(a)) return null;
  const discount = Math.round(a * toRate(rate) * 100) / 100;
  return { discount, total: Math.round((a - discount) * 100) / 100 };
}

const REASONS = {
  not_found: "Ce code promo n'existe pas.",
  unknown: "Ce code promo n'existe pas.",
  inactive: "Ce code promo n'est plus actif.",
  disabled: "Ce code promo n'est plus actif.",
  suspended: "Ce code promo est suspendu.",
  expired: "Ce code promo a expiré.",
  pending: "Ce code promo n'est pas encore actif.",
  self: "Vous ne pouvez pas utiliser votre propre code.",
  self_use: "Vous ne pouvez pas utiliser votre propre code.",
  own_code: "Vous ne pouvez pas utiliser votre propre code.",
  wrong_kind: "Ce code ne s'applique pas à cette opération.",
};

export function promoReasonLabel(reason) {
  return (typeof reason === "string" && REASONS[reason]) || "Code promo invalide.";
}

/** Erreur 400 { error:'invalid_promo', reason } renvoyée par un paiement. */
export const isInvalidPromoError = (e) => e?.code === "invalid_promo" || e?.data?.error === "invalid_promo";

export async function checkPromo(code, kind = "cert") {
  const c = normalizePromo(code);
  if (!c) return { valid: false, reason: "not_found" };
  const res = await fetch(
    `${apiBaseUrl}/v1/promo/${encodeURIComponent(c)}/check?kind=${encodeURIComponent(kind)}`,
  );
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok && !data) throw new Error(`Vérification indisponible (${res.status})`);
  return {
    valid: data?.valid === true,
    reason: typeof data?.reason === "string" ? data.reason : undefined,
    discountRate: toRate(data?.discountRate),
    influencerName: typeof data?.influencerName === "string" ? data.influencerName : "",
    code: c,
  };
}

/** Montant après remise d'un code appliqué (cert), ou null s'il n'y a pas de remise. */
export function promoTotal(amountUsd, applied) {
  if (!applied || amountUsd == null) return null;
  const c = discounted(amountUsd, applied.discountRate);
  return c && c.discount > 0 ? c.total : null;
}

/** Montant numérique tiré d'un libellé comme « 25 $ » ou « 22,5 $ ». */
export function amountOf(label) {
  if (typeof label === "number") return Number.isFinite(label) ? label : null;
  const m = String(label || "").replace(/\s/g, "").replace(",", ".").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
