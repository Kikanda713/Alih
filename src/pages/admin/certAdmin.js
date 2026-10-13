/*
 * Outils du back-office de certification (tous types : actif, aptitude pro,
 * établissement) : paiement, dispense de paiement, statuts.
 *
 * Statuts : requested (attente de paiement) → paid (payé, à vérifier) →
 * issued | rejected | info_requested ; revoked.
 */

export const WAIVE_MIN = 5;
export const REASON_MIN = 5;
export const EMPTY_WAIVE = { on: false, reason: "" };

export const txt = (v) =>
  typeof v === "string" || typeof v === "number" ? String(v) : "";

/** Statut effectif d'une ligne (un « requested » déjà payé = à vérifier). */
export function certRowStatus(row, fallback = "none") {
  const st = row?.certStatus || row?.status || fallback;
  if (st === "requested" && row?.paid === true) return "paid";
  return st;
}

/** Délivrer / mettre à jour exige un paiement (ou une dispense) ? */
export const needsPayment = (row, forced) => forced || row?.paid !== true;

/** La dispense est valide (ou inutile). */
export const waiveOk = (unpaid, w) =>
  !unpaid || (!!w?.on && String(w.reason || "").trim().length >= WAIVE_MIN);

/** Champs à ajouter au corps de la requête quand l'admin dispense du paiement. */
export const waiveBody = (unpaid, w) =>
  unpaid && w?.on
    ? { waivePayment: true, waiveReason: String(w.reason || "").trim() }
    : {};

/** 409 { error:'payment_required' } renvoyé par issue / renew / update. */
export const isPaymentRequired = (e) =>
  e?.status === 409 || /payment_required/i.test(String(e?.message || ""));

export const PAYMENT_REQUIRED_MSG =
  "Paiement non reçu. Cochez « Délivrer sans paiement » et indiquez un motif pour continuer.";
