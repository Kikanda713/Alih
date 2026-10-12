import { useState } from 'react'
import { FaHandshake, FaCheckCircle, FaBan, FaUndo, FaImage } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { useToast } from '../../components/useToast'
import { Badge, Spinner, EmptyState, ConfirmModal } from '../../components/ui.jsx'
import { StatGrid, StatCard } from '../../components/StatCard.jsx'
import { usePaged } from '../../components/usePaged'
import { Pagination } from '../../components/Pagination.jsx'
import { useAdminView } from './adminView'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const money = (v, c) => (v == null ? '—' : `${Number(v).toLocaleString('fr-FR')} ${c === 'USD' ? '$' : 'FC'}`)
const STATUS = {
  published: { tone: 'success', label: 'Publiée' },
  removed: { tone: 'danger', label: 'Retirée' },
}
const EMPTY = { items: [], counts: {} }
const FILTERS = [
  { k: '', label: 'Toutes' },
  { k: 'published', label: 'Publiées' },
  { k: 'removed', label: 'Retirées' },
]

export default function AdminP2P() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const { city, withCity } = useAdminView()
  const [filter, setFilter] = useState('')
  const [confirm, setConfirm] = useState({ open: false, item: null, action: null, busy: false })

  // Rechargé à chaque changement de ville ; erreur → liste vide.
  const { data = EMPTY, loading, reload } = useLoad(
    () => api.get(withCity('/v1/admin/p2p')).then(
      (r) => ({ items: r?.items || [], counts: r?.counts || {} }),
      () => EMPTY,
    ),
    [city],
  )

  const items = filter ? data.items.filter((i) => i.status === filter) : data.items
  const { pageItems, page, setPage, totalPages, count } = usePaged(items, 12)
  const c = data.counts || {}

  const doModerate = async () => {
    setConfirm((s) => ({ ...s, busy: true }))
    try {
      await api.post(`/v1/admin/p2p/${confirm.item.productId}/moderate`, { action: confirm.action })
      notify(confirm.action === 'remove' ? 'Annonce retirée' : 'Annonce republiée', 'success')
      setConfirm({ open: false, item: null, action: null, busy: false })
      reload()
    } catch (e) {
      notify(e?.message || 'Erreur', 'error')
      setConfirm((s) => ({ ...s, busy: false }))
    }
  }

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1"><FaHandshake style={{ marginRight: 8 }} />Marché P2P</h1>
        <p className="dash-sub">Ventes spontanées (sans boutique). Modérez : retirez ce qui enfreint les règles.</p>
      </header>

      <StatGrid>
        <StatCard icon={<FaHandshake />} value={c.total ?? 0} label="Annonces" />
        <StatCard icon={<FaCheckCircle />} value={c.published ?? 0} label="Publiées" />
        <StatCard icon={<FaBan />} value={c.removed ?? 0} label="Retirées" />
      </StatGrid>

      <div className="admin-toolbar">
        <div className="cat-tabs admin-tabs">
          {FILTERS.map((f) => (
            <button key={f.k} className={`cat-tab${filter === f.k ? ' active' : ''}`} onClick={() => setFilter(f.k)}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading ? <Spinner label="Chargement…" /> : items.length === 0 ? (
        <EmptyState icon={<FaHandshake />} title="Aucune annonce" text="Aucune annonce P2P pour ce filtre / cette ville." />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead><tr><th className="cat-col-img"></th><th>Article</th><th>Prix</th><th>Ville</th><th>Vendeur</th><th>Statut</th><th className="cat-col-actions">Actions</th></tr></thead>
              <tbody>
                {pageItems.map((i) => {
                  const st = STATUS[i.status] || STATUS.published
                  return (
                    <tr key={i.productId}>
                      <td><span className="cat-thumb">{i.image ? <img src={i.image} alt="" /> : <FaImage />}</span></td>
                      <td><span className="cat-pname">{i.name}</span>{i.category && <span className="cat-sku">{i.category}</span>}</td>
                      <td>{money(i.displayPrice, i.currency)}</td>
                      <td>{cap(i.city) || '—'}</td>
                      <td><span className="cat-sku">{i.sellerPhone || '—'}</span></td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="cat-col-actions">
                        {i.status === 'removed' ? (
                          <button className="cat-icon-btn" title="Republier" onClick={() => setConfirm({ open: true, item: i, action: 'publish', busy: false })}><FaUndo /></button>
                        ) : (
                          <button className="cat-icon-btn danger" title="Retirer" onClick={() => setConfirm({ open: true, item: i, action: 'remove', busy: false })}><FaBan /></button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={confirm.open}
        danger={confirm.action === 'remove'}
        busy={confirm.busy}
        title={confirm.action === 'remove' ? "Retirer l'annonce" : "Republier l'annonce"}
        message={confirm.item ? `${confirm.action === 'remove' ? 'Retirer' : 'Republier'} « ${confirm.item.name} » ?` : ''}
        confirmLabel={confirm.action === 'remove' ? 'Retirer' : 'Republier'}
        cancelLabel="Annuler"
        onConfirm={doModerate}
        onClose={() => setConfirm({ open: false, item: null, action: null, busy: false })}
      />
    </div>
  )
}
