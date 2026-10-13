import { useState } from "react";
import {
  FaBan,
  FaCertificate,
  FaCheckCircle,
  FaEye,
  FaFileAlt,
  FaPrint,
  FaSyncAlt,
  FaTimesCircle,
} from "react-icons/fa";
import { Badge, Button, Field, Input, Textarea } from "../../components/ui.jsx";
import { Pagination } from "../../components/Pagination.jsx";
import { certAssetUrl } from "../../api/certificates";
import { DEFAULT_SHOP_CHECKLIST, checkDone, checkLabel, isImageUrl } from "../dashboard/certCommon";
import { CertFlags, CertReason, CertStateBadge, WaivePayment } from "./AdminCertParts.jsx";
import {
  EMPTY_WAIVE,
  PAYMENT_REQUIRED_MSG,
  certRowStatus,
  isPaymentRequired,
  needsPayment,
  waiveBody,
  waiveOk,
} from "./certAdmin";

/*
 * Back-office : certificats d'établissement vérifié (kind 'shop').
 * Tableau des demandes + fiche détaillée (visite, documents, checklist,
 * délivrance / renouvellement / révocation).
 */

const DOC_LABEL = {
  facade: "Façade",
  legal: "Document légal",
  other: "Autre document",
};
const LEGAL = [
  { k: "rccm", label: "RCCM" },
  { k: "nif", label: "NIF" },
  { k: "idNat", label: "Id. Nat." },
  { k: "patente", label: "Patente" },
];

const txt = (v) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const fmtDate = (d) => {
  if (!d) return "-";
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? "-" : t.toLocaleDateString("fr-FR", { dateStyle: "medium" });
};
const todayIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const slug = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);

const shopId = (r) => r?.certId || r?.id;
const shopStatus = (r) => certRowStatus(r, "requested");
const shopExpired = (r) =>
  !!r?.expired ||
  (shopStatus(r) === "issued" && !!r?.validUntil && new Date(r.validUntil).getTime() < Date.now());
const subjectOf = (r) => (r?.subject && typeof r.subject === "object" ? r.subject : {});
const inspectionOf = (r) => {
  const i = r?.inspection || subjectOf(r).inspection;
  return i && typeof i === "object" ? i : null;
};
const listingsCount = (v) => {
  if (typeof v === "number") return v;
  if (v && typeof v === "object") return v.count ?? v.total ?? v.active ?? null;
  return null;
};

function StatusBadge({ row }) {
  const st = shopStatus(row);
  if (shopExpired(row)) return <Badge tone="danger">Expiré</Badge>;
  // « paid » = payé, visite à faire.
  if (st === "paid") return <Badge tone="warn">À visiter</Badge>;
  return <CertStateBadge status={st} fallback={<Badge tone="warn">À visiter</Badge>} />;
}

// Demande en cours de traitement : refus / complément possibles.
const reviewable = (r) => {
  const st = shopStatus(r);
  return st === "requested" || st === "paid" || st === "info_requested";
};

export function ShopCertTable({ rows, page, totalPages, count, setPage, onOpen, onRevoke, onReject }) {
  return (
    <>
      <div className="cat-table-wrap">
        <table className="cat-table">
          <thead>
            <tr>
              <th>Établissement</th>
              <th>Activité</th>
              <th>Ville</th>
              <th>Statut</th>
              <th>Visite</th>
              <th>Expiration</th>
              <th>Payé</th>
              <th className="cat-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const subj = subjectOf(r);
              const insp = inspectionOf(r);
              return (
                <tr key={shopId(r) || r.serial || idx}>
                  <td>
                    <span className="cat-pname">{txt(subj.shopName) || txt(r.shopName) || "-"}</span>
                    {txt(r.serial) && <span className="cat-sku"> · {txt(r.serial)}</span>}
                  </td>
                  <td>{txt(subj.typeLabel) || "-"}</td>
                  <td>
                    {cap(txt(subj.city) || txt(r.city)) || "-"}
                    {txt(subj.commune) ? ` · ${txt(subj.commune)}` : ""}
                  </td>
                  <td>
                    <StatusBadge row={r} />
                    <CertReason row={r} />
                  </td>
                  <td>{insp?.visitedAt ? fmtDate(insp.visitedAt) : "-"}</td>
                  <td>{fmtDate(r.validUntil)}</td>
                  <td>
                    <CertFlags row={r} />
                  </td>
                  <td className="cat-col-actions">
                    <button className="cat-icon-btn" title="Voir la fiche" onClick={() => onOpen(r)}>
                      <FaEye />
                    </button>
                    {onReject && reviewable(r) && (
                      <button
                        className="cat-icon-btn"
                        title="Refuser / Demander un complément"
                        onClick={() => onReject(r)}
                      >
                        <FaTimesCircle />
                      </button>
                    )}
                    {shopStatus(r) === "issued" && (
                      <button className="cat-icon-btn danger" title="Révoquer" onClick={() => onRevoke(r)}>
                        <FaBan />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
    </>
  );
}

/** Points de la checklist : réglages (ou défaut) + points déjà présents sur la demande. */
function checklistTemplate(row, settings) {
  const fromSettings = settings?.shopChecklist ?? settings?.shop_checklist;
  const base =
    Array.isArray(fromSettings) && fromSettings.length
      ? fromSettings.map(checkLabel)
      : DEFAULT_SHOP_CHECKLIST;
  const fromRow = Array.isArray(row?.checklist) ? row.checklist : [];
  const out = [];
  const seen = new Set();
  for (const i of fromRow) {
    const label = checkLabel(i);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ key: (i && typeof i === "object" && txt(i.key)) || slug(label), label });
  }
  for (const label of base) {
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ key: slug(label), label });
  }
  return out;
}

