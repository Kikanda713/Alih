import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FaExternalLinkAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaBoxOpen,
  FaSyncAlt,
  FaLink,
  FaStore,
  FaImage,
  FaEye,
  FaCertificate,
  FaCopy,
  FaCreditCard,
  FaPrint,
  FaExchangeAlt,
  FaMagic,
} from "react-icons/fa";
import { useTindisaApi } from "../../api/client";
import { useLoad } from "../../api/useLoad";
import { useT } from "../../i18n";
import { useToast } from "../../components/useToast";
import {
  Card,
  Button,
  Badge,
  Spinner,
  EmptyState,
  Field,
  Input,
  Select,
  Modal,
  ConfirmModal,
} from "../../components/ui.jsx";
import { usePaged } from "../../components/usePaged";
import { Pagination } from "../../components/Pagination.jsx";
import { useTaxonomy, categoriesByType } from "../../api/taxonomy";
import ProductFormModal from "./ProductFormModal.jsx";
import AnalyticsModal from "../../components/AnalyticsModal.jsx";
import PhotoEnhanceModal from "../../components/PhotoEnhanceModal.jsx";
import PaymentModal from "../../components/PaymentModal.jsx";
import { isInvalidPromoError, promoReasonLabel } from "../../api/promo";
import BataOfferModal from "./BataOfferModal.jsx";
import {
  AssetCertStateModal,
  CertCell,
  UpdateRequestModal,
} from "./AssetCertParts.jsx";
import { textOf, verifyLinkOf } from "./certCommon";
import { bataFamilyOf } from "../../market/lib/bata";

// BATA (échange) : état de l'offre d'un article certifié éligible.
const BATA_STATE = {
  active: { cls: "on", label: "BATA actif" },
  paused: { cls: "paused", label: "BATA en pause" },
};
function BataToggle({ p, offer, onOpen }) {
  const st = BATA_STATE[offer?.status];
  return (
    <button
      className={`cat-bata-btn${st ? " " + st.cls : ""}`}
      title="Échange (BATA) : proposer ce bien contre un autre"
      onClick={() => onOpen(p)}
    >
      <FaExchangeAlt /> {st ? st.label : "BATA"}
    </button>
  );
}

/* Barre de filtres pour que le commerçant prenne en main son catalogue. */
function CatalogueFilters({ value, onChange, taxonomy }) {
  const cats = value.type
    ? categoriesByType(taxonomy, value.type)
    : taxonomy?.categories || [];
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="cat-filters">
      <Input
        placeholder="Rechercher un article…"
        value={value.q}
        onChange={set("q")}
      />
      <Select
        value={value.type}
        onChange={(e) =>
          onChange({ ...value, type: e.target.value, category: "" })
        }
        options={taxonomy?.itemTypes || []}
        placeholder="Type"
      />
      <Select
        value={value.category}
        onChange={set("category")}
        options={cats}
        placeholder="Catégorie"
      />
      <Select
        value={value.condition}
        onChange={set("condition")}
        options={taxonomy?.conditions || []}
        placeholder="État"
      />
      <Select
        value={value.stock}
        onChange={set("stock")}
        options={[
          { id: "in", label: "En stock" },
          { id: "out", label: "Rupture" },
        ]}
        placeholder="Stock"
      />
      <Select
        value={value.cert}
        onChange={set("cert")}
        options={[
          { id: "certified", label: "Certifiés" },
          { id: "requested", label: "En demande" },
          { id: "uncertified", label: "Non certifiés" },
        ]}
        placeholder="Certification"
      />
    </div>
  );
}

