import { useState } from "react";
import {
  FaCertificate,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaEdit,
  FaBan,
  FaCog,
  FaLink,
  FaPrint,
} from "react-icons/fa";
import { useTindisaApi } from "../../api/client";
import { useLoad } from "../../api/useLoad";
import { useToast } from "../../components/useToast";
import {
  Button,
  Badge,
  Spinner,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
  Modal,
  ConfirmModal,
} from "../../components/ui.jsx";
import { StatGrid, StatCard } from "../../components/StatCard.jsx";
import { usePaged } from "../../components/usePaged";
import { Pagination } from "../../components/Pagination.jsx";
import { useAdminView } from "./adminView";
import { certAssetUrl } from "../../api/certificates";

const usd = (v) =>
  `${Number(v || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} $`;
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const STATUS = {
  issued: { tone: "success", label: "Certifié", icon: <FaCheckCircle /> },
  requested: { tone: "warn", label: "Demandé", icon: <FaClock /> },
  revoked: { tone: "danger", label: "Révoqué", icon: <FaBan /> },
  none: { tone: "neutral", label: "Non certifié", icon: <FaTimesCircle /> },
};
const BC = {
  anchored: { tone: "success", label: "Ancré on-chain" },
  mock: { tone: "success", label: "Ancré (test)" },
  pending: { tone: "warn", label: "Empreinte enregistrée" },
  none: { tone: "neutral", label: "—" },
};

// Modèle de checklist (miroir du backend) — l'admin coche à l'authentification.
const CHECKLIST_TPL = {
  legal: [
    { key: "title", label: "Titre / preuve de propriété" },
    { key: "origin", label: "Facture d'origine / provenance" },
    { key: "customs", label: "Conformité douanière / importation" },
    { key: "nolitige", label: "Absence de litige connu" },
    { key: "identity", label: "Identité du propriétaire vérifiée" },
  ],
  technical: [
    { key: "inspection", label: "Inspection / état vérifié" },
    { key: "authenticity", label: "Authenticité (marque, n° série)" },
    { key: "specs", label: "Spécifications conformes" },
    { key: "photos", label: "Photos certifiées" },
  ],
};
const EMPTY_CERT = { assets: [], counts: {}, settings: {} };
const FILTERS = [
  { k: "", label: "Tous" },
  { k: "certified", label: "Certifiés" },
  { k: "uncertified", label: "Non certifiés" },
  { k: "requested", label: "Demandés" },
];

