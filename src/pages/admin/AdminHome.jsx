import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaUsers, FaStore, FaShoppingBag, FaMotorcycle, FaCoins, FaCreditCard, FaHistory, FaChartLine, FaMicrochip } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Card, Button, Badge, Spinner, EmptyState } from '../../components/ui.jsx'
import { usePaged, Pagination } from '../../components/Pagination.jsx'
import { useAdminView } from './AdminScopeContext.jsx'
import { planById } from '../../data/plans'

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }
function money(n) { return `${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $` }
function money2(n) { return `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` }
function num(n) { return Number(n || 0).toLocaleString('fr-FR') }
function tok(n) {
  const v = Number(n || 0)
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M`
  if (v >= 1e3) return `${(v / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k`
  return String(v)
}

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
  const { city, global, withCity } = useAdminView()
  const [stats, setStats] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [activities, setActivities] = useState([])
  const [loadingAct, setLoadingAct] = useState(true)
  const { pageItems, page, setPage, totalPages, count } = usePaged(activities, 8)

  useEffect(() => {
    let alive = true
    setStats(null)
    setMetrics(null)
    setLoadingAct(true)
    api.get(withCity('/v1/admin/stats'))
      .then((r) => alive && setStats(r || {}))
      .catch(() => alive && setStats({ boutiques: 0, acheteurs: 0, livreurs: 0, gmvUsd: 0 }))

    api.get(withCity('/v1/admin/metrics'))
      .then((r) => alive && setMetrics(r || {}))
      .catch(() => alive && setMetrics({ business: {}, tokens: {} }))

    // Activités récentes — montées sur les données DÉJÀ disponibles (mêmes
    // endpoints que les pages Utilisateurs et Abonnements), agrégées + triées
    // côté client. Pas de nouvel appel backend dédié.
    Promise.all([
      api.get(withCity('/v1/admin/users')).catch(() => []),
      api.get(withCity('/v1/admin/subscriptions')).catch(() => null),
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
  }, [city])

  if (!stats) return <div className="dash-page"><Spinner label={t('merchant.loading')} /></div>

  const cards = [
    { icon: <FaStore />, value: stats.boutiques ?? stats.merchants ?? 0, label: 'Boutiques' },
    { icon: <FaShoppingBag />, value: stats.acheteurs ?? stats.buyers ?? 0, label: 'Acheteurs' },
    { icon: <FaMotorcycle />, value: stats.livreurs ?? 0, label: 'Livreurs' },
    { icon: <FaCoins />, value: money(stats.gmvUsd), label: 'Recettes (GMV)' },
  ]

  const scopeLabel = city ? cap(city) : (global ? 'Tout le pays' : '')
  const biz = metrics?.business || {}
  const tk = metrics?.tokens || {}
  const dailyMax = Math.max(1, ...(tk.daily || []).map((d) => (d.inputTokens || 0) + (d.outputTokens || 0)))

  const bizItems = [
    { label: 'Ventes conclues', value: num(biz.salesCount), sub: `${num(biz.sales30dCount)} sur 30j` },
    { label: 'GMV (volume d’affaires)', value: money(biz.gmvUsd), sub: `${money(biz.gmv30dUsd)} sur 30j` },
    { label: 'Panier moyen', value: money2(biz.avgOrderUsd) },
    { label: 'MRR (commission 30j)', value: money2(biz.mrrUsd), sub: 'notre revenu récurrent' },
    { label: 'Commissions dues', value: money2(biz.owedUsd), tone: Number(biz.owedUsd) > 0 ? 'warn' : null },
    { label: 'Commissions versées', value: money2(biz.paidUsd) },
    { label: 'Comptes bloqués', value: num(biz.blockedSellers), tone: Number(biz.blockedSellers) > 0 ? 'danger' : null, sub: `seuil ${biz.thresholds?.block ?? 50} $` },
    { label: 'Churn vendeurs (30j)', value: `${num(biz.churnRatePct)} %`, sub: `${num(biz.inactiveSellers30d)} inactifs / ${num(biz.activeSellers)}` },
  ]
  const tokItems = [
    { label: 'Tokens (total)', value: tok(tk.totalTokens), sub: `${tok(tk.inputTokens)} in · ${tok(tk.outputTokens)} out` },
    { label: 'Tokens 30 jours', value: tok(tk.tokens30d) },
    { label: 'Tokens 24 h', value: tok(tk.tokens24h) },
    { label: 'Coût estimé', value: money2(tk.estCostUsd), sub: `${money2(tk.estCost30dUsd)} sur 30j` },
    { label: 'Conversations', value: num(tk.sessions), sub: `${num(tk.turns)} tours` },
    { label: 'Tarif gpt-4o', value: `${tk.pricing?.inPerMUsd ?? 2.5}/${tk.pricing?.outPerMUsd ?? 10} $`, sub: 'in/out par M tokens' },
  ]

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">{t('admin.home.title')}</h1>
        <p className="dash-sub">{t('admin.home.subtitle')}{scopeLabel ? ` · ${scopeLabel}` : ''}</p>
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
        <Button as={Link} to="/admin/commissions" variant="secondary"><FaCreditCard /> Commissions</Button>
      </div>

      {/* Performance commerciale (startup metrics) */}
      <Card>
        <div className="dash-page-head" style={{ marginBottom: 14 }}>
          <h2 className="dash-h2"><FaChartLine style={{ marginRight: 8 }} />Performance commerciale</h2>
        </div>
        {!metrics ? <Spinner label={t('cat.loading')} /> : (
          <div className="metric-grid">
            {bizItems.map((m, i) => (
              <div key={i} className="metric-item">
                <span className="metric-item-label">{m.label}</span>
                <span className={`metric-item-value${m.tone ? ' tone-' + m.tone : ''}`}>{m.value}</span>
                {m.sub && <span className="metric-item-sub">{m.sub}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Consommation IA (tokens) */}
      <Card>
        <div className="dash-page-head" style={{ marginBottom: 14 }}>
          <h2 className="dash-h2"><FaMicrochip style={{ marginRight: 8 }} />Consommation IA (tokens)</h2>
          <p className="dash-sub">Estimée — Azure ne renvoie pas l’usage exact en streaming. Coût indicatif.</p>
        </div>
        {!metrics ? <Spinner label={t('cat.loading')} /> : (
          <>
            <div className="metric-grid">
              {tokItems.map((m, i) => (
                <div key={i} className="metric-item">
                  <span className="metric-item-label">{m.label}</span>
                  <span className="metric-item-value">{m.value}</span>
                  {m.sub && <span className="metric-item-sub">{m.sub}</span>}
                </div>
              ))}
            </div>
            {(tk.daily || []).length > 0 && (
              <div className="metric-bars" title="Tokens / jour (14 derniers jours)">
                {tk.daily.map((d, i) => {
                  const total = (d.inputTokens || 0) + (d.outputTokens || 0)
                  const h = Math.max(4, Math.round((total / dailyMax) * 100))
                  const day = new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                  return (
                    <div key={i} className="metric-bar-col" title={`${day} · ${tok(total)} tokens`}>
                      <div className="metric-bar" style={{ height: `${h}%` }} />
                      <span className="metric-bar-x">{day}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </Card>

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
