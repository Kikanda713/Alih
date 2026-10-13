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
  FaTools,
  FaFileAlt,
  FaPhone,
  FaSyncAlt,
  FaStore,
} from "react-icons/fa";
import { useTaxonomy } from "../../api/taxonomy";
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
import { ShopCertDetail, ShopCertTable } from "./AdminShopCerts.jsx";
import { DEFAULT_SHOP_CHECKLIST } from "../dashboard/certCommon";

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
  none: { tone: "neutral", label: "·" },
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
const PRO_FILTERS = [
  { k: "", label: "Tous" },
  { k: "requested", label: "À vérifier" },
  { k: "certified", label: "Délivrés" },
];
const KINDS = [
  { k: "asset", label: "Actifs de valeur" },
  { k: "pro", label: "Aptitude professionnelle" },
  { k: "shop", label: "Établissements" },
];
const KIND_ICON = { asset: <FaCertificate />, pro: <FaTools />, shop: <FaStore /> };

// ---- Aptitude professionnelle (CAP) ----
const DOC_LABEL = {
  identity: "Pièce d'identité",
  diploma: "Diplôme / formation",
  attestation: "Attestation d'employeur",
  license: "Agrément, ordre ou permis",
  other: "Autre justificatif",
};
const DEFAULT_PRO_CHECKLIST = [
  "Identité vérifiée",
  "Diplôme ou attestation authentique",
  "Références contactées",
  "Expérience cohérente avec le profil",
];
const fmtDate = (d) => {
  if (!d) return "-";
  const t = new Date(d);
  return Number.isNaN(t.getTime())
    ? "-"
    : t.toLocaleDateString("fr-FR", { dateStyle: "medium" });
};
const isImg = (u) =>
  !/\.pdf(\?|$)/i.test(u || "") &&
  (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(u || "") ||
    /\/image\/upload\//.test(u || ""));
const itemLabel = (i) =>
  typeof i === "string" ? i : i?.label || i?.key || "";
const itemDone = (i) => !!(i && (i.done ?? i.ok ?? i.checked ?? false));
const proStatus = (r) => r?.certStatus || r?.status || "requested";
const proExpired = (r) =>
  !!r?.expired ||
  (proStatus(r) === "issued" &&
    !!r?.validUntil &&
    new Date(r.validUntil).getTime() < Date.now());
const proCfg = (cfg, camel, snake) => cfg?.[camel] ?? cfg?.[snake];
const toLines = (v) =>
  Array.isArray(v)
    ? v.map(itemLabel).filter(Boolean).join("\n")
    : String(v || "");

export default function AdminCertification() {
  const api = useTindisaApi();
  const { notify } = useToast();
  const { city, withCity } = useAdminView();
  const taxonomy = useTaxonomy();
  const [kind, setKind] = useState("asset");
  const [filter, setFilter] = useState("");
  const [proView, setProView] = useState(null); // dossier pro affiché
  const [shopView, setShopView] = useState(null); // établissement affiché
  const [proChecks, setProChecks] = useState({});
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
    const qs = [
      kind === "pro" || kind === "shop" ? "kind=" + kind : "",
      filter ? "filter=" + filter : "",
    ]
      .filter(Boolean)
      .join("&");
    const path = "/v1/admin/certification/assets" + (qs ? "?" + qs : "");
    return api.get(withCity(path)).then(
      (r) => ({
        assets: Array.isArray(r?.assets || r?.items || r?.certificates)
          ? r.assets || r.items || r.certificates
          : [],
        counts: r?.counts || {},
        settings: r?.settings || {},
      }),
      () => EMPTY_CERT,
    );
  }, [city, filter, kind]);
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
      // Aptitude professionnelle : envoyé en camelCase ET snake_case (le
      // backend accepte l'une ou l'autre forme selon sa version).
      const proIssue = proCfg(cfg, "proIssuePriceUsd", "pro_issue_price_usd");
      const proUpdate = proCfg(cfg, "proUpdatePriceUsd", "pro_update_price_usd");
      const proMonths = proCfg(cfg, "proValidityMonths", "pro_validity_months");
      const proList = proCfg(cfg, "proChecklist", "pro_checklist");
      if (proIssue !== undefined && proIssue !== "") {
        body.proIssuePriceUsd = body.pro_issue_price_usd = Number(proIssue);
      }
      if (proUpdate !== undefined && proUpdate !== "") {
        body.proUpdatePriceUsd = body.pro_update_price_usd = Number(proUpdate);
      }
      if (proMonths !== undefined && proMonths !== "") {
        body.proValidityMonths = body.pro_validity_months = Number(proMonths);
      }
      if (proList !== undefined) {
        body.proChecklist = body.pro_checklist = (
          Array.isArray(proList) ? proList.map(itemLabel) : String(proList).split("\n")
        )
          .map((s) => s.trim())
          .filter(Boolean);
      }
      // Établissements vérifiés.
      const shopIssue = proCfg(cfg, "shopIssuePriceUsd", "shop_issue_price_usd");
      const shopUpdate = proCfg(cfg, "shopUpdatePriceUsd", "shop_update_price_usd");
      const shopMonths = proCfg(cfg, "shopValidityMonths", "shop_validity_months");
      const shopList = proCfg(cfg, "shopChecklist", "shop_checklist");
      if (shopIssue !== undefined && shopIssue !== "") body.shopIssuePriceUsd = Number(shopIssue);
      if (shopUpdate !== undefined && shopUpdate !== "") body.shopUpdatePriceUsd = Number(shopUpdate);
      if (shopMonths !== undefined && shopMonths !== "") body.shopValidityMonths = Number(shopMonths);
      if (shopList !== undefined) {
        body.shopChecklist = (
          Array.isArray(shopList) ? shopList.map(itemLabel) : String(shopList).split("\n")
        )
          .map((x) => x.trim())
          .filter(Boolean);
      }
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

  // ---- Aptitude professionnelle ----
  const tradeLabel = (t, other) => {
    const id = t && typeof t === "object" ? t.id : t;
    if (id === "autre" && other) return other;
    if (t && typeof t === "object") return t.label || t.id || "";
    return (taxonomy?.trades || []).find((x) => x.id === t)?.label || t;
  };
  const proChecklistTpl = (row) => {
    const fromSettings = proCfg(data.settings, "proChecklist", "pro_checklist");
    const base =
      Array.isArray(fromSettings) && fromSettings.length
        ? fromSettings.map(itemLabel)
        : DEFAULT_PRO_CHECKLIST;
    const fromRow = Array.isArray(row?.checklist)
      ? row.checklist.map(itemLabel)
      : [];
    return Array.from(new Set([...fromRow, ...base].filter(Boolean)));
  };
  const openPro = (row) => {
    const init = {};
    (Array.isArray(row.checklist) ? row.checklist : []).forEach((i) => {
      if (itemDone(i)) init[itemLabel(i)] = true;
    });
    setProChecks(init);
    setNotes("");
    setProView(row);
  };
  const proId = (row) => row?.certId || row?.id;
  const doProIssue = async () => {
    const row = proView;
    const renew = proStatus(row) === "issued";
    setBusy(true);
    try {
      const checklist = proChecklistTpl(row).map((label) => ({
        label,
        checked: !!proChecks[label],
        done: !!proChecks[label],
      }));
      if (renew) {
        await api.put(
          `/v1/admin/certification/cert/${encodeURIComponent(proId(row))}`,
          { kind: "pro", checklist, notes },
        );
      } else {
        await api.post("/v1/admin/certification/issue", {
          kind: "pro",
          certId: proId(row),
          checklist,
          notes,
        });
      }
      notify(renew ? "Certificat renouvelé" : "Certificat délivré", "success");
      setProView(null);
      reload();
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  };
  const askRevokePro = (row) =>
    setConfirm({
      open: true,
      asset: {
        certId: proId(row),
        name: row.subject?.holderName || row.holderName || row.serial,
      },
      busy: false,
    });

  const askRevokeShop = (row) =>
    setConfirm({
      open: true,
      asset: {
        certId: row.certId || row.id,
        name: row.subject?.shopName || row.shopName || row.serial,
      },
      busy: false,
    });

  const s = data.settings || {};
  const c = data.counts || {};
  const isPro = kind === "pro";
  const isShop = kind === "shop";
  const filters = isPro || isShop ? PRO_FILTERS : FILTERS;

  return (
    <div className="dash-page">
      <header className="dash-page-head cat-head">
        <div>
          <h1 className="dash-h1">
            <FaCertificate style={{ marginRight: 8 }} />
            Certification
          </h1>
          {isShop ? (
            <p className="dash-sub">
              Établissements vérifiés : visite sur place (produits, prix,
              réactivité, documents légaux, hygiène), délivrance et
              renouvellement chaque année.
            </p>
          ) : isPro ? (
            <p className="dash-sub">
              Certificats d'aptitude professionnelle des techniciens et
              artisans : vérification du dossier (identité, diplômes,
              références), délivrance et renouvellement.
            </p>
          ) : (
            <p className="dash-sub">
              Actifs de valeur (≥{" "}
              {usd(
                s.thresholdCurrency === "USD"
                  ? s.thresholdAmount
                  : (s.thresholdAmount || 0) / (s.exchangeRate || 2400),
              )}{" "}
              équiv.) : authentification, suivi propriété, checklist légale &
              technique.
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={() => setCfgOpen(true)}>
          <FaCog /> Paramètres
        </Button>
      </header>

      <div className="cat-tabs admin-tabs admin-cert-kinds">
        {KINDS.map((k) => (
          <button
            key={k.k}
            className={`cat-tab${kind === k.k ? " active" : ""}`}
            onClick={() => {
              setKind(k.k);
              setFilter("");
            }}
          >
            {KIND_ICON[k.k]} {k.label}
          </button>
        ))}
      </div>

      {isPro || isShop ? (
        <StatGrid>
          <StatCard
            icon={isShop ? <FaStore /> : <FaTools />}
            value={c.total ?? data.assets.length}
            label={isShop ? "Demandes" : "Dossiers"}
          />
          <StatCard
            icon={<FaCheckCircle />}
            value={c.certified ?? c.issued ?? 0}
            label="Délivrés"
          />
          <StatCard
            icon={<FaClock />}
            value={c.requested ?? 0}
            label={isShop ? "À visiter" : "À vérifier"}
          />
          <StatCard
            icon={<FaTimesCircle />}
            value={c.expired ?? 0}
            label="Expirés"
          />
        </StatGrid>
      ) : (
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
      )}

      <div className="admin-toolbar">
        <div className="cat-tabs admin-tabs">
          {filters.map((f) => (
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
        isShop ? (
          <EmptyState
            icon={<FaStore />}
            title="Aucune demande"
            text="Aucune demande de certificat d'établissement pour ce filtre ou cette ville."
          />
        ) : isPro ? (
          <EmptyState
            icon={<FaTools />}
            title="Aucun dossier"
            text="Aucune demande de certificat d'aptitude professionnelle pour ce filtre / cette ville."
          />
        ) : (
          <EmptyState
            icon={<FaCertificate />}
            title="Aucun actif"
            text="Aucun actif éligible pour ce filtre / cette ville."
          />
        )
      ) : isShop ? (
        <ShopCertTable
          rows={pageItems}
          page={page}
          totalPages={totalPages}
          count={count}
          setPage={setPage}
          onOpen={setShopView}
          onRevoke={askRevokeShop}
        />
      ) : isPro ? (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>Titulaire</th>
                  <th>Métiers</th>
                  <th>Établissement / Ville</th>
                  <th>Expire le</th>
                  <th>Statut</th>
                  <th className="cat-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => {
                  const stKey = proStatus(r);
                  const expired = proExpired(r);
                  const st = STATUS[stKey] || STATUS.none;
                  const subj = r.subject || {};
                  const trades = (subj.trades || r.trades || [])
                    .map((t) => tradeLabel(t, subj.otherTrade || r.otherTrade))
                    .filter(Boolean);
                  return (
                    <tr key={proId(r) || r.serial}>
                      <td>
                        <span className="cat-pname">
                          {subj.holderName || r.holderName || "-"}
                        </span>
                        {r.serial && (
                          <span className="cat-sku"> · {r.serial}</span>
                        )}
                      </td>
                      <td className="admin-cert-wrap">
                        {trades.length ? trades.join(", ") : "-"}
                      </td>
                      <td>
                        {r.shopName || r.shop?.name || "-"}
                        {r.city || r.shop?.city
                          ? ` · ${cap(r.city || r.shop?.city)}`
                          : ""}
                      </td>
                      <td>{fmtDate(r.validUntil)}</td>
                      <td>
                        {expired ? (
                          <Badge tone="danger">Expiré</Badge>
                        ) : (
                          <Badge tone={st.tone}>
                            {stKey === "issued" ? "Délivré" : st.label}
                          </Badge>
                        )}
                        {stKey === "requested" && r.paid === false && (
                          <>
                            {" "}
                            <Badge tone="neutral">Non payé</Badge>
                          </>
                        )}
                      </td>
                      <td className="cat-col-actions">
                        <button
                          className="cat-icon-btn"
                          title="Voir le dossier"
                          onClick={() => openPro(r)}
                        >
                          <FaEye />
                        </button>
                        {stKey === "issued" && (
                          <button
                            className="cat-icon-btn danger"
                            title="Révoquer"
                            onClick={() => askRevokePro(r)}
                          >
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
          <Pagination
            page={page}
            totalPages={totalPages}
            count={count}
            onChange={setPage}
          />
        </>
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>Actif</th>
                  <th>Catégorie</th>
                  <th>Valeur</th>
                  <th>Établissement / Ville</th>
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
                      <td>{a.category || "·"}</td>
                      <td>{usd(a.valueUsd)}</td>
                      <td>
                        {a.shopName || "·"}
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
                          "·"
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
            <h3 className="dash-h3">Aptitude professionnelle (techniciens)</h3>
            <div className="form-row">
              <Field label="Prix émission (USD)">
                <Input
                  type="number"
                  min="0"
                  value={proCfg(cfg, "proIssuePriceUsd", "pro_issue_price_usd") ?? ""}
                  placeholder="25"
                  onChange={(e) =>
                    setCfg({ ...cfg, proIssuePriceUsd: e.target.value })
                  }
                />
              </Field>
              <Field label="Prix renouvellement (USD)">
                <Input
                  type="number"
                  min="0"
                  value={proCfg(cfg, "proUpdatePriceUsd", "pro_update_price_usd") ?? ""}
                  placeholder="10"
                  onChange={(e) =>
                    setCfg({ ...cfg, proUpdatePriceUsd: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Durée de validité (mois)">
              <Input
                type="number"
                min="1"
                value={proCfg(cfg, "proValidityMonths", "pro_validity_months") ?? ""}
                placeholder="24"
                onChange={(e) =>
                  setCfg({ ...cfg, proValidityMonths: e.target.value })
                }
              />
            </Field>
            <Field label="Checklist de vérification (un point par ligne)">
              <Textarea
                rows={4}
                value={toLines(proCfg(cfg, "proChecklist", "pro_checklist"))}
                placeholder={DEFAULT_PRO_CHECKLIST.join("\n")}
                onChange={(e) =>
                  setCfg({ ...cfg, proChecklist: e.target.value })
                }
              />
            </Field>
            <h3 className="dash-h3">Établissements vérifiés</h3>
            <div className="form-row">
              <Field label="Prix émission (USD)">
                <Input
                  type="number"
                  min="0"
                  value={proCfg(cfg, "shopIssuePriceUsd", "shop_issue_price_usd") ?? ""}
                  placeholder="25"
                  onChange={(e) => setCfg({ ...cfg, shopIssuePriceUsd: e.target.value })}
                />
              </Field>
              <Field label="Prix renouvellement (USD)">
                <Input
                  type="number"
                  min="0"
                  value={proCfg(cfg, "shopUpdatePriceUsd", "shop_update_price_usd") ?? ""}
                  placeholder="10"
                  onChange={(e) => setCfg({ ...cfg, shopUpdatePriceUsd: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Durée de validité (mois)">
              <Input
                type="number"
                min="1"
                value={proCfg(cfg, "shopValidityMonths", "shop_validity_months") ?? ""}
                placeholder="12"
                onChange={(e) => setCfg({ ...cfg, shopValidityMonths: e.target.value })}
              />
            </Field>
            <Field label="Checklist de la visite (un point par ligne)">
              <Textarea
                rows={5}
                value={toLines(proCfg(cfg, "shopChecklist", "shop_checklist"))}
                placeholder={DEFAULT_SHOP_CHECKLIST.join("\n")}
                onChange={(e) => setCfg({ ...cfg, shopChecklist: e.target.value })}
              />
            </Field>
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
        title={certify ? `Certifier · ${certify.name}` : ""}
        onClose={() => setCertify(null)}
      >
        {certify && (
          <div className="product-form">
            <p className="dash-sub">
              Valeur {usd(certify.valueUsd)} · {certify.shopName || "·"}.
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
                        <span>{doc.category || "·"}</span>
                      </div>
                      <div>
                        <span className="metric-item-label">Valeur</span>
                        <span>
                          {doc.value?.amount != null
                            ? `${Number(doc.value.amount).toLocaleString("fr-FR")} ${doc.value.currency || ""}`
                            : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="metric-item-label">Propriétaire</span>
                        <span>{doc.ownership?.current?.name || "·"}</span>
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

      {/* Dossier aptitude professionnelle */}
      <Modal
        open={!!proView}
        title={
          proView
            ? `Dossier · ${proView.subject?.holderName || proView.holderName || ""}`
            : ""
        }
        onClose={() => setProView(null)}
      >
        {proView &&
          (() => {
            const r = proView;
            const subj = r.subject || {};
            const stKey = proStatus(r);
            const issued = stKey === "issued";
            const revoked = stKey === "revoked";
            const expired = proExpired(r);
            const trades = (subj.trades || r.trades || [])
              .map((t) => tradeLabel(t, subj.otherTrade || r.otherTrade))
              .filter(Boolean);
            const zones = (subj.zones || r.zones || [])
              .map((z) => (typeof z === "string" ? z : z?.label || z?.name))
              .filter(Boolean);
            const docs = Array.isArray(r.documents) ? r.documents : [];
            const refs = Array.isArray(r.references) ? r.references : [];
            const pdfUrl =
              issued && r.serial
                ? certAssetUrl(
                    `/v1/certificates/${encodeURIComponent(r.serial)}/pdf`,
                  )
                : null;
            const price = issued
              ? proCfg(s, "proUpdatePriceUsd", "pro_update_price_usd")
              : proCfg(s, "proIssuePriceUsd", "pro_issue_price_usd");
            return (
              <div className="cert-view admin-procert">
                <div className="admin-procert-head">
                  {subj.photoUrl && (
                    <img src={subj.photoUrl} alt="" className="admin-procert-photo" />
                  )}
                  <div>
                    <strong>{subj.holderName || r.holderName || "-"}</strong>
                    <div className="cat-sku">
                      {r.serial || "Pas encore de numéro"} ·{" "}
                      {r.shopName || r.shop?.name || "-"}
                      {r.city || r.shop?.city ? ` · ${cap(r.city || r.shop?.city)}` : ""}
                    </div>
                    <div className="admin-procert-badges">
                      {expired ? (
                        <Badge tone="danger">Expiré</Badge>
                      ) : (
                        <Badge tone={(STATUS[stKey] || STATUS.none).tone}>
                          {issued ? "Délivré" : (STATUS[stKey] || STATUS.none).label}
                        </Badge>
                      )}
                      {r.paid === true && <Badge tone="success">Payé</Badge>}
                      {r.paid === false && <Badge tone="neutral">Non payé</Badge>}
                    </div>
                  </div>
                </div>

                <div className="cert-doc-grid">
                  <div>
                    <span className="metric-item-label">Métiers</span>
                    <span>{trades.length ? trades.join(", ") : "-"}</span>
                  </div>
                  <div>
                    <span className="metric-item-label">Zones</span>
                    <span>{zones.length ? zones.join(", ") : "-"}</span>
                  </div>
                  <div>
                    <span className="metric-item-label">Expérience</span>
                    <span>
                      {subj.experienceYears != null
                        ? `${subj.experienceYears} an${subj.experienceYears > 1 ? "s" : ""}`
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="metric-item-label">Valable jusqu'au</span>
                    <span>{fmtDate(r.validUntil)}</span>
                  </div>
                </div>

                <h3 className="dash-h3">Documents ({docs.length})</h3>
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
                        {isImg(d.url) ? (
                          <img src={d.url} alt={DOC_LABEL[d.type] || "Document"} />
                        ) : (
                          <span className="admin-procert-docicon">
                            <FaFileAlt />
                          </span>
                        )}
                        <span>
                          {DOC_LABEL[d.type] || "Document"}
                          {d.note ? ` · ${d.note}` : ""}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="dash-sub">Aucun document joint.</p>
                )}

                <h3 className="dash-h3">Références ({refs.length})</h3>
                {refs.length ? (
                  <ul className="admin-procert-refs">
                    {refs.map((f, i) => (
                      <li key={i}>
                        <strong>{f.name}</strong>
                        {f.relation ? <span> · {f.relation}</span> : null}
                        {f.phone && (
                          <a href={`tel:${String(f.phone).replace(/[^\d+]/g, "")}`}>
                            <FaPhone /> {f.phone}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dash-sub">Aucune référence.</p>
                )}

                {!revoked && (
                  <>
                    <h3 className="dash-h3">Checklist de vérification</h3>
                    {proChecklistTpl(r).map((label) => (
                      <label key={label} className="cert-check">
                        <input
                          type="checkbox"
                          checked={!!proChecks[label]}
                          onChange={(e) =>
                            setProChecks({ ...proChecks, [label]: e.target.checked })
                          }
                        />{" "}
                        {label}
                      </label>
                    ))}
                    <Field label="Notes">
                      <Textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </Field>
                    {price != null && price !== "" && (
                      <p className="dash-sub">
                        {issued ? "Le renouvellement" : "L'émission"} coûte{" "}
                        {usd(price)} au technicien.
                      </p>
                    )}
                  </>
                )}

                <div className="ui-modal-foot admin-procert-foot">
                  <Button variant="ghost" onClick={() => setProView(null)}>
                    Fermer
                  </Button>
                  {pdfUrl && (
                    <Button
                      variant="ghost"
                      as="a"
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaPrint /> PDF
                    </Button>
                  )}
                  {issued && (
                    <Button
                      variant="danger"
                      onClick={() => {
                        setProView(null);
                        askRevokePro(r);
                      }}
                    >
                      <FaBan /> Révoquer
                    </Button>
                  )}
                  {!revoked && (
                    <Button variant="primary" onClick={doProIssue} disabled={busy}>
                      {issued ? <FaSyncAlt /> : <FaCertificate />}{" "}
                      {busy
                        ? "Enregistrement…"
                        : issued
                          ? "Renouveler"
                          : "Délivrer le certificat"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* Établissement vérifié */}
      <Modal
        open={!!shopView}
        title={
          shopView
            ? `Établissement · ${
                typeof shopView.subject?.shopName === "string"
                  ? shopView.subject.shopName
                  : typeof shopView.shopName === "string"
                    ? shopView.shopName
                    : ""
              }`
            : ""
        }
        onClose={() => setShopView(null)}
      >
        {shopView && (
          <ShopCertDetail
            key={shopView.certId || shopView.id || shopView.serial}
            row={shopView}
            settings={s}
            api={api}
            notify={notify}
            onClose={() => setShopView(null)}
            onDone={() => {
              setShopView(null);
              reload();
            }}
            onRevoke={(row) => {
              setShopView(null);
              askRevokeShop(row);
            }}
          />
        )}
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
