import { useCallback, useState } from 'react'
import { FaHandshake, FaCheckCircle, FaBan, FaImage, FaFlag, FaUserSlash, FaUndo } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { useToast } from '../../components/useToast'
import { Badge, Spinner, EmptyState, ConfirmModal } from '../../components/ui.jsx'
import { StatGrid, StatCard } from '../../components/StatCard.jsx'
import { usePaged } from '../../components/usePaged'
import { Pagination } from '../../components/Pagination.jsx'
import { useAdminView } from './adminView'
import { ModTabs, FlagChips, RowActions, BulkBar, ModerationModal, ModerationHistory } from './ModerationKit.jsx'
import { MOD_STATUS, useSelection, doneMessage } from './moderationShared.jsx'

/*
 * Marché P2P (ventes spontanées sans établissement), modéré APRÈS publication par
 * la ville : file « À examiner », signalements, bloquer la diffusion, supprimer,
 * restaurer, en lot, et blocage du numéro d'un vendeur (plus aucune annonce P2P).
 */

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const money = (v, c) => (v == null ? '·' : `${Number(v).toLocaleString('fr-FR')} ${c === 'USD' ? '$' : 'FC'}`)
const EMPTY = { items: [], counts: {} }

export default function AdminP2P() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const { city, withCity, global } = useAdminView()
  const [filter, setFilter] = useState('')
  const [modal, setModal] = useState({ open: false, action: null, items: [], busy: false })
  const [history, setHistory] = useState(null)
  const [lift, setLift] = useState({ open: false, phone: null, busy: false })
  const sel = useSelection()

  const withStatus = (path) => {
    const base = withCity(path)
    return filter ? `${base}${base.includes('?') ? '&' : '?'}status=${encodeURIComponent(filter)}` : base
  }

  // Rechargé à chaque changement de ville / d'onglet ; erreur → liste vide.
  const { data = EMPTY, loading, reload } = useLoad(
    () => api.get(withStatus('/v1/admin/p2p')).then(
      (r) => ({ items: (r?.items || []).map((i) => ({ ...i, id: i.productId, isP2P: true })), counts: r?.counts || {} }),
      () => EMPTY,
    ),
    [city, filter],
  )
  const bansQ = useLoad(() => api.get('/v1/admin/p2p/phone-bans').catch(() => []), [city])
  const bans = Array.isArray(bansQ.data) ? bansQ.data : []

  const items = data.items
  const { pageItems, page, setPage, totalPages, count } = usePaged(items, 12)
  const c = data.counts || {}
  const selectedItems = items.filter((i) => sel.ids.has(i.id))

  const openAction = (action, list) => setModal({ open: true, action, items: list, busy: false })
  const closeModal = () => setModal({ open: false, action: null, items: [], busy: false })

  const doModerate = async (payload) => {
    setModal((s) => ({ ...s, busy: true }))
    try {
      const ids = modal.items.map((i) => i.id)
      const res = ids.length > 1
        ? await api.post('/v1/admin/p2p/moderate-bulk', { ...payload, ids })
        : await api.post(`/v1/admin/p2p/${ids[0]}/moderate`, payload)
      notify(doneMessage(payload.action, res), res?.failed?.length ? 'info' : 'success')
      closeModal()
      sel.clear()
      reload()
      bansQ.reload()
    } catch (e) {
      notify(e?.message || 'Erreur', 'error')
      setModal((s) => ({ ...s, busy: false }))
    }
  }
  const loadHistory = useCallback((item) => api.get(`/v1/admin/p2p/${item.id}/moderation-log`), [api])

  const doLift = async () => {
    setLift((s) => ({ ...s, busy: true }))
    try {
      await api.post(`/v1/admin/p2p/phone-bans/${encodeURIComponent(lift.phone)}/lift`, {})
      notify('Numéro débloqué : il peut de nouveau publier', 'success')
      setLift({ open: false, phone: null, busy: false })
      bansQ.reload()
      reload()
    } catch (e) {
      notify(e?.message || 'Erreur', 'error')
      setLift((s) => ({ ...s, busy: false }))
    }
  }

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1"><FaHandshake style={{ marginRight: 8 }} />Marché P2P</h1>
        <p className="dash-sub">
          Ventes spontanées (sans établissement), publiées tout de suite puis modérées : examinez la file, bloquez la diffusion
          ou supprimez ce qui enfreint les règles (trafic, produits interdits, arnaques).
        </p>
      </header>

      <StatGrid>
        <StatCard icon={<FaHandshake />} value={c.total ?? 0} label="Annonces" />
        <StatCard icon={<FaCheckCircle />} value={c.published ?? 0} label="En ligne" />
        <StatCard icon={<FaFlag />} value={c.flagged ?? 0} label="À examiner" />
        <StatCard icon={<FaBan />} value={(c.blocked ?? 0) + (c.removed ?? 0)} label="Bloquées ou supprimées" />
        <StatCard icon={<FaUserSlash />} value={bans.length} label="Numéros bloqués" />
      </StatGrid>

      <div className="admin-toolbar">
        <ModTabs value={filter} counts={c} onChange={(k) => { setFilter(k); setPage(1); sel.clear() }} />
      </div>

      <BulkBar count={selectedItems.length} onAction={(a) => openAction(a, selectedItems)} onClear={sel.clear} />

      {loading ? <Spinner label="Chargement…" /> : items.length === 0 ? (
        <EmptyState icon={<FaHandshake />} title="Aucune annonce" text="Aucune annonce P2P pour ce filtre / cette ville." />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead><tr>
                <th className="mod-col-check">
                  <input type="checkbox" aria-label="Tout sélectionner"
                    checked={pageItems.length > 0 && pageItems.every((i) => sel.ids.has(i.id))}
                    onChange={(e) => sel.setAll(pageItems.map((i) => i.id), e.target.checked)} />
                </th>
                <th className="cat-col-img"></th><th>Article</th><th>Prix</th><th>Ville</th><th>Vendeur</th><th>Statut</th><th className="cat-col-actions">Actions</th>
              </tr></thead>
              <tbody>
                {pageItems.map((i) => {
                  const st = MOD_STATUS[i.status] || MOD_STATUS.published
                  return (
                    <tr key={i.id}>
                      <td className="mod-col-check"><input type="checkbox" aria-label={`Sélectionner ${i.name}`} checked={sel.ids.has(i.id)} onChange={() => sel.toggle(i.id)} /></td>
                      <td><span className="cat-thumb">{i.image ? <img src={i.image} alt="" /> : <FaImage />}</span></td>
                      <td>
                        <span className="cat-pname">{i.name}</span>
                        {i.category && <span className="cat-sku">{i.category}</span>}
                        <FlagChips moderation={i.moderation} />
                      </td>
                      <td>{money(i.displayPrice, i.currency)}</td>
                      <td>{cap(i.city) || '·'}</td>
                      <td>
                        <span className="cat-sku">{i.sellerPhone || '·'}</span>
                        {i.sellerBanned && <Badge tone="danger">Numéro bloqué</Badge>}
                      </td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="cat-col-actions"><RowActions item={i} onAction={openAction} onHistory={setHistory} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
        </>
      )}

      {bans.length > 0 && (
        <section className="ui-card admin-mk-panel mod-bans">
          <h3>Numéros bloqués <small>(ne peuvent plus publier en P2P)</small></h3>
          <ol className="mod-log">
            {bans.map((b) => (
              <li key={b.phone}>
                <b>{b.phone}</b>
                <small>{b.at ? new Date(b.at).toLocaleDateString('fr-FR') : ''}{b.actor ? ` · ${b.actor}` : ''}</small>
                {global && (
                  <button className="cat-icon-btn" title="Débloquer ce numéro" aria-label="Débloquer ce numéro" onClick={() => setLift({ open: true, phone: b.phone, busy: false })}><FaUndo /></button>
                )}
                {b.reason && <span className="mod-reason">{b.reason}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <ModerationModal state={modal} onClose={closeModal} onConfirm={doModerate} />
      <ModerationHistory item={history} load={loadHistory} onClose={() => setHistory(null)} />
      <ConfirmModal
        open={lift.open}
        busy={lift.busy}
        title="Débloquer le numéro"
        message={lift.phone ? `${lift.phone} pourra de nouveau publier des annonces P2P. Ses annonces bloquées restent bloquées.` : ''}
        confirmLabel="Débloquer"
        cancelLabel="Annuler"
        onConfirm={doLift}
        onClose={() => setLift({ open: false, phone: null, busy: false })}
      />
    </div>
  )
}
