import { formatPrice } from "../market/lib/format.js";

/*
 * Programme influenceur : libellés et normalisation communs au back-office
 * et à l'espace commerçant. Jamais d'objet rendu tel quel : tout passe par txt().
 */

export const txt = (v) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export const usd = (v) => formatPrice(num(v), "USD");

/** Taux renvoyé en fraction (0.5) ou en pourcentage (50) → pourcentage affichable. */
export const pctOf = (v) => {
  const n = num(v);
  const p = n > 0 && n <= 1 ? n * 100 : n;
  return Math.round(p * 10) / 10;
};

export function fmtDate(d, withTime = false) {
  if (!d) return "·";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "·";
  return t.toLocaleString(
    "fr-FR",
    withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium" },
  );
}

export const KIND_LABEL = {
  shop_owner: "Commerçant",
  individual: "Particulier",
  external: "Externe",
};

export const STATUS = {
  pending: { tone: "warn", label: "En attente" },
  active: { tone: "success", label: "Actif" },
  suspended: { tone: "danger", label: "Suspendu" },
};
export const statusOf = (s) => STATUS[s] || { tone: "neutral", label: txt(s) || "·" };

export const EARN_STATUS = {
  pending: {
    tone: "warn",
    label: "En attente",
    hint: "Commission pas encore encaissée par Tindisa auprès du vendeur",
  },
  acquired: { tone: "success", label: "Acquis", hint: "Gain acquis, prêt à être versé" },
  paid: { tone: "neutral", label: "Versé", hint: "Déjà versé à l'influenceur" },
  void: { tone: "danger", label: "Annulé", hint: "Vente ou paiement annulé" },
};
export const earnStatusOf = (s) =>
  EARN_STATUS[s] || { tone: "neutral", label: txt(s) || "·", hint: "" };

export const SOURCE_LABEL = { sale: "Vente conclue", cert: "Certificat" };

export const METHODS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "orange", label: "Orange Money" },
  { value: "airtel", label: "Airtel Money" },
  { value: "other", label: "Autre" },
];
export const methodLabel = (m) => METHODS.find((x) => x.value === m)?.label || txt(m) || "·";

/** Codes : [string] ou [{ code, active }] → [{ code, active }]. */
export function codesOf(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((c) =>
      typeof c === "string"
        ? { code: c, active: true }
        : c && typeof c === "object" && txt(c.code)
          ? { code: txt(c.code), active: c.active !== false }
          : null,
    )
    .filter(Boolean);
}

export const arr = (v) => (Array.isArray(v) ? v : []);

/** Copie dans le presse-papiers ; repli : affiche le texte dans une notification. */
export async function copyText(text, notify, okMsg = "Copié") {
  try {
    await navigator.clipboard.writeText(text);
    notify?.(okMsg, "success");
  } catch {
    notify?.(text, "info");
  }
}

/** Téléchargement d'une image d'une autre origine (l'attribut download y est ignoré). */
export async function downloadImage(url, name) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 5000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}
