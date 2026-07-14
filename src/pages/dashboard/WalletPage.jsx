import { useEffect, useState, useCallback } from 'react'
import { FaWallet, FaArrowDown, FaArrowUp, FaMoneyBillWave } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Card, Spinner, EmptyState, Button } from '../../components/ui.jsx'
import { usePaged, Pagination } from '../../components/Pagination.jsx'
import PaymentModal from '../../components/PaymentModal.jsx'

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
  const [wallet, setWallet] = useState({ balances: [], transactions: [] })
  const [fees, setFees] = useState(null)
  const [payFees, setPayFees] = useState(false)
  const { pageItems, page, setPage, totalPages, count } = usePaged(wallet.transactions, 10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, cf] = await Promise.all([
        api.get('/v1/merchant/wallet'),
        api.get('/v1/merchant/commissions').catch(() => null),
      ])
      const balances = Array.isArray(r?.balances) && r.balances.length
        ? r.balances
        : (r?.balance != null ? [{ currency: r.currency || 'CDF', balance: r.balance }] : [])
      setWallet({ balances, transactions: r?.transactions || [] })
      setFees(cf)
    } catch {
      setWallet({ balances: [], transactions: [] })
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

      <div className="wallet-balances">
        {(wallet.balances.length ? wallet.balances : [{ currency: 'CDF', balance: 0 }]).map((b) => (
          <Card className="wallet-balance" key={b.currency}>
            <div className="wallet-balance-icon"><FaWallet /></div>
            <div>
              <span className="wallet-balance-label">{t('wallet.balance')} ({b.currency})</span>
              <span className="wallet-balance-value">{fmt(b.balance, b.currency)}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Frais de commission cumulés (modèle pay-as-you-sell) */}
      {fees && (() => {
        const owed = Number(fees.owedUsd || 0)
        const th = fees.thresholds || { pay: 10, remind: 20, block: 50 }
        const status = fees.status || 'ok'
        const cls = status === 'blocked' ? 'danger' : status === 'reminder' ? 'warn' : status === 'due' ? 'info' : 'ok'
        const msg = status === 'blocked'
          ? `Compte bloqué : vos frais (${owed} $) dépassent ${th.block} $. Réglez-les par mobile money pour réactiver la vente.`
          : status === 'reminder'
            ? `Rappel : vous devez ${owed} $ de frais de commission. Merci de régler (blocage à ${th.block} $).`
            : status === 'due'
              ? `Vous devez ${owed} $ de frais. Vous pouvez déjà régler (versement dès ${th.pay} $).`
              : `Frais de commission cumulés : ${owed} $. Rien à verser tant que vous êtes sous ${th.pay} $.`
        return (
          <Card className={`wallet-fees wallet-fees-${cls}`}>
            <div className="wallet-fees-head">
              <span><FaMoneyBillWave /> Frais de commission</span>
              <b>{owed.toLocaleString('fr-FR')} $ dus</b>
            </div>
            <p className="wallet-fees-msg">{msg}</p>
            <p className="wallet-fees-note">Commission sur ventes conclues : 10% (0-10$), 3% (10-100$), 2% (100-1000$), 1,5% (1000-10000$), 0,5% (au-delà). {fees.paidUsd ? `Déjà réglé : ${fees.paidUsd} $.` : ''}</p>
            {owed >= (th.pay || 10) && (
              <div className="wallet-fees-actions">
                <Button variant="primary" onClick={() => setPayFees(true)}>Régler mes frais ({owed} $)</Button>
              </div>
            )}
          </Card>
        )
      })()}

      <PaymentModal
        open={payFees}
        variant="fees"
        amount={Number(fees?.owedUsd || 0)}
        onClose={() => setPayFees(false)}
        onDone={load}
      />

      <div>
        <h2 className="dash-h2 wallet-tx-title">{t('wallet.history')}</h2>
        {wallet.transactions.length === 0 ? (
          <EmptyState icon={<FaMoneyBillWave />} title={t('wallet.empty.title')} text={t('wallet.empty.text')} />
        ) : (
          <>
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
                {pageItems.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className={`wallet-tx-icon ${isCredit(tx.type) ? 'credit' : 'debit'}`}>
                        {isCredit(tx.type) ? <FaArrowDown /> : <FaArrowUp />}
                      </span>
                    </td>
                    <td>{tx.description || (isCredit(tx.type) ? t('wallet.credit') : t('wallet.debit'))}</td>
                    <td>{fmtDate(tx.createdAt)}</td>
                    <td className={isCredit(tx.type) ? 'wallet-amount-credit' : 'wallet-amount-debit'}>
                      {isCredit(tx.type) ? '+' : '−'} {fmt(tx.amount, tx.currency || 'CDF')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