export default function AdminCertification() {
  const api = useTindisaApi();
  const { notify } = useToast();
  const { city, withCity } = useAdminView();
  const [filter, setFilter] = useState("");
  const [cfgOpen, setCfgOpen] = useState(false);
  const [certify, setCertify] = useState(null); // asset en cours de certification
  const [checks, setChecks] = useState({});
  const [owner, setOwner] = useState({ name: "", contact: "" });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState(null); // certificat affiché
  const [confirm, setConfirm] = useState({
    open: false,
    asset: null,
    busy: false,
  });

  // Rechargé à chaque changement de ville ou de filtre ; erreur → liste vide.
  const {
    data = EMPTY_CERT,
    loading,
    reload,
  } = useLoad(() => {
    let path = "/v1/admin/certification/assets";
    if (filter) path += "?filter=" + filter;
    return api.get(withCity(path)).then(
      (r) => ({
        assets: r?.assets || [],
        counts: r?.counts || {},
        settings: r?.settings || {},
      }),
      () => EMPTY_CERT,
    );
  }, [city, filter]);
  // Paramètres éditables : initialisés depuis les réglages chargés (null tant
  // qu'aucun chargement n'a abouti), puis modifiés localement.
  const [cfgEdit, setCfg] = useState(null);
  const cfg = cfgEdit ?? (data !== EMPTY_CERT ? data.settings : null);

  const { pageItems, page, setPage, totalPages, count } = usePaged(
    data.assets,
    10,
  );

  const saveConfig = async () => {
    setBusy(true);
    try {
      const body = {
        thresholdAmount: Number(cfg.thresholdAmount),
        thresholdCurrency: cfg.thresholdCurrency,
        categories: String(
          cfg.categories ||
            (Array.isArray(cfg.categories) ? cfg.categories.join(",") : ""),
        )
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        issuePriceUsd: Number(cfg.issuePriceUsd),
        updatePriceUsd: Number(cfg.updatePriceUsd),
      };
      const r = await api.put("/v1/admin/certification/config", body);
      setCfg(r);
      notify("Paramètres enregistrés", "success");
      setCfgOpen(false);
      reload();
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  };

  const openCertify = (a) => {
    setCertify(a);
    setChecks({});
    setOwner({ name: "", contact: "" });
    setNotes("");
  };
  const doCertify = async () => {
    setBusy(true);
    try {
      const checklist = {
        legal: CHECKLIST_TPL.legal.map((i) => ({
          ...i,
          checked: !!checks["l_" + i.key],
        })),
        technical: CHECKLIST_TPL.technical.map((i) => ({
          ...i,
          checked: !!checks["t_" + i.key],
        })),
      };
      const ownership = {
        current: owner.name
          ? {
              name: owner.name,
              contact: owner.contact,
              since: new Date().toISOString().slice(0, 10),
            }
          : null,
        history: [],
      };
      await api.post("/v1/admin/certification/issue", {
        productId: certify.productId,
        checklist,
        ownership,
        notes,
      });
      notify("Certificat émis ✅", "success");
      setCertify(null);
      reload();
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  };

  const viewDoc = async (a) => {
    try {
      const d = await api.get(
        `/v1/admin/certification/doc/${encodeURIComponent(a.certId || a.productId)}`,
      );
      setDoc(d);
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    }
  };
  const doRevoke = async () => {
    setConfirm((c) => ({ ...c, busy: true }));
    try {
      await api.post(
        `/v1/admin/certification/cert/${confirm.asset.certId}/revoke`,
        {},
      );
      notify("Certificat révoqué", "success");
      setConfirm({ open: false, asset: null, busy: false });
      reload();
    } catch (e) {
      notify(e?.message || "Erreur", "error");
      setConfirm((c) => ({ ...c, busy: false }));
    }
  };

  const s = data.settings || {};
  const c = data.counts || {};

  return (
    <div className="dash-page">
      <header className="dash-page-head cat-head">
        <div>
          <h1 className="dash-h1">
            <FaCertificate style={{ marginRight: 8 }} />
            Certification
          </h1>
          <p className="dash-sub">
            Actifs de valeur (≥{" "}
            {usd(
              s.thresholdCurrency === "USD"
                ? s.thresholdAmount
                : (s.thresholdAmount || 0) / (s.exchangeRate || 2400),
            )}{" "}
            équiv.) — authentification, suivi propriété, checklist légale &
            technique.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setCfgOpen(true)}>
          <FaCog /> Paramètres
        </Button>
      </header>

      <StatGrid>
        <StatCard
          icon={<FaCertificate />}
          value={c.total ?? 0}
          label="Actifs éligibles"
        />
        <StatCard
          icon={<FaCheckCircle />}
          value={c.certified ?? 0}
          label="Certifiés"
        />
        <StatCard
          icon={<FaClock />}
          value={c.requested ?? 0}
          label="Demandes"
        />
        <StatCard
          icon={<FaTimesCircle />}
          value={c.uncertified ?? 0}
          label="Non certifiés"
        />
      </StatGrid>

      <div className="admin-toolbar">
        <div className="cat-tabs admin-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.k}
              className={`cat-tab${filter === f.k ? " active" : ""}`}
              onClick={() => setFilter(f.k)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner label="Chargement…" />
      ) : data.assets.length === 0 ? (
        <EmptyState
          icon={<FaCertificate />}
          title="Aucun actif"
          text="Aucun actif éligible pour ce filtre / cette ville."
        />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>Actif</th>
                  <th>Catégorie</th>
                  <th>Valeur</th>
                  <th>Boutique / Ville</th>
                  <th>Statut</th>
                  <th>Blockchain</th>
                  <th className="cat-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a) => {
                  const st = STATUS[a.certStatus] || STATUS.none;
                  const bc = BC[a.blockchainStatus] || BC.none;
                  return (
                    <tr key={a.productId}>
                      <td>
                        <span className="cat-pname">{a.name}</span>
                        {a.serial && (
                          <span className="cat-sku"> · {a.serial}</span>
                        )}
                      </td>
                      <td>{a.category || "—"}</td>
                      <td>{usd(a.valueUsd)}</td>
                      <td>
                        {a.shopName || "—"}
                        {a.city ? ` · ${cap(a.city)}` : ""}
                      </td>
                      <td>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td>
                        {a.certStatus === "issued" ? (
                          <Badge tone={bc.tone}>
                            <FaLink /> {bc.label}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="cat-col-actions">
                        {a.certStatus === "issued" ? (
                          <>
                            <button
                              className="cat-icon-btn"
                              title="Voir le certificat"
                              onClick={() => viewDoc(a)}
                            >
                              <FaEye />
                            </button>
                            <button
                              className="cat-icon-btn"
                              title="Mettre à jour"
                              onClick={() => viewDoc(a)}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="cat-icon-btn danger"
                              title="Révoquer"
                              onClick={() =>
                                setConfirm({
                                  open: true,
                                  asset: a,
                                  busy: false,
                                })
                              }
                            >
                              <FaBan />
                            </button>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => openCertify(a)}
                          >
                            <FaCertificate /> Certifier
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            count={count}
            onChange={setPage}
          />
        </>
      )}

      {/* Paramètres */}
      <Modal
        open={cfgOpen}
        title="Paramètres de certification"
        onClose={() => setCfgOpen(false)}
      >
        {cfg && (
          <div className="product-form">
            <div className="form-row">
              <Field label="Seuil (valeur minimale)">
                <Input
                  type="number"
                  value={cfg.thresholdAmount ?? ""}
                  onChange={(e) =>
                    setCfg({ ...cfg, thresholdAmount: e.target.value })
                  }
                />
              </Field>
              <Field label="Devise du seuil">
                <Select
                  value={cfg.thresholdCurrency || "CDF"}
                  onChange={(e) =>
                    setCfg({ ...cfg, thresholdCurrency: e.target?.value ?? e })
                  }
                  options={[
                    { value: "CDF", label: "CDF" },
                    { value: "USD", label: "USD" },
                  ]}
                />
              </Field>
            </div>
            <Field label="Catégories soumises (séparées par des virgules ; vide = toutes)">
              <Input
                value={
                  Array.isArray(cfg.categories)
                    ? cfg.categories.join(", ")
                    : cfg.categories || ""
                }
                onChange={(e) => setCfg({ ...cfg, categories: e.target.value })}
                placeholder="immobilier, vehicule, bijou, or, oeuvre_art…"
              />
            </Field>
            <div className="form-row">
              <Field label="Prix émission (USD)">
                <Input
                  type="number"
                  value={cfg.issuePriceUsd ?? ""}
                  onChange={(e) =>
                    setCfg({ ...cfg, issuePriceUsd: e.target.value })
                  }
                />
              </Field>
              <Field label="Prix mise à jour (USD)">
                <Input
                  type="number"
                  value={cfg.updatePriceUsd ?? ""}
                  onChange={(e) =>
                    setCfg({ ...cfg, updatePriceUsd: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="ui-modal-foot">
              <Button variant="ghost" onClick={() => setCfgOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={saveConfig} disabled={busy}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Certifier (checklist) */}
      <Modal
        open={!!certify}
        title={certify ? `Certifier — ${certify.name}` : ""}
        onClose={() => setCertify(null)}
      >
        {certify && (
          <div className="product-form">
            <p className="dash-sub">
              Valeur {usd(certify.valueUsd)} · {certify.shopName || "—"}.
              L'émission coûte {usd(s.issuePriceUsd)} au commerçant (cumul).
            </p>
            <h3 className="dash-h3">Checklist légale</h3>
            {CHECKLIST_TPL.legal.map((i) => (
              <label key={i.key} className="cert-check">
                <input
                  type="checkbox"
                  checked={!!checks["l_" + i.key]}
                  onChange={(e) =>
                    setChecks({ ...checks, ["l_" + i.key]: e.target.checked })
                  }
                />{" "}
                {i.label}
              </label>
            ))}
            <h3 className="dash-h3">Checklist technique</h3>
            {CHECKLIST_TPL.technical.map((i) => (
              <label key={i.key} className="cert-check">
                <input
                  type="checkbox"
                  checked={!!checks["t_" + i.key]}
                  onChange={(e) =>
                    setChecks({ ...checks, ["t_" + i.key]: e.target.checked })
                  }
                />{" "}
                {i.label}
              </label>
            ))}
            <div className="form-row">
              <Field label="Propriétaire (nom)">
                <Input
                  value={owner.name}
                  onChange={(e) => setOwner({ ...owner, name: e.target.value })}
                />
              </Field>
              <Field label="Contact">
                <Input
                  value={owner.contact}
                  onChange={(e) =>
                    setOwner({ ...owner, contact: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <div className="ui-modal-foot">
              <Button variant="ghost" onClick={() => setCertify(null)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={doCertify} disabled={busy}>
                {busy ? "Émission…" : "Émettre le certificat"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Certificat — aperçu du PDF réel + ancrage on-chain */}
      <Modal
        open={!!doc}
        title={doc ? `Certificat ${doc.serial}` : ""}
        onClose={() => setDoc(null)}
      >
        {doc &&
          (() => {
            const pdfUrl =
              doc.status === "issued" && doc.hasPdf
                ? certAssetUrl(
                    `/v1/certificates/${encodeURIComponent(doc.serial)}/pdf`,
                  )
                : null;
            const bc = doc.blockchain || {};
            return (
              <div className="cert-view">
                {pdfUrl ? (
                  <div className="cert-pdf-preview">
                    <iframe src={pdfUrl} title="Certificat de valeur Tindisa" />
                  </div>
                ) : (
                  <div className="cert-doc">
                    <div className="cert-doc-head">
                      <FaCertificate className="cert-doc-logo" />
                      <div>
                        <strong>Certificat de valeur Tindisa</strong>
                        <div className="cat-sku">
                          {doc.serial} · v{doc.version} ·{" "}
                          {doc.status === "issued" ? "Valide" : cap(doc.status)}
                        </div>
                      </div>
                    </div>
                    <div className="cert-doc-grid">
                      <div>
                        <span className="metric-item-label">Actif</span>
                        <span>{doc.productName}</span>
                      </div>
                      <div>
                        <span className="metric-item-label">Catégorie</span>
                        <span>{doc.category || "—"}</span>
                      </div>
                      <div>
                        <span className="metric-item-label">Valeur</span>
                        <span>
                          {doc.value?.amount != null
                            ? `${Number(doc.value.amount).toLocaleString("fr-FR")} ${doc.value.currency || ""}`
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="metric-item-label">Propriétaire</span>
                        <span>{doc.ownership?.current?.name || "—"}</span>
                      </div>
                    </div>
                    <h3 className="dash-h3">Checklist de contrôle</h3>
                    <div className="cert-doc-checks">
                      {[
                        ...(doc.checklist?.legal || []),
                        ...(doc.checklist?.technical || []),
                      ].map((i, idx) => (
                        <span
                          key={idx}
                          className={`cert-check-badge${i.checked ? " ok" : ""}`}
                        >
                          {i.checked ? <FaCheckCircle /> : <FaTimesCircle />}{" "}
                          {i.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="cert-doc-bc">
                  <FaLink /> <strong>Blockchain :</strong>{" "}
                  {(BC[bc.status] || BC.none).label}
                  {bc.anchorHash && (
                    <div className="cat-sku">empreinte {bc.anchorHash}</div>
                  )}
                  <div className="cert-bc-links">
                    {bc.explorerUrl && (
                      <a
                        href={bc.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Voir la transaction
                      </a>
                    )}
                    {bc.ipfsUrl && (
                      <a
                        href={bc.ipfsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Document IPFS
                      </a>
                    )}
                  </div>
                </div>

                <div className="ui-modal-foot">
                  <Button variant="ghost" onClick={() => setDoc(null)}>
                    Fermer
                  </Button>
                  {pdfUrl && (
                    <Button
                      variant="primary"
                      as="a"
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaPrint /> Ouvrir / télécharger le PDF
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
      </Modal>

      <ConfirmModal
        open={confirm.open}
        danger
        busy={confirm.busy}
        title="Révoquer le certificat"
        message={
          confirm.asset
            ? `Révoquer le certificat de « ${confirm.asset.name} » ?`
            : ""
        }
        confirmLabel="Révoquer"
        cancelLabel="Annuler"
        onConfirm={doRevoke}
        onClose={() => setConfirm({ open: false, asset: null, busy: false })}
      />
    </div>
  );
}
