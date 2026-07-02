import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { FaPlus, FaEdit, FaTrash, FaBoxOpen, FaSyncAlt, FaLink, FaStore, FaImage, FaEye } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { useToast } from '../../components/Toast.jsx'
import { Card, Button, Badge, Spinner, EmptyState, Field, Input, Select, Modal, ConfirmModal } from '../../components/ui.jsx'
import { usePaged, Pagination } from '../../components/Pagination.jsx'
import { useTaxonomy, categoriesByType } from '../../api/taxonomy'
import ProductFormModal from './ProductFormModal.jsx'
import AnalyticsModal from '../../components/AnalyticsModal.jsx'

/* Barre de filtres pour que le commerçant prenne en main son catalogue. */
function CatalogueFilters({ value, onChange, taxonomy }) {
  const cats = value.type ? categoriesByType(taxonomy, value.type) : (taxonomy?.categories || [])
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="cat-filters">
      <Input placeholder="Rechercher un article…" value={value.q} onChange={set('q')} />
      <Select value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value, category: '' })}
        options={taxonomy?.itemTypes || []} placeholder="Type" />
      <Select value={value.category} onChange={set('category')} options={cats} placeholder="Catégorie" />
      <Select value={value.condition} onChange={set('condition')} options={taxonomy?.conditions || []} placeholder="État" />
      <Select value={value.stock} onChange={set('stock')}
        options={[{ id: 'in', label: 'En stock' }, { id: 'out', label: 'Rupture' }]} placeholder="Stock" />
    </div>
  )
}

function applyFilters(products, f) {
  const q = (f.q || '').trim().toLowerCase()
  return products.filter((p) => {
    if (q && !`${p.name || ''} ${p.sku || ''} ${p.category || ''}`.toLowerCase().includes(q)) return false
    if (f.type && (p.type || 'product') !== f.type) return false
    if (f.category && p.category !== f.category) return false
    if (f.condition && p.condition !== f.condition) return false
    if (f.stock === 'in' && !((p.quantity || 0) > 0)) return false
    if (f.stock === 'out' && (p.quantity || 0) > 0) return false
    return true
  })
}

