import { useEffect, useState, useCallback } from 'react'
import { FaHandshake } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Spinner, EmptyState, Badge } from '../../components/ui.jsx'

const STATUS_TONE = {
  ACCEPTED: 'success',
  PENDING: 'warn',
  NEGOTIATING: 'warn',
  REJECTED: 'danger',
  EXPIRED: 'neutral',
}

function fmtPrice(v, currency = 'CDF') {
  if (v == null) return '—'
  const n = Number(v)
  return Number.isNaN(n) ? '—' : `${n.toLocaleString('fr-FR')} ${currency}`
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

export default function VentesPage() {
  const api = useTindisaApi()
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/v1/merchant/offers')
      setOffers(r?.offers || [])
    } catch {
      setOffers([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">{t('sales.title')}</h1>
        <p className="dash-sub">{t('sales.subtitle')}</p>
      </header>

      {loading ? (
        <Spinner label={t('cat.loading')} />
      ) : offers.length === 0 ? (
        <EmptyState icon={<FaHandshake />} title={t('sales.empty.title')} text={t('sales.empty.text')} />
      ) : (
        <div className="cat-table-wrap">
          <table className="cat-table">
            <thead>
              <tr>
                <th>{t('sales.col.date')}</th>
                <th>{t('sales.col.product')}</th>
                <th>{t('sales.col.offer')}</th>
                <th>{t('sales.col.counter')}</th>
                <th>{t('sales.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>{fmtDate(o.createdAt)}</td>
                  <td><span className="cat-sku">{String(o.productId).slice(0, 8)}…</span></td>
                  <td>{fmtPrice(o.buyerOffer, o.currency)}</td>
                  <td>{fmtPrice(o.counterOffer, o.currency)}</td>
                  <td><Badge tone={STATUS_TONE[o.status] || 'neutral'}>{t(`sales.status.${o.status}`)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
