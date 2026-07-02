import { useEffect, useMemo, useState } from 'react'
import { FaEye, FaHandshake, FaCheckCircle, FaChartBar } from 'react-icons/fa'
import { useTindisaApi } from '../api/client'
import { Modal, Spinner } from './ui.jsx'

const PERIODS = [
  { d: 7, label: '7 j' },
  { d: 30, label: '30 j' },
  { d: 90, label: '90 j' },
]

/** Histogramme SVG des vues par jour (sans dépendance). */
function Histogram({ series }) {
  const max = Math.max(1, ...series.map((s) => s.views))
  const W = 520, H = 150, pad = 22
  const n = series.length
  const bw = n ? Math.max(2, (W - pad * 2) / n - 2) : 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="an-hist" preserveAspectRatio="none">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#eadfd4" />
      {series.map((s, i) => {
        const h = Math.round(((H - pad * 2) * s.views) / max)
        const x = pad + i * ((W - pad * 2) / Math.max(1, n)) + 1
        const y = H - pad - h
        return (
          <g key={s.day}>
            <rect x={x} y={y} width={bw} height={h} rx="2" fill="#C65D2E">
              <title>{s.day} : {s.views} vue(s)</title>
            </rect>
          </g>
        )
      })}
    </svg>
  )
}

function FunnelRow({ icon, label, value, rate }) {
  return (
    <div className="an-funnel-row">
      <span className="an-funnel-ic">{icon}</span>
      <span className="an-funnel-label">{label}</span>
      <span className="an-funnel-val">{value}</span>
      {rate != null && <span className="an-funnel-rate">{rate}%</span>}
    </div>
  )
}

export default function AnalyticsModal({ open, product, onClose }) {
  const api = useTindisaApi()
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!open || !product?.id) return
    let alive = true
    setLoading(true)
    api.get(`/v1/merchant/products/${product.id}/analytics?days=${days}`)
      .then((r) => alive && setData(r || null))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id, days])

  const f = data?.funnel || {}
  const totalViews = useMemo(
    () => (product?.views ?? 0),
    [product],
  )

  return (
    <Modal open={open} title={`Analytics — ${product?.name || ''}`} onClose={onClose}>
      <div className="an-periods">
        {PERIODS.map((p) => (
          <button key={p.d} className={`an-period${days === p.d ? ' active' : ''}`} onClick={() => setDays(p.d)}>
            {p.label}
          </button>
        ))}
        <span className="an-total"><FaEye /> {totalViews} vues au total</span>
      </div>

      {loading ? (
        <Spinner label="Chargement…" />
      ) : (
        <>
          <div className="an-section-title"><FaChartBar /> Vues par jour</div>
          {data?.series?.length ? (
            <Histogram series={data.series} />
          ) : (
            <p className="an-empty">Pas encore de données journalières — le suivi des vues par jour démarre maintenant. Reviens dans quelques jours pour voir la tendance 📈</p>
          )}

          <div className="an-section-title"><FaHandshake /> Conversion des leads ({days} j)</div>
          <div className="an-funnel">
            <FunnelRow icon={<FaEye />} label="Vues" value={f.views ?? 0} />
            <FunnelRow icon={<FaHandshake />} label="Offres reçues" value={f.offers ?? 0} rate={f.viewToOffer ?? 0} />
            <FunnelRow icon={<FaCheckCircle />} label="Ventes / acceptées" value={f.accepted ?? 0} rate={f.offerToSale ?? 0} />
          </div>
          <p className="an-hint">
            Taux vue→offre : <b>{f.viewToOffer ?? 0}%</b> · taux offre→vente : <b>{f.offerToSale ?? 0}%</b>.
            Optimisez photos, prix et description pour améliorer la conversion.
          </p>
        </>
      )}
    </Modal>
  )
}
