import { useRef, useState } from "react";
import { FaCheckCircle, FaClock, FaFileAlt, FaTimes, FaUpload } from "react-icons/fa";
import { uploadImage } from "../../api/cloudinary";
import { Button, Input, Select } from "../../components/ui.jsx";
import { checkDone, checkLabel, isImageUrl } from "./certCommon";

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

/** Frise d'avancement : `steps` = [{ label, icon }], `step` = index courant. */
export function CertSteps({ steps, step, lastWarn }) {
  return (
    <ol className="procert-steps" aria-label="Avancement">
      {steps.map((s, i) => (
        <li
          key={i}
          className={`procert-step${i < step ? " done" : ""}${i === step ? " current" : ""}${
            i === steps.length - 1 && lastWarn ? " warn" : ""
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
