import { useState } from 'react'
import { FaExchangeAlt, FaCheckCircle, FaHandshake, FaLock, FaBan, FaListUl } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { useToast } from '../../components/useToast'
import { Badge, Spinner, EmptyState, ConfirmModal } from '../../components/ui.jsx'
import { StatGrid, StatCard } from '../../components/StatCard.jsx'
import { usePaged } from '../../components/usePaged'
import { Pagination } from '../../components/Pagination.jsx'
import { useAdminView } from './adminView'
import { cashModeLabel, txt, usd } from '../../market/lib/bata'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const fmtDate = (d) => {
  if (!d) return '·'
  const t = new Date(d)
  return Number.isNaN(t.getTime()) ? '·' : t.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}
const FAMILY = { vehicule: 'Véhicule', appareil: 'Téléphone / ordinateur' }
const OFFER_STATUS = {
  active: { tone: 'success', label: 'Active' },
  paused: { tone: 'warn', label: 'En pause' },
  closed: { tone: 'neutral', label: 'Arrêtée' },
  removed: { tone: 'danger', label: 'Retirée' },
}
const PROPOSAL_STATUS = {
  proposed: { tone: 'warn', label: 'Proposée' },
  accepted: { tone: 'success', label: 'Acceptée' },
  declined: { tone: 'danger', label: 'Refusée' },
  agreed: { tone: 'success', label: 'Accord' },
  paid: { tone: 'success', label: 'Séquestre payé' },
  completed: { tone: 'neutral', label: 'Terminée' },
  cancelled: { tone: 'neutral', label: 'Annulée' },
}
const FILTERS = [
  { k: '', label: 'Toutes' },
  { k: 'active', label: 'Actives' },
  { k: 'paused', label: 'En pause' },
  { k: 'closed', label: 'Arrêtées' },
  { k: 'removed', label: 'Retirées' },
]
const objList = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [])
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

export default function AdminBata() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const { city, withCity } = useAdminView()
  const [status, setStatus] = useState('')
  const [confirm, setConfirm] = useState({ item: null, busy: false })

  const overview = useLoad(
    () => api.get(withCity('/v1/admin/bata')).then(
      (r) => ({ counts: r?.counts && typeof r.counts === 'object' ? r.counts : {}, recent: objList(r?.recent) }),
      () => ({ counts: {}, recent: [] }),
    ),
    [city],
  )
  const offers = useLoad(
    () => api.get(withCity(`/v1/admin/bata/offers${status ? `?status=${encodeURIComponent(status)}` : ''}`)).then(
      (r) => objList(Array.isArray(r) ? r : r?.items),
      () => [],
    ),
    [city, status],
  )
  const items = offers.data || []
  const { pageItems, page, setPage, totalPages, count } = usePaged(items, 12)
  const c = overview.data?.counts || {}
  const recent = overview.data?.recent || []

  const doRemove = async () => {
    setConfirm((s) => ({ ...s, busy: true }))
    try {
      await api.post(`/v1/admin/bata/offers/${encodeURIComponent(confirm.item.id)}/remove`)
      notify('Offre BATA retirée', 'success')
      setConfirm({ item: null, busy: false })
      offers.reload()
      overview.reload()
    } catch (e) {
      notify(e?.message || 'Erreur', 'error')
      setConfirm((s) => ({ ...s, busy: false }))
    }
  }

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1"><FaExchangeAlt style={{ marginRight: 8 }} />BATA</h1>
        <p className="dash-sub">Échanges de biens certifiés (véhicules, téléphones, ordinateurs). Retirez les offres douteuses.</p>
      </header>

      <StatGrid>
        <StatCard icon={<FaListUl />} value={n(c.offers)} label="Offres" />
        <StatCard icon={<FaCheckCircle />} value={n(c.active)} label="Actives" />
        <StatCard icon={<FaHandshake />} value={n(c.proposals)} label="Propositions" />
        <StatCard icon={<FaHandshake />} value={n(c.agreed)} label="Accords" />
        <StatCard icon={<FaCheckCircle />} value={n(c.completed)} label="Terminés" />
        <StatCard icon={<FaLock />} value={usd(c.escrowHeld) || '0 $'} label="En séquestre" />
      </StatGrid>

      {recent.length > 0 && (
        <section className="bata-admin-sec">
          <h2 className="dash-h2">Propositions récentes</h2>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead><tr><th>Date</th><th>Échange</th><th>Différence</th><th>Règlement</th><th>Ville</th><th>Statut</th></tr></thead>
              <tbody>
                {recent.slice(0, 10).map((r, i) => {
                  const st = PROPOSAL_STATUS[r.status] || { tone: 'neutral', label: txt(r.status) || '·' }
                  return (
                    <tr key={txt(r.id) || i}>
                      <td>{fmtDate(r.createdAt)}</td>
                      <td><span className="cat-pname">{txt(r.fromName) || '·'}</span><span className="cat-sku">contre {txt(r.toName) || '·'}</span></td>
                      <td>{usd(Math.abs(n(r.difference))) || '·'}</td>
                      <td>{cashModeLabel(r.cashMode)}</td>
                      <td>{cap(txt(r.city)) || '·'}</td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="admin-toolbar">
        <div className="cat-tabs admin-tabs">
          {FILTERS.map((f) => (
            <button key={f.k} className={`cat-tab${status === f.k ? ' active' : ''}`} onClick={() => { setStatus(f.k); setPage(1) }}>{f.label}</button>
          ))}
        </div>
      </div>

      {offers.loading && !offers.data ? <Spinner label="Chargement…" /> : items.length === 0 ? (
        <EmptyState icon={<FaExchangeAlt />} title="Aucune offre" text="Aucune offre BATA pour ce filtre ou cette ville." />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead><tr><th>Bien</th><th>Valeur</th><th>Ville</th><th>Propriétaire</th><th>Créée</th><th>Statut</th><th className="cat-col-actions">Actions</th></tr></thead>
              <tbody>
                {pageItems.map((o, i) => {
                  const st = OFFER_STATUS[o.status] || { tone: 'neutral', label: txt(o.status) || '·' }
                  return (
                    <tr key={txt(o.id) || i}>
                      <td><span className="cat-pname">{txt(o.name) || '·'}</span><span className="cat-sku">{FAMILY[o.family] || txt(o.family)}</span></td>
                      <td>{usd(o.valueUsd) || '·'}</td>
                      <td>{cap(txt(o.city)) || '·'}</td>
                      <td><span className="cat-sku">{txt(o.ownerMasked) || '·'}</span></td>
                      <td>{fmtDate(o.createdAt)}</td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="cat-col-actions">
                        {o.status !== 'removed' && o.id && (
                          <button className="cat-icon-btn danger" title="Retirer" aria-label="Retirer" onClick={() => setConfirm({ item: o, busy: false })}><FaBan /></button>
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
        open={!!confirm.item}
        danger
        busy={confirm.busy}
        title="Retirer l’offre BATA"
        message={confirm.item ? `Retirer l’offre BATA « ${txt(confirm.item.name) || 'ce bien'} » ? L’annonce n’affichera plus « BATA possible ».` : ''}
        confirmLabel="Retirer"
        cancelLabel="Annuler"
        onConfirm={doRemove}
        onClose={() => setConfirm({ item: null, busy: false })}
      />
    </div>
  )
}
