import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCertificate,
  FaClock,
  FaCopy,
  FaCreditCard,
  FaDownload,
  FaExclamationTriangle,
  FaIdCard,
  FaPlus,
  FaSyncAlt,
  FaTimes,
  FaTools,
} from "react-icons/fa";
import { useTindisaApi } from "../../api/client";
import { useLoad } from "../../api/useLoad";
import { useTaxonomy } from "../../api/taxonomy";
import { useToast } from "../../components/useToast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Spinner,
} from "../../components/ui.jsx";
import {
  RENEW_WINDOW_DAYS,
  daysUntil,
  fmtDate,
  priceSymbol,
  renewalSentOf,
  textOf,
  useCertActions,
  verifyLinkOf,
} from "./certCommon";
import { CertDecisionCard, CertDocsEditor, CertFlow, CertPaidCard } from "./CertParts.jsx";

/*
 * Certificat d'aptitude professionnelle (CAP) des techniciens / artisans.
 * Dossier (pièces + références) → vérification Tindisa → certificat imprimable
 * valable 2 ans, renouvelable. Route : /dashboard/certificat-pro.
 */

const ENDPOINT = "/v1/merchant/certificates/pro";

const DOC_TYPES = [
  { value: "identity", label: "Pièce d'identité" },
  { value: "diploma", label: "Diplôme / certificat de formation" },
  { value: "attestation", label: "Attestation d'employeur" },
  { value: "license", label: "Agrément, inscription à l'ordre ou permis" },
  { value: "other", label: "Autre justificatif" },
];

const EMPTY_REF = { name: "", phone: "", relation: "" };