function applyFilters(products, f, certByProduct = {}) {
  const q = (f.q || "").trim().toLowerCase();
  return products.filter((p) => {
    if (
      q &&
      !`${p.name || ""} ${p.sku || ""} ${p.category || ""}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    if (f.type && (p.type || "product") !== f.type) return false;
    if (f.category && p.category !== f.category) return false;
    if (f.condition && p.condition !== f.condition) return false;
    if (f.stock === "in" && !((p.quantity || 0) > 0)) return false;
    if (f.stock === "out" && (p.quantity || 0) > 0) return false;
    if (f.cert) {
      const st = certByProduct[p.id]?.status || "none";
      if (f.cert === "certified" && st !== "issued") return false;
      if (
        f.cert === "requested" &&
        !["requested", "paid", "info_requested", "rejected"].includes(st)
      )
        return false;
      if (f.cert === "uncertified" && st === "issued") return false;
    }
    return true;
  });
}

// Symbole/suffixe selon la devise (CDF → FC, USD → $).
function curLabel(currency) {
  const c = String(currency || "CDF").toUpperCase();
  return c === "USD" ? "$" : "FC";
}
function fmtPrice(v, currency) {
  if (v == null || v === "") return "·";
  const n = Number(v);
  if (Number.isNaN(n)) return "·";
  return `${n.toLocaleString("fr-FR")} ${curLabel(currency)}`;
}

function Thumb({ url }) {
  return (
    <span className="cat-thumb">
      {url ? <img src={url} alt="" /> : <FaImage />}
    </span>
  );
}

// Valeur en USD (au taux BCC) pour juger l'éligibilité à la certification.
/*
 * Décision de modération sur un article (posée par l'équipe Tindisa) : diffusion
 * bloquée ou supprimée, avec le motif. Le vendeur ne peut pas le remettre en ligne
 * lui-même ; il conteste auprès de l'assistant.
 */
function ModerationNotice({ moderation }) {
  if (!moderation || moderation.status === "published") return null;
  const label =
    moderation.status === "removed"
      ? "Supprimée"
      : moderation.status === "blocked"
        ? "Diffusion bloquée"
        : "Hors ligne";
  return (
    <span className="cat-mod-notice">
      <Badge tone="danger">{label}</Badge>
      {moderation.reason && <span className="cat-sku"> {moderation.reason}</span>}
      <span className="cat-sku">
        {" "}
        Pour contester, écrivez à l’assistant Tindisa.
      </span>
    </span>
  );
}

function priceUsd(pricing, rate) {
  const v = Number(pricing?.displayPrice);
  if (!Number.isFinite(v)) return null;
  return String(pricing?.currency || "CDF").toUpperCase() === "USD"
    ? v
    : v / (rate || 2400);
}

function ProductTable({
  products,
  readOnly,
  onEdit,
  onDelete,
  onViews,
  t,
  certByProduct,
  threshold,
  onViewCert,
  onRequestCert,
  onCertState,
  bataByProduct,
  onBata,
  onPhoto,
  proposedIds,
}) {
  const showCert = !!threshold;
  const rate = threshold?.exchangeRate;
  return (
    <div className="cat-table-wrap">
      <table className="cat-table">
        <thead>
          <tr>
            <th className="cat-col-img"></th>
            <th>{t("cat.col.product")}</th>
            <th>{t("cat.col.category")}</th>
            <th>{t("cat.col.price")}</th>
            {!readOnly && <th>{t("cat.col.floor")}</th>}
            <th>{t("cat.col.stock")}</th>
            {/* Vues = analytique, affichée pour TOUS les articles (local ET Wanzo). */}
            <th className="cat-col-views" title="Recommandations / vues">
              Vues
            </th>
            {showCert && (
              <th title="Certification des actifs de valeur">Certif.</th>
            )}
            {!readOnly && (
              <th className="cat-col-actions">{t("cat.col.actions")}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                <Thumb url={p.imageUrl} />
              </td>
              <td>
                <span className="cat-pname">{p.name}</span>
                {p.sku && <span className="cat-sku">{p.sku}</span>}
                <ModerationNotice moderation={p.moderation} />
              </td>
              <td>{p.category || "·"}</td>
              <td>{fmtPrice(p.pricing?.displayPrice, p.pricing?.currency)}</td>
              {!readOnly && (
                <td className="cat-floor">
                  {fmtPrice(p.pricing?.minPrice, p.pricing?.currency)}
                </td>
              )}
              <td>
                <Badge tone={(p.quantity || 0) > 0 ? "success" : "danger"}>
                  {p.quantity ?? 0}
                </Badge>
              </td>
              <td className="cat-views">
                {onViews ? (
                  <button
                    className="cat-views-btn"
                    title="Voir l'analytics"
                    onClick={() => onViews(p)}
                  >
                    <FaEye className="cat-views-ic" /> {p.views ?? 0}
                  </button>
                ) : (
                  <>
                    <FaEye className="cat-views-ic" /> {p.views ?? 0}
                  </>
                )}
              </td>
              {showCert && (
                <td>
                  <CertCell
                    p={p}
                    cert={certByProduct?.[p.id]}
                    eligible={(() => {
                      const u = priceUsd(p.pricing, rate);
                      return u != null && u >= (threshold?.usd || Infinity);
                    })()}
                    onView={onViewCert}
                    onRequest={onRequestCert}
                    onState={onCertState}
                  />
                  {onBata &&
                    certByProduct?.[p.id]?.status === "issued" &&
                    bataFamilyOf(p.category, p.subcategory) && (
                      <BataToggle
                        p={p}
                        offer={bataByProduct?.[p.id]}
                        onOpen={onBata}
                      />
                    )}
                </td>
              )}
              {!readOnly && (
                <td className="cat-col-actions">
                  {p.id && !p.moderation && (
                    <a
                      className="cat-icon-btn"
                      href={`/annonce/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Voir sur le marché public"
                      aria-label="Voir sur le marché public"
                    >
                      <FaExternalLinkAlt />
                    </a>
                  )}
                  {onPhoto && p.id && (p.imageUrl || p.images?.length) && (
                    <button
                      className={`cat-icon-btn${proposedIds?.has(p.id) ? " cat-icon-todo" : ""}`}
                      onClick={() => onPhoto(p)}
                      title={
                        proposedIds?.has(p.id)
                          ? "Photo améliorée à valider"
                          : "Photo e-commerce (avant / après)"
                      }
                      aria-label="Photo e-commerce"
                    >
                      <FaMagic />
                    </button>
                  )}
                  <button
                    className="cat-icon-btn"
                    onClick={() => onEdit(p)}
                    aria-label={t("cat.edit")}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="cat-icon-btn danger"
                    onClick={() => onDelete(p)}
                    aria-label={t("cat.delete")}
                  >
                    <FaTrash />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShopRenameModal({ open, current, onClose, onSave }) {
  const { t } = useT();
  const [name, setName] = useState(current || "");
  const [busy, setBusy] = useState(false);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setName(current || "");
  }
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave(name.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      title={t("shop.rename")}
      onClose={busy ? undefined : onClose}
    >
      <Field label={t("shop.name")}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <div className="ui-modal-foot">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {t("form.cancel")}
        </Button>
        <Button variant="primary" onClick={save} disabled={busy}>
          {t("form.save")}
        </Button>
      </div>
    </Modal>
  );
}

const NO_PRODUCTS = [];

function WanzoTab({ t, onViews }) {
  const api = useTindisaApi();
  const { notify } = useToast();
  const [busy, setBusy] = useState("");
  // Liaison Wanzo + produits Wanzo ; rechargés après connexion / synchro.
  const {
    data,
    loading,
    reload: load,
  } = useLoad(async () => {
    try {
      const [link, wanzo] = await Promise.allSettled([
        api.get("/v1/wanzo/link"),
        api.get("/v1/merchant/wanzo/products"),
      ]);
      return {
        link: link.status === "fulfilled" ? link.value : null,
        products:
          wanzo.status === "fulfilled" ? wanzo.value?.products || [] : [],
      };
    } catch {
      return { link: null, products: [] };
    }
  }, []);
  const state = {
    loading,
    link: data?.link ?? null,
    products: data?.products || NO_PRODUCTS,
  };
  const wp = usePaged(state.products, 10);

  const linked = state.link?.linked;
  const verified = state.link?.link?.verified;

  // Liaison automatique : le backend résout le companyId via l'email (vérifié)
  // du marchand connecté — aucune saisie d'ID requise.
  const connect = async () => {
    setBusy("connect");
    try {
      await api.post("/v1/wanzo/link", {});
      notify(t("merchant.connect.success"), "success");
      load();
    } catch (e) {
      notify(e?.message || t("merchant.error"), "error");
    } finally {
      setBusy("");
    }
  };

  const sync = async () => {
    setBusy("sync");
    try {
      const r = await api.post("/v1/wanzo/sync", {});
      notify(t("merchant.sync.success", { count: r?.synced ?? 0 }), "success");
      load();
    } catch (e) {
      notify(e?.message || t("merchant.sync.unknown"), "error");
    } finally {
      setBusy("");
    }
  };

  if (state.loading) return <Spinner label={t("cat.loading")} />;

  return (
    <div className="cat-wanzo">
      <Card className="cat-wanzo-card">
        <div className="cat-wanzo-status">
          <FaLink />
          {linked ? (
            <span>
              {t("merchant.status.linked")} ·{" "}
              <Badge tone={verified ? "success" : "warn"}>
                {verified
                  ? t("merchant.status.verified")
                  : t("merchant.status.notVerified")}
              </Badge>
            </span>
          ) : (
            <span>{t("cat.wanzo.notLinked")}</span>
          )}
        </div>
        {!linked ? (
          <div className="cat-wanzo-connect">
            <p className="cat-wanzo-hint">{t("merchant.connect.title")}</p>
            <Button
              variant="primary"
              onClick={connect}
              disabled={busy === "connect"}
            >
              <FaLink /> {t("merchant.connect.button")}
            </Button>
          </div>
        ) : (
          <Button variant="primary" onClick={sync} disabled={busy === "sync"}>
            <FaSyncAlt /> {t("merchant.sync.button")}
          </Button>
        )}
      </Card>

      <p className="cat-readonly-note">{t("cat.wanzo.readonly")}</p>
      {state.products.length === 0 ? (
        <EmptyState icon={<FaBoxOpen />} text={t("cat.wanzo.empty")} />
      ) : (
        <>
          <ProductTable
            products={wp.pageItems}
            readOnly
            onViews={onViews}
            t={t}
          />
          <Pagination
            page={wp.page}
            totalPages={wp.totalPages}
            count={wp.count}
            onChange={wp.setPage}
          />
        </>
      )}
    </div>
  );
}

export default function CataloguePage() {
  const api = useTindisaApi();
  const { t } = useT();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("local");
  // Catalogue (boutique + produits), rechargé après chaque action. En cas
  // d'erreur : message affiché, dernières données conservées.
  const lastCatalog = useRef({ shop: null, products: NO_PRODUCTS });
  const {
    data: catalog,
    loading,
    reload: load,
  } = useLoad(
    () =>
      api.get("/v1/merchant/products").then(
        (r) =>
          (lastCatalog.current = {
            shop: r?.shop || null,
            products: r?.products || [],
          }),
        (e) => ({
          ...lastCatalog.current,
          error: e?.message || t("merchant.error"),
        }),
      ),
    [],
  );
  const shop = catalog?.shop ?? null;
  const products = catalog?.products || NO_PRODUCTS;
  const error = catalog?.error || "";
  // Arrivée via ?new=1 → ouvre directement le formulaire d'ajout.
  const [modal, setModal] = useState(() => ({
    open: params.get("new") === "1",
    product: null,
  }));
  const [confirm, setConfirm] = useState({
    open: false,
    product: null,
    busy: false,
  });
  const [analytics, setAnalytics] = useState({ open: false, product: null });
  // Photo de couverture au format e-commerce (avant / après, Studio ou Scène).
  const [photoFor, setPhotoFor] = useState(null);
  // Retouches IA en attente : jamais publiées sans votre accord.
  const { data: photoProposals, reload: reloadProposals } = useLoad(
    () => api.get("/v1/merchant/photos/proposed").catch(() => null),
    [],
  );
  const proposedIds = new Set(
    (photoProposals?.items || []).map((x) => x.productId),
  );
  const [renaming, setRenaming] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    type: "",
    category: "",
    condition: "",
    stock: "",
    cert: "",
  });
  const [certByProduct, setCertByProduct] = useState({});
  const [certSummary, setCertSummary] = useState(null);
  const [viewCert, setViewCert] = useState(null);
  const [certPdfUrl, setCertPdfUrl] = useState("");
  const [pay, setPay] = useState({ open: false, product: null });
  // Offres BATA du commerçant (best-effort) : la plus récente non clôturée par article.
  const { data: bataByProduct, reload: reloadBata } = useLoad(
    () =>
      api.get("/v1/merchant/bata/offers").then(
        (r) => {
          const list = Array.isArray(r)
            ? r
            : Array.isArray(r?.items)
              ? r.items
              : Array.isArray(r?.offers)
                ? r.offers
                : [];
          const map = {};
          for (const o of list) {
            if (!o || typeof o !== "object" || !o.productId) continue;
            if (o.status === "closed" || o.status === "removed") {
              if (!map[o.productId]) map[o.productId] = o;
            } else map[o.productId] = o;
          }
          return map;
        },
        () => ({}),
      ),
    [],
  );
  const [bataFor, setBataFor] = useState(null);
  const taxonomy = useTaxonomy();
  const filtered = applyFilters(products, filters, certByProduct);
  const lp = usePaged(filtered, 10);

  // Certificats du commerçant (best-effort, ne bloque pas le catalogue) :
  // rechargés après chaque chargement réussi du catalogue.
  useEffect(() => {
    if (!catalog || catalog.error) return;
    Promise.all([
      api.get("/v1/merchant/certificates").catch(() => []),
      api.get("/v1/merchant/certificates/summary").catch(() => null),
    ]).then(([list, sum]) => {
      const map = {};
      for (const c of Array.isArray(list) ? list : []) map[c.productId] = c;
      setCertByProduct(map);
      setCertSummary(sum || null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  // « Certifier » = payer (argent réel). Le paiement ne délivre pas le
  // certificat : l'équipe Tindisa inspecte l'actif puis le délivre.
  const startCertify = (p) => setPay({ open: true, product: p, kind: "issue" });
  const [certState, setCertState] = useState(null); // { product, cert }
  const [updateFor, setUpdateFor] = useState(null); // certificat à mettre à jour
  // Tarif applicable (ville de la boutique, sinon national) : d'abord celui du
  // certificat existant, puis celui de la boutique de l'article, puis le défaut.
  const amountFor = (p, kind = "issue") => {
    const c = p ? certByProduct[p.id || p.productId] : null;
    const fromCert = kind === "update" ? c?.price?.update : c?.price?.issue;
    const shopPricing =
      certSummary?.pricingByShop?.[p?.shopId ?? p?.shop?.id] || certSummary?.pricing;
    const v =
      fromCert ?? (kind === "update" ? shopPricing?.updateUsd : shopPricing?.issueUsd);
    return v != null ? `${v} $` : "";
  };

  // Renvoi d'une demande (complément, refus, révocation) : même action que la
  // demande initiale. Déjà payée → retour en vérification, sinon paiement.
  const resubmitCert = async (p) => {
    try {
      const r = await api.post("/v1/merchant/certificates/request", {
        productId: p.id,
      });
      if (r && typeof r === "object" && r.ok === false) {
        notify(textOf(r.reason) || textOf(r.message) || "Demande refusée", "error");
        return;
      }
      setCertState(null);
      load();
      const st = textOf(r?.status || r?.certificate?.status);
      const paid = r?.paid ?? r?.certificate?.paid;
      if (st === "requested" && paid !== true) {
        notify("Demande renvoyée. Réglez les frais pour lancer la vérification.", "success");
        startCertify(p);
      } else {
        notify("Demande renvoyée : l'équipe Tindisa va la vérifier.", "success");
      }
    } catch (e) {
      notify(e?.message || t("merchant.error"), "error");
    }
  };

  // Mise à jour d'un certificat délivré : note → update-request → paiement.
  const submitUpdate = async (cert, note) => {
    const ref = cert.certId || cert.id || cert.productId;
    try {
      await api.post(
        `/v1/merchant/certificates/${encodeURIComponent(ref)}/update-request`,
        { note },
      );
      setUpdateFor(null);
      closeCert();
      notify("Demande de mise à jour envoyée. Réglez les frais pour qu'elle soit traitée.", "success");
      const product = products.find((x) => x.id === cert.productId) || {
        id: cert.productId,
        name: cert.productName,
      };
      setPay({ open: true, product, kind: "update" });
      load();
    } catch (e) {
      notify(e?.message || t("merchant.error"), "error");
    }
  };

  // Copier un lien de paiement (à envoyer via WhatsApp/SMS).
  const copyPayLink = async (productId, kind = "issue", promoCode = "") => {
    try {
      const r = await api.post("/v1/merchant/certificates/pay-link", {
        productId,
        ...(kind === "update" ? { kind: "update" } : {}),
        ...(promoCode ? { promoCode } : {}),
      });
      if (r?.url && navigator.clipboard) {
        await navigator.clipboard.writeText(r.url);
        notify(
          "Lien de paiement copié : collez-le dans votre messagerie ou par SMS",
          "success",
        );
      } else if (r?.url) {
        notify(r.url, "info");
      }
    } catch (e) {
      notify(isInvalidPromoError(e) ? promoReasonLabel(e?.data?.reason) : e?.message || t("merchant.error"), "error");
    }
  };

  const openCert = async (cert) => {
    const ref = cert.certId || cert.productId;
    try {
      const d = await api.get(
        `/v1/merchant/certificates/${encodeURIComponent(ref)}/doc`,
      );
      // Fiche complète + champs de la liste (verifyUrl, updateRequested…).
      setViewCert(d && typeof d === "object" ? { ...cert, ...d } : cert);
      // Aperçu du PDF réel (le QR y figure) : base64 → blob local.
      setCertPdfUrl("");
      try {
        const pdf = await api.get(
          `/v1/merchant/certificates/${encodeURIComponent(ref)}/pdf`,
        );
        if (pdf?.base64) {
          const bytes = Uint8Array.from(atob(pdf.base64), (c) =>
            c.charCodeAt(0),
          );
          setCertPdfUrl(
            URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })),
          );
        }
      } catch {
        /* pas de PDF (certificat legacy) — on affiche quand même les métadonnées */
      }
    } catch (e) {
      notify(e?.message || t("merchant.error"), "error");
    }
  };
  const copyVerifyLink = async (cert) => {
    const link = verifyLinkOf(cert);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      notify("Lien de vérification copié", "success");
    } catch {
      notify(link, "info");
    }
  };
  const closeCert = () => {
    if (certPdfUrl) URL.revokeObjectURL(certPdfUrl);
    setCertPdfUrl("");
    setViewCert(null);
  };

  // ?new=1 consommé (modale ouverte via l'état initial) : on nettoie l'URL.
  useEffect(() => {
    if (params.get("new") === "1") {
      params.delete("new");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (payload) => {
    const editing = !!modal.product;
    if (editing)
      await api.put(`/v1/merchant/products/${modal.product.id}`, payload);
    else await api.post("/v1/merchant/products", payload);
    setModal({ open: false, product: null });
    notify(editing ? t("toast.updated") : t("toast.created"), "success");
    load();
  };

  const doDelete = async () => {
    const p = confirm.product;
    setConfirm((c) => ({ ...c, busy: true }));
    try {
      await api.del(`/v1/merchant/products/${p.id}`);
      notify(t("toast.deleted"), "success");
      setConfirm({ open: false, product: null, busy: false });
      load();
    } catch (e) {
      notify(e?.message || t("merchant.error"), "error");
      setConfirm((c) => ({ ...c, busy: false }));
    }
  };

  const renameShop = async (name) => {
    try {
      await api.put("/v1/merchant/shop", { name });
      notify(t("toast.shopRenamed"), "success");
      setRenaming(false);
      load();
    } catch (e) {
      notify(e?.message || t("merchant.error"), "error");
    }
  };

  return (
    <div className="dash-page">
      <header className="dash-page-head cat-head">
        <div>
          <h1 className="dash-h1">{t("cat.title")}</h1>
          <p className="dash-sub">{t("cat.subtitle")}</p>
          {shop && (
            <button
              className="cat-shop-chip"
              onClick={() => navigate("/dashboard/boutique")}
              title="Gérer mon espace pro"
            >
              <FaStore /> {shop.name} <FaEdit className="cat-shop-edit" />
            </button>
          )}
        </div>
        {tab === "local" && (
          <Button
            variant="primary"
            onClick={() => setModal({ open: true, product: null })}
          >
            <FaPlus /> {t("cat.add")}
          </Button>
        )}
      </header>

      <div className="cat-tabs">
        <button
          className={`cat-tab${tab === "local" ? " active" : ""}`}
          onClick={() => setTab("local")}
        >
          {t("cat.tab.local")}
        </button>
        <button
          className={`cat-tab${tab === "wanzo" ? " active" : ""}`}
          onClick={() => setTab("wanzo")}
        >
          {t("cat.tab.wanzo")}
        </button>
      </div>

      {tab === "local" ? (
        loading ? (
          <Spinner label={t("cat.loading")} />
        ) : error ? (
          <Card>
            <p className="form-error">{error}</p>
          </Card>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<FaBoxOpen />}
            title={t("cat.empty.title")}
            text={t("cat.empty.text")}
            action={
              <Button
                variant="primary"
                onClick={() => setModal({ open: true, product: null })}
              >
                <FaPlus /> {t("cat.add")}
              </Button>
            }
          />
        ) : (
          <>
            {certSummary &&
              (certSummary.certified > 0 ||
                certSummary.requested > 0 ||
                Number(certSummary.totalCostUsd) > 0) && (
                <div className="cat-cert-summary">
                  <FaCertificate className="cat-cert-summary-ic" />
                  <span>
                    <strong>{certSummary.certified}</strong> certifiés
                  </span>
                  <span>
                    <strong>{certSummary.requested}</strong> en demande
                  </span>
                  <span>
                    Coût total{" "}
                    <strong>
                      {Number(certSummary.totalCostUsd || 0).toLocaleString(
                        "fr-FR",
                      )}{" "}
                      $
                    </strong>
                    {Number(certSummary.owedUsd) > 0
                      ? ` (dont ${Number(certSummary.owedUsd).toLocaleString("fr-FR")} $ dus)`
                      : ""}
                  </span>
                </div>
              )}
            <CatalogueFilters
              value={filters}
              onChange={setFilters}
              taxonomy={taxonomy}
            />
            {photoProposals?.count > 0 && (
              <div className="cat-photo-todo" role="status">
                <FaMagic />
                <span>
                  <strong>{photoProposals.count}</strong> photo
                  {photoProposals.count > 1 ? "s" : ""} améliorée
                  {photoProposals.count > 1 ? "s" : ""} à valider. Elles ne
                  sont pas publiées tant que vous ne les acceptez pas.
                </span>
                <div className="cat-photo-todo-list">
                  {photoProposals.items.slice(0, 6).map((x) => (
                    <button
                      key={x.productId}
                      type="button"
                      className="cat-photo-todo-item"
                      title={x.name}
                      onClick={() => setPhotoFor({ id: x.productId, name: x.name })}
                    >
                      <img src={x.enhancedUrl} alt={x.name} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {filtered.length === 0 ? (
              <Card>
                <p className="cat-empty-filter">
                  Aucun article ne correspond à ces filtres.
                </p>
              </Card>
            ) : (
              <>
                <ProductTable
                  products={lp.pageItems}
                  onEdit={(p) => setModal({ open: true, product: p })}
                  onDelete={(p) =>
                    setConfirm({ open: true, product: p, busy: false })
                  }
                  onViews={(p) => setAnalytics({ open: true, product: p })}
                  t={t}
                  certByProduct={certByProduct}
                  threshold={certSummary?.threshold}
                  onViewCert={openCert}
                  onRequestCert={startCertify}
                  onCertState={(p, c) => setCertState({ product: p, cert: c })}
                  bataByProduct={bataByProduct}
                  onBata={setBataFor}
                  onPhoto={setPhotoFor}
                  proposedIds={proposedIds}
                />
                <Pagination
                  page={lp.page}
                  totalPages={lp.totalPages}
                  count={lp.count}
                  onChange={lp.setPage}
                />
              </>
            )}
          </>
        )
      ) : (
        <WanzoTab
          t={t}
          onViews={(p) => setAnalytics({ open: true, product: p })}
        />
      )}

      <ProductFormModal
        open={modal.open}
        product={modal.product}
        onClose={() => setModal({ open: false, product: null })}
        onSave={save}
      />

      <ConfirmModal
        open={confirm.open}
        danger
        busy={confirm.busy}
        title={t("cat.delete")}
        message={
          confirm.product
            ? t("cat.deleteConfirm", { name: confirm.product.name })
            : ""
        }
        confirmLabel={t("cat.delete")}
        cancelLabel={t("form.cancel")}
        onConfirm={doDelete}
        onClose={() => setConfirm({ open: false, product: null, busy: false })}
      />

      <ShopRenameModal
        open={renaming}
        current={shop?.name}
        onClose={() => setRenaming(false)}
        onSave={renameShop}
      />

      <AnalyticsModal
        open={analytics.open}
        product={analytics.product}
        onClose={() => setAnalytics({ open: false, product: null })}
      />

      {photoFor && (
        <PhotoEnhanceModal
          open
          title={`Photo de « ${photoFor.name} »`}
          onClose={() => setPhotoFor(null)}
          onChanged={reloadProposals}
          endpoints={{
            state: `/v1/merchant/products/${photoFor.id}/photo`,
            enhance: `/v1/merchant/products/${photoFor.id}/photo/enhance`,
            accept: `/v1/merchant/products/${photoFor.id}/photo/accept`,
            revert: `/v1/merchant/products/${photoFor.id}/photo/enhance`,
          }}
        />
      )}

      <Modal
        open={!!viewCert}
        title={viewCert ? `Certificat ${textOf(viewCert.serial)}` : ""}
        onClose={closeCert}
      >
        {viewCert && (
          <div className="cert-view">
            {/* Aperçu du PDF officiel (le QR y figure) */}
            {certPdfUrl ? (
              <div className="cert-pdf-preview">
                <iframe src={certPdfUrl} title="Certificat de valeur Tindisa" />
              </div>
            ) : (
              <div className="cert-doc">
                <div className="cert-doc-head">
                  <FaCertificate className="cert-doc-logo" />
                  <div>
                    <strong>Certificat de valeur Tindisa</strong>
                    <div className="cat-sku">
                      {viewCert.serial} · v{viewCert.version} ·{" "}
                      {viewCert.status === "issued"
                        ? "Valide"
                        : viewCert.status}
                    </div>
                  </div>
                </div>
                <div className="cert-doc-grid">
                  <div>
                    <span className="metric-item-label">Actif</span>
                    <span>{viewCert.productName}</span>
                  </div>
                  <div>
                    <span className="metric-item-label">Valeur</span>
                    <span>
                      {viewCert.value?.amount != null
                        ? `${Number(viewCert.value.amount).toLocaleString("fr-FR")} ${viewCert.value.currency || ""}`
                        : "·"}
                    </span>
                  </div>
                  <div>
                    <span className="metric-item-label">Émis le</span>
                    <span>
                      {viewCert.issuedAt
                        ? new Date(viewCert.issuedAt).toLocaleDateString(
                            "fr-FR",
                          )
                        : "·"}
                    </span>
                  </div>
                  <div>
                    <span className="metric-item-label">Émetteur</span>
                    <span>{viewCert.issuer}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Ancrage blockchain (données réelles) */}
            <div className="cert-doc-bc">
              <FaLink /> <strong>Blockchain :</strong>{" "}
              {viewCert.blockchain?.status === "anchored"
                ? "Ancré on-chain"
                : viewCert.blockchain?.status === "mock"
                  ? "Ancré (mode test)"
                  : viewCert.blockchain?.status === "pending"
                    ? "Empreinte enregistrée (ancrage en attente)"
                    : "·"}
              {viewCert.blockchain?.anchorHash && (
                <div className="cat-sku">
                  empreinte {viewCert.blockchain.anchorHash}
                </div>
              )}
              <div className="cert-bc-links">
                {viewCert.blockchain?.explorerUrl && (
                  <a
                    href={viewCert.blockchain.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir la transaction
                  </a>
                )}
                {viewCert.blockchain?.ipfsUrl && (
                  <a
                    href={viewCert.blockchain.ipfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Document IPFS
                  </a>
                )}
              </div>
            </div>

            {viewCert.updateRequested && (
              <div className="procert-renew">
                <FaSyncAlt />
                <span>
                  {viewCert.updatePaid
                    ? "Mise à jour payée : l'équipe Tindisa vérifie puis délivre la nouvelle version. Vous serez prévenu par message."
                    : "Mise à jour demandée. Réglez les frais pour que l'équipe Tindisa la traite."}
                </span>
              </div>
            )}

            <div className="ui-modal-foot procert-foot">
              <Button variant="ghost" onClick={closeCert}>
                Fermer
              </Button>
              {viewCert.status === "issued" && verifyLinkOf(viewCert) && (
                <Button variant="ghost" onClick={() => copyVerifyLink(viewCert)}>
                  <FaCopy /> Copier le lien de vérification
                </Button>
              )}
              {viewCert.status === "issued" &&
                (viewCert.updateRequested && !viewCert.updatePaid ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const product = products.find(
                        (x) => x.id === viewCert.productId,
                      ) || { id: viewCert.productId, name: viewCert.productName };
                      closeCert();
                      setPay({ open: true, product, kind: "update" });
                    }}
                  >
                    <FaCreditCard /> Payer la mise à jour
                  </Button>
                ) : !viewCert.updateRequested ? (
                  <Button variant="ghost" onClick={() => setUpdateFor(viewCert)}>
                    <FaSyncAlt /> Demander une mise à jour
                  </Button>
                ) : null)}
              {certPdfUrl && (
                <Button
                  variant="primary"
                  as="a"
                  href={certPdfUrl}
                  download={`${textOf(viewCert.serial) || "certificat"}.pdf`}
                >
                  <FaPrint /> Télécharger le PDF
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <AssetCertStateModal
        state={certState}
        amount={amountFor(certState?.product, "issue")}
        onClose={() => setCertState(null)}
        onPay={(p) => {
          setCertState(null);
          startCertify(p);
        }}
        onCopyPayLink={(id) => copyPayLink(id)}
        onEditProduct={(p) => {
          setCertState(null);
          setModal({ open: true, product: p });
        }}
        onResubmit={resubmitCert}
      />

      <UpdateRequestModal
        key={updateFor ? updateFor.certId || updateFor.productId : "none"}
        cert={updateFor}
        amount={
          updateFor
            ? amountFor({ id: updateFor.productId, shopId: updateFor.shopId }, "update")
            : amountFor(null, "update")
        }
        onClose={() => setUpdateFor(null)}
        onSubmit={submitUpdate}
      />

      {bataFor && (
        <BataOfferModal
          key={bataFor.id}
          product={bataFor}
          offer={bataByProduct?.[bataFor.id] || null}
          onClose={() => setBataFor(null)}
          onSaved={() => {
            setBataFor(null);
            reloadBata();
          }}
          onCertify={(p) => {
            setBataFor(null);
            startCertify(p);
          }}
        />
      )}

      <PaymentModal
        open={pay.open}
        variant="certificate"
        certKind={pay.kind === "update" ? "update" : "issue"}
        productId={pay.product?.id}
        amount={amountFor(pay.product, pay.kind === "update" ? "update" : "issue")}
        onCopyLink={
          pay.product
            ? (promoCode) => copyPayLink(pay.product.id, pay.kind === "update" ? "update" : "issue", promoCode)
            : undefined
        }
        onClose={() => setPay({ open: false, product: null, kind: "issue" })}
        onDone={load}
      />
    </div>
  );
}