function fmtPrice(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString('fr-FR')} CDF`
}

function Thumb({ url }) {
  return (
    <span className="cat-thumb">
      {url ? <img src={url} alt="" /> : <FaImage />}
    </span>
  )
}

function ProductTable({ products, readOnly, onEdit, onDelete, onViews, t }) {
  return (
    <div className="cat-table-wrap">
      <table className="cat-table">
        <thead>
          <tr>
            <th className="cat-col-img"></th>
            <th>{t('cat.col.product')}</th>
            <th>{t('cat.col.category')}</th>
            <th>{t('cat.col.price')}</th>
            {!readOnly && <th>{t('cat.col.floor')}</th>}
            <th>{t('cat.col.stock')}</th>
            {/* Vues = analytique, affichée pour TOUS les articles (local ET Wanzo). */}
            <th className="cat-col-views" title="Recommandations / vues">Vues</th>
            {!readOnly && <th className="cat-col-actions">{t('cat.col.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td><Thumb url={p.imageUrl} /></td>
              <td>
                <span className="cat-pname">{p.name}</span>
                {p.sku && <span className="cat-sku">{p.sku}</span>}
              </td>
              <td>{p.category || '—'}</td>
              <td>{fmtPrice(p.pricing?.displayPrice)}</td>
              {!readOnly && <td className="cat-floor">{fmtPrice(p.pricing?.minPrice)}</td>}
              <td><Badge tone={(p.quantity || 0) > 0 ? 'success' : 'danger'}>{p.quantity ?? 0}</Badge></td>
              <td className="cat-views">
                {onViews ? (
                  <button className="cat-views-btn" title="Voir l'analytics" onClick={() => onViews(p)}>
                    <FaEye className="cat-views-ic" /> {p.views ?? 0}
                  </button>
                ) : (
                  <><FaEye className="cat-views-ic" /> {p.views ?? 0}</>
                )}
              </td>
              {!readOnly && (
                <td className="cat-col-actions">
                  <button className="cat-icon-btn" onClick={() => onEdit(p)} aria-label={t('cat.edit')}><FaEdit /></button>
                  <button className="cat-icon-btn danger" onClick={() => onDelete(p)} aria-label={t('cat.delete')}><FaTrash /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ShopRenameModal({ open, current, onClose, onSave }) {
  const { t } = useT()
  const [name, setName] = useState(current || '')
  const [busy, setBusy] = useState(false)
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setName(current || '')
  }
  const save = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await onSave(name.trim())
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} title={t('shop.rename')} onClose={busy ? undefined : onClose}>
      <Field label={t('shop.name')}>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <div className="ui-modal-foot">
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t('form.cancel')}</Button>
        <Button variant="primary" onClick={save} disabled={busy}>{t('form.save')}</Button>
      </div>
    </Modal>
  )
}

function WanzoTab({ t }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [state, setState] = useState({ loading: true, link: null, products: [] })
  const [busy, setBusy] = useState('')
  const wp = usePaged(state.products, 10)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    try {
      const [link, wanzo] = await Promise.allSettled([
        api.get('/v1/wanzo/link'),
        api.get('/v1/merchant/wanzo/products'),
      ])
      setState({
        loading: false,
        link: link.status === 'fulfilled' ? link.value : null,
        products: wanzo.status === 'fulfilled' ? wanzo.value?.products || [] : [],
      })
    } catch {
      setState({ loading: false, link: null, products: [] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const linked = state.link?.linked
  const verified = state.link?.link?.verified

  // Liaison automatique : le backend résout le companyId via l'email (vérifié)
  // du marchand connecté — aucune saisie d'ID requise.
  const connect = async () => {
    setBusy('connect')
    try {
      await api.post('/v1/wanzo/link', {})
      notify(t('merchant.connect.success'), 'success')
      await load()
    } catch (e) {
      notify(e?.message || t('merchant.error'), 'error')
    } finally { setBusy('') }
  }

  const sync = async () => {
    setBusy('sync')
    try {
      const r = await api.post('/v1/wanzo/sync', {})
      notify(t('merchant.sync.success', { count: r?.synced ?? 0 }), 'success')
      await load()
    } catch (e) {
      notify(e?.message || t('merchant.sync.unknown'), 'error')
    } finally { setBusy('') }
  }

  if (state.loading) return <Spinner label={t('cat.loading')} />

  return (
    <div className="cat-wanzo">
      <Card className="cat-wanzo-card">
        <div className="cat-wanzo-status">
          <FaLink />
          {linked ? (
            <span>{t('merchant.status.linked')} — <Badge tone={verified ? 'success' : 'warn'}>{verified ? t('merchant.status.verified') : t('merchant.status.notVerified')}</Badge></span>
          ) : (<span>{t('cat.wanzo.notLinked')}</span>)}
        </div>
        {!linked ? (
          <div className="cat-wanzo-connect">
            <p className="cat-wanzo-hint">{t('merchant.connect.title')}</p>
            <Button variant="primary" onClick={connect} disabled={busy === 'connect'}>
              <FaLink /> {t('merchant.connect.button')}
            </Button>
          </div>
        ) : (
          <Button variant="primary" onClick={sync} disabled={busy === 'sync'}><FaSyncAlt /> {t('merchant.sync.button')}</Button>
        )}
      </Card>

      <p className="cat-readonly-note">{t('cat.wanzo.readonly')}</p>
      {state.products.length === 0 ? (
        <EmptyState icon={<FaBoxOpen />} text={t('cat.wanzo.empty')} />
      ) : (
        <>
          <ProductTable products={wp.pageItems} readOnly t={t} />
          <Pagination page={wp.page} totalPages={wp.totalPages} count={wp.count} onChange={wp.setPage} />
        </>
      )}
    </div>
  )
}

export default function CataloguePage() {
  const api = useTindisaApi()
  const { t } = useT()
  const { notify } = useToast()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('local')
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState({ open: false, product: null })
  const [confirm, setConfirm] = useState({ open: false, product: null, busy: false })
  const [analytics, setAnalytics] = useState({ open: false, product: null })
  const [renaming, setRenaming] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ q: '', type: '', category: '', condition: '', stock: '' })
  const taxonomy = useTaxonomy()
  const filtered = applyFilters(products, filters)
  const lp = usePaged(filtered, 10)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api.get('/v1/merchant/products')
      setShop(r?.shop || null)
      setProducts(r?.products || [])
    } catch (e) {
      setError(e?.message || t('merchant.error'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (params.get('new') === '1') {
      setModal({ open: true, product: null })
      params.delete('new')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async (payload) => {
    const editing = !!modal.product
    if (editing) await api.put(`/v1/merchant/products/${modal.product.id}`, payload)
    else await api.post('/v1/merchant/products', payload)
    setModal({ open: false, product: null })
    notify(editing ? t('toast.updated') : t('toast.created'), 'success')
    await load()
  }

  const doDelete = async () => {
    const p = confirm.product
    setConfirm((c) => ({ ...c, busy: true }))
    try {
      await api.del(`/v1/merchant/products/${p.id}`)
      notify(t('toast.deleted'), 'success')
      setConfirm({ open: false, product: null, busy: false })
      await load()
    } catch (e) {
      notify(e?.message || t('merchant.error'), 'error')
      setConfirm((c) => ({ ...c, busy: false }))
    }
  }

  const renameShop = async (name) => {
    try {
      await api.put('/v1/merchant/shop', { name })
      notify(t('toast.shopRenamed'), 'success')
      setRenaming(false)
      await load()
    } catch (e) {
      notify(e?.message || t('merchant.error'), 'error')
    }
  }

  return (
    <div className="dash-page">
      <header className="dash-page-head cat-head">
        <div>
          <h1 className="dash-h1">{t('cat.title')}</h1>
          <p className="dash-sub">{t('cat.subtitle')}</p>
          {shop && (
            <button
              className="cat-shop-chip"
              onClick={() => navigate('/dashboard/boutique')}
              title="Gérer ma boutique"
            >
              <FaStore /> {shop.name} <FaEdit className="cat-shop-edit" />
            </button>
          )}
        </div>
        {tab === 'local' && (
          <Button variant="primary" onClick={() => setModal({ open: true, product: null })}>
            <FaPlus /> {t('cat.add')}
          </Button>
        )}
      </header>

      <div className="cat-tabs">
        <button className={`cat-tab${tab === 'local' ? ' active' : ''}`} onClick={() => setTab('local')}>{t('cat.tab.local')}</button>
        <button className={`cat-tab${tab === 'wanzo' ? ' active' : ''}`} onClick={() => setTab('wanzo')}>{t('cat.tab.wanzo')}</button>
      </div>

      {tab === 'local' ? (
        loading ? (
          <Spinner label={t('cat.loading')} />
        ) : error ? (
          <Card><p className="form-error">{error}</p></Card>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<FaBoxOpen />}
            title={t('cat.empty.title')}
            text={t('cat.empty.text')}
            action={<Button variant="primary" onClick={() => setModal({ open: true, product: null })}><FaPlus /> {t('cat.add')}</Button>}
          />
        ) : (
          <>
            <CatalogueFilters value={filters} onChange={setFilters} taxonomy={taxonomy} />
            {filtered.length === 0 ? (
              <Card><p className="cat-empty-filter">Aucun article ne correspond à ces filtres.</p></Card>
            ) : (
              <>
                <ProductTable products={lp.pageItems} onEdit={(p) => setModal({ open: true, product: p })} onDelete={(p) => setConfirm({ open: true, product: p, busy: false })} onViews={(p) => setAnalytics({ open: true, product: p })} t={t} />
                <Pagination page={lp.page} totalPages={lp.totalPages} count={lp.count} onChange={lp.setPage} />
              </>
            )}
          </>
        )
      ) : (
        <WanzoTab t={t} />
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
        title={t('cat.delete')}
        message={confirm.product ? t('cat.deleteConfirm', { name: confirm.product.name }) : ''}
        confirmLabel={t('cat.delete')}
        cancelLabel={t('form.cancel')}
        onConfirm={doDelete}
        onClose={() => setConfirm({ open: false, product: null, busy: false })}
      />

      <ShopRenameModal open={renaming} current={shop?.name} onClose={() => setRenaming(false)} onSave={renameShop} />

      <AnalyticsModal
        open={analytics.open}
        product={analytics.product}
        onClose={() => setAnalytics({ open: false, product: null })}
      />
    </div>
  )
}
