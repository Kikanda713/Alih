import { useEffect, useState, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { FaFileInvoiceDollar, FaDownload, FaWallet } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Badge, Spinner, EmptyState } from '../../components/ui.jsx'
import { usePaged, Pagination } from '../../components/Pagination.jsx'
import { planById } from '../../data/plans'
import { downloadInvoice, invoiceRef } from '../../utils/invoice'

const TONE = {
  success: 'success', active: 'success', trialing: 'warn', pending: 'warn',
  failed: 'danger', cancelled: 'danger', expired: 'neutral',
}
const STATUS_LABEL = {
  success: 'Payé', pending: 'En attente', failed: 'Échoué',
  active: 'Actif', trialing: 'Essai', cancelled: 'Annulé', expired: 'Expiré',
}

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) } catch { return '—' }
}

/**
 * FACTURATION — historique des factures/reçus (abonnements legacy + règlements de
 * commission). Le paiement des frais et le solde vivent dans le Wallet (pas de
 * doublon ici) ; cette page centralise les DOCUMENTS téléchargeables.
 */
export default function SubscriptionPage() {
  const api = useTindisaApi()
  const { t } = useT()
  const { user } = useAuth0()
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])
  const { pageItems, page, setPage, totalPages, count } = usePaged(invoices, 10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [subRes, feeRes] = await Promise.all([
        api.get('/v1/merchant/subscription').catch(() => null),
        api.get('/v1/merchant/commissions/payments').catch(() => []),
      ])
      const list = []
      const sub = subRes?.subscription
      // Abonnement payant (legacy / futur premium) → une facture.
      if (sub && sub.plan && sub.plan !== 'free' &&
          (['active', 'trialing'].includes(sub.status) || Number(sub.priceUsd) > 0)) {
        list.push({
          ref: invoiceRef(sub),
          date: sub.currentPeriodEnd || sub.updatedAt || sub.createdAt,
          type: 'Abonnement',
          label: planById(sub.plan)?.name || sub.plan,
          amount: Number(sub.priceUsd) || 0,
          status: sub.status,
          trial: sub.status === 'trialing',
          method: sub.telecom ? `Mobile Money (${sub.telecom})` : '—',
        })
      }
      // Règlements de frais de commission → reçus.
      for (const fp of Array.isArray(feeRes) ? feeRes : []) {
        list.push({
          ref: `FEE-${String(fp.id || '').slice(0, 8).toUpperCase()}`,
          date: fp.settledAt || fp.createdAt,
          type: 'Commission',
          label: 'Frais de commission',
          amount: Number(fp.amountUsd) || 0,
          status: fp.status,
          method: 'Mobile Money',
        })
      }
      list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      setInvoices(list)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const getInvoice = (p) => downloadInvoice({
    ref: p.ref,
    dateStr: fmtDate(p.date),
    clientName: user?.name || user?.email || 'Client Tindisa',
    paidBy: user?.name || user?.email || '',
    planName: `${p.type} — ${p.label}`,
    priceTtc: p.amount,
    status: p.trial ? 'Essai' : (STATUS_LABEL[p.status] || p.status),
    method: p.method,
  })

  if (loading) return <div className="dash-page"><Spinner label={t('cat.loading')} /></div>

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">Facturation</h1>
        <p className="dash-sub">Vos factures et reçus (abonnements et règlements de commission).</p>
      </header>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<FaFileInvoiceDollar />}
          title="Aucune facture"
          text="Vos factures et reçus apparaîtront ici après votre premier règlement (commission ou abonnement)."
        />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th className="cat-col-actions">Facture</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.ref}>
                    <td><span className="cat-pname">{p.ref}</span></td>
                    <td>{fmtDate(p.date)}</td>
                    <td>{p.type} <small>({p.label})</small></td>
                    <td>{p.amount} $</td>
                    <td><Badge tone={TONE[p.status] || 'neutral'}>{STATUS_LABEL[p.status] || p.status}</Badge></td>
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
          <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
        </>
      )}

      <p className="sub-note">
        <FaWallet />&nbsp;Pour régler vos frais de commission, rendez-vous dans votre <Link to="/dashboard/wallet">Wallet</Link>.
      </p>
    </div>
  )
}
