import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaStore, FaBan, FaUndo, FaSearch, FaHistory, FaExternalLinkAlt, FaTools } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { useTaxonomy, findShopType, shopTypeGroups } from '../../api/taxonomy'
import { useToast } from '../../components/useToast'
import { Badge, Button, EmptyState, Field, Input, Modal, Spinner, Textarea } from '../../components/ui.jsx'
import { useAdminView } from './adminView'

/*
 * Vendeurs (établissements, ateliers, agences, techniciens…) et leur BLOCAGE.
 * Bloquer = retirer du marché (annonces, fiche, recherche de l'assistant) et
 * empêcher toute publication ; motif obligatoire, tracé (qui, quand, pourquoi).
 * Un admin de ville ne voit et ne bloque que sa ville.
 */

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const when = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '')
const PAGE = 30
const STATUS_FILTERS = [
  { k: '', label: 'Tous' },
  { k: 'active', label: 'Actifs' },
  { k: 'blocked', label: 'Bloqués' },
]

function BlockModal({ seller, onClose, onDone }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (reason.trim().length < 5) return notify('Indiquez le motif du blocage', 'error')
    setBusy(true)
    try {
      await api.post(`/v1/admin/sellers/${seller.id}/block`, { reason: reason.trim() })
      notify(`${seller.name} est bloqué`, 'success')
      onDone()
    } catch (e) {
      notify(e?.message || 'Blocage impossible', 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open title={`Bloquer ${seller.name}`} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button>
        <Button variant="danger" onClick={submit} disabled={busy}><FaBan /> {busy ? 'Blocage…' : 'Bloquer'}</Button>
      </>}>
      <p className="dash-sub">
        Le vendeur disparaît du marché (annonces, fiche publique, recherche de l’assistant) et ne peut plus rien publier
        ni modifier. Son tableau de bord affiche la suspension, le motif lui est indiqué s’il tente de publier, et il peut toujours régler ses commissions.
      </p>
      <Field label="Motif *" hint="Communiqué au vendeur">
        <Textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. annonces trompeuses signalées par plusieurs acheteurs" autoFocus />
      </Field>
    </Modal>
  )
}

