import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBoxes,
  FaCalendarCheck,
  FaCertificate,
  FaCheckCircle,
  FaClipboardCheck,
  FaClock,
  FaCopy,
  FaCreditCard,
  FaDownload,
  FaExclamationTriangle,
  FaFileSignature,
  FaSearchLocation,
  FaStore,
  FaSyncAlt,
  FaTimes,
  FaTools,
} from "react-icons/fa";
import { useTindisaApi } from "../../api/client";
import { useLoad } from "../../api/useLoad";
import { businessNoun, isIndividualType, useTaxonomy } from "../../api/taxonomy";
import { useToast } from "../../components/useToast";
import { Badge, Button, Card, EmptyState, Field, Input, Spinner } from "../../components/ui.jsx";
import { RENEW_WINDOW_DAYS, daysUntil, fmtDate, priceSymbol, useCertActions } from "./certCommon";
import { CertChecklist, CertDocsEditor, CertSteps } from "./CertParts.jsx";

/*
 * Certificat d'établissement vérifié (boutiques, ateliers, garages, hôtels…).
 * Demande → visite de vérification par l'équipe Tindisa → certificat imprimable
 * valable 1 an, renouvelable. Route : /dashboard/certificat-etablissement.
 */

const ENDPOINT = "/v1/merchant/certificates/shop";
const VISIT_MAX = 120;

const DOC_TYPES = [
  { value: "facade", label: "Photo de la façade" },
  { value: "legal", label: "Document légal (RCCM, Id. Nat., patente…)" },
  { value: "other", label: "Autre document" },
];

const CHECKED_POINTS = [
  { icon: <FaBoxes />, text: "Disponibilité réelle des produits et des prix affichés" },
  { icon: <FaClipboardCheck />, text: "Qualité de l'accueil, hygiène et réactivité" },
  { icon: <FaFileSignature />, text: "Documents légaux de l'activité" },
];

