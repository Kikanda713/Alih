import { useRef, useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaFileAlt,
  FaRedo,
  FaSearch,
  FaTimes,
  FaUpload,
} from "react-icons/fa";
import { uploadImage } from "../../api/cloudinary";
import { Badge, Button, Card, Input, Select } from "../../components/ui.jsx";
import {
  certStepOf,
  checkDone,
  checkLabel,
  decisionReasonOf,
  fmtDate,
  isImageUrl,
  textOf,
} from "./certCommon";

/* Morceaux d'interface partagés par les pages de certificats du tableau de bord. */

export function CertChecklist({ items }) {
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

/**
 * Frise d'avancement : `steps` = [{ label, icon }], `step` = index courant.
 * `warnAt` : index d'une étape à signaler (refus, complément, expiration).
 */
export function CertSteps({ steps, step, lastWarn, warnAt }) {
  return (
    <ol className="procert-steps" aria-label="Avancement">
      {steps.map((s, i) => (
        <li
          key={i}
          className={`procert-step${i < step ? " done" : ""}${i === step ? " current" : ""}${
            (i === steps.length - 1 && lastWarn) || i === warnAt ? " warn" : ""
          }`}
        >
          <span className="procert-step-dot">{s.icon}</span>
          <span className="procert-step-label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Liste de justificatifs téléversés sur Cloudinary, avec type et précision.
 * `docs` = [{ type, url, note }], mis à jour via `setDocs` (fonction d'état).
 */
export function CertDocsEditor({ docs, setDocs, docTypes, defaultType, max = 6, notify, addLabel = "Ajouter un document", onUploadingChange }) {
  const [docType, setDocType] = useState(defaultType || docTypes[0]?.value);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const docLabel = (t) => docTypes.find((d) => d.value === t)?.label || "Document";

  const setBusy = (v) => {
    setUploading(v);
    onUploadingChange?.(v);
  };

  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (docs.length + files.length > max) {
      notify(`${max} documents au maximum`, "error");
      return;
    }
    setBusy(true);
    try {
      for (const f of files) {
        const url = await uploadImage(f);
        setDocs((d) => [...d, { type: docType, url, note: "" }]);
      }
    } catch (err) {
      notify(err?.message || "Échec du téléversement", "error");
    } finally {
      setBusy(false);
    }
  };

  const patch = (i, p) => setDocs((all) => all.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <>
      <div className="procert-docs">
        {docs.map((d, i) => (
          <div key={d.url + i} className="procert-doc">
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="procert-doc-thumb">
              {isImageUrl(d.url) ? <img src={d.url} alt={docLabel(d.type)} /> : <FaFileAlt />}
            </a>
            <div className="procert-doc-body">
              <Select
                value={d.type}
                options={docTypes}
                onChange={(e) => patch(i, { type: e.target.value })}
                aria-label="Type de document"
              />
              <Input
                value={d.note}
                placeholder="Précision (facultatif)"
                onChange={(e) => patch(i, { note: e.target.value })}
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
      {docs.length < max && (
        <div className="procert-upload">
          <Select
            value={docType}
            options={docTypes}
            onChange={(e) => setDocType(e.target.value)}
            aria-label="Type du document à ajouter"
          />
          <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <FaUpload /> {uploading ? "Téléversement…" : addLabel}
          </Button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={onFile} />
        </div>
      )}
    </>
  );
}

/**
 * Frise commune Demande → Paiement → Vérification → Délivré, dérivée du statut.
 * `reviewLabel` remplace « Vérification » (ex. « Visite » pour un établissement).
 */
export function CertFlow({ cert, reviewLabel = "Vérification", reviewIcon }) {
  const status = cert?.status || "none";
  const expired = !!cert?.expired;
  const steps = [
    { label: "Demande", icon: <FaFileAlt /> },
    { label: "Paiement", icon: <FaCreditCard /> },
    { label: reviewLabel, icon: reviewIcon || <FaSearch /> },
    {
      label:
        status === "issued" && cert?.validUntil
          ? `${expired ? "Expiré le" : "Délivré, valable jusqu'au"} ${fmtDate(cert.validUntil)}`
          : "Délivré",
      icon: <FaCheckCircle />,
    },
  ];
  const warnAt = status === "info_requested" || status === "rejected" ? 2 : undefined;
  return (
    <CertSteps
      steps={steps}
      step={certStepOf(status, !!cert?.paid)}
      lastWarn={status === "issued" && expired}
      warnAt={warnAt}
    />
  );
}

const DECISION = {
  info_requested: {
    tone: "warn",
    badge: "Complément demandé",
    title: "L'équipe Tindisa a besoin d'un complément",
    help: "Complétez votre dossier puis renvoyez-le. Si vous avez déjà payé, vous n'aurez rien à repayer.",
  },
  rejected: {
    tone: "danger",
    badge: "Refusé",
    title: "Demande refusée",
    help: "Vous pouvez corriger votre dossier et le soumettre de nouveau.",
  },
  revoked: {
    tone: "danger",
    badge: "Révoqué",
    title: "Certificat révoqué",
    help: "Ce certificat n'est plus valable. Vous pouvez déposer une nouvelle demande.",
  },
};

/** Décision de l'équipe (complément demandé, refus, révocation) avec son motif. */
export function CertDecisionCard({ cert, onResubmit, resubmitLabel = "Compléter et renvoyer mon dossier" }) {
  const d = DECISION[cert?.status];
  if (!d) return null;
  const reason = decisionReasonOf(cert);
  return (
    <Card className="procert-status">
      <div className="procert-status-head">
        <Badge tone={d.tone}>{d.badge}</Badge>
        {cert?.status !== "revoked" && cert?.paid === true && <Badge tone="success">Payé</Badge>}
        {textOf(cert?.serial) && <span className="procert-serial">{textOf(cert.serial)}</span>}
      </div>
      <strong>{d.title}</strong>
      {reason && (
        <blockquote className="procert-reason">
          {cert.status === "revoked" ? "Motif : " : ""}
          {reason}
        </blockquote>
      )}
      <p className="dash-sub">{d.help}</p>
      {onResubmit && (
        <div className="procert-actions">
          <Button variant="primary" onClick={onResubmit}>
            {cert.status === "revoked" ? <FaFileAlt /> : <FaRedo />} {resubmitLabel}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Paiement reçu : le dossier attend la vérification de l'équipe Tindisa. */
export function CertPaidCard({ cert, text, children }) {
  return (
    <Card className="procert-status">
      <div className="procert-status-head">
        <Badge tone="warn">Vérification en cours</Badge>
        <Badge tone="success">Payé</Badge>
      </div>
      <p className="dash-sub">
        {text ||
          "Paiement reçu. L'équipe Tindisa vérifie votre dossier puis délivre le certificat. Vous serez prévenu par message."}
      </p>
      <CertChecklist items={cert?.checklist} />
      {children}
    </Card>
  );
}
