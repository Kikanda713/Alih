import { useCallback, useState } from 'react'
import { useLoad } from '../../api/useLoad'
import { Link } from 'react-router-dom'
import { FaGlobeAfrica, FaCheckCircle, FaBan, FaSearch, FaConciergeBell, FaExclamationTriangle, FaExternalLinkAlt, FaEye, FaFlag } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useToast } from '../../components/useToast'
import { Badge, Spinner, EmptyState, Input, Select } from '../../components/ui.jsx'
import { StatGrid, StatCard } from '../../components/StatCard.jsx'
import { Pagination } from '../../components/Pagination.jsx'
import { useAdminView } from './adminView'
import { useTaxonomy } from '../../api/taxonomy'
import { categoryLabel } from '../../market/lib/format'
import { EnhancePanel, EnhanceThumb } from './PhotoEnhance.jsx'
import ProactivePanel from './ProactivePanel.jsx'
import { ModTabs, FlagChips, RowActions, BulkBar, ModerationModal, ModerationHistory } from './ModerationKit.jsx'
import { MOD_STATUS, useSelection, doneMessage } from './moderationShared.jsx'

/*
 * Back-office du marché web : santé du catalogue public, ce que cherchent les
 * visiteurs (et ne trouvent pas : opportunités de recrutement de vendeurs), et
 * modération APRÈS publication de n'importe quelle annonce (boutique ou P2P) :
 * file « À examiner » (filtre automatique, signalements), bloquer la diffusion,
 * supprimer, restaurer, en lot, avec historique. Périmètre ville côté serveur.
 */

const PAGE = 20
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const money = (v, c) => (v == null ? '·' : `${Number(v).toLocaleString('fr-FR')} ${c === 'USD' ? '$' : 'FC'}`)

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
  const [modal, setModal] = useState({ open: false, action: null, items: [], busy: false })
  const [history, setHistory] = useState(null)
  const sel = useSelection()

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
    })).then(
      (r) => ({ items: (r?.items || []).map((i) => ({ ...i, isP2P: !!i.shop?.isP2P })), total: r?.total || 0, counts: r?.counts || {} }),
      () => ({ items: [], total: 0, counts: {} }),
    ),
    [city, query, status, type, photo, page],
  )
  const insights = insightsQ.data
  const list = listQ.data || { items: [], total: 0, counts: {} }
  const loading = listQ.loading
  const loadList = listQ.reload
  const loadInsights = insightsQ.reload

  const openAction = (action, items) => setModal({ open: true, action, items, busy: false })
  const closeModal = () => setModal({ open: false, action: null, items: [], busy: false })
  const selectedItems = list.items.filter((i) => sel.ids.has(i.id))

  const doModerate = async (payload) => {
    setModal((s) => ({ ...s, busy: true }))
    try {
      const ids = modal.items.map((i) => i.id)
      const res = ids.length > 1
        ? await api.post('/v1/admin/marketplace/listings/moderate-bulk', { ...payload, ids })
        : await api.post(`/v1/admin/marketplace/listings/${ids[0]}/moderate`, payload)
      notify(doneMessage(payload.action, res), res?.failed?.length ? 'info' : 'success')
      closeModal()
      sel.clear()
      loadList()
      loadInsights()
    } catch (e) {
      notify(e?.message || 'Erreur', 'error')
      setModal((s) => ({ ...s, busy: false }))
    }
  }
  const loadHistory = useCallback((item) => api.get(`/v1/admin/marketplace/listings/${item.id}/moderation-log`), [api])

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
        <StatCard icon={<FaFlag />} value={list.counts?.flagged ?? 0} label="À examiner" />
        <StatCard icon={<FaBan />} value={(L.blocked ?? 0) + (L.removed ?? 0)} label="Bloquées ou supprimées" />
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

      <EnhancePanel withParams={withParams} onProgress={loadList} onShowProposed={() => { setPhoto('proposed'); setPage(1) }} />
      <ProactivePanel />

      <div className="admin-toolbar admin-mk-toolbar">
        <ModTabs value={status} counts={list.counts} onChange={(k) => { setStatus(k); setPage(1); sel.clear() }} />
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}
          options={[{ id: 'product', label: 'Produits' }, { id: 'service', label: 'Services' }]} placeholder="Tous types" />
        <Select value={photo} onChange={(e) => { setPhoto(e.target.value); setPage(1) }}
          options={[{ id: 'pending', label: 'Photos à améliorer' }, { id: 'proposed', label: 'Photos à valider' }, { id: 'enhanced', label: 'Photos améliorées' }]} placeholder="Toutes les photos" />
        <form className="admin-mk-search" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1) }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, établissement ou réf. TND-…" />
          <button type="submit" className="cat-icon-btn" aria-label="Rechercher"><FaSearch /></button>
        </form>
      </div>

      <BulkBar count={selectedItems.length} onAction={(a) => openAction(a, selectedItems)} onClear={sel.clear} />

      {loading ? <Spinner label="Chargement…" /> : list.items.length === 0 ? (
        <EmptyState icon={<FaGlobeAfrica />} title="Aucune annonce" text="Aucune annonce pour ces filtres ou cette ville." />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead><tr>
                <th className="mod-col-check">
                  <input type="checkbox" aria-label="Tout sélectionner"
                    checked={list.items.length > 0 && list.items.every((i) => sel.ids.has(i.id))}
                    onChange={(e) => sel.setAll(list.items.map((i) => i.id), e.target.checked)} />
                </th>
                <th className="cat-col-img"></th><th>Annonce</th><th>Prix</th><th>Ville</th><th>Vendeur</th><th>Vues</th><th>Statut</th><th className="cat-col-actions">Actions</th></tr></thead>
              <tbody>
                {list.items.map((i) => {
                  const st = MOD_STATUS[i.status] || MOD_STATUS.published
                  return (
                    <tr key={i.id}>
                      <td className="mod-col-check"><input type="checkbox" aria-label={`Sélectionner ${i.name}`} checked={sel.ids.has(i.id)} onChange={() => sel.toggle(i.id)} /></td>
                      <td><EnhanceThumb item={i} onChanged={loadList} /></td>
                      <td>
                        <span className="cat-pname">{i.name}</span>
                        <span className="cat-sku">{i.ref} · {i.type === 'service' ? 'Service' : 'Produit'}{i.category ? ` · ${categoryLabel(taxonomy, i.category)}` : ''}</span>
                        <FlagChips moderation={i.moderation} />
                      </td>
                      <td>{money(i.price, i.currency)}</td>
                      <td>{cap(i.city) || '·'}</td>
                      <td>
                        {i.shop?.isP2P ? <Badge tone="warn">Particulier</Badge> : <span className="cat-sku">{i.shop?.name}</span>}
                        {i.shop?.status === 'blocked' && <Badge tone="danger">Vendeur bloqué</Badge>}
                      </td>
                      <td>{i.views}</td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="cat-col-actions">
                        {i.status === 'published' && (
                          <Link className="cat-icon-btn" title="Voir sur le marché" to={`/annonce/${i.id}`} target="_blank"><FaExternalLinkAlt /></Link>
                        )}
                        <RowActions item={i} onAction={openAction} onHistory={setHistory} />
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

      <ModerationModal state={modal} onClose={closeModal} onConfirm={doModerate} />
      <ModerationHistory item={history} load={loadHistory} onClose={() => setHistory(null)} />
    </div>
  )
}
