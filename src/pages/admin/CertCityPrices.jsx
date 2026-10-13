import { useState } from "react";
import { FaEdit, FaMapMarkerAlt, FaPlus, FaTrash } from "react-icons/fa";
import { useTindisaApi } from "../../api/client";
import { useLoad } from "../../api/useLoad";
import { useTaxonomy } from "../../api/taxonomy";
import { useToast } from "../../components/useToast";
import { Badge, Button, Field, Input, Select, Spinner } from "../../components/ui.jsx";
import { cityLabel } from "../../market/lib/format";
import { useAdminView } from "./adminView";

/** Les six tarifs (clé API, libellé court, groupe). */
const PRICE_FIELDS = [
  { key: "assetIssueUsd", label: "Émission", group: "Actif de valeur" },
  { key: "assetUpdateUsd", label: "Mise à jour", group: "Actif de valeur" },
  { key: "proIssueUsd", label: "Émission", group: "Aptitude pro" },
  { key: "proUpdateUsd", label: "Renouvellement", group: "Aptitude pro" },
  { key: "shopIssueUsd", label: "Émission", group: "Établissement" },
  { key: "shopUpdateUsd", label: "Renouvellement", group: "Établissement" },
];
const GROUPS = ["Actif de valeur", "Aptitude pro", "Établissement"];

const cityKey = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
const money = (v) => (v == null || v === "" ? "" : `${Number(v).toLocaleString("fr-FR")} $`);
const EMPTY = { cities: [], national: {}, canEdit: false };

/**
 * Tarifs de certification PAR VILLE. Une case vide = tarif national. Seul l'admin
 * global modifie ; un admin de ville voit les tarifs effectifs de sa ville.
 */