export default function ShopCertificatePage() {
  const api = useTindisaApi();
  const { notify } = useToast();
  const taxonomy = useTaxonomy();
  const { busy, payLink, downloadPdf, copyVerify } = useCertActions({
    endpoint: ENDPOINT,
    api,
    notify,
    fileStem: "certificat-etablissement",
  });

  const { data, loading, error, setData } = useLoad(() => api.get(ENDPOINT), []);
  const [editing, setEditing] = useState(false);

  if (loading) {
    return (
      <div className="dash-page">
        <Spinner label="Chargement…" />
      </div>
    );
  }
  if (error || !data || typeof data !== "object") {
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

  const shop = data.shop && typeof data.shop === "object" ? data.shop : null;
  const cert = data.certificate && typeof data.certificate === "object" ? data.certificate : null;
  const price = cert?.price || data.price || { issue: 25, update: 10, currency: "USD" };
  const sym = priceSymbol(price);
  const noun = businessNoun(taxonomy, shop?.shopType);
  const technician = shop?.shopType ? isIndividualType(taxonomy, shop.shopType) : false;

  const status = cert?.status || "none";
  const expired = !!cert?.expired;
  const left = daysUntil(cert?.validUntil);
  const renewable = status === "issued" && (expired || (left != null && left <= RENEW_WINDOW_DAYS));
  const showForm = !!data.eligible && (editing || !cert || status === "revoked");
  const visitedAt = cert?.inspection?.visitedAt;

  // Étape courante : 0 demande, 1 visite, 2 délivré, 3 expiration.
  const step = !cert || status === "revoked" ? 0 : status === "requested" ? 1 : expired ? 3 : 2;
  const steps = [
    { label: "Demande", icon: <FaStore /> },
    { label: "Visite de vérification", icon: <FaSearchLocation /> },
    { label: "Délivré", icon: <FaCheckCircle /> },
    {
      label: cert?.validUntil
        ? `${expired ? "Expiré le" : "Expire le"} ${fmtDate(cert.validUntil)}`
        : "Valable 1 an",
      icon: <FaSyncAlt />,
    },
  ];

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <h1 className="dash-h1">
            <FaCertificate style={{ marginRight: 8 }} />
            Certificat d'établissement vérifié
          </h1>
          <p className="dash-sub">
            Rassurez vos clients avant même qu'ils se déplacent. L'équipe
            Tindisa visite {noun.your}, vérifie ce que vous proposez et vous
            délivre un certificat sécurisé, vérifiable en ligne et valable 1 an.
            Votre page affiche alors le badge « Établissement vérifié par Tindisa ».
          </p>
        </div>
      </header>

      <Card className="procert-intro">
        <ul className="procert-facts">
          {CHECKED_POINTS.map((p) => (
            <li key={p.text}>
              {p.icon} <span>{p.text}</span>
            </li>
          ))}
          <li>
            <FaClock /> <span>Valable 1 an, renouvelable</span>
          </li>
          <li>
            <FaCreditCard />{" "}
            <span>
              Émission {price.issue} {sym}, renouvellement {price.update} {sym}
            </span>
          </li>
        </ul>
      </Card>

      <CertSteps steps={steps} step={step} lastWarn={expired} />

      {!data.eligible && (
        <Card className="procert-notice">
          <FaExclamationTriangle />
          <div>
            <strong>{technician ? "Certificat réservé aux établissements" : "Établissement à compléter"}</strong>
            <p>
              {typeof data.reason === "string" && data.reason
                ? data.reason
                : technician
                  ? "Ce certificat concerne les boutiques, ateliers, garages, hôtels et autres établissements. En tant que technicien ou artisan, demandez plutôt le certificat d'aptitude professionnelle."
                  : `Complétez les informations de ${noun.your} (nom, adresse, ville) pour demander la visite de vérification.`}
            </p>
            {technician ? (
              <Button as={Link} to="/dashboard/certificat-pro" variant="primary">
                <FaTools /> Certificat d'aptitude professionnelle
              </Button>
            ) : (
              <Button as={Link} to="/dashboard/boutique" variant="primary">
                <FaStore /> Compléter {noun.my}
              </Button>
            )}
          </div>
        </Card>
      )}

      {cert && status === "requested" && (
        <Card className="procert-status">
          <div className="procert-status-head">
            <Badge tone="warn">{visitedAt ? "Visite effectuée" : "Visite à planifier"}</Badge>
            {cert.paid ? <Badge tone="success">Payé</Badge> : <Badge tone="neutral">Paiement en attente</Badge>}
          </div>
          <p className="dash-sub">
            {visitedAt
              ? `Notre équipe est passée le ${fmtDate(visitedAt)}. Le certificat sera délivré après validation du rapport de visite.`
              : `Votre demande pour ${shop?.name ? `« ${shop.name} »` : noun.this} est enregistrée. Notre équipe vous appellera pour convenir d'une visite.`}
            {!cert.paid && " La visite est programmée une fois le paiement reçu."}
          </p>
          <CertChecklist items={cert.checklist} />
          <div className="procert-actions">
            {!cert.paid && (
              <Button variant="primary" onClick={payLink} disabled={busy === "pay"}>
                <FaCreditCard />{" "}
                {busy === "pay" ? "Ouverture…" : `Payer ${cert.serial ? price.update : price.issue} ${sym}`}
              </Button>
            )}
            {!editing && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Modifier ma demande
              </Button>
            )}
          </div>
        </Card>
      )}

      {cert && status === "issued" && (
        <Card className="procert-status">
          <div className="procert-status-head">
            {expired ? <Badge tone="danger">Expiré</Badge> : <Badge tone="success">Valide</Badge>}
            {cert.serial && <span className="procert-serial">{cert.serial}</span>}
          </div>
          <dl className="procert-grid">
            <div className="wide">
              <dt>Établissement</dt>
              <dd>
                {shop?.name || "Non précisé"}
                {shop?.city ? ` (${shop.city})` : ""}
              </dd>
            </div>
            {visitedAt && (
              <div>
                <dt>Visité le</dt>
                <dd>{fmtDate(visitedAt)}</dd>
              </div>
            )}
            <div>
              <dt>{expired ? "A expiré le" : "Valable jusqu'au"}</dt>
              <dd>{fmtDate(cert.validUntil) || "Non précisé"}</dd>
            </div>
          </dl>
          <CertChecklist items={cert.checklist} />
          {renewable && (
            <div className="procert-renew">
              <FaExclamationTriangle />
              <span>
                {expired
                  ? "Votre certificat a expiré et le badge n'apparaît plus sur votre page. Renouvelez-le pour le retrouver."
                  : `Votre certificat expire dans ${left} jour${left > 1 ? "s" : ""}. Pensez à le renouveler.`}
              </span>
            </div>
          )}
          <div className="procert-actions">
            <Button variant="primary" onClick={() => downloadPdf(cert.serial)} disabled={busy === "pdf"}>
              <FaDownload /> {busy === "pdf" ? "Préparation…" : "Télécharger mon certificat"}
            </Button>
            {cert.serial && (
              <Button variant="ghost" onClick={() => copyVerify(cert.serial)}>
                <FaCopy /> Lien de vérification
              </Button>
            )}
            {renewable && !editing && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <FaSyncAlt /> Renouveler ({price.update} {sym})
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
              Votre précédent certificat a été révoqué. Vous pouvez faire une
              nouvelle demande de visite ci-dessous.
            </p>
          </div>
        </Card>
      )}

      {showForm && (
        <RequestForm
          key={cert?.id || "new"}
          api={api}
          notify={notify}
          initial={cert}
          renewal={renewable}
          noun={noun}
          onCancel={cert && status !== "revoked" ? () => setEditing(false) : null}
          onSaved={(next) => {
            if (next && typeof next === "object") setData(next);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function RequestForm({ api, notify, initial, renewal, noun, onCancel, onSaved }) {
  const [docs, setDocs] = useState(() =>
    (Array.isArray(initial?.documents) ? initial.documents : [])
      .filter((d) => d && typeof d.url === "string")
      .map((d) => ({
        type: DOC_TYPES.some((t) => t.value === d.type) ? d.type : "other",
        url: d.url,
        note: typeof d.note === "string" ? d.note : "",
      })),
  );
  const [contactPhone, setContactPhone] = useState(
    typeof initial?.contactPhone === "string" ? initial.contactPhone : "",
  );
  const [preferredVisit, setPreferredVisit] = useState(
    typeof initial?.preferredVisit === "string" ? initial.preferredVisit : "",
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const phone = contactPhone.trim();
  const phoneBad = phone && phone.replace(/\D/g, "").length < 8;

  const submit = async (e) => {
    e.preventDefault();
    if (phoneBad) {
      notify("Numéro de téléphone incomplet", "error");
      return;
    }
    setSaving(true);
    try {
      const visit = preferredVisit.trim().slice(0, VISIT_MAX);
      const body = {
        documents: docs.map((d) => ({
          type: d.type,
          url: d.url,
          ...(d.note.trim() ? { note: d.note.trim() } : {}),
        })),
        ...(phone ? { contactPhone: phone } : {}),
        ...(visit ? { preferredVisit: visit } : {}),
      };
      const next = await api.post(ENDPOINT, body);
      notify(
        renewal ? "Demande de renouvellement envoyée" : "Demande de visite envoyée",
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
          {renewal ? "Renouveler mon certificat" : "Demander la visite de vérification"}
        </h2>
        <p className="procert-hint">
          Un membre de l'équipe Tindisa passera dans {noun.the} pour vérifier
          vos produits, vos prix et vos documents. Rien n'est obligatoire
          ci-dessous, mais ces informations accélèrent la visite.
        </p>

        <Field label="Téléphone à appeler pour la visite" hint="Laissez vide pour utiliser le numéro de votre compte.">
          <Input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Ex. +243 99 000 0000"
            autoComplete="tel"
          />
        </Field>

        <Field
          label="Quand pouvons-nous passer ?"
          hint={`${preferredVisit.length}/${VISIT_MAX} caractères`}
        >
          <Input
            value={preferredVisit}
            maxLength={VISIT_MAX}
            onChange={(e) => setPreferredVisit(e.target.value)}
            placeholder="Ex. en semaine après 14 h"
          />
        </Field>

        <h3 className="dash-h3">Photos et documents ({docs.length}/6)</h3>
        <p className="procert-hint">
          Facultatif : une photo de la façade et vos documents légaux (RCCM,
          identification nationale, patente…) si vous les avez.
        </p>
        <CertDocsEditor
          docs={docs}
          setDocs={setDocs}
          docTypes={DOC_TYPES}
          defaultType="facade"
          notify={notify}
          addLabel="Ajouter une photo ou un document"
          onUploadingChange={setUploading}
        />

        <div className="ui-modal-foot procert-foot">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={saving || uploading}>
            <FaCalendarCheck />{" "}
            {saving ? "Envoi…" : renewal ? "Demander le renouvellement" : "Demander la visite"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
