import { useEffect, useMemo, useState, useCallback } from 'react'
import { FaUserSlash, FaUserCheck, FaUsers, FaStore, FaShoppingBag } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { useToast } from '../../components/Toast.jsx'
import { Card, Badge, Spinner, EmptyState, Input, ConfirmModal } from '../../components/ui.jsx'
import { usePaged, Pagination } from '../../components/Pagination.jsx'

function name(u) {
  const n = [u.firstname, u.lastname].filter(Boolean).join(' ').trim()
  return n || u.name || u.email || u.phone || '—'
}
function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) } catch { return '—' }
}
const TYPE_TONE = { merchant: 'success', buyer: 'neutral', both: 'warn' }
const STATUS_TONE = { active: 'success', suspended: 'danger', guest: 'warn' }

export default function AdminUsers() {
  const api = useTindisaApi()
  const { t } = useT()
  const { notify } = useToast()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState({ open: false, user: null, busy: false })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/v1/admin/users')
      setUsers(r?.users || [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return users.filter((u) => {
      if (type !== 'all' && u.type !== type) return false
      if (!needle) return true
      return [name(u), u.email, u.phone].filter(Boolean).join(' ').toLowerCase().includes(needle)
    })
  }, [users, type, q])

  const { pageItems, page, setPage, totalPages, count } = usePaged(filtered, 10)

  const toggleStatus = async () => {
    const u = confirm.user
    const next = u.status === 'suspended' ? 'active' : 'suspended'
    setConfirm((c) => ({ ...c, busy: true }))
    try {
      await api.put(`/v1/admin/users/${u.id}/status`, { status: next })
      notify(next === 'suspended' ? t('admin.users.suspended') : t('admin.users.activated'), 'success')
      setConfirm({ open: false, user: null, busy: false })
      await load()
    } catch (e) {
      notify(e?.message || t('merchant.error'), 'error')
      setConfirm((c) => ({ ...c, busy: false }))
    }
  }

  const tabs = [
    { k: 'all', icon: <FaUsers />, label: t('admin.users.all') },
    { k: 'merchant', icon: <FaStore />, label: t('admin.users.merchants') },
    { k: 'buyer', icon: <FaShoppingBag />, label: t('admin.users.buyers') },
  ]

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">{t('admin.users.title')}</h1>
        <p className="dash-sub">{t('admin.users.subtitle')}</p>
      </header>

      <div className="admin-toolbar">
        <div className="cat-tabs admin-tabs">
          {tabs.map((tb) => (
            <button key={tb.k} className={`cat-tab${type === tb.k ? ' active' : ''}`} onClick={() => setType(tb.k)}>
              {tb.icon} {tb.label}
            </button>
          ))}
        </div>
        <Input className="admin-search" placeholder={t('admin.users.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <Spinner label={t('cat.loading')} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FaUsers />} title={t('admin.users.empty.title')} text={t('admin.users.empty.text')} />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>{t('admin.users.col.user')}</th>
                  <th>{t('admin.users.col.contact')}</th>
                  <th>{t('admin.users.col.type')}</th>
                  <th>{t('admin.users.col.status')}</th>
                  <th>{t('admin.users.col.joined')}</th>
                  <th className="cat-col-actions">{t('cat.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((u) => (
                  <tr key={u.id}>
                    <td><span className="cat-pname">{name(u)}</span></td>
                    <td><span className="cat-sku">{u.email || u.phone || '—'}</span></td>
                    <td><Badge tone={TYPE_TONE[u.type] || 'neutral'}>{t(`admin.type.${u.type || 'buyer'}`)}</Badge></td>
                    <td><Badge tone={STATUS_TONE[u.status] || 'neutral'}>{t(`admin.status.${u.status || 'active'}`)}</Badge></td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td className="cat-col-actions">
                      <button
                        className={`cat-icon-btn${u.status === 'suspended' ? '' : ' danger'}`}
                        title={u.status === 'suspended' ? t('admin.users.activate') : t('admin.users.suspend')}
                        onClick={() => setConfirm({ open: true, user: u, busy: false })}
                      >
                        {u.status === 'suspended' ? <FaUserCheck /> : <FaUserSlash />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={confirm.open}
        danger={confirm.user?.status !== 'suspended'}
        busy={confirm.busy}
        title={confirm.user?.status === 'suspended' ? t('admin.users.activate') : t('admin.users.suspend')}
        message={confirm.user ? t('admin.users.confirm', { name: name(confirm.user) }) : ''}
        confirmLabel={confirm.user?.status === 'suspended' ? t('admin.users.activate') : t('admin.users.suspend')}
        cancelLabel={t('form.cancel')}
        onConfirm={toggleStatus}
        onClose={() => setConfirm({ open: false, user: null, busy: false })}
      />
    </div>
  )
}
