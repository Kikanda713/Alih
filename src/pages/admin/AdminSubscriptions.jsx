import { useEffect, useState, useCallback, useMemo } from 'react'
import { FaCreditCard } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Badge, Spinner, EmptyState, Select } from '../../components/ui.jsx'
import { usePaged, Pagination } from '../../components/Pagination.jsx'
import ExportButtons from '../../components/ExportButtons.jsx'
import { planById } from '../../data/plans'

const STATUS_TONE = { trialing: 'warn', active: 'success', cancelled: 'danger', expired: 'neutral' }
const STATUS_OPTS = [
  { id: 'active', label: 'Actif' }, { id: 'trialing', label: 'Essai' },
  { id: 'cancelled', label: 'Annulé' }, { id: 'expired', label: 'Expiré' },
]
const PLAN_OPTS = [
  { id: 'free', label: 'Gratuit' }, { id: 'basic', label: 'Basic' },
  { id: 'pro', label: 'Pro' }, { id: 'business', label: 'Business' },
]

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) } catch { return '—' }
}
const EXPORT_COLS = [
  { key: 'userName', label: 'Vendeur' },
  { key: 'email', label: 'Email' },
  { key: 'shopName', label: 'Boutique' },
  { key: 'city', label: 'Ville' },
  { key: 'plan', label: 'Plan', map: (s) => planById(s.plan)?.name || s.plan },
  { key: 'priceUsd', label: 'Prix (USD/mois)', map: (s) => Number(s.priceUsd) || 0 },
  { key: 'status', label: 'Statut' },
  { key: 'period', label: 'Période', map: (s) => (s.status === 'trialing' ? fmtDate(s.trialEndsAt) : fmtDate(s.currentPeriodEnd)) },
]

export default function AdminSubscriptions() {
  const api = useTindisaApi()
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState([])
  const [summary, setSummary] = useState(null)
  const [fStatus, setFStatus] = useState('')
  const [fPlan, setFPlan] = useState('')
  const filtered = useMemo(
    () => subs.filter((s) => (!fStatus || s.status === fStatus) && (!fPlan || s.plan === fPlan)),
    [subs, fStatus, fPlan],
  )
  const { pageItems, page, setPage, totalPages, count } = usePaged(filtered, 10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/v1/admin/subscriptions')
      setSubs(r?.subscriptions || [])
      setSummary(r?.summary || null)
    } catch {
      setSubs([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">{t('admin.subs.title')}</h1>
        <p className="dash-sub">{t('admin.subs.subtitle')}</p>
      </header>

      {/* Suivi par plan + revenu mensuel récurrent (MRR) */}
      {summary && (
        <div className="admin-subs-summary">
          {(summary.byPlan || []).map((r) => (
            <div className="admin-sub-card" key={r.plan}>
              <div className="admin-sub-plan">{planById(r.plan)?.name || r.plan}</div>
              <div className="admin-sub-total">{r.total}</div>
              <div className="admin-sub-meta">
                <span className="ok">{r.active} actifs</span>
                {r.trialing > 0 && <span> · {r.trialing} essais</span>}
              </div>
              {r.mrrUsd > 0 && <div className="admin-sub-mrr">{r.mrrUsd}$/mois</div>}
            </div>
          ))}
          <div className="admin-sub-card total">
            <div className="admin-sub-plan">MRR total</div>
            <div className="admin-sub-total">{summary.mrrUsd || 0}$</div>
            <div className="admin-sub-meta">{summary.total} abonnés</div>
          </div>
        </div>
      )}

      {!loading && subs.length > 0 && (
        <div className="admin-toolbar">
          <div className="admin-filters">
            <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} options={STATUS_OPTS} placeholder="Tous statuts" />
            <Select value={fPlan} onChange={(e) => setFPlan(e.target.value)} options={PLAN_OPTS} placeholder="Tous plans" />
          </div>
          <ExportButtons baseName="tindisa-abonnements" columns={EXPORT_COLS} rows={filtered} sheetName="Abonnements" />
        </div>
      )}

      {loading ? (
        <Spinner label={t('cat.loading')} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FaCreditCard />} title={t('admin.subs.empty.title')} text={t('admin.subs.empty.text')} />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>{t('admin.subs.col.user')}</th>
                  <th>Ville</th>
                  <th>{t('admin.subs.col.plan')}</th>
                  <th>{t('admin.subs.col.price')}</th>
                  <th>{t('admin.subs.col.status')}</th>
                  <th>{t('admin.subs.col.period')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="cat-pname">{s.userName || s.userId}</span>
                      {s.email && s.email !== s.userName && <span className="cat-sku">{s.email}</span>}
                    </td>
                    <td>{s.city || '—'}</td>
                    <td>{planById(s.plan)?.name || s.plan}</td>
                    <td>{Number(s.priceUsd) || 0}$ / {t('sub.month')}</td>
                    <td><Badge tone={STATUS_TONE[s.status] || 'neutral'}>{t(`sub.status.${s.status}`)}</Badge></td>
                    <td>{s.status === 'trialing' ? fmtDate(s.trialEndsAt) : fmtDate(s.currentPeriodEnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
        </>
      )}
    </div>
  )
}
