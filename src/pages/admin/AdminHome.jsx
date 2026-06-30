import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaUsers, FaStore, FaShoppingBag, FaUserClock, FaCreditCard, FaHistory } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Card, Button, Badge, Spinner, EmptyState } from '../../components/ui.jsx'
import { usePaged, Pagination } from '../../components/Pagination.jsx'
import { planById } from '../../data/plans'

const ACCT_TONE = { active: 'success', suspended: 'danger', pending: 'warn' }
const SUB_TONE = { trialing: 'warn', active: 'success', cancelled: 'danger', expired: 'neutral' }

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) } catch { return '—' }
}
function ts(d) { const n = d ? new Date(d).getTime() : 0; return Number.isFinite(n) ? n : 0 }
function userName(u) {
  const n = [u.firstname, u.lastname].filter(Boolean).join(' ').trim()
  return n || u.name || u.email || u.phone || '—'
}
function isMerchant(u) {
  const r = String(u.role || u.type || '').toLowerCase()
  return /merchant|commer|vendeur|seller/.test(r) || !!u.shopId || !!u.hasShop
}

export default function AdminHome() {
  const api = useTindisaApi()
  const { t } = useT()
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [loadingAct, setLoadingAct] = useState(true)
  const { pageItems, page, setPage, totalPages, count } = usePaged(activities, 8)

  useEffect(() => {
    let alive = true
    api.get('/v1/admin/stats')
      .then((r) => alive && setStats(r || {}))
      .catch(() => alive && setStats({ users: 0, merchants: 0, buyers: 0, pending: 0 }))

    // Activités récentes — montées sur les données DÉJÀ disponibles (mêmes
    // endpoints que les pages Utilisateurs et Abonnements), agrégées + triées
    // côté client. Pas de nouvel appel backend dédié.
    Promise.all([
      api.get('/v1/admin/users').catch(() => []),
      api.get('/v1/admin/subscriptions').catch(() => null),
    ]).then(([users, subsRes]) => {
      if (!alive) return
      const list = Array.isArray(users) ? users : users?.users || []
      const subs = subsRes?.subscriptions || []
      const acts = [
        ...list.map((u) => ({
          id: 'u-' + (u.id || u.email || Math.random()),
          icon: isMerchant(u) ? <FaStore /> : <FaShoppingBag />,
          type: isMerchant(u) ? 'Nouvelle boutique' : 'Nouvel acheteur',
          detail: userName(u) + (u.email ? ` · ${u.email}` : u.phone ? ` · ${u.phone}` : ''),
          status: u.status || 'active',
          tone: ACCT_TONE[u.status] || 'success',
          statusLabel: u.status || 'active',
          date: u.createdAt || u.created_at,
        })),
        ...subs.map((s) => ({
          id: 's-' + (s.id || s.userId || Math.random()),
          icon: <FaCreditCard />,
          type: `Abonnement ${planById(s.plan)?.name || s.plan || ''}`.trim(),
          detail: s.userName || s.userId || '—',
          status: s.status,
          tone: SUB_TONE[s.status] || 'neutral',
          statusLabel: s.status,
          date: s.createdAt || s.created_at || s.currentPeriodEnd || s.trialEndsAt,
        })),
      ].sort((a, b) => ts(b.date) - ts(a.date))
      setActivities(acts)
      setLoadingAct(false)
    })

    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!stats) return <div className="dash-page"><Spinner label={t('merchant.loading')} /></div>

  const cards = [
    { icon: <FaUsers />, value: stats.users ?? 0, label: t('admin.stats.users') },
    { icon: <FaStore />, value: stats.merchants ?? 0, label: t('admin.stats.merchants') },
    { icon: <FaShoppingBag />, value: stats.buyers ?? 0, label: t('admin.stats.buyers') },
    { icon: <FaUserClock />, value: stats.pending ?? 0, label: t('admin.stats.pending') },
  ]

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">{t('admin.home.title')}</h1>
        <p className="dash-sub">{t('admin.home.subtitle')}</p>
      </header>

      <div className="dash-stats admin-stats">
        {cards.map((c, i) => (
          <Card key={i} className="dash-stat">
            <div className="dash-stat-icon">{c.icon}</div>
            <div>
              <span className="dash-stat-value">{c.value}</span>
              <span className="dash-stat-label">{c.label}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="dash-quick">
        <Button as={Link} to="/admin/users" variant="primary"><FaUsers /> {t('admin.home.manageUsers')}</Button>
        <Button as={Link} to="/admin/subscriptions" variant="secondary"><FaCreditCard /> {t('admin.subs.title')}</Button>
      </div>

      {/* Activités récentes : créations de comptes (boutiques/acheteurs) + abonnements */}
      <Card>
        <div className="dash-page-head" style={{ marginBottom: 14 }}>
          <h2 className="dash-h2"><FaHistory style={{ marginRight: 8 }} />Activités récentes</h2>
        </div>
        {loadingAct ? (
          <Spinner label={t('cat.loading')} />
        ) : activities.length === 0 ? (
          <EmptyState icon={<FaHistory />} title="Aucune activité" text="Les créations de comptes et abonnements apparaîtront ici." />
        ) : (
          <>
            <div className="cat-table-wrap">
              <table className="cat-table">
                <thead>
                  <tr>
                    <th>Activité</th>
                    <th>Détail</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((a) => (
                    <tr key={a.id}>
                      <td><span className="admin-act-type">{a.icon} {a.type}</span></td>
                      <td><span className="cat-sku">{a.detail}</span></td>
                      <td><Badge tone={a.tone}>{a.statusLabel}</Badge></td>
                      <td>{fmtDate(a.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
