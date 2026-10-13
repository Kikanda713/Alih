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
} from "../../components/ui.jsx";
import { StatGrid, StatCard } from "../../components/StatCard.jsx";
import { usePaged } from "../../components/usePaged";
import { Pagination } from "../../components/Pagination.jsx";
import { useAdminView } from "./adminView";
import { certAssetUrl } from "../../api/certificates";
import { ShopCertDetail, ShopCertTable } from "./AdminShopCerts.jsx";
import CertCityPrices from "./CertCityPrices.jsx";
import { DEFAULT_SHOP_CHECKLIST } from "../dashboard/certCommon";
import {
  CertFlags,
  CertReason,
  RejectModal,
  RevokeModal,
  WaivePayment,
} from "./AdminCertParts.jsx";
import {
  EMPTY_WAIVE,
  PAYMENT_REQUIRED_MSG,
  certRowStatus,
  isPaymentRequired,
  needsPayment,
  txt,
  waiveBody,
  waiveOk,
} from "./certAdmin";

const usd = (v) =>
  `${Number(v || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} $`;
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const STATUS = {
  issued: { tone: "success", label: "Certifié", icon: <FaCheckCircle /> },
  requested: { tone: "neutral", label: "En attente de paiement", icon: <FaClock /> },
  paid: { tone: "warn", label: "À vérifier", icon: <FaClock /> },
  info_requested: { tone: "warn", label: "Complément demandé", icon: <FaClock /> },
  rejected: { tone: "danger", label: "Refusé", icon: <FaTimesCircle /> },
  revoked: { tone: "danger", label: "Révoqué", icon: <FaBan /> },
  none: { tone: "neutral", label: "Non certifié", icon: <FaTimesCircle /> },
};
// Demande en cours : refus ou complément possibles.
const REVIEWABLE = new Set(["requested", "paid", "info_requested"]);
const assetStatus = (a) => certRowStatus(a, "none");
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
// Filtres envoyés tels quels au backend (?filter=).
const FILTERS = [
  { k: "", label: "Tous" },
  { k: "paid", label: "À vérifier" },
  { k: "requested", label: "Non payés" },
  { k: "info_requested", label: "Complément demandé" },
  { k: "rejected", label: "Refusés" },
  { k: "certified", label: "Certifiés" },
  { k: "uncertified", label: "Non certifiés" },
];
const PRO_FILTERS = [
  { k: "", label: "Tous" },
  { k: "paid", label: "À vérifier" },
  { k: "requested", label: "Non payés" },
  { k: "info_requested", label: "Complément demandé" },
  { k: "rejected", label: "Refusés" },
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
const proStatus = (r) => certRowStatus(r, "requested");
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
  const { city, withCity, global } = useAdminView();
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
  const [revokeTarget, setRevokeTarget] = useState(null); // { certId, name }
  const [rejectTarget, setRejectTarget] = useState(null); // { certId, name }
  // Dispense de paiement (modale ouverte : certifier, mettre à jour, dossier pro).
  const [waive, setWaive] = useState(EMPTY_WAIVE);
  const [forcePay, setForcePay] = useState(false); // 409 payment_required reçu
  const resetWaive = () => {
    setWaive(EMPTY_WAIVE);
    setForcePay(false);
  };
  // Mise à jour d'un actif : paiement exigé si le propriétaire l'a demandée sans
  // payer (ou si le backend a répondu 409) ; émission : tant que non payé.
  const certifyUnpaid = (c) =>
    c?.mode === "update"
      ? forcePay || (!!c.updateRequested && c.paid !== true)
      : needsPayment(c, forcePay);
  const onIssueError = (e) => {
    if (isPaymentRequired(e)) {
      setForcePay(true);
      notify(PAYMENT_REQUIRED_MSG, "error");
    } else notify(e?.message || "Erreur", "error");
  };

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
  // Seul l'admin global modifie la config et les tarifs (le backend renvoie canEdit).
  const { data: cfgMeta } = useLoad(
    () => api.get("/v1/admin/certification/config").catch(() => null),
    [],
  );
  const canEditCfg = Boolean(cfgMeta?.canEdit ?? global);

  const { pageItems, page, setPage, totalPages, count } = usePaged(
    data.assets,
    10,
  );

  const saveConfig = async () => {
    if (!canEditCfg) return;
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
      notify(
        e?.status === 403
          ? "Seul l'administrateur national peut modifier ces paramètres."
          : e?.message || "Erreur",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  // Certifier (émission) ou mettre à jour (actif déjà certifié) : même fiche
  // checklist + propriétaire + notes. `certify.mode` = 'issue' | 'update'.
  const openCertify = (a) => {
    resetWaive();
    setCertify({ ...a, mode: "issue" });
    setChecks({});
    setOwner({ name: "", contact: "" });
    setNotes("");
  };
  // « Mettre à jour » un certificat délivré : champs certifiés pré-remplis
  // depuis la fiche, puis PUT /cert/:id (nouvelle version du PDF).
  const openUpdate = async (a) => {
    resetWaive();
    try {
      const d = await api.get(
        `/v1/admin/certification/doc/${encodeURIComponent(a.certId || a.productId)}`,
      );
      const init = {};
      const cl = d && typeof d.checklist === "object" ? d.checklist : {};
      (Array.isArray(cl.legal) ? cl.legal : []).forEach((i) => {
        if (i?.checked && i.key) init["l_" + i.key] = true;
      });
      (Array.isArray(cl.technical) ? cl.technical : []).forEach((i) => {
        if (i?.checked && i.key) init["t_" + i.key] = true;
      });
      const cur = d?.ownership?.current;
      setChecks(init);
      setOwner({ name: txt(cur?.name), contact: txt(cur?.contact) });
      setNotes(txt(d?.notes));
      setCertify({
        ...a,
        mode: "update",
        prevOwnership:
          d?.ownership && typeof d.ownership === "object" ? d.ownership : null,
      });
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    }
  };
  const doCertify = async () => {
    const isUpdate = certify.mode === "update";
    const unpaid = certifyUnpaid(certify);
    if (!waiveOk(unpaid, waive)) {
      notify(PAYMENT_REQUIRED_MSG, "error");
      return;
    }
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
      const today = new Date().toISOString().slice(0, 10);
      const prev = certify.prevOwnership || {};
      const prevCur = prev.current && typeof prev.current === "object" ? prev.current : null;
      const history = Array.isArray(prev.history) ? prev.history : [];
      const changed = !!prevCur && txt(prevCur.name) !== owner.name.trim();
      const ownership = {
        current: owner.name.trim()
          ? {
              name: owner.name.trim(),
              contact: owner.contact.trim(),
              since: changed || !prevCur ? today : prevCur.since || today,
            }
          : null,
        // Changement de propriétaire : l'ancien passe dans l'historique.
        history: changed ? [...history, { ...prevCur, until: today }] : history,
      };
      const extra = waiveBody(unpaid, waive);
      if (isUpdate) {
        await api.put(
          `/v1/admin/certification/cert/${encodeURIComponent(certify.certId)}`,
          { checklist, ownership, notes, ...extra },
        );
      } else {
        await api.post("/v1/admin/certification/issue", {
          productId: certify.productId,
          ...(certify.certId ? { certId: certify.certId } : {}),
          checklist,
          ownership,
          notes,
          ...extra,
        });
      }
      notify(isUpdate ? "Certificat mis à jour" : "Certificat délivré", "success");
      setCertify(null);
      reload();
    } catch (e) {
      onIssueError(e);
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
    resetWaive();
    setProChecks(init);
    setNotes("");
    setProView(row);
  };
  const proId = (row) => row?.certId || row?.id;
  const doProIssue = async () => {
    const row = proView;
    const renew = proStatus(row) === "issued";
    const unpaid = needsPayment(row, forcePay);
    if (!waiveOk(unpaid, waive)) {
      notify(PAYMENT_REQUIRED_MSG, "error");
      return;
    }
    setBusy(true);
    try {
      const checklist = proChecklistTpl(row).map((label) => ({
        label,
        checked: !!proChecks[label],
        done: !!proChecks[label],
      }));
      const extra = waiveBody(unpaid, waive);
      if (renew) {
        await api.put(
          `/v1/admin/certification/cert/${encodeURIComponent(proId(row))}`,
          { kind: "pro", checklist, notes, ...extra },
        );
      } else {
        await api.post("/v1/admin/certification/issue", {
          kind: "pro",
          certId: proId(row),
          checklist,
          notes,
          ...extra,
        });
      }
      notify(renew ? "Certificat renouvelé" : "Certificat délivré", "success");
      setProView(null);
      reload();
    } catch (e) {
      onIssueError(e);
    } finally {
      setBusy(false);
    }
  };
  const proName = (row) =>
    txt(row?.subject?.holderName) || txt(row?.holderName) || txt(row?.serial);
  const shopName = (row) =>
    txt(row?.subject?.shopName) || txt(row?.shopName) || txt(row?.serial);
  const askRevokePro = (row) =>
    setRevokeTarget({ certId: proId(row), name: proName(row) });
  const askRevokeShop = (row) =>
    setRevokeTarget({ certId: row.certId || row.id, name: shopName(row) });
  const askRejectPro = (row) =>
    setRejectTarget({ certId: proId(row), name: proName(row) });
  const askRejectShop = (row) =>
    setRejectTarget({ certId: row.certId || row.id, name: shopName(row) });

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
            value={c.paid ?? c.requested ?? 0}
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
          value={c.paid ?? c.requested ?? 0}
          label="À vérifier (payés)"
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
          onReject={askRejectShop}
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
                        <CertFlags row={r} />
                        <CertReason row={r} />
                      </td>
                      <td className="cat-col-actions">
                        <button
                          className="cat-icon-btn"
                          title="Voir le dossier"
                          onClick={() => openPro(r)}
                        >
                          <FaEye />
                        </button>
                        {REVIEWABLE.has(stKey) && (
                          <button
                            className="cat-icon-btn"
                            title="Refuser / Demander un complément"
                            onClick={() => askRejectPro(r)}
                          >
                            <FaTimesCircle />
                          </button>
                        )}
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
                  const stKey = assetStatus(a);
                  const st = STATUS[stKey] || STATUS.none;
                  const bc = BC[a.blockchainStatus] || BC.none;
                  const unpaid = a.paid !== true;
                  return (
                    <tr key={a.certId || a.productId}>
                      <td>
                        <span className="cat-pname">{txt(a.name) || "-"}</span>
                        {txt(a.serial) && (
                          <span className="cat-sku"> · {txt(a.serial)}</span>
                        )}
                      </td>
                      <td>{txt(a.category) || "·"}</td>
                      <td>{usd(a.valueUsd)}</td>
                      <td>
                        {a.p2p ? (
                          <Badge tone="neutral">
                            Particulier
                            {txt(a.sellerMasked) ? ` · ${txt(a.sellerMasked)}` : ""}
                          </Badge>
                        ) : (
                          txt(a.shopName) || "·"
                        )}
                        {txt(a.city) ? ` · ${cap(txt(a.city))}` : ""}
                      </td>
                      <td>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {stKey !== "none" && <CertFlags row={{ ...a, p2p: false }} />}
                        <CertReason row={a} />
                      </td>
                      <td>
                        {stKey === "issued" ? (
                          <Badge tone={bc.tone}>
                            <FaLink /> {bc.label}
                          </Badge>
                        ) : (
                          "·"
                        )}
                      </td>
                      <td className="cat-col-actions">
                        {stKey === "issued" ? (
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
                              title={
                                a.updateRequested
                                  ? "Mettre à jour (demandée par le propriétaire)"
                                  : "Mettre à jour"
                              }
                              onClick={() => openUpdate(a)}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="cat-icon-btn danger"
                              title="Révoquer"
                              onClick={() =>
                                setRevokeTarget({
                                  certId: a.certId,
                                  name: txt(a.name) || txt(a.serial),
                                })
                              }
                            >
                              <FaBan />
                            </button>
                          </>
                        ) : stKey === "revoked" ? (
                          "·"
                        ) : (
                          <>
                            {a.certId && REVIEWABLE.has(stKey) && (
                              <button
                                className="cat-icon-btn"
                                title="Refuser / Demander un complément"
                                onClick={() =>
                                  setRejectTarget({
                                    certId: a.certId,
                                    name: txt(a.name) || txt(a.serial),
                                  })
                                }
                              >
                                <FaTimesCircle />
                              </button>
                            )}
                            <Button
                              variant={unpaid ? "ghost" : "primary"}
                              title={
                                unpaid
                                  ? "Paiement non reçu : délivrance possible uniquement avec une dispense motivée"
                                  : undefined
                              }
                              onClick={() => openCertify(a)}
                            >
                              <FaCertificate /> Délivrer
                            </Button>
                          </>
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
            {!canEditCfg && (
              <p className="cert-config-locked">
                Lecture seule : seul l'administrateur national modifie le seuil et les tarifs.
              </p>
            )}
            <fieldset className="cert-config-fields" disabled={!canEditCfg}>
            <h3 className="dash-h3">Tarifs nationaux et seuil</h3>
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
            </fieldset>
            <div className="ui-modal-foot">
              <Button variant="ghost" onClick={() => setCfgOpen(false)}>
                {canEditCfg ? "Annuler" : "Fermer"}
              </Button>
              {canEditCfg && (
                <Button variant="primary" onClick={saveConfig} disabled={busy}>
                  {busy ? "Enregistrement…" : "Enregistrer"}
                </Button>
              )}
            </div>
            <CertCityPrices />
          </div>
        )}
      </Modal>

      {/* Certifier (checklist) */}
      <Modal
        open={!!certify}
        title={
          certify
            ? `${certify.mode === "update" ? "Mettre à jour" : "Délivrer"} · ${txt(certify.name)}`
            : ""
        }
        onClose={busy ? undefined : () => setCertify(null)}
      >
        {certify && (
          <div className="product-form">
            <p className="dash-sub">
              Valeur {usd(certify.valueUsd)} ·{" "}
              {certify.p2p
                ? `Particulier${txt(certify.sellerMasked) ? ` ${txt(certify.sellerMasked)}` : ""}`
                : txt(certify.shopName) || "·"}
              .{" "}
              {certify.mode === "update"
                ? `Nouvelle version du certificat ${txt(certify.serial)} (mise à jour ${usd(certify.price?.update ?? s.updatePriceUsd)}).`
                : `L'émission coûte ${usd(certify.price?.issue ?? s.issuePriceUsd)} au demandeur.`}
            </p>
            <div className="admin-procert-badges">
              <CertFlags row={certify} />
            </div>
            <CertReason row={certify} block />
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
            <WaivePayment
              unpaid={certifyUnpaid(certify)}
              value={waive}
              onChange={setWaive}
              label={
                certify.mode === "update"
                  ? "Mettre à jour sans paiement"
                  : "Délivrer sans paiement"
              }
            />
            <div className="ui-modal-foot procert-foot">
              <Button
                variant="ghost"
                onClick={() => setCertify(null)}
                disabled={busy}
              >
                Annuler
              </Button>
              {certify.certId && REVIEWABLE.has(assetStatus(certify)) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCertify(null);
                    setRejectTarget({
                      certId: certify.certId,
                      name: txt(certify.name) || txt(certify.serial),
                    });
                  }}
                  disabled={busy}
                >
                  <FaTimesCircle /> Refuser / Demander un complément
                </Button>
              )}
              <Button
                variant="primary"
                onClick={doCertify}
                disabled={busy || !waiveOk(certifyUnpaid(certify), waive)}
              >
                {busy
                  ? "Enregistrement…"
                  : certify.mode === "update"
                    ? "Enregistrer la mise à jour"
                    : "Délivrer le certificat"}
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
            // Tarif de la ville du technicien (repli : tarif national).
            const price = issued
              ? r.price?.update ?? proCfg(s, "proUpdatePriceUsd", "pro_update_price_usd")
              : r.price?.issue ?? proCfg(s, "proIssuePriceUsd", "pro_issue_price_usd");
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
                      <CertFlags row={r} />
                    </div>
                    <CertReason row={r} block />
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
                    <WaivePayment
                      unpaid={needsPayment(r, forcePay)}
                      value={waive}
                      onChange={setWaive}
                      label={issued ? "Renouveler sans paiement" : "Délivrer sans paiement"}
                    />
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
                  {REVIEWABLE.has(stKey) && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setProView(null);
                        askRejectPro(r);
                      }}
                    >
                      <FaTimesCircle /> Refuser / Demander un complément
                    </Button>
                  )}
                  {!revoked && (
                    <Button
                      variant="primary"
                      onClick={doProIssue}
                      disabled={busy || !waiveOk(needsPayment(r, forcePay), waive)}
                    >
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
            onReject={(row) => {
              setShopView(null);
              askRejectShop(row);
            }}
          />
        )}
      </Modal>

      <RevokeModal
        key={revokeTarget ? `rv-${revokeTarget.certId}` : "rv"}
        target={revokeTarget}
        api={api}
        notify={notify}
        onClose={() => setRevokeTarget(null)}
        onDone={() => {
          setRevokeTarget(null);
          reload();
        }}
      />

      <RejectModal
        key={rejectTarget ? `rj-${rejectTarget.certId}` : "rj"}
        target={rejectTarget}
        api={api}
        notify={notify}
        onClose={() => setRejectTarget(null)}
        onDone={() => {
          setRejectTarget(null);
          reload();
        }}
      />
    </div>
  );
}