export default function CertCityPrices() {
  const api = useTindisaApi();
  const { notify } = useToast();
  const taxonomy = useTaxonomy();
  const { global, cities: scopeCities = [] } = useAdminView();
  const [editing, setEditing] = useState(null); // { city, isNew, values }
  const [removing, setRemoving] = useState(null); // ville à retirer
  const [busy, setBusy] = useState(false);

  const { data = EMPTY, loading, error, reload } = useLoad(
    () => api.get("/v1/admin/certification/city-prices"),
    [],
  );
  const canEdit = Boolean(data?.canEdit ?? global) && !error;
  const national = data?.national || {};
  const rows = Array.isArray(data?.cities) ? data.cities : [];

  const label = (c) => cityLabel(taxonomy, c) || c;
  const taken = new Set(rows.map((r) => cityKey(r.city)));
  const cityOptions = Array.from(
    new Set([...(taxonomy?.cities || []).map((c) => c.id), ...scopeCities.map(cityKey)].filter(Boolean)),
  )
    .filter((c) => !taken.has(c))
    .map((c) => ({ value: c, label: label(c) }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  const startEdit = (row) =>
    setEditing({
      city: row?.city || "",
      isNew: !row,
      values: Object.fromEntries(PRICE_FIELDS.map((f) => [f.key, row?.[f.key] ?? ""])),
    });

  const save = async () => {
    if (!editing?.city) return notify("Choisissez une ville.", "error");
    const body = {};
    for (const f of PRICE_FIELDS) {
      const v = editing.values[f.key];
      if (v === "" || v == null) body[f.key] = null;
      else if (!Number.isFinite(Number(v)) || Number(v) < 0)
        return notify(`${f.group} : prix invalide.`, "error");
      else body[f.key] = Number(v);
    }
    setBusy(true);
    try {
      await api.put(`/v1/admin/certification/city-prices/${encodeURIComponent(editing.city)}`, body);
      notify(`Tarifs de ${label(editing.city)} enregistrés`, "success");
      setEditing(null);
      reload();
    } catch (e) {
      notify(
        e?.status === 403 ? "Seul l'administrateur national peut modifier les tarifs." : e?.message || "Erreur",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/v1/admin/certification/city-prices/${encodeURIComponent(removing)}`);
      notify(`${label(removing)} revient au tarif national`, "success");
      setRemoving(null);
      reload();
    } catch (e) {
      notify(
        e?.status === 403 ? "Seul l'administrateur national peut modifier les tarifs." : e?.message || "Erreur",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cert-city-prices">
      <div className="cert-city-head">
        <h3 className="dash-h3">Tarifs par ville</h3>
        {canEdit && !editing && (
          <Button size="sm" variant="secondary" onClick={() => startEdit(null)}>
            <FaPlus /> Ajouter une ville
          </Button>
        )}
      </div>
      <p className="dash-sub">
        {canEdit
          ? "Une case vide applique le tarif national. Le montant est figé au moment où le demandeur lance son paiement."
          : "Tarifs appliqués dans votre ville. Seul l'administrateur national peut les modifier."}
      </p>

      {loading && <Spinner label="Chargement des tarifs…" />}
      {!loading && error && <p className="dash-sub">Tarifs par ville indisponibles pour le moment.</p>}
      {!loading && !error && rows.length === 0 && !editing && (
        <p className="dash-sub">Aucune ville n'a de tarif propre : le tarif national s'applique partout.</p>
      )}

      {editing && (
        <div className="cert-city-editor">
          {editing.isNew ? (
            <Field label="Ville">
              <Select
                value={editing.city}
                placeholder="Choisir une ville"
                options={cityOptions}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
              />
            </Field>
          ) : (
            <p className="cert-city-name">
              <FaMapMarkerAlt /> {label(editing.city)}
            </p>
          )}
          {GROUPS.map((g) => (
            <div key={g}>
              <span className="ui-field-label">{g}</span>
              <div className="form-row">
                {PRICE_FIELDS.filter((f) => f.group === g).map((f) => (
                  <Field key={f.key} label={`${f.label} (USD)`}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={editing.values[f.key]}
                      placeholder={national[f.key] != null ? `${national[f.key]} (national)` : "national"}
                      onChange={(e) =>
                        setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
          <div className="ui-modal-foot">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Annuler
            </Button>
            <Button variant="primary" onClick={save} disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer la ville"}
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <ul className="cert-city-list">
          {rows.map((r) => {
            const eff = r.effective || {};
            return (
              <li key={r.city} className="cert-city-card">
                <div className="cert-city-card-head">
                  <span className="cert-city-name">
                    <FaMapMarkerAlt /> {label(r.city)}
                  </span>
                  {r.inherited && <Badge tone="neutral">Tarif national</Badge>}
                  {canEdit && (
                    <span className="cert-city-actions">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)} disabled={busy}>
                        <FaEdit /> Modifier
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(r.city)} disabled={busy}>
                        <FaTrash /> Retirer
                      </Button>
                    </span>
                  )}
                </div>
                <dl className="cert-city-grid">
                  {GROUPS.map((g) => (
                    <div key={g}>
                      <dt>{g}</dt>
                      <dd>
                        {PRICE_FIELDS.filter((f) => f.group === g).map((f, i) => {
                          const own = r[f.key] != null;
                          const v = eff[f.key] ?? national[f.key];
                          return (
                            <span key={f.key} className={own ? "is-own" : "is-national"}>
                              {i > 0 ? " / " : ""}
                              {money(v) || "national"}
                            </span>
                          );
                        })}
                      </dd>
                    </div>
                  ))}
                </dl>
                {/* Confirmation sur place (pas de fenêtre dans la fenêtre des paramètres). */}
                {removing === r.city && (
                  <div className="cert-city-confirm">
                    <p>
                      {label(r.city)} appliquera de nouveau le tarif national. Les paiements déjà
                      lancés gardent leur montant.
                    </p>
                    <span className="cert-city-actions">
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(null)} disabled={busy}>
                        Annuler
                      </Button>
                      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
                        {busy ? "Retrait…" : "Retirer"}
                      </Button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
