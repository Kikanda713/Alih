import { useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCopy,
  FaDownload,
  FaExternalLinkAlt,
  FaEye,
  FaImages,
  FaMousePointer,
  FaPlus,
  FaRegClock,
  FaSearch,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { useLoad } from "../api/useLoad";
import { useTaxonomy } from "../api/taxonomy";
import { marketApi } from "../market/lib/api";
import { formatPrice, imageUrl } from "../market/lib/format";
import { Badge, Button, Card, ConfirmModal, Field, Input, Modal, Select, Spinner } from "./ui.jsx";
import { copyText, downloadImage, fmtDate, txt } from "./influencerCommon";
import "./InfluencerSelections.css";

/*
 * « Mes sélections » de l'influenceur (/dashboard/influenceur) : mini catalogues
 * composés à partir de TOUT le marché public (n'importe quelle boutique),
 * partagés par un lien court /s/:slug et une image mosaïque.
 *   GET    /v1/merchant/influencer/collections                  → { collections, maxItems }
 *   POST   /v1/merchant/influencer/collections                  { title, days }
 *   GET    /v1/merchant/influencer/collections/:id              → { collection: { items, … } }
 *   PATCH  /v1/merchant/influencer/collections/:id              { title }
 *   DELETE /v1/merchant/influencer/collections/:id
 *   POST   /v1/merchant/influencer/collections/:id/items        { productId }
 *   DELETE /v1/merchant/influencer/collections/:id/items/:pid
 *   POST   /v1/merchant/influencer/collections/:id/reorder      { productIds }
 *   POST   /v1/merchant/influencer/collections/:id/publish|extend|expire { days? }
 * Une sélection est EN LIGNE dès son premier article ; vide, elle n'a pas de lien.
 * Recherche : GET /v1/market/listings (q, category, city), paginée.
 */

const ENDPOINT = "/v1/merchant/influencer/collections";
const PAGE = 12;
const DAY_OPTIONS = [
  { value: "3", label: "3 jours" },
  { value: "7", label: "7 jours" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
];

const STATUS = {
  published: { tone: "success", label: "En ligne" },
  draft: { tone: "neutral", label: "Vide, pas encore en ligne" },
  expired: { tone: "warn", label: "Expirée" },
};

const priceOf = (p) => formatPrice(p?.price, p?.currency) || "Prix sur demande";
const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;
/** L'image mosaïque change avec le contenu : la clé évite une ancienne version en cache. */
const mosaicUrl = (c) =>
  c?.imageUrl ? `${c.imageUrl}?v=${(c.items || []).map((i) => String(i.id).slice(0, 4)).join("")}` : null;

function Thumb({ src, alt = "" }) {
  return src ? (
    <img className="isel-thumb" src={imageUrl(src, 160)} alt={alt} loading="lazy" />
  ) : (
    <span className="isel-thumb isel-thumb-empty"><FaImages /></span>
  );
}

/** Liens de partage d'une sélection en ligne : copier, image, page. */
function ShareActions({ c, notify }) {
  if (!c?.isPublic || !txt(c.shareUrl)) return null;
  return (
    <div className="infl-code-actions">
      <Button variant="ghost" size="sm" onClick={() => copyText(c.shareUrl, notify, "Lien copié")}>
        <FaCopy /> Copier le lien
      </Button>
      {txt(c.imageUrl) && (
        <Button variant="ghost" size="sm" onClick={() => downloadImage(mosaicUrl(c), `tindisa-selection-${c.slug}.png`)}>
          <FaDownload /> Image
        </Button>
      )}
      {txt(c.pageUrl) && (
        <Button as="a" variant="ghost" size="sm" href={c.pageUrl} target="_blank" rel="noopener noreferrer">
          <FaExternalLinkAlt /> Voir la page
        </Button>
      )}
    </div>
  );
}

/** Recherche dans tout le marché public (texte, catégorie, ville), paginée. */
function MarketSearch({ inSelection, full, busyId, onAdd }) {
  const taxonomy = useTaxonomy();
  const [form, setForm] = useState({ q: "", category: "", city: "" });
  const [query, setQuery] = useState(null);
  const [pages, setPages] = useState(1);
  const params = query ? { ...query, limit: PAGE * pages, offset: 0, facets: 0 } : null;
  const res = useLoad(() => (params ? marketApi.listings(params) : Promise.resolve(null)), [params]);
  const items = Array.isArray(res.data?.items) ? res.data.items : [];

  const submit = (e) => {
    e.preventDefault();
    setPages(1);
    setQuery({ q: form.q.trim(), category: form.category, city: form.city });
  };
  const categories = (taxonomy?.categories || []).map((c) => ({ value: c.id, label: c.label }));
  const cities = (taxonomy?.cities || []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <section className="isel-search" aria-label="Chercher des articles sur le marché">
      <form className="isel-search-form" onSubmit={submit}>
        <Input
          value={form.q}
          onChange={(e) => setForm({ ...form, q: e.target.value })}
          placeholder="Chercher sur tout le marché : parcelle, sandales, Benerva…"
          aria-label="Recherche"
        />
        <Select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          options={categories}
          placeholder="Toutes catégories"
          aria-label="Catégorie"
        />
        <Select
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          options={cities}
          placeholder="Toutes villes"
          aria-label="Ville"
        />
        <Button type="submit" size="sm">
          <FaSearch /> Chercher
        </Button>
      </form>
      {!query && <p className="dash-sub">Les articles publiés de toutes les boutiques et vendeurs peuvent entrer dans votre sélection.</p>}
      {query && res.loading && items.length === 0 && <Spinner label="Recherche…" />}
      {query && !res.loading && items.length === 0 && <p className="dash-sub">Aucun article ne correspond. Essayez un autre mot ou retirez un filtre.</p>}
      {items.length > 0 && (
        <ul className="isel-results">
          {items.map((p) => {
            const already = inSelection.has(String(p.id));
            return (
              <li key={p.id} className="isel-result">
                <Thumb src={p.images?.[0]} />
                <div className="isel-result-main">
                  <strong>{txt(p.name)}</strong>
                  <span>{priceOf(p)}{txt(p.city) ? ` · ${txt(p.city)}` : ""}</span>
                  {txt(p.shop?.name) && <small>{txt(p.shop.name)}</small>}
                </div>
                <Button
                  size="sm"
                  variant={already ? "ghost" : "secondary"}
                  disabled={already || full || busyId === p.id}
                  onClick={() => onAdd(p)}
                >
                  {already ? "Ajouté" : <><FaPlus /> Ajouter</>}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {res.data?.hasMore && (
        <Button variant="ghost" size="sm" disabled={res.loading} onClick={() => setPages((n) => n + 1)}>
          {res.loading ? "Chargement…" : "Plus de résultats"}
        </Button>
      )}
    </section>
  );
}

/** Édition d'une sélection : titre, articles (ordre, retrait), recherche, aperçu, durée. */
function SelectionEditor({ id, api, notify, maxItems, onClose, onChanged }) {
  const q = useLoad(() => api.get(`${ENDPOINT}/${id}`), [id]);
  const c = q.data?.collection || null;
  const [busy, setBusy] = useState(null);
  const [title, setTitle] = useState(null);
  const [days, setDays] = useState("7");
  const [preview, setPreview] = useState(false);
  const items = c?.items || [];
  const inSelection = new Set(items.map((i) => String(i.id)));
  const full = items.length >= maxItems;

  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const d = await fn();
      if (d?.collection) q.setData(d);
      if (ok) notify(ok, "success");
      onChanged();
      return d;
    } catch (e) {
      notify(e?.message || "Opération impossible.", "error");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const add = (p) =>
    run(p.id, () => api.post(`${ENDPOINT}/${id}/items`, { productId: p.id }), `« ${txt(p.name)} » ajouté`);
  const remove = (p) => run(`rm-${p.id}`, () => api.del(`${ENDPOINT}/${id}/items/${p.id}`));
  const move = (index, dir) => {
    const ids = items.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run("order", () => api.post(`${ENDPOINT}/${id}/reorder`, { productIds: ids }));
  };
  const rename = () => {
    const t = (title ?? "").trim();
    if (!t || t === c?.title) return setTitle(null);
    run("title", () => api.patch(`${ENDPOINT}/${id}`, { title: t }), "Titre enregistré").then(() => setTitle(null));
  };
  const extend = () =>
    run("extend", () => api.post(`${ENDPOINT}/${id}/extend`, { days: Number(days) }), `Sélection prolongée de ${days} jours`);
  const publish = () => run("publish", () => api.post(`${ENDPOINT}/${id}/publish`, {}), "Sélection en ligne");

  const st = STATUS[c?.status] || STATUS.draft;
  return (
    <Modal open wide title={c ? `Sélection « ${txt(c.title)} »` : "Sélection"} onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Fermer</Button>}>
      {!c && q.loading && <Spinner label="Chargement…" />}
      {!c && !q.loading && <p className="dash-sub">Sélection introuvable.</p>}
      {c && (
        <div className="isel-editor">
          <div className="isel-editor-head">
            <Field label="Titre">
              <div className="isel-inline">
                <Input value={title ?? c.title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
                {title != null && title.trim() !== c.title && (
                  <Button size="sm" onClick={rename} disabled={busy === "title"}>Enregistrer</Button>
                )}
              </div>
            </Field>
            <div className="isel-status">
              <Badge tone={st.tone}>{st.label}</Badge>
              <span className="dash-sub">
                {c.status === "expired"
                  ? `Expirée le ${fmtDate(c.expiresAt)} : prolongez-la pour la remettre en ligne.`
                  : c.isPublic
                    ? `En ligne jusqu'au ${fmtDate(c.expiresAt)}.`
                    : "Ajoutez un premier article : la sélection sera aussitôt en ligne."}
              </span>
            </div>
          </div>

          <ShareActions c={c} notify={notify} />

          <div className="isel-inline isel-extend">
            <Select value={days} onChange={(e) => setDays(e.target.value)} options={DAY_OPTIONS} aria-label="Durée" />
            <Button variant="ghost" size="sm" onClick={extend} disabled={busy === "extend"}>
              <FaRegClock /> Prolonger
            </Button>
            {c.status === "draft" && items.length > 0 && (
              <Button size="sm" onClick={publish} disabled={busy === "publish"}>Publier</Button>
            )}
            {c.isPublic && txt(c.imageUrl) && (
              <Button variant="ghost" size="sm" onClick={() => setPreview((v) => !v)}>
                <FaEye /> {preview ? "Masquer l'aperçu" : "Aperçu de l'image"}
              </Button>
            )}
          </div>
          {preview && c.isPublic && (
            <img className="isel-mosaic" src={mosaicUrl(c)} alt={`Image de partage de « ${txt(c.title)} »`} width="1080" height="1080" />
          )}

          <h3 className="dash-h3">Articles ({items.length}/{maxItems})</h3>
          {items.length === 0 ? (
            <p className="dash-sub">Aucun article pour l'instant. Cherchez ci-dessous dans tout le marché.</p>
          ) : (
            <ol className="isel-items">
              {items.map((p, i) => (
                <li key={p.id} className="isel-item">
                  <span className="isel-pos">{i + 1}</span>
                  <Thumb src={p.image} alt="" />
                  <div className="isel-result-main">
                    <strong>{txt(p.name)}</strong>
                    <span>{priceOf(p)}{txt(p.city) ? ` · ${txt(p.city)}` : ""}</span>
                    {txt(p.shopName) && <small>{txt(p.shopName)}</small>}
                  </div>
                  <div className="isel-item-actions">
                    <Button variant="ghost" size="sm" aria-label="Monter" title="Monter" disabled={i === 0 || !!busy} onClick={() => move(i, -1)}>
                      <FaArrowUp />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label="Descendre" title="Descendre" disabled={i === items.length - 1 || !!busy} onClick={() => move(i, 1)}>
                      <FaArrowDown />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label="Retirer" title="Retirer" disabled={busy === `rm-${p.id}`} onClick={() => remove(p)}>
                      <FaTimes />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {full && <p className="dash-sub">Sélection complète ({maxItems} articles au plus) : retirez un article pour en ajouter un autre.</p>}

          <h3 className="dash-h3">Ajouter des articles</h3>
          <MarketSearch inSelection={inSelection} full={full} busyId={busy} onAdd={add} />
        </div>
      )}
    </Modal>
  );
}

/** Formulaire de création (titre, durée). */
function CreateForm({ api, notify, onCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api.post(ENDPOINT, { title: title.trim() || undefined, days: Number(days) });
      notify("Sélection créée : ajoutez vos articles.", "success");
      onCreated(d?.collection?.id);
    } catch (err) {
      notify(err?.message || "Création impossible.", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="isel-create" onSubmit={create}>
      <Field label="Titre">
        <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Mes coups de cœur de la semaine" />
      </Field>
      <Field label="Durée en ligne">
        <Select value={days} onChange={(e) => setDays(e.target.value)} options={DAY_OPTIONS} />
      </Field>
      <div className="procert-actions">
        <Button variant="ghost" size="sm" type="button" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button size="sm" type="submit" disabled={busy}>{busy ? "Création…" : "Créer"}</Button>
      </div>
    </form>
  );
}

export function SelectionsManager({ api, notify, canEdit = true }) {
  const list = useLoad(() => api.get(ENDPOINT), []);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = Array.isArray(list.data?.collections) ? list.data.collections : [];
  const maxItems = Number(list.data?.maxItems) || 12;

  const act = async (kind, c) => {
    setBusy(true);
    try {
      if (kind === "delete") await api.del(`${ENDPOINT}/${c.id}`);
      else await api.post(`${ENDPOINT}/${c.id}/${kind}`, kind === "extend" ? { days: 7 } : {});
      notify(kind === "delete" ? "Sélection supprimée" : kind === "expire" ? "Sélection arrêtée" : "Sélection prolongée de 7 jours", "success");
      list.reload();
    } catch (e) {
      notify(e?.message || "Opération impossible.", "error");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <Card className="infl-card">
      <div className="infl-card-head">
        <h2 className="dash-h3"><FaImages /> Mes sélections</h2>
        {canEdit && !creating && (
          <Button size="sm" onClick={() => setCreating(true)}><FaPlus /> Nouvelle sélection</Button>
        )}
      </div>
      <p className="dash-sub">
        Un mini catalogue d'articles choisis sur tout le marché ({maxItems} au plus), partagé par un lien court et une image.
        Il est en ligne dès le premier article. Aussi possible depuis WhatsApp : « crée une sélection ».
      </p>
      {creating && (
        <CreateForm
          api={api}
          notify={notify}
          onCancel={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            list.reload();
            if (id) setEditing(id);
          }}
        />
      )}
      {list.loading && !list.data && <Spinner label="Chargement…" />}
      {!list.loading && rows.length === 0 && !creating && <p className="dash-sub">Aucune sélection pour l'instant.</p>}
      {rows.length > 0 && (
        <ul className="infl-sel-list">
          {rows.map((c) => {
            const st = STATUS[c.status] || STATUS.draft;
            const n = Number(c.itemCount) || 0;
            return (
              <li key={c.id} className="infl-sel isel-row">
                <Thumb src={c.cover} />
                <div className="isel-row-body">
                  <div className="infl-sel-main">
                    <strong>{txt(c.title)}</strong>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="infl-sel-stats">
                    <span>{plural(n, "article")}</span>
                    <span><FaEye /> {plural(Number(c.views) || 0, "vue")}</span>
                    <span><FaMousePointer /> {plural(Number(c.clicks) || 0, "clic")}</span>
                    <span><FaRegClock /> {c.status === "expired" ? "Expirée le" : "Jusqu'au"} {fmtDate(c.expiresAt)}</span>
                  </div>
                  <ShareActions c={c} notify={notify} />
                  {canEdit && (
                    <div className="infl-code-actions">
                      <Button variant="secondary" size="sm" onClick={() => setEditing(c.id)}>Modifier</Button>
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => act("extend", c)}>
                        <FaRegClock /> +7 jours
                      </Button>
                      {c.status !== "expired" && (
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm({ kind: "expire", c })}>
                          Arrêter
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm({ kind: "delete", c })}>
                        <FaTrash /> Supprimer
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <SelectionEditor
          id={editing}
          api={api}
          notify={notify}
          maxItems={maxItems}
          onClose={() => setEditing(null)}
          onChanged={list.reload}
        />
      )}
      <ConfirmModal
        open={!!confirm}
        busy={busy}
        danger={confirm?.kind === "delete"}
        title={confirm?.kind === "delete" ? "Supprimer la sélection ?" : "Arrêter la sélection ?"}
        message={
          confirm?.kind === "delete"
            ? `« ${txt(confirm?.c?.title)} » sera supprimée et son lien ne fonctionnera plus.`
            : `« ${txt(confirm?.c?.title)} » sera marquée expirée tout de suite. Vous pourrez la prolonger plus tard.`
        }
        confirmLabel={confirm?.kind === "delete" ? "Supprimer" : "Arrêter"}
        onConfirm={() => confirm && act(confirm.kind, confirm.c)}
        onClose={() => setConfirm(null)}
      />
    </Card>
  );
}