export default function ProCertificatePage() {
  const api = useTindisaApi();
  const { notify } = useToast();
  const { busy, payLink, downloadPdf: dl, copyVerify: cp } = useCertActions({
    endpoint: ENDPOINT,
    api,
    notify,
    fileStem: "certificat-pro",
  });
  const taxonomy = useTaxonomy();

  const { data, loading, error, setData } = useLoad(
    () => api.get(ENDPOINT),
    [],
  );

  const [editing, setEditing] = useState(false);

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
  const sym = priceSymbol(price);
  const tradeLabel = (id) =>
    id === "autre" && data.profile?.otherTrade
      ? data.profile.otherTrade
      : (taxonomy?.trades || []).find((t) => t.id === id)?.label || id;
  const requiresLicense = !!(data.requiresLicense ?? cert?.requiresLicense);

  const downloadPdf = () => dl(cert?.serial);
  const copyVerify = () => cp(cert?.serial, verifyLinkOf(cert));

  const status = cert?.status || "none";
  const expired = !!cert?.expired;
  const left = daysUntil(cert?.validUntil);
  const issued = status === "issued";
  const renewable =
    issued && (expired || (left != null && left <= RENEW_WINDOW_DAYS));
  const renewalSent = issued && renewalSentOf(cert);
  const renewalPaid = renewalSent && !!(cert?.renewalPaid || cert?.updatePaid);
  const decided =
    status === "info_requested" || status === "rejected" || status === "revoked";
  // Formulaire : premier dépôt, ou ouvert à la demande (modifier, compléter,
  // renvoyer après refus, renouveler).
  const showForm = data.eligible && (!cert || editing);

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

      <CertFlow cert={cert} />

      {!data.eligible && (
        <Card className="procert-notice">
          <FaExclamationTriangle />
          <div>
            <strong>Profil professionnel incomplet</strong>
            <p>
              {textOf(data.reason) ||
                "Ce certificat est réservé aux techniciens et artisans. Complétez votre profil pro (métiers, zones d'intervention, expérience) pour déposer votre dossier."}
            </p>
            <Button as={Link} to="/dashboard/boutique" variant="primary">
              <FaTools /> Compléter mon profil
            </Button>
          </div>
        </Card>
      )}

      {cert && status === "requested" && !cert.paid && (
        <Card className="procert-status">
          <div className="procert-status-head">
            <Badge tone="warn">En attente de paiement</Badge>
          </div>
          <p className="dash-sub">
            Votre dossier au nom de <strong>{textOf(cert.holderName)}</strong> est
            enregistré. Réglez les frais pour que l'équipe Tindisa commence la
            vérification (identité, documents, références).
          </p>
          <div className="procert-actions">
            <Button variant="primary" onClick={payLink} disabled={busy === "pay"}>
              <FaCreditCard />{" "}
              {busy === "pay" ? "Ouverture…" : `Payer ${price.issue} ${sym}`}
            </Button>
            {!editing && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Modifier mon dossier
              </Button>
            )}
          </div>
        </Card>
      )}

      {cert && (status === "paid" || (status === "requested" && cert.paid)) && (
        <CertPaidCard
          cert={cert}
          text={`Paiement reçu. L'équipe Tindisa vérifie le dossier de ${
            textOf(cert.holderName) || "son titulaire"
          } et contacte vos références, puis délivre le certificat. Vous serez prévenu par message.`}
        >
          {!editing && (
            <div className="procert-actions">
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Compléter mon dossier
              </Button>
            </div>
          )}
        </CertPaidCard>
      )}

      {cert && decided && (
        <CertDecisionCard
          cert={cert}
          onResubmit={data.eligible && !editing ? () => setEditing(true) : null}
          resubmitLabel={
            status === "revoked"
              ? "Déposer un nouveau dossier"
              : status === "rejected"
                ? "Corriger et renvoyer mon dossier"
                : "Compléter et renvoyer mon dossier"
          }
        />
      )}

      {cert && issued && (
        <Card className="procert-status">
          <div className="procert-status-head">
            {expired ? (
              <Badge tone="danger">Expiré</Badge>
            ) : (
              <Badge tone="success">Certifié</Badge>
            )}
            {textOf(cert.serial) && <span className="procert-serial">{textOf(cert.serial)}</span>}
          </div>
          <dl className="procert-grid">
            <div>
              <dt>Titulaire</dt>
              <dd>{textOf(cert.holderName) || "Non précisé"}</dd>
            </div>
            <div>
              <dt>{expired ? "A expiré le" : "Valable jusqu'au"}</dt>
              <dd>{fmtDate(cert.validUntil) || "Non précisé"}</dd>
            </div>
            {data.profile?.trades?.length > 0 && (
              <div className="wide">
                <dt>Métiers</dt>
                <dd>{data.profile.trades.map(tradeLabel).filter((x) => typeof x === "string").join(", ")}</dd>
              </div>
            )}
          </dl>
          {renewalSent ? (
            <div className="procert-renew">
              <FaSyncAlt />
              <span>
                {renewalPaid
                  ? "Renouvellement payé : l'équipe Tindisa vérifie votre dossier puis prolonge votre certificat. Vous serez prévenu par message."
                  : "Votre dossier de renouvellement est enregistré. Payez le renouvellement pour que l'équipe Tindisa le traite."}
              </span>
            </div>
          ) : renewable ? (
            <div className="procert-renew">
              <FaExclamationTriangle />
              <span>
                {expired
                  ? "Votre certificat a expiré. Renouvelez-le pour rester visible comme professionnel certifié."
                  : `Votre certificat expire dans ${left} jour${left > 1 ? "s" : ""}. Pensez à le renouveler.`}
              </span>
            </div>
          ) : null}
          <div className="procert-actions">
            <Button variant="primary" onClick={downloadPdf} disabled={busy === "pdf"}>
              <FaDownload /> {busy === "pdf" ? "Préparation…" : "Télécharger mon certificat"}
            </Button>
            <Button variant="ghost" onClick={copyVerify}>
              <FaCopy /> Copier le lien de vérification
            </Button>
            {(renewalSent || renewable) && !renewalPaid && (
              <Button variant="primary" onClick={payLink} disabled={busy === "pay"}>
                <FaCreditCard />{" "}
                {busy === "pay" ? "Ouverture…" : `Payer le renouvellement (${price.update} ${sym})`}
              </Button>
            )}
            {(renewable || renewalSent) && !editing && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <FaSyncAlt /> {renewalSent ? "Modifier mon dossier de renouvellement" : "Envoyer mon dossier de renouvellement"}
              </Button>
            )}
          </div>
        </Card>
      )}

      {showForm && (
        <DossierForm
          key={cert?.id || "new"}
          api={api}
          notify={notify}
          initial={cert}
          requiresLicense={requiresLicense}
          renewal={issued}
          onCancel={cert ? () => setEditing(false) : null}
          onSaved={(next) => {
            setData(next);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function DossierForm({ api, notify, initial, requiresLicense, renewal, onCancel, onSaved }) {
  const [holderName, setHolderName] = useState(initial?.holderName || "");
  const [docs, setDocs] = useState(() =>
    (initial?.documents || []).map((d) => ({ type: d.type || "other", url: d.url, note: d.note || "" })),
  );
  const [refs, setRefs] = useState(() => {
    const r = (initial?.references || []).map((x) => ({ ...EMPTY_REF, ...x }));
    while (r.length < 2) r.push({ ...EMPTY_REF });
    return r;
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasIdentity = docs.some((d) => d.type === "identity");
  const hasProof = docs.some((d) => d.type === "diploma" || d.type === "attestation");
  const hasLicense = docs.some((d) => d.type === "license");
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
  if (requiresLicense && !hasLicense) problems.push("votre agrément, inscription à l'ordre ou permis");
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
        {requiresLicense ? (
          <p className="procert-hint procert-hint-required">
            Votre métier est réglementé : joignez aussi votre agrément, votre
            inscription à l'ordre ou votre permis d'exercer (obligatoire).
          </p>
        ) : (
          <p className="procert-hint">
            Si vous avez un agrément, une inscription à l'ordre ou un permis
            d'exercer, vous pouvez aussi le joindre (facultatif).
          </p>
        )}
        <CertDocsEditor
          docs={docs}
          setDocs={setDocs}
          docTypes={DOC_TYPES}
          defaultType="identity"
          notify={notify}
          onUploadingChange={setUploading}
        />

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
