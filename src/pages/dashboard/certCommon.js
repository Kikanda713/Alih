import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { apiBaseUrl, auth0Config } from "../../auth/config";

/*
 * Outils communs aux pages de certificats du tableau de bord
 * (aptitude professionnelle, établissement vérifié).
 */

export const VERIFY_BASE = "https://tindisa.com/verify?c=";
export const RENEW_WINDOW_DAYS = 60;

// Points contrôlés par défaut lors de la visite d'un établissement (miroir du backend).
export const DEFAULT_SHOP_CHECKLIST = [
  "Établissement visité à l'adresse indiquée",
  "Produits annoncés réellement disponibles",
  "Prix conformes aux annonces",
  "Réactivité aux messages et appels",
  "Documents légaux présentés",
  "Hygiène et propreté des lieux",
];


export function fmtDate(d) {
  if (!d) return "";
  try {
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return "";
    return t.toLocaleDateString("fr-FR", { dateStyle: "long" });
  } catch {
    return "";
  }
}

export function daysUntil(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

export const isImageUrl = (u) =>
  typeof u === "string" &&
  !/\.pdf(\?|$)/i.test(u) &&
  (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(u) || /\/image\/upload\//.test(u));

export const checkDone = (i) => !!(i && typeof i === "object" && (i.done ?? i.ok ?? i.checked ?? false));
export const checkLabel = (i) =>
  typeof i === "string" ? i : String(i?.label || i?.key || "");

export const priceSymbol = (price) =>
  !price?.currency || price.currency === "USD" ? "$" : price.currency;

// Télécharge le PDF authentifié : accepte une réponse application/pdf brute
// comme la réponse JSON { base64 } ou { url }.
async function fetchPdf(endpoint, token) {
  const res = await fetch(`${apiBaseUrl}${endpoint}/pdf`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const data = await res.json();
    if (data?.base64) {
      const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
      return { out: new Blob([bytes], { type: "application/pdf" }), fileName: data.fileName };
    }
    if (data?.url) return { out: data.url, fileName: data.fileName };
    throw new Error("Certificat PDF indisponible pour le moment.");
  }
  return { out: await res.blob() };
}

/**
 * Actions d'un certificat marchand : lien de paiement, PDF, lien de vérification.
 * `busy` vaut "pay" ou "pdf" pendant l'action.
 */
export function useCertActions({ endpoint, api, notify, fileStem }) {
  const { getAccessTokenSilently } = useAuth0();
  const [busy, setBusy] = useState("");

  const payLink = async () => {
    setBusy("pay");
    try {
      const r = await api.post(`${endpoint}/pay-link`, {});
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
      else notify("Lien de paiement indisponible", "error");
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    } finally {
      setBusy("");
    }
  };

  const downloadPdf = async (serial) => {
    setBusy("pdf");
    try {
      let token = null;
      try {
        token = await getAccessTokenSilently(
          auth0Config.audience
            ? { authorizationParams: { audience: auth0Config.audience } }
            : undefined,
        );
      } catch {
        /* sans token : le backend répondra 401 */
      }
      const { out, fileName } = await fetchPdf(endpoint, token);
      const href = typeof out === "string" ? out : URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = href;
      a.download = fileName || `${serial || fileStem}.pdf`;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (typeof out !== "string") setTimeout(() => URL.revokeObjectURL(href), 60000);
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    } finally {
      setBusy("");
    }
  };

  const copyVerify = async (serial) => {
    const link = VERIFY_BASE + encodeURIComponent(serial || "");
    try {
      await navigator.clipboard.writeText(link);
      notify("Lien de vérification copié", "success");
    } catch {
      notify(link, "info");
    }
  };

  return { busy, payLink, downloadPdf, copyVerify };
}
