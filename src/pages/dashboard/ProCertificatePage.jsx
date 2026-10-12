import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  FaCertificate,
  FaCheckCircle,
  FaClock,
  FaCopy,
  FaCreditCard,
  FaDownload,
  FaExclamationTriangle,
  FaFileAlt,
  FaIdCard,
  FaPlus,
  FaSyncAlt,
  FaTimes,
  FaTools,
  FaUpload,
} from "react-icons/fa";
import { useTindisaApi } from "../../api/client";
import { useLoad } from "../../api/useLoad";
import { uploadImage } from "../../api/cloudinary";
import { useTaxonomy } from "../../api/taxonomy";
import { apiBaseUrl, auth0Config } from "../../auth/config";
import { useToast } from "../../components/useToast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
} from "../../components/ui.jsx";

/*
 * Certificat d'aptitude professionnelle (CAP) des techniciens / artisans.
 * Dossier (pièces + références) → vérification Tindisa → certificat imprimable
 * valable 2 ans, renouvelable. Route : /dashboard/certificat-pro.
 */

const ENDPOINT = "/v1/merchant/certificates/pro";
const VERIFY_BASE = "https://tindisa.com/verify?c=";
const RENEW_WINDOW_DAYS = 60;

const DOC_TYPES = [
  { value: "identity", label: "Pièce d'identité" },
  { value: "diploma", label: "Diplôme / certificat de formation" },
  { value: "attestation", label: "Attestation d'employeur" },
  { value: "other", label: "Autre justificatif" },
];
const docLabel = (t) =>
  DOC_TYPES.find((d) => d.value === t)?.label || "Justificatif";

const EMPTY_REF = { name: "", phone: "", relation: "" };

