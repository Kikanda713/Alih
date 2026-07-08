import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { FaCheck, FaCrown, FaTimesCircle, FaBolt, FaFileInvoiceDollar, FaDownload } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { useToast } from '../../components/Toast.jsx'
import { Card, Button, Badge, Spinner, EmptyState, ConfirmModal } from '../../components/ui.jsx'
import PaymentModal from '../../components/PaymentModal.jsx'
import { PLANS, planById } from '../../data/plans'
import { downloadInvoice, invoiceRef } from '../../utils/invoice'

const STATUS_TONE = { trialing: 'warn', active: 'success', cancelled: 'danger', expired: 'neutral' }

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) } catch { return '—' }
}

export default function SubscriptionPage() {
  const api = useTindisaApi()
  const { t } = useT()
  const { notify } = useToast()
  const { user } = useAuth0()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [sub, setSub] = useState(null)
  const [ent, setEnt] = useState(null)
  const [tab, setTab] = useState('abo') // 'abo' | 'history'
  const [cancelOpen, setCancelOpen] = useState(false)
  const [payModal, setPayModal] = useState({ open: false, plan: null, amount: 0 })

  // Historique de paiement : monté sur l'abonnement courant (un paiement/renouv.
  // par abonnement). Chaque ligne payante donne une facture téléchargeable.
  const payments = (() => {
    if (!sub || !sub.plan || sub.plan === 'free') return []
    const paid = ['active', 'trialing'].includes(sub.status) || sub.priceUsd > 0
    if (!paid) return []
    return [{
      ref: invoiceRef(sub),
      date: sub.currentPeriodEnd || sub.updatedAt || sub.createdAt,
      plan: planById(sub.plan)?.name || sub.plan,
      ttc: Number(sub.priceUsd) || planById(sub.plan)?.price || 0,
      status: sub.status,
      trial: sub.status === 'trialing',
      method: sub.telecom ? `Mobile Money (${sub.telecom})` : '—',
    }]
  })()

  const getInvoice = (p) => downloadInvoice({
    ref: p.ref,
    dateStr: fmtDate(p.date),
    clientName: user?.name || user?.email || 'Client Tindisa',
    paidBy: user?.name || user?.email || '',
    planName: p.plan,
    priceTtc: p.ttc,
    status: p.trial ? 'Essai' : p.status,
    method: p.method,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, e] = await Promise.all([
        api.get('/v1/merchant/subscription'),
        api.get('/v1/merchant/entitlements').catch(() => null),
      ])
      setSub(r?.subscription || null)
      setEnt(e || null)
    } catch {
      setSub(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  // Arrivée depuis la landing (CTA d'un plan) : ouvrir directement le paiement.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const plan = searchParams.get('plan')
    if (plan && plan !== 'free') {
      const p = planById(plan)
      if (p) setPayModal({ open: true, plan, amount: p.price })
    }
    if (plan) { searchParams.delete('plan'); setSearchParams(searchParams, { replace: true }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      <div className="cat-tabs">
        <button className={`cat-tab${tab === 'abo' ? ' active' : ''}`} onClick={() => setTab('abo')}>Mon abonnement</button>
        <button className={`cat-tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>
          <FaFileInvoiceDollar /> Historique &amp; factures
        </button>
      </div>

      {tab === 'history' ? (
        payments.length === 0 ? (
          <EmptyState icon={<FaFileInvoiceDollar />} title="Aucun paiement" text="Vos paiements et factures apparaîtront ici après votre premier abonnement payant." />
        ) : (
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>Réf. facture</th>
                  <th>Date</th>
                  <th>Formule</th>
                  <th>Montant TTC</th>
                  <th>Statut</th>
                  <th className="cat-col-actions">Facture</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.ref}>
                    <td><span className="cat-pname">{p.ref}</span></td>
                    <td>{fmtDate(p.date)}</td>
                    <td>{p.plan}</td>
                    <td>{p.ttc}$ {p.trial && <small>(essai)</small>}</td>
                    <td><Badge tone={STATUS_TONE[p.status] || 'neutral'}>{t(`sub.status.${p.status}`)}</Badge></td>
                    <td className="cat-col-actions">
                      <button className="cat-icon-btn" title="Télécharger la facture" onClick={() => getInvoice(p)}>
                        <FaDownload />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
      <>

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

      {/* Bonus de lancement : boutique traitée comme Business pendant 2 semaines. */}
      {ent?.bonus?.active && (
        <Card className="sub-bonus">
          <p><FaBolt /> <b>Bonus de lancement actif</b></p>
          <p>Votre boutique profite du plan <b>Business</b> — articles et recommandations <b>illimités</b>, toutes fonctionnalités débloquées — jusqu'au <b>{new Date(ent.bonus.until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</b>.</p>
          <p>Profitez-en pour charger un <b>maximum de produits</b> sans aucune contrainte !</p>
        </Card>
      )}

      {/* Consommation / palier (freemium) */}
      {ent && (() => {
        const max = ent.limits?.maxItems ?? 0
        const unlimited = max >= 1000000
        const used = ent.usage?.items ?? 0
        const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, max)) * 100))
        const near = !unlimited && used >= max - 3
        return (
          <Card className="sub-usage">
            <div className="sub-usage-head">
              <span>Offre actuelle : <b>{ent.plan?.label}</b></span>
              <span>Catalogue : <b>{used}</b> / {unlimited ? '∞' : max} articles</span>
            </div>
            {!unlimited && (
              <div className="usage-bar"><div className="usage-bar-fill" style={{ width: pct + '%', background: near ? '#d9822b' : '#635dff' }} /></div>
            )}
            {/* Recommandations du mois = ressource LIMITÉE/monétisée (nb de fois où
                l'agent expose la boutique aux acheteurs). Au-delà du quota, la
                boutique n'est plus recommandée jusqu'au mois suivant / à la montée en gamme. */}
            {ent.usage?.recommendationsThisMonth != null && (() => {
              const reco = ent.usage.recommendationsThisMonth
              const q = ent.limits?.maxRecommendationsPerMonth || 0
              const qUnl = q >= 1000000
              const rpct = qUnl ? 0 : Math.min(100, Math.round((reco / Math.max(1, q)) * 100))
              const recoNear = !qUnl && reco >= q * 0.9
              return (
                <div className="sub-usage-month">
                  <div className="sub-usage-head">
                    <span>Recommandations ce mois</span>
                    <span><b>{reco}</b>{qUnl ? '' : ` / ${q}`} recommandations <small>(~{ent.usage.tokenEquivalents} tokens-éq)</small></span>
                  </div>
                  {!qUnl && <div className="usage-bar"><div className="usage-bar-fill" style={{ width: rpct + '%', background: rpct >= 90 ? '#d9822b' : '#1a9e54' }} /></div>}
                  {recoNear && (
                    <p className="sub-usage-nudge"><FaBolt /> Vous approchez de votre quota de recommandations. Au-delà, votre boutique cesse d'être proposée aux acheteurs jusqu'au mois prochain. Passez à une offre supérieure pour rester visible.</p>
                  )}
                </div>
              )
            })()}
            {near && (
              <p className="sub-usage-nudge"><FaBolt /> Vous approchez de la limite d'articles de votre offre. Passez à une offre supérieure pour agrandir votre catalogue, proposer des services et débloquer les certificats.</p>
            )}
          </Card>
        )
      })()}

      {/* Plans */}
      <div className="sub-grid">
        {PLANS.map((p) => {
          // Sans abonnement actif, l'utilisateur est sur le palier GRATUIT.
          const isCurrent = active ? sub.plan === p.id : p.id === 'free'
          const isFree = p.id === 'free'
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
              ) : isFree ? (
                <Button variant="ghost" disabled>Inclus</Button>
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
      </>
      )}

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
