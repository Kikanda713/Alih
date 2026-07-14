import { useEffect, useState, useCallback } from 'react'
import { FaPercent } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { Badge, Spinner, EmptyState } from '../../components/ui.jsx'
import { usePaged, Pagination } from '../../components/Pagination.jsx'

const TONE = { ok: 'neutral', due: 'warn', reminder: 'warn', blocked: 'danger' }
const LABEL = { ok: 'OK', due: 'À verser', reminder: 'Rappel', blocked: 'Bloqué' }
const usd = (v) => `${Number(v || 0).toLocaleString('fr-FR')} $`
const mask = (id) => (id && id.length > 12 ? `…${id.slice(-8)}` : id || '—')

export default function AdminCommissions() {
  const api = useTindisaApi()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const { pageItems, page, setPage, totalPages, count } = usePaged(data?.sellers || [], 12)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.get('/v1/admin/commissions'))
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="dash-page">
        <header className="dash-page-head"><h1 className="dash-h1">Commissions</h1></header>
        <Spinner label="Chargement…" />
      </div>
    )
  }

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">Commissions</h1>
        <p className="dash-sub">Suivi des commissions sur ventes conclues (modèle pay-as-you-sell).</p>
      </header>

      <div className="admin-subs-summary">
        <div className="admin-sub-card"><div className="admin-sub-plan">Volume vendu (GMV)</div><div className="admin-sub-total">{usd(data?.gmvUsd)}</div><div className="admin-sub-meta">{data?.salesCount || 0} ventes</div></div>
        <div className="admin-sub-card"><div className="admin-sub-plan">Commission totale</div><div className="admin-sub-total">{usd(data?.totalCommissionUsd)}</div></div>
        <div className="admin-sub-card total"><div className="admin-sub-plan">Dus (non réglés)</div><div className="admin-sub-total">{usd(data?.totalOwedUsd)}</div><div className="admin-sub-meta">Réglés : {usd(data?.totalPaidUsd)}</div></div>
      </div>

      {!data?.sellers?.length ? (
        <EmptyState icon={<FaPercent />} title="Aucune commission" text="Les commissions apparaîtront à mesure des ventes confirmées." />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr><th>Vendeur</th><th>Ventes</th><th>Dus</th><th>Réglés</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {pageItems.map((s) => (
                  <tr key={s.sellerId}>
                    <td title={s.sellerId}>{mask(s.sellerId)}</td>
                    <td>{s.sales}</td>
                    <td className={s.owedUsd > 0 ? 'wallet-amount-debit' : ''}>{usd(s.owedUsd)}</td>
                    <td>{usd(s.paidUsd)}</td>
                    <td><Badge tone={TONE[s.status] || 'neutral'}>{LABEL[s.status] || s.status}</Badge></td>
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
