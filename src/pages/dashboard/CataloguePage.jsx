import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaPlus, FaEdit, FaTrash, FaBoxOpen, FaSyncAlt, FaLink } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Card, Button, Badge, Spinner, EmptyState, Field, Input } from '../../components/ui.jsx'
import ProductFormModal from './ProductFormModal.jsx'

function fmtPrice(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString('fr-FR')} CDF`
}

function ProductTable({ products, readOnly, onEdit, onDelete, t }) {
  return (
    <div className="cat-table-wrap">
      <table className="cat-table">
        <thead>
          <tr>
            <th>{t('cat.col.product')}</th>
            <th>{t('cat.col.category')}</th>
            <th>{t('cat.col.price')}</th>
            {!readOnly && <th>{t('cat.col.floor')}</th>}
            <th>{t('cat.col.stock')}</th>
            {!readOnly && <th className="cat-col-actions">{t('cat.col.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                <span className="cat-pname">{p.name}</span>
                {p.sku && <span className="cat-sku">{p.sku}</span>}
              </td>
              <td>{p.category || '—'}</td>
              <td>{fmtPrice(p.pricing?.displayPrice)}</td>
              {!readOnly && <td className="cat-floor">{fmtPrice(p.pricing?.minPrice)}</td>}
              <td>
                <Badge tone={(p.quantity || 0) > 0 ? 'success' : 'danger'}>{p.quantity ?? 0}</Badge>
              </td>
              {!readOnly && (
                <td className="cat-col-actions">
                  <button className="cat-icon-btn" onClick={() => onEdit(p)} aria-label={t('cat.edit')}>
                    <FaEdit />
                  </button>
                  <button className="cat-icon-btn danger" onClick={() => onDelete(p)} aria-label={t('cat.delete')}>
                    <FaTrash />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WanzoTab({ t }) {
  const api = useTindisaApi()
  const [state, setState] = useState({ loading: true, link: null, products: [] })
  const [companyId, setCompanyId] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

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

  useEffect(() => {
    load()
  }, [load])

  const linked = state.link?.linked
  const verified = state.link?.link?.verified

  const connect = async () => {
    if (!companyId.trim()) return setMsg(t('merchant.connect.empty'))
    setBusy('connect')
    setMsg('')
    try {
      await api.post('/v1/wanzo/link', { companyId: companyId.trim() })
      setMsg(t('merchant.connect.success'))
      await load()
    } catch (e) {
      setMsg(e?.message || t('merchant.error'))
    } finally {
      setBusy('')
    }
  }

  const sync = async () => {
    setBusy('sync')
    setMsg('')
    try {
      const r = await api.post('/v1/wanzo/sync', {})
      setMsg(t('merchant.sync.success', { count: r?.synced ?? 0 }))
      await load()
    } catch (e) {
      setMsg(e?.message || t('merchant.sync.unknown'))
    } finally {
      setBusy('')
    }
  }

  if (state.loading) return <Spinner label={t('cat.loading')} />

  return (
    <div className="cat-wanzo">
      <Card className="cat-wanzo-card">
        <div className="cat-wanzo-status">
          <FaLink />
          {linked ? (
            <span>
              {t('merchant.status.linked')} —{' '}
              <Badge tone={verified ? 'success' : 'warn'}>
                {verified ? t('merchant.status.verified') : t('merchant.status.notVerified')}
              </Badge>
            </span>
          ) : (
            <span>{t('cat.wanzo.notLinked')}</span>
          )}
        </div>

        {!linked ? (
          <div className="cat-wanzo-connect">
            <Field label={t('merchant.connect.title')}>
              <Input
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder={t('merchant.connect.placeholder')}
              />
            </Field>
            <Button variant="primary" onClick={connect} disabled={busy === 'connect'}>
              {t('merchant.connect.button')}
            </Button>
          </div>
        ) : (
          <Button variant="primary" onClick={sync} disabled={busy === 'sync'}>
            <FaSyncAlt /> {t('merchant.sync.button')}
          </Button>
        )}
        {msg && <p className="cat-wanzo-msg">{msg}</p>}
      </Card>

      <p className="cat-readonly-note">{t('cat.wanzo.readonly')}</p>
      {state.products.length === 0 ? (
        <EmptyState icon={<FaBoxOpen />} text={t('cat.wanzo.empty')} />
      ) : (
        <ProductTable products={state.products} readOnly t={t} />
      )}
    </div>
  )
}

export default function CataloguePage() {
  const api = useTindisaApi()
  const { t } = useT()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState('local')
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState({ open: false, product: null })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api.get('/v1/merchant/products')
      setProducts(r?.products || [])
    } catch (e) {
      setError(e?.message || t('merchant.error'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Ouverture auto du formulaire via ?new=1 (depuis l'accueil).
  useEffect(() => {
    if (params.get('new') === '1') {
      setModal({ open: true, product: null })
      params.delete('new')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async (payload) => {
    if (modal.product) {
      await api.put(`/v1/merchant/products/${modal.product.id}`, payload)
    } else {
      await api.post('/v1/merchant/products', payload)
    }
    setModal({ open: false, product: null })
    await load()
  }

  const remove = async (p) => {
    if (!window.confirm(t('cat.deleteConfirm', { name: p.name }))) return
    await api.del(`/v1/merchant/products/${p.id}`)
    await load()
  }

  return (
    <div className="dash-page">
      <header className="dash-page-head cat-head">
        <div>
          <h1 className="dash-h1">{t('cat.title')}</h1>
          <p className="dash-sub">{t('cat.subtitle')}</p>
        </div>
        {tab === 'local' && (
          <Button variant="primary" onClick={() => setModal({ open: true, product: null })}>
            <FaPlus /> {t('cat.add')}
          </Button>
        )}
      </header>

      <div className="cat-tabs">
        <button className={`cat-tab${tab === 'local' ? ' active' : ''}`} onClick={() => setTab('local')}>
          {t('cat.tab.local')}
        </button>
        <button className={`cat-tab${tab === 'wanzo' ? ' active' : ''}`} onClick={() => setTab('wanzo')}>
          {t('cat.tab.wanzo')}
        </button>
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
            action={
              <Button variant="primary" onClick={() => setModal({ open: true, product: null })}>
                <FaPlus /> {t('cat.add')}
              </Button>
            }
          />
        ) : (
          <ProductTable products={products} onEdit={(p) => setModal({ open: true, product: p })} onDelete={remove} t={t} />
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
    </div>
  )
}
