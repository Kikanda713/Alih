import { useState } from 'react'
import { Modal, Button, Field, Input, Spinner } from './ui.jsx'
import { useTindisaApi } from '../api/client'
import { useToast } from './Toast.jsx'
import { useT } from '../i18n/index.jsx'
import mpesa from '../assets/MPESA.png'
import airtel from '../assets/AIRTEL.png'
import orange from '../assets/ORANGE.png'

// Opérateurs -> codes telecom SerdiPay
const OPERATORS = [
  { code: 'MP', name: 'M-Pesa', logo: mpesa },
  { code: 'AM', name: 'Airtel Money', logo: airtel },
  { code: 'OM', name: 'Orange Money', logo: orange },
]

/**
 * Paiement Mobile Money d'un abonnement. Choix opérateur + téléphone -> /pay.
 * Le paiement réel est encaissé par Wanzo (SerdiPay) ; on attend la confirmation
 * (PIN) puis le callback relayé qui active l'abonnement -> on sonde le statut.
 */
export default function PaymentModal({ open, plan, amount, onClose, onDone, variant = 'subscription' }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const { t } = useT()
  const [telecom, setTelecom] = useState('MP')
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState('form')
  const [busy, setBusy] = useState(false)
  const isFees = variant === 'fees'

  const poll = async () => {
    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 2500))
      try {
        if (isFees) {
          const c = await api.get('/v1/merchant/commissions')
          if (Number(c?.owedUsd || 0) === 0) {
            notify(t('pay.success'), 'success')
            onDone?.()
            onClose?.()
            return
          }
        } else {
          const s = await api.get('/v1/merchant/subscription')
          const st = s?.subscription?.status
          if (st === 'active' || st === 'trialing') {
            notify(t('pay.success'), 'success')
            onDone?.()
            onClose?.()
            return
          }
          if (st === 'payment_failed') {
            notify(t('pay.failed'), 'error')
            setStep('form')
            setBusy(false)
            return
          }
        }
      } catch { /* continue polling */ }
    }
    notify(t('pay.timeout'), 'info')
    onDone?.()
    onClose?.()
  }

  const pay = async () => {
    if (!phone.trim()) return notify(t('pay.phoneRequired'), 'error')
    setBusy(true)
    try {
      const r = isFees
        ? await api.post('/v1/merchant/commissions/pay', { phone: phone.trim(), telecom })
        : await api.post('/v1/merchant/subscription/pay', {
            plan,
            phone: phone.trim(),
            telecom,
          })
      if (r?.status === 'failed') {
        notify(r?.message || t('pay.failed'), 'error')
        setBusy(false)
        return
      }
      setStep('pending')
      poll()
    } catch (e) {
      notify(e?.message || t('merchant.error'), 'error')
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={t('pay.title')} onClose={busy ? undefined : onClose}>
      {step === 'form' ? (
        <div className="pay-form">
          <p className="pay-amount">{t('pay.amount', { amount })}</p>
          <span className="ui-field-label">{t('pay.operator')}</span>
          <div className="pay-operators">
            {OPERATORS.map((o) => (
              <button
                key={o.code}
                type="button"
                className={`pay-op${telecom === o.code ? ' active' : ''}`}
                onClick={() => setTelecom(o.code)}
              >
                <img src={o.logo} alt={o.name} />
                <span>{o.name}</span>
              </button>
            ))}
          </div>
          <Field label={t('pay.phone')} hint={t('pay.phoneHint')}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2439XXXXXXXX" inputMode="tel" />
          </Field>
          <div className="ui-modal-foot">
            <Button variant="ghost" onClick={onClose} disabled={busy}>{t('form.cancel')}</Button>
            <Button variant="primary" onClick={pay} disabled={busy}>{t('pay.pay')}</Button>
          </div>
        </div>
      ) : (
        <div className="pay-pending">
          <Spinner label={t('pay.pending')} />
          <p className="pay-pending-hint">{t('pay.pendingHint')}</p>
        </div>
      )}
    </Modal>
  )
}
