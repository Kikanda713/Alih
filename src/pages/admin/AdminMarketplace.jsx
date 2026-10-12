import { useCallback, useState } from 'react'
import { useLoad } from '../../api/useLoad'
import { Link } from 'react-router-dom'
import { FaGlobeAfrica, FaCheckCircle, FaBan, FaUndo, FaSearch, FaConciergeBell, FaExclamationTriangle, FaExternalLinkAlt, FaEye } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useToast } from '../../components/useToast'
import { Badge, Spinner, EmptyState, ConfirmModal, Input, Select } from '../../components/ui.jsx'
import { StatGrid, StatCard } from '../../components/StatCard.jsx'
import { Pagination } from '../../components/Pagination.jsx'
import { useAdminView } from './adminView'
import { useTaxonomy } from '../../api/taxonomy'
import { categoryLabel } from '../../market/lib/format'
import { EnhancePanel, EnhanceThumb } from './PhotoEnhance.jsx'

/*
 * Back-office du marché web : santé du catalogue public, ce que cherchent les
 * visiteurs (et ne trouvent pas : opportunités de recrutement de vendeurs), et
 * modération de n'importe quelle annonce. Retirer = invisible sur le site ET
 * dans la recherche de l'assistant. Périmètre ville respecté côté serveur.
 */

const PAGE = 20
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const money = (v, c) => (v == null ? '·' : `${Number(v).toLocaleString('fr-FR')} ${c === 'USD' ? '$' : 'FC'}`)
const STATUS = {
  published: { tone: 'success', label: 'En ligne' },
  removed: { tone: 'danger', label: 'Retirée' },
}
const STATUS_FILTERS = [
  { k: '', label: 'Toutes' },
  { k: 'published', label: 'En ligne' },
  { k: 'removed', label: 'Retirées' },
]

