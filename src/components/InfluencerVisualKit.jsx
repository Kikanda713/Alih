import { FaCopy, FaDownload, FaEye, FaImages, FaLink, FaMousePointer, FaRegClock } from "react-icons/fa";
import { useLoad } from "../api/useLoad";
import { Badge, Button, Card } from "./ui.jsx";
import { copyText, fmtDate, txt } from "./influencerCommon";

/*
 * Kit visuel et sélections de l'influenceur (/dashboard/influenceur).
 *   GET /v1/merchant/influencer/visual-kit  → { ok, code, images:[{kind,label,url}], verifyUrl }
 *   GET /v1/merchant/influencer/collections → { collections:[{ slug, title, status, itemCount, views, clicks, expiresAt, shareUrl, imageUrl }] }
 * Les images (PNG 1080x1080) sont générées par l'API Tindisa et se partagent
 * telles quelles sur WhatsApp, Facebook, TikTok…
 */

const ENDPOINT = "/v1/merchant/influencer";

/** Téléchargement d'une image d'une autre origine (l'attribut download y est ignoré). */
async function downloadImage(url, name) {
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

const SEL_STATUS = {
  published: { tone: "success", label: "En ligne" },
  draft: { tone: "neutral", label: "Brouillon" },
  expired: { tone: "warn", label: "Expirée" },
};

export function VisualKitCard({ api, notify }) {
  const { data } = useLoad(() => api.get(`${ENDPOINT}/visual-kit`), []);
  const images = Array.isArray(data?.images) ? data.images.filter((i) => txt(i?.url)) : [];
  if (!data?.ok || !images.length) return null;
  return (
    <Card className="infl-card">
      <h2 className="dash-h3">
        <FaImages /> Kit visuel
      </h2>
      <p className="dash-sub">
        Des images prêtes à publier avec votre code {txt(data.code)}. Le QR code mène vers Tindisa avec votre code déjà appliqué.
      </p>
      <div className="infl-kit-grid">
        {images.map((img) => (
          <figure key={img.kind} className="infl-kit-item">
            <img src={img.url} alt={txt(img.label)} loading="lazy" width="1080" height="1080" />
            <figcaption>{txt(img.label)}</figcaption>
            <div className="infl-code-actions">
              <Button size="sm" onClick={() => downloadImage(img.url, `tindisa-${img.kind}-${txt(data.code)}.png`)}>
                <FaDownload /> Télécharger
              </Button>
              <Button variant="ghost" size="sm" onClick={() => copyText(img.url, notify, "Lien de l'image copié")}>
                <FaLink /> Lien
              </Button>
            </div>
          </figure>
        ))}
      </div>
      {txt(data.verifyUrl) && (
        <p className="infl-chat-tip">
          <FaLink /> Exemple de certificat vérifiable par tous : {txt(data.verifyUrl)}
        </p>
      )}
    </Card>
  );
}

export function SelectionsCard({ api, notify }) {
  const { data } = useLoad(() => api.get(`${ENDPOINT}/collections`), []);
  const list = Array.isArray(data?.collections) ? data.collections : [];
  return (
    <Card className="infl-card">
      <h2 className="dash-h3">
        <FaImages /> Vos sélections
      </h2>
      {list.length === 0 ? (
        <p className="dash-sub">
          Composez une sélection d'articles depuis WhatsApp ou Telegram : écrivez « crée une sélection » à
          l'assistant Tindisa, ajoutez jusqu'à 12 articles puis publiez. Le lien reste en ligne 7 jours.
        </p>
      ) : (
        <ul className="infl-sel-list">
          {list.map((c) => {
            const st = SEL_STATUS[c.status] || SEL_STATUS.draft;
            return (
              <li key={c.slug} className="infl-sel">
                <div className="infl-sel-main">
                  <strong>{txt(c.title)}</strong>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <div className="infl-sel-stats">
                  <span>{Number(c.itemCount) || 0} article{Number(c.itemCount) > 1 ? "s" : ""}</span>
                  <span><FaEye /> {Number(c.views) || 0} vue{Number(c.views) > 1 ? "s" : ""}</span>
                  <span><FaMousePointer /> {Number(c.clicks) || 0} clic{Number(c.clicks) > 1 ? "s" : ""}</span>
                  <span><FaRegClock /> {c.status === "expired" ? "Expirée le" : "Jusqu'au"} {fmtDate(c.expiresAt)}</span>
                </div>
                {c.status === "published" && txt(c.shareUrl) && (
                  <div className="infl-code-actions">
                    <Button variant="ghost" size="sm" onClick={() => copyText(c.shareUrl, notify, "Lien copié")}>
                      <FaCopy /> Copier le lien
                    </Button>
                    {txt(c.imageUrl) && (
                      <Button variant="ghost" size="sm" onClick={() => downloadImage(c.imageUrl, `tindisa-selection-${c.slug}.png`)}>
                        <FaDownload /> Image
                      </Button>
                    )}
                    {txt(c.pageUrl) && (
                      <Button as="a" variant="secondary" size="sm" href={c.pageUrl} target="_blank" rel="noopener noreferrer">
                        Voir la page
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