function HistoryModal({ seller, onClose }) {
  const api = useTindisaApi()
  const q = useLoad(() => api.get(`/v1/admin/sellers/${seller.id}/history`).then((r) => r || [], () => []), [seller.id])
  return (
    <Modal open title={`Historique · ${seller.name}`} onClose={onClose}>
      {q.loading ? <Spinner /> : !q.data?.length ? <p className="dash-sub">Aucun blocage enregistré.</p> : (
        <ul className="admin-seller-history">
          {q.data.map((h, i) => (
            <li key={i}>
              <Badge tone={h.action === 'block' ? 'danger' : 'success'}>{h.action === 'block' ? 'Bloqué' : 'Débloqué'}</Badge>
              <span>
                <b>{when(h.at)}</b>{h.actor ? ` · ${decodeURIComponent(h.actor)}` : ''}
                {h.reason && <small>{h.reason}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

/**
 * Métiers saisis librement par les techniciens (« Autre métier ») : indique
 * quels métiers ajouter au catalogue. Masqué s'il n'y a rien (ou route absente).
 */
function OtherTradesCard() {
  const api = useTindisaApi()
  const { city, withCity } = useAdminView()
  const q = useLoad(() => api.get(withCity('/v1/admin/pros/other-trades')).then((r) => r || [], () => []), [city])
  const rows = Array.isArray(q.data) ? q.data : []
  if (!rows.length) return null
  return (
    <details className="admin-other-trades">
      <summary><FaTools /> Métiers proposés par les techniciens <Badge tone="neutral">{rows.length}</Badge></summary>
      <p className="dash-sub">Métiers saisis dans « Autre métier » : les plus fréquents sont à ajouter au catalogue.</p>
      <ul>
        {rows.map((r) => (
          <li key={r.label}>
            <b>{r.label}</b> <span className="cat-sku">{r.count} profil{r.count > 1 ? 's' : ''}</span>
            {r.examples?.length > 0 && (
              <span className="admin-other-trades-ex">
                {r.examples.slice(0, 3).map((e, i) => (
                  <span key={e.shopId}>
                    {i > 0 && ', '}
                    <a href={`/boutique/${e.shopId}`} target="_blank" rel="noopener noreferrer">{e.name}</a>{e.city ? ` (${cap(e.city)})` : ''}
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}

export default function AdminSellers() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const taxonomy = useTaxonomy()
  const { city, withCity } = useAdminView()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [offset, setOffset] = useState(0)
  const [blocking, setBlocking] = useState(null)
  const [history, setHistory] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (status) params.set('status', status)
  if (type) params.set('type', type)
  if (offset) params.set('offset', String(offset))
  const qs = params.toString()
  const listQ = useLoad(
    () => api.get(withCity(`/v1/admin/sellers${qs ? `?${qs}` : ''}`)).then((r) => r || { items: [], total: 0 }),
    [city, qs],
  )
  const data = listQ.data || { items: [], total: 0 }

  const unblock = async (s) => {
    setBusyId(s.id)
    try {
      await api.post(`/v1/admin/sellers/${s.id}/unblock`, {})
      notify(`${s.name} est débloqué`, 'success')
      listQ.reload()
    } catch (e) {
      notify(e?.message || 'Déblocage impossible', 'error')
    } finally {
      setBusyId(null)
    }
  }
  const resetTo = (fn) => { setOffset(0); fn() }

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1"><FaStore style={{ marginRight: 8 }} />Vendeurs</h1>
        <p className="dash-sub">Établissements, ateliers, agences et techniciens. Un vendeur bloqué disparaît du marché et ne peut plus rien publier.</p>
      </header>

      <OtherTradesCard />

      <div className="admin-seller-tools">
        <form className="admin-mk-search" onSubmit={(e) => { e.preventDefault(); resetTo(() => setQuery(q.trim())) }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou téléphone" />
          <button type="submit" className="cat-icon-btn" aria-label="Rechercher"><FaSearch /></button>
        </form>
        <select className="ui-input ui-select" value={type} onChange={(e) => resetTo(() => setType(e.target.value))} aria-label="Type d’activité">
          <option value="">Toutes les activités</option>
          {shopTypeGroups(taxonomy).map((g) => (
            <optgroup key={g.id} label={g.label}>
              {g.options.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </optgroup>
          ))}
        </select>
        <div className="mk-seg">
          {STATUS_FILTERS.map((f) => (
            <button key={f.k || 'all'} type="button" className={status === f.k ? 'active' : ''} onClick={() => resetTo(() => setStatus(f.k))}>{f.label}</button>
          ))}
        </div>
      </div>

      {listQ.loading ? <Spinner label="Chargement…" /> : !data.items.length ? (
        <EmptyState icon={<FaStore />} title="Aucun vendeur" text={query || status || type ? 'Aucun vendeur ne correspond à ces filtres.' : 'Aucun vendeur dans ce périmètre.'} />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead><tr><th>Vendeur</th><th>Activité</th><th>Ville</th><th>Annonces</th><th>Statut</th><th className="cat-col-actions">Actions</th></tr></thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id} className={s.status === 'blocked' ? 'admin-row-blocked' : ''}>
                    <td>
                      <span className="cat-pname">{s.name}</span>
                      {s.phone && <span className="cat-sku">{s.phone}</span>}
                    </td>
                    <td>{findShopType(taxonomy, s.shopType)?.label || 'Non précisée'}</td>
                    <td>{cap(s.city) || '·'}{s.commune ? <span className="cat-sku">{s.commune}</span> : null}</td>
                    <td>{s.listings}</td>
                    <td>
                      {s.status === 'blocked' ? (
                        <>
                          <Badge tone="danger">Bloqué</Badge>
                          {s.block?.reason && <span className="cat-sku admin-block-reason">{s.block.reason}</span>}
                        </>
                      ) : <Badge tone="success">Actif</Badge>}
                    </td>
                    <td className="cat-col-actions">
                      {s.status !== 'blocked' && (
                        <Link className="cat-icon-btn" title="Voir la fiche publique" to={`/boutique/${s.id}`} target="_blank"><FaExternalLinkAlt /></Link>
                      )}
                      <button className="cat-icon-btn" title="Historique" onClick={() => setHistory(s)}><FaHistory /></button>
                      {s.status === 'blocked' ? (
                        <Button size="sm" variant="secondary" disabled={busyId === s.id} onClick={() => unblock(s)}><FaUndo /> Débloquer</Button>
                      ) : (
                        <Button size="sm" variant="danger" onClick={() => setBlocking(s)}><FaBan /> Bloquer</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(offset > 0 || data.hasMore) && (
            <div className="admin-pager">
              <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Précédent</Button>
              <span className="dash-sub">{offset + 1} à {offset + data.items.length} sur {data.total}</span>
              <Button variant="ghost" size="sm" disabled={!data.hasMore} onClick={() => setOffset(offset + PAGE)}>Suivant</Button>
            </div>
          )}
        </>
      )}

      {blocking && <BlockModal seller={blocking} onClose={() => setBlocking(null)} onDone={() => { setBlocking(null); listQ.reload() }} />}
      {history && <HistoryModal seller={history} onClose={() => setHistory(null)} />}
    </div>
  )
}