export default function AdminMarketplace() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const taxonomy = useTaxonomy()
  const { city, withCity } = useAdminView()
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [photo, setPhoto] = useState('')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState({ open: false, item: null, action: null, busy: false })

  const withParams = useCallback((path, params) => {
    const base = withCity(path)
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v)
    const s = sp.toString()
    return s ? `${base}${base.includes('?') ? '&' : '?'}${s}` : base
  }, [withCity])

  const insightsQ = useLoad(
    () => api.get(withParams('/v1/admin/marketplace/insights', { days: 30 })).catch(() => null),
    [city],
  )
  const listQ = useLoad(
    () => api.get(withParams('/v1/admin/marketplace/listings', {
      q: query, status, type, photo, offset: (page - 1) * PAGE, limit: PAGE,
    })).then((r) => ({ items: r?.items || [], total: r?.total || 0 }), () => ({ items: [], total: 0 })),
    [city, query, status, type, photo, page],
  )
  const insights = insightsQ.data
  const list = listQ.data || { items: [], total: 0 }
  const loading = listQ.loading
  const loadList = listQ.reload
  const loadInsights = insightsQ.reload

  const doModerate = async () => {
    setConfirm((s) => ({ ...s, busy: true }))
    try {
      await api.post(`/v1/admin/marketplace/listings/${confirm.item.id}/moderate`, { action: confirm.action })
      notify(confirm.action === 'remove' ? 'Annonce retirée du marché' : 'Annonce remise en ligne', 'success')
      setConfirm({ open: false, item: null, action: null, busy: false })
      loadList()
      loadInsights()
    } catch (e) {
      notify(e?.message || 'Erreur', 'error')
      setConfirm((s) => ({ ...s, busy: false }))
    }
  }

  const L = insights?.listings || {}
  const S = insights?.searches || {}
  const totalPages = Math.max(1, Math.ceil(list.total / PAGE))

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1"><FaGlobeAfrica style={{ marginRight: 8 }} />Marché web</h1>
        <p className="dash-sub">
          Catalogue public de <Link to="/marche" target="_blank">tindisa.com/marche</Link>, recherches des visiteurs
          (30 derniers jours) et modération des annonces. Les paniers web sont finalisés par l’assistant dans la messagerie :
          ventes et commissions apparaissent ensuite dans les écrans habituels.
        </p>
      </header>

      <StatGrid>
        <StatCard icon={<FaCheckCircle />} value={L.published ?? 0} label="Annonces en ligne" />
        <StatCard icon={<FaConciergeBell />} value={L.services ?? 0} label="dont services" />
        <StatCard icon={<FaBan />} value={L.removed ?? 0} label="Retirées" />
        <StatCard icon={<FaSearch />} value={S.total ?? 0} label="Recherches web (30 j)" />
        <StatCard icon={<FaExclamationTriangle />} value={S.zero ?? 0} label="Sans résultat" />
      </StatGrid>

      <div className="admin-mk-insights">
        <section className="ui-card admin-mk-panel">
          <h3>Requêtes les plus fréquentes</h3>
          {!insights?.topQueries?.length ? <p className="dash-sub">Aucune recherche web sur la période.</p> : (
            <ol className="admin-mk-list">
              {insights.topQueries.map((r) => (
                <li key={r.query}><span>{r.query}</span><b>{r.count}×</b><small>{r.results} rés.</small></li>
              ))}
            </ol>
          )}
        </section>
        <section className="ui-card admin-mk-panel">
          <h3>Recherches sans résultat <small>(vendeurs à recruter)</small></h3>
          {!insights?.zeroQueries?.length ? <p className="dash-sub">Rien à signaler : chaque recherche a trouvé des annonces.</p> : (
            <ol className="admin-mk-list">
              {insights.zeroQueries.map((r) => (
                <li key={r.query}><span>{r.query}</span><b>{r.count}×</b></li>
              ))}
            </ol>
          )}
        </section>
        <section className="ui-card admin-mk-panel">
          <h3>Annonces les plus vues</h3>
          {!insights?.topViewed?.length ? <p className="dash-sub">Pas encore de vues enregistrées.</p> : (
            <ol className="admin-mk-list">
              {insights.topViewed.map((r) => (
                <li key={r.id}>
                  <Link to={`/annonce/${r.id}`} target="_blank">{r.name}</Link>
                  <b><FaEye /> {r.views}</b><small>{cap(r.city) || ''}</small>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <EnhancePanel withParams={withParams} onProgress={loadList} />

      <div className="admin-toolbar admin-mk-toolbar">
        <div className="cat-tabs admin-tabs">
          {STATUS_FILTERS.map((f) => (
            <button key={f.k} className={`cat-tab${status === f.k ? ' active' : ''}`} onClick={() => { setStatus(f.k); setPage(1) }}>{f.label}</button>
          ))}
        </div>
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}
          options={[{ id: 'product', label: 'Produits' }, { id: 'service', label: 'Services' }]} placeholder="Tous types" />
        <Select value={photo} onChange={(e) => { setPhoto(e.target.value); setPage(1) }}
          options={[{ id: 'pending', label: 'Photos à améliorer' }, { id: 'enhanced', label: 'Photos améliorées' }]} placeholder="Toutes les photos" />
        <form className="admin-mk-search" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1) }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, établissement ou réf. TND-…" />
          <button type="submit" className="cat-icon-btn" aria-label="Rechercher"><FaSearch /></button>
        </form>
      </div>

      {loading ? <Spinner label="Chargement…" /> : list.items.length === 0 ? (
        <EmptyState icon={<FaGlobeAfrica />} title="Aucune annonce" text="Aucune annonce pour ces filtres ou cette ville." />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead><tr><th className="cat-col-img"></th><th>Annonce</th><th>Prix</th><th>Ville</th><th>Vendeur</th><th>Vues</th><th>Statut</th><th className="cat-col-actions">Actions</th></tr></thead>
              <tbody>
                {list.items.map((i) => {
                  const st = STATUS[i.status] || STATUS.published
                  return (
                    <tr key={i.id}>
                      <td><EnhanceThumb item={i} onChanged={loadList} /></td>
                      <td>
                        <span className="cat-pname">{i.name}</span>
                        <span className="cat-sku">{i.ref} · {i.type === 'service' ? 'Service' : 'Produit'}{i.category ? ` · ${categoryLabel(taxonomy, i.category)}` : ''}</span>
                      </td>
                      <td>{money(i.price, i.currency)}</td>
                      <td>{cap(i.city) || '·'}</td>
                      <td>{i.shop?.isP2P ? <Badge tone="warn">Particulier</Badge> : <span className="cat-sku">{i.shop?.name}</span>}</td>
                      <td>{i.views}</td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="cat-col-actions">
                        {i.status !== 'removed' && (
                          <Link className="cat-icon-btn" title="Voir sur le marché" to={`/annonce/${i.id}`} target="_blank"><FaExternalLinkAlt /></Link>
                        )}
                        {i.status === 'removed' ? (
                          <button className="cat-icon-btn" title="Remettre en ligne" onClick={() => setConfirm({ open: true, item: i, action: 'publish', busy: false })}><FaUndo /></button>
                        ) : (
                          <button className="cat-icon-btn danger" title="Retirer du marché" onClick={() => setConfirm({ open: true, item: i, action: 'remove', busy: false })}><FaBan /></button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} count={list.total} onChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={confirm.open}
        danger={confirm.action === 'remove'}
        busy={confirm.busy}
        title={confirm.action === 'remove' ? 'Retirer du marché' : 'Remettre en ligne'}
        message={confirm.item ? (confirm.action === 'remove'
          ? `« ${confirm.item.name} » ne sera plus visible sur le site ni proposé par l’assistant. Continuer ?`
          : `« ${confirm.item.name} » redeviendra visible sur le site et dans l’assistant.`) : ''}
        confirmLabel={confirm.action === 'remove' ? 'Retirer' : 'Remettre en ligne'}
        cancelLabel="Annuler"
        onConfirm={doModerate}
        onClose={() => setConfirm({ open: false, item: null, action: null, busy: false })}
      />
    </div>
  )
}
