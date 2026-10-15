import { FaDownload, FaImages, FaLink } from "react-icons/fa";
import { useLoad } from "../api/useLoad";
import { Button, Card } from "./ui.jsx";
import { copyText, downloadImage, txt } from "./influencerCommon";

/*
 * Kit visuel de l'influenceur (/dashboard/influenceur) ; ses sélections : InfluencerSelections.jsx.
 *   GET /v1/merchant/influencer/visual-kit  → { ok, code, images:[{kind,label,url}], verifyUrl }
 * Les images (PNG 1080x1080) sont générées par l'API Tindisa et se partagent
 * telles quelles sur WhatsApp, Facebook, TikTok…
 */

const ENDPOINT = "/v1/merchant/influencer";

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
