import { useEffect, useState, useCallback } from 'react'
import { FaWallet, FaArrowDown, FaArrowUp, FaMoneyBillWave } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Card, Spinner, EmptyState } from '../../components/ui.jsx'

function fmt(v, currency = 'CDF') {
  const n = Number(v)
  return Number.isNaN(n) ? '—' : `${n.toLocaleString('fr-FR')} ${currency}`
}
function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) } catch { return '—' }
}
function isCredit(type) {
  return String(type || '').toUpperCase().includes('CREDIT')
}

export default function WalletPage() {
  const api = useTindisaApi()
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState({ balance: 0, currency: 'CDF', transactions: [] })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/v1/merchant/wallet')
      setWallet({ balance: r?.balance ?? 0, currency: r?.currency || 'CDF', transactions: r?.transactions || [] })
    } catch {
      setWallet({ balance: 0, currency: 'CDF', transactions: [] })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="dash-page">
        <header className="dash-page-head"><h1 className="dash-h1">{t('wallet.title')}</h1></header>
        <Spinner label={t('cat.loading')} />
      </div>
    )
  }

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">{t('wallet.title')}</h1>
        <p className="dash-sub">{t('wallet.subtitle')}</p>
      </header>

      <Card className="wallet-balance">
        <div className="wallet-balance-icon"><FaWallet /></div>
        <div>
          <span className="wallet-balance-label">{t('wallet.balance')}</span>
          <span className="wallet-balance-value">{fmt(wallet.balance, wallet.currency)}</span>
        </div>
      </Card>

      <div>
        <h2 className="dash-h2 wallet-tx-title">{t('wallet.history')}</h2>
        {wallet.transactions.length === 0 ? (
          <EmptyState icon={<FaMoneyBillWave />} title={t('wallet.empty.title')} text={t('wallet.empty.text')} />
        ) : (
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  <th className="cat-col-img"></th>
                  <th>{t('wallet.col.label')}</th>
                  <th>{t('wallet.col.date')}</th>
                  <th>{t('wallet.col.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className={`wallet-tx-icon ${isCredit(tx.type) ? 'credit' : 'debit'}`}>
                        {isCredit(tx.type) ? <FaArrowDown /> : <FaArrowUp />}
                      </span>
                    </td>
                    <td>{tx.description || (isCredit(tx.type) ? t('wallet.credit') : t('wallet.debit'))}</td>
                    <td>{fmtDate(tx.createdAt)}</td>
                    <td className={isCredit(tx.type) ? 'wallet-amount-credit' : 'wallet-amount-debit'}>
                      {isCredit(tx.type) ? '+' : '−'} {fmt(tx.amount, wallet.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
