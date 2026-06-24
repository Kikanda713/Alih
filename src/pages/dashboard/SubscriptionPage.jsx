import { useEffect, useState, useCallback } from 'react'
import { FaCheck, FaCrown, FaTimesCircle } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { useToast } from '../../components/Toast.jsx'
import { Card, Button, Badge, Spinner, ConfirmModal } from '../../components/ui.jsx'
import PaymentModal from '../../components/PaymentModal.jsx'
import { PLANS, planById } from '../../data/plans'

const STATUS_TONE = { trialing: 'warn', active: 'success', cancelled: 'danger', expired: 'neutral' }

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) } catch { return '—' }
}

export default function SubscriptionPage() {
  const api = useTindisaApi()
  const { t } = useT()
  const { notify } = useToast()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [sub, setSub] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [payModal, setPayModal] = useState({ open: false, plan: null, amount: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/v1/merchant/subscription')
      setSub(r?.subscription || null)
    } catch {
      setSub(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const active = sub && sub.status !== 'cancelled' && sub.status !== 'expired'

  // Essai gratuit (Pro) = sans paiement. Les souscriptions payantes passent par PaymentModal.
  const startTrial = async (plan) => {
    setBusy(plan)
    try {
      await api.post('/v1/merchant/subscription', { plan, trial: true })
      notify(t('sub.toast.subscribed'), 'success')
      await load()
    } catch (e) {
      notify(e?.message || t('merchant.error'), 'error')
    } finally {
      setBusy('')
    }
  }

  const cancel = async () => {
    setBusy('cancel')
    try {
      await api.put('/v1/merchant/subscription', { cancel: true })
      notify(t('sub.toast.cancelled'), 'success')
      setCancelOpen(false)
      await load()
    } catch (e) {
      notify(e?.message || t('merchant.error'), 'error')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <div className="dash-page"><Spinner label={t('cat.loading')} /></div>

  const currentPlan = sub ? planById(sub.plan) : null

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">{t('sub.title')}</h1>
        <p className="dash-sub">{t('sub.subtitle')}</p>
      </header>

      {/* Abonnement courant */}
      {active && (
        <Card className="sub-current">
          <div className="sub-current-icon"><FaCrown /></div>
          <div className="sub-current-main">
            <span className="sub-current-label">{t('sub.current')}</span>
            <span className="sub-current-plan">
              {currentPlan?.name || sub.plan}
              <Badge tone={STATUS_TONE[sub.status] || 'neutral'}>{t(`sub.status.${sub.status}`)}</Badge>
            </span>
            <span className="sub-current-meta">
              {sub.status === 'trialing'
                ? t('sub.trialEnds', { date: fmtDate(sub.trialEndsAt) })
                : t('sub.renews', { date: fmtDate(sub.currentPeriodEnd) })}
            </span>
          </div>
          <Button variant="ghost" onClick={() => setCancelOpen(true)} disabled={busy === 'cancel'}>
            <FaTimesCircle /> {t('sub.cancel')}
          </Button>
        </Card>
      )}

      {/* Plans */}
      <div className="sub-grid">
        {PLANS.map((p) => {
          const isCurrent = active && sub.plan === p.id
          return (
            <Card key={p.id} className={`sub-card${p.featured ? ' featured' : ''}${isCurrent ? ' current' : ''}`}>
              {p.featured && <span className="sub-card-badge">{t('sub.popular')}</span>}
              <h3 className="sub-card-name">{p.name}</h3>
              <div className="sub-card-price"><b>{p.price}$</b> <span>/ {t('sub.month')}</span></div>
              {p.trial && !active && <span className="sub-card-trial">{t('sub.trial')}</span>}
              <ul className="sub-card-features">
                {p.features.map((f, i) => <li key={i}><FaCheck /> {f}</li>)}
              </ul>
              {isCurrent ? (
                <Button variant="secondary" disabled>{t('sub.currentPlan')}</Button>
              ) : (
                <Button
                  variant={p.featured ? 'primary' : 'secondary'}
                  disabled={!!busy}
                  onClick={() => {
                    if (!active && p.trial) startTrial(p.id)
                    else setPayModal({ open: true, plan: p.id, amount: p.price })
                  }}
                >
                  {!active && p.trial ? t('sub.tryFree') : active ? t('sub.switch') : t('sub.subscribe')}
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      <p className="sub-note">{t('sub.note')}</p>

      <ConfirmModal
        open={cancelOpen}
        danger
        busy={busy === 'cancel'}
        title={t('sub.cancel')}
        message={t('sub.cancelConfirm')}
        confirmLabel={t('sub.cancel')}
        cancelLabel={t('form.cancel')}
        onConfirm={cancel}
        onClose={() => setCancelOpen(false)}
      />

      <PaymentModal
        open={payModal.open}
        plan={payModal.plan}
        amount={payModal.amount}
        onClose={() => setPayModal({ open: false, plan: null, amount: 0 })}
        onDone={load}
      />
    </div>
  )
}