function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { dateStyle: "long" });
  } catch {
    return "";
  }
}
function daysUntil(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}
const isImageUrl = (u) =>
  !/\.pdf(\?|$)/i.test(u || "") &&
  (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(u || "") ||
    /\/image\/upload\//.test(u || ""));
const checkDone = (i) =>
  !!(i && (i.done ?? i.ok ?? i.checked ?? false));
const checkLabel = (i) =>
  typeof i === "string" ? i : i?.label || i?.key || "";

// Télécharge le PDF authentifié : accepte une réponse application/pdf brute
// comme la réponse JSON { base64 } des certificats d'actifs.
async function fetchPdfBlob(token) {
  const res = await fetch(`${apiBaseUrl}${ENDPOINT}/pdf`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const data = await res.json();
    if (data?.base64) {
      const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
      return new Blob([bytes], { type: "application/pdf" });
    }
    if (data?.url) return data.url;
    throw new Error("Certificat PDF indisponible pour le moment.");
  }
  return res.blob();
}

export default function ProCertificatePage() {
  const api = useTindisaApi();
  const { getAccessTokenSilently } = useAuth0();
  const { notify } = useToast();
  const taxonomy = useTaxonomy();

  const { data, loading, error, setData } = useLoad(
    () => api.get(ENDPOINT),
    [],
  );

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");

  if (loading) {
    return (
      <div className="dash-page">
        <Spinner label="Chargement…" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="dash-page">
        <EmptyState
          icon={<FaCertificate />}
          title="Service indisponible"
          text={error?.message || "Impossible de charger votre certificat pour le moment."}
        />
      </div>
    );
  }

  const cert = data.certificate || null;
  const price = cert?.price || data.price || { issue: 25, update: 10, currency: "USD" };
  const tradeLabel = (id) =>
    (taxonomy?.trades || []).find((t) => t.id === id)?.label || id;

  const payLink = async () => {
    setBusy("pay");
    try {
      const r = await api.post(`${ENDPOINT}/pay-link`, {});
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
      else notify("Lien de paiement indisponible", "error");
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    } finally {
      setBusy("");
    }
  };

  const downloadPdf = async () => {
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
      const out = await fetchPdfBlob(token);
      const href = typeof out === "string" ? out : URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${cert?.serial || "certificat-pro"}.pdf`;
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

  const copyVerify = async () => {
    const link = VERIFY_BASE + encodeURIComponent(cert?.serial || "");
    try {
      await navigator.clipboard.writeText(link);
      notify("Lien de vérification copié", "success");
    } catch {
      notify(link, "info");
    }
  };

  const status = cert?.status || "none";
  const expired = !!cert?.expired;
  const left = daysUntil(cert?.validUntil);
  const renewable =
    status === "issued" &&
    (expired || (left != null && left <= RENEW_WINDOW_DAYS));
  const showForm =
    data.eligible &&
    (editing || !cert || status === "revoked");

  // Étape courante de la frise : 0 dossier, 1 vérification, 2 délivré, 3 expiration.
  const step =
    !cert || status === "revoked" ? 0 : status === "requested" ? 1 : expired ? 3 : 2;
  const steps = [
    { label: "Dossier à déposer", icon: <FaFileAlt /> },
    { label: "En vérification", icon: <FaClock /> },
    { label: "Délivré", icon: <FaCheckCircle /> },
    {
      label: cert?.validUntil
        ? `${expired ? "Expiré le" : "Expire le"} ${fmtDate(cert.validUntil)}`
        : "Valable 2 ans",
      icon: <FaSyncAlt />,
    },
  ];

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <h1 className="dash-h1">
            <FaCertificate style={{ marginRight: 8 }} />
            Certificat d'aptitude professionnelle
          </h1>
          <p className="dash-sub">
            Prouvez votre savoir-faire à vos clients. Tindisa vérifie votre
            identité, vos diplômes ou attestations et vos références, puis
            délivre un certificat sécurisé, vérifiable en ligne et valable 2 ans.
          </p>
        </div>
      </header>

      <Card className="procert-intro">
        <ul className="procert-facts">
          <li>
            <FaIdCard /> <span>Identité et compétences vérifiées par Tindisa</span>
          </li>
          <li>
            <FaClock /> <span>Valable 2 ans, renouvelable</span>
          </li>
          <li>
            <FaCreditCard />{" "}
            <span>
              Émission {price.issue} {price.currency === "USD" ? "$" : price.currency},
              renouvellement {price.update} {price.currency === "USD" ? "$" : price.currency}
            </span>
          </li>
        </ul>
      </Card>

      <ol className="procert-steps" aria-label="Avancement">
        {steps.map((s, i) => (
          <li
            key={i}
            className={`procert-step${i < step ? " done" : ""}${i === step ? " current" : ""}${
              i === 3 && expired ? " warn" : ""
            }`}
          >
            <span className="procert-step-dot">{s.icon}</span>
            <span className="procert-step-label">{s.label}</span>
          </li>
        ))}
      </ol>

      {!data.eligible && (
        <Card className="procert-notice">
          <FaExclamationTriangle />
          <div>
            <strong>Profil professionnel incomplet</strong>
            <p>
              {data.reason ||
                "Ce certificat est réservé aux techniciens et artisans. Complétez votre profil pro (métiers, zones d'intervention, expérience) pour déposer votre dossier."}
            </p>
            <Button as={Link} to="/dashboard/boutique" variant="primary">
              <FaTools /> Compléter mon profil
            </Button>
          </div>
        </Card>
      )}

      {cert && status === "requested" && (
        <Card className="procert-status">
          <div className="procert-status-head">
            <Badge tone="warn">En vérification</Badge>
            {cert.paid ? (
              <Badge tone="success">Payé</Badge>
            ) : (
              <Badge tone="neutral">Paiement en attente</Badge>
            )}
          </div>
          <p className="dash-sub">
            Votre dossier au nom de <strong>{cert.holderName}</strong> est en
            cours de vérification. Nous contacterons vos références avant de
            délivrer le certificat.
          </p>
          <Checklist items={cert.checklist} />
          <div className="procert-actions">
            {!cert.paid && (
              <Button variant="primary" onClick={payLink} disabled={busy === "pay"}>
                <FaCreditCard />{" "}
                {busy === "pay"
                  ? "Ouverture…"
                  : `Payer ${cert.serial ? price.update : price.issue} $`}
              </Button>
            )}
            {!editing && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Compléter mon dossier
              </Button>
            )}
          </div>
        </Card>
      )}

      {cert && status === "issued" && (
        <Card className="procert-status">
          <div className="procert-status-head">
            {expired ? (
              <Badge tone="danger">Expiré</Badge>
            ) : (
              <Badge tone="success">Valide</Badge>
            )}
            <span className="procert-serial">{cert.serial}</span>
          </div>
          <dl className="procert-grid">
            <div>
              <dt>Titulaire</dt>
              <dd>{cert.holderName}</dd>
            </div>
            <div>
              <dt>{expired ? "A expiré le" : "Valable jusqu'au"}</dt>
              <dd>{fmtDate(cert.validUntil) || "Non précisé"}</dd>
            </div>
            {data.profile?.trades?.length > 0 && (
              <div className="wide">
                <dt>Métiers</dt>
                <dd>{data.profile.trades.map(tradeLabel).join(", ")}</dd>
              </div>
            )}
          </dl>
          {renewable && (
            <div className="procert-renew">
              <FaExclamationTriangle />
              <span>
                {expired
                  ? "Votre certificat a expiré. Renouvelez-le pour rester visible comme professionnel certifié."
                  : `Votre certificat expire dans ${left} jour${left > 1 ? "s" : ""}. Pensez à le renouveler.`}
              </span>
            </div>
          )}
          <div className="procert-actions">
            <Button variant="primary" onClick={downloadPdf} disabled={busy === "pdf"}>
              <FaDownload /> {busy === "pdf" ? "Préparation…" : "Télécharger mon certificat"}
            </Button>
            <Button variant="ghost" onClick={copyVerify}>
              <FaCopy /> Lien de vérification
            </Button>
            {renewable && !editing && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <FaSyncAlt /> Renouveler ({price.update} $)
              </Button>
            )}
          </div>
        </Card>
      )}

      {cert && status === "revoked" && (
        <Card className="procert-notice">
          <FaTimes />
          <div>
            <strong>Certificat révoqué</strong>
            <p>
              Votre précédent certificat a été révoqué. Vous pouvez déposer un
              nouveau dossier ci-dessous.
            </p>
          </div>
        </Card>
      )}

      {showForm && (
        <DossierForm
          key={cert?.id || "new"}
          api={api}
          notify={notify}
          initial={cert}
          renewal={renewable}
          onCancel={cert && status !== "revoked" ? () => setEditing(false) : null}
          onSaved={(next) => {
            setData(next);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function Checklist({ items }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  return (
    <div className="cert-doc-checks procert-checks">
      {list.map((i, idx) => (
        <span key={idx} className={`cert-check-badge${checkDone(i) ? " ok" : ""}`}>
          {checkDone(i) ? <FaCheckCircle /> : <FaClock />} {checkLabel(i)}
        </span>
      ))}
    </div>
  );
}

function DossierForm({ api, notify, initial, renewal, onCancel, onSaved }) {
  const [holderName, setHolderName] = useState(initial?.holderName || "");
  const [docs, setDocs] = useState(() =>
    (initial?.documents || []).map((d) => ({ type: d.type || "other", url: d.url, note: d.note || "" })),
  );
  const [refs, setRefs] = useState(() => {
    const r = (initial?.references || []).map((x) => ({ ...EMPTY_REF, ...x }));
    while (r.length < 2) r.push({ ...EMPTY_REF });
    return r;
  });
  const [docType, setDocType] = useState("identity");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (docs.length + files.length > 6) {
      notify("6 documents au maximum", "error");
      return;
    }
    setUploading(true);
    try {
      for (const f of files) {
        const url = await uploadImage(f);
        setDocs((d) => [...d, { type: docType, url, note: "" }]);
      }
    } catch (err) {
      notify(err?.message || "Échec du téléversement", "error");
    } finally {
      setUploading(false);
    }
  };

  const hasIdentity = docs.some((d) => d.type === "identity");
  const hasProof = docs.some((d) => d.type === "diploma" || d.type === "attestation");
  const cleanRefs = refs
    .map((r) => ({ name: r.name.trim(), phone: r.phone.trim(), relation: r.relation.trim() }))
    .filter((r) => r.name || r.phone);
  const refsOk =
    cleanRefs.length >= 2 &&
    cleanRefs.length <= 3 &&
    cleanRefs.every((r) => r.name && r.phone.replace(/\D/g, "").length >= 8);

  const problems = [];
  if (!holderName.trim()) problems.push("le nom du titulaire");
  if (!hasIdentity) problems.push("une pièce d'identité");
  if (!hasProof) problems.push("un diplôme ou une attestation d'employeur");
  if (docs.length < 2) problems.push("au moins 2 documents");
  if (!refsOk) problems.push("2 ou 3 références avec nom et téléphone");

  const submit = async (e) => {
    e.preventDefault();
    if (problems.length) {
      notify(`Il manque : ${problems.join(", ")}.`, "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        holderName: holderName.trim(),
        documents: docs.map((d) => ({
          type: d.type,
          url: d.url,
          ...(d.note.trim() ? { note: d.note.trim() } : {}),
        })),
        references: cleanRefs.map((r) => ({
          name: r.name,
          phone: r.phone,
          ...(r.relation ? { relation: r.relation } : {}),
        })),
      };
      const next = await api.post(ENDPOINT, body);
      notify(
        renewal ? "Demande de renouvellement envoyée" : "Dossier envoyé pour vérification",
        "success",
      );
      onSaved(next);
    } catch (err) {
      notify(err?.message || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="procert-form">
      <form onSubmit={submit} className="product-form">
        <h2 className="procert-h2">
          {renewal ? "Renouveler mon certificat" : "Mon dossier"}
        </h2>
        <Field label="Nom complet du titulaire" hint="Tel qu'il figure sur votre pièce d'identité.">
          <Input
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            placeholder="Ex. Jean Mukendi"
            autoComplete="name"
          />
        </Field>

        <h3 className="dash-h3">Documents ({docs.length}/6)</h3>
        <p className="procert-hint">
          Joignez une pièce d'identité et au moins un diplôme, certificat de
          formation ou attestation d'employeur (photos lisibles).
        </p>
        <div className="procert-docs">
          {docs.map((d, i) => (
            <div key={d.url + i} className="procert-doc">
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="procert-doc-thumb">
                {isImageUrl(d.url) ? <img src={d.url} alt={docLabel(d.type)} /> : <FaFileAlt />}
              </a>
              <div className="procert-doc-body">
                <Select
                  value={d.type}
                  options={DOC_TYPES}
                  onChange={(e) =>
                    setDocs((all) => all.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))
                  }
                  aria-label="Type de document"
                />
                <Input
                  value={d.note}
                  placeholder="Précision (facultatif)"
                  onChange={(e) =>
                    setDocs((all) => all.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))
                  }
                />
              </div>
              <button
                type="button"
                className="cat-icon-btn danger procert-doc-remove"
                title="Retirer"
                aria-label="Retirer ce document"
                onClick={() => setDocs((all) => all.filter((_, j) => j !== i))}
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>
        {docs.length < 6 && (
          <div className="procert-upload">
            <Select
              value={docType}
              options={DOC_TYPES}
              onChange={(e) => setDocType(e.target.value)}
              aria-label="Type du document à ajouter"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <FaUpload /> {uploading ? "Téléversement…" : "Ajouter un document"}
            </Button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={onFile} />
          </div>
        )}

        <h3 className="dash-h3">Références (2 à 3)</h3>
        <p className="procert-hint">
          Anciens clients, employeurs ou formateurs que nous pourrons appeler.
        </p>
        {refs.map((r, i) => (
          <div key={i} className="procert-ref">
            <Input
              value={r.name}
              placeholder="Nom"
              onChange={(e) => setRefs((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <Input
              type="tel"
              value={r.phone}
              placeholder="Téléphone"
              onChange={(e) => setRefs((all) => all.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))}
            />
            <Input
              value={r.relation}
              placeholder="Lien (client, employeur…)"
              onChange={(e) =>
                setRefs((all) => all.map((x, j) => (j === i ? { ...x, relation: e.target.value } : x)))
              }
            />
            {refs.length > 2 && (
              <button
                type="button"
                className="cat-icon-btn danger"
                title="Retirer"
                aria-label="Retirer cette référence"
                onClick={() => setRefs((all) => all.filter((_, j) => j !== i))}
              >
                <FaTimes />
              </button>
            )}
          </div>
        ))}
        {refs.length < 3 && (
          <Button type="button" variant="ghost" onClick={() => setRefs((all) => [...all, { ...EMPTY_REF }])}>
            <FaPlus /> Ajouter une référence
          </Button>
        )}

        <div className="ui-modal-foot procert-foot">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={saving || uploading}>
            {saving ? "Envoi…" : renewal ? "Envoyer ma demande de renouvellement" : "Envoyer mon dossier"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