/**
 * Fiche d'une demande. Monter avec `key={shopId(row)}` pour réinitialiser
 * l'état à chaque ouverture.
 */
export function ShopCertDetail({ row, settings, api, notify, onClose, onDone, onRevoke, onReject }) {
  const subj = subjectOf(row);
  const insp = inspectionOf(row);
  const stKey = shopStatus(row);
  const issued = stKey === "issued";
  const revoked = stKey === "revoked";
  const tpl = checklistTemplate(row, settings);

  const [checks, setChecks] = useState(() => {
    const init = {};
    (Array.isArray(row.checklist) ? row.checklist : []).forEach((i) => {
      if (checkDone(i)) init[checkLabel(i)] = true;
    });
    return init;
  });
  const [visitedAt, setVisitedAt] = useState(() =>
    !issued && typeof insp?.visitedAt === "string" ? insp.visitedAt.slice(0, 10) : "",
  );
  const [inspector, setInspector] = useState(() => (!issued ? txt(insp?.inspector) : ""));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [waive, setWaive] = useState(EMPTY_WAIVE);
  const [forcePay, setForcePay] = useState(false); // 409 payment_required reçu
  const unpaid = needsPayment(row, forcePay);
  const canSubmit = waiveOk(unpaid, waive);

  const docs = (Array.isArray(row.documents) ? row.documents : []).filter(
    (d) => d && typeof d.url === "string",
  );
  const legal = subj.legal && typeof subj.legal === "object" ? subj.legal : {};
  const listings = listingsCount(subj.listings);
  const place = [txt(subj.quartier), txt(subj.commune), cap(txt(subj.city))].filter(Boolean).join(", ");
  const pdfUrl =
    issued && txt(row.serial)
      ? certAssetUrl(`/v1/certificates/${encodeURIComponent(row.serial)}/pdf`)
      : null;
  const price = issued
    ? settings?.shopUpdatePriceUsd ?? settings?.shop_update_price_usd
    : settings?.shopIssuePriceUsd ?? settings?.shop_issue_price_usd;
  const today = todayIso();

  const submit = async () => {
    if (!visitedAt) {
      notify("Indiquez la date de la visite", "error");
      return;
    }
    if (visitedAt > today) {
      notify("La date de visite ne peut pas être dans le futur", "error");
      return;
    }
    if (!inspector.trim()) {
      notify("Indiquez le nom de l'inspecteur", "error");
      return;
    }
    setBusy(true);
    try {
      const body = {
        kind: "shop",
        checklist: tpl.map((i) => ({ key: i.key, label: i.label, checked: !!checks[i.label] })),
        notes,
        inspection: { visitedAt, inspector: inspector.trim() },
      };
      if (issued) {
        await api.put(`/v1/admin/certification/cert/${encodeURIComponent(shopId(row))}`, {
          ...body,
          ...waiveBody(unpaid, waive),
        });
      } else {
        await api.post("/v1/admin/certification/issue", {
          ...body,
          certId: shopId(row),
          ...waiveBody(unpaid, waive),
        });
      }
      notify(issued ? "Certificat renouvelé" : "Certificat délivré", "success");
      onDone();
    } catch (e) {
      if (isPaymentRequired(e)) {
        setForcePay(true);
        notify(PAYMENT_REQUIRED_MSG, "error");
      } else notify(e?.message || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cert-view admin-procert">
      <div className="admin-procert-head">
        <div>
          <strong>{txt(subj.shopName) || txt(row.shopName) || "-"}</strong>
          <div className="cat-sku">
            {txt(row.serial) || "Pas encore de numéro"}
            {txt(subj.typeLabel) ? ` · ${txt(subj.typeLabel)}` : ""}
          </div>
          <div className="admin-procert-badges">
            <StatusBadge row={row} />
            <CertFlags row={row} />
          </div>
        </div>
      </div>
      <CertReason row={row} block />

      <div className="cert-doc-grid">
        <div>
          <span className="metric-item-label">Responsable</span>
          <span>{txt(subj.ownerName) || "-"}</span>
        </div>
        <div>
          <span className="metric-item-label">Localisation</span>
          <span>{place || "-"}</span>
        </div>
        <div>
          <span className="metric-item-label">Adresse</span>
          <span>
            {txt(subj.address) || "-"}
            {txt(subj.landmark) ? ` (repère : ${txt(subj.landmark)})` : ""}
          </span>
        </div>
        <div>
          <span className="metric-item-label">Annonces en ligne</span>
          <span>{listings != null ? txt(listings) : "-"}</span>
        </div>
        <div>
          <span className="metric-item-label">Dernière visite</span>
          <span>
            {insp?.visitedAt ? fmtDate(insp.visitedAt) : "-"}
            {txt(insp?.inspector) ? ` · ${txt(insp.inspector)}` : ""}
          </span>
        </div>
        <div>
          <span className="metric-item-label">Valable jusqu'au</span>
          <span>{fmtDate(row.validUntil)}</span>
        </div>
      </div>

      <h3 className="dash-h3">Documents légaux déclarés</h3>
      <div className="admin-procert-badges">
        {LEGAL.map((l) =>
          legal[l.k] ? (
            <Badge key={l.k} tone="success">
              <FaCheckCircle /> {l.label}
            </Badge>
          ) : (
            <Badge key={l.k} tone="neutral">
              <FaTimesCircle /> {l.label}
            </Badge>
          ),
        )}
      </div>

      <h3 className="dash-h3">Photos et documents ({docs.length})</h3>
      {docs.length ? (
        <div className="admin-procert-docs">
          {docs.map((d, i) => (
            <a
              key={i}
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-procert-doc"
            >
              {isImageUrl(d.url) ? (
                <img src={d.url} alt={DOC_LABEL[d.type] || "Document"} />
              ) : (
                <span className="admin-procert-docicon">
                  <FaFileAlt />
                </span>
              )}
              <span>
                {DOC_LABEL[d.type] || "Document"}
                {txt(d.note) ? ` · ${txt(d.note)}` : ""}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="dash-sub">Aucun document joint.</p>
      )}

      {!revoked && (
        <>
          <h3 className="dash-h3">{issued ? "Nouvelle visite (renouvellement)" : "Visite de vérification"}</h3>
          <div className="form-row">
            <Field label="Date de la visite *">
              <Input
                type="date"
                max={today}
                value={visitedAt}
                onChange={(e) => setVisitedAt(e.target.value)}
              />
            </Field>
            <Field label="Inspecteur *">
              <Input
                value={inspector}
                placeholder="Nom de l'agent Tindisa"
                onChange={(e) => setInspector(e.target.value)}
              />
            </Field>
          </div>
          <h3 className="dash-h3">Checklist de vérification</h3>
          {tpl.map((i) => (
            <label key={i.label} className="cert-check">
              <input
                type="checkbox"
                checked={!!checks[i.label]}
                onChange={(e) => setChecks({ ...checks, [i.label]: e.target.checked })}
              />{" "}
              {i.label}
            </label>
          ))}
          <Field label="Notes">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {price != null && price !== "" && (
            <p className="dash-sub">
              {issued ? "Le renouvellement" : "L'émission"} coûte{" "}
              {Number(price).toLocaleString("fr-FR")} $ à l'établissement.
            </p>
          )}
          <WaivePayment
            unpaid={unpaid}
            value={waive}
            onChange={setWaive}
            label={issued ? "Renouveler sans paiement" : "Délivrer sans paiement"}
          />
        </>
      )}

      <div className="ui-modal-foot admin-procert-foot">
        <Button variant="ghost" onClick={onClose}>
          Fermer
        </Button>
        {pdfUrl && (
          <Button variant="ghost" as="a" href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <FaPrint /> PDF
          </Button>
        )}
        {issued && (
          <Button variant="danger" onClick={() => onRevoke(row)}>
            <FaBan /> Révoquer
          </Button>
        )}
        {onReject && reviewable(row) && (
          <Button variant="ghost" onClick={() => onReject(row)}>
            <FaTimesCircle /> Refuser / Demander un complément
          </Button>
        )}
        {!revoked && (
          <Button
            variant="primary"
            onClick={submit}
            disabled={busy || !canSubmit}
            title={!canSubmit ? "Paiement non reçu : cochez la dispense et indiquez un motif" : undefined}
          >
            {issued ? <FaSyncAlt /> : <FaCertificate />}{" "}
            {busy ? "Enregistrement…" : issued ? "Renouveler" : "Délivrer le certificat"}
          </Button>
        )}
      </div>
    </div>
  );
}
