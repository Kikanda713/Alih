import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaAward, FaMapMarkerAlt, FaTools, FaUserCircle } from 'react-icons/fa'
import { useTaxonomy } from '../../api/taxonomy'
import { useLoad } from '../../api/useLoad'
import { marketApi } from '../lib/api'
import { imageUrl, cityLabel } from '../lib/format'

/** Carte d'un technicien / artisan (profil pro) : renvoie vers sa page publique. */
export function ProCard({ pro }) {
  const taxonomy = useTaxonomy()
  const img = imageUrl(pro.photo || pro.logoUrl, 420)
  const trades = (pro.trades || []).map((t) => (typeof t === 'string' ? t : t.label)).filter(Boolean)
  const place = [pro.commune, cityLabel(taxonomy, pro.city)].filter(Boolean).join(', ')
  return (
    <Link to={`/boutique/${pro.shopId}`} className="mk-pro-card">
      <div className="mk-pro-card-media">
        {img ? <img src={img} alt="" loading="lazy" /> : <span className="mk-card-noimg"><FaUserCircle /></span>}
        {pro.certified && <span className="mk-tag mk-tag-cert"><FaAward /> Certifié</span>}
      </div>
      <div className="mk-pro-card-body">
        <h3>{pro.name}</h3>
        {trades.length > 0 && <p className="mk-pro-card-trades">{trades.join(' · ')}</p>}
        <p className="mk-pro-card-meta">
          {place && <span><FaMapMarkerAlt /> {place}</span>}
          {pro.experienceYears > 0 && <span>{pro.experienceYears} an{pro.experienceYears > 1 ? 's' : ''} d’exp.</span>}
          {pro.available === false && <span className="mk-pro-off">Indisponible</span>}
        </p>
      </div>
    </Link>
  )
}

const PAGE = 12

/**
 * Techniciens et artisans (univers « Main d'œuvre ») : GET /v1/market/pros,
 * filtre par métier ; la ville suit le filtre courant du marché.
 * Masqué si la route ne répond pas ou s'il n'y a encore personne (sans filtre).
 */
export default function ProsRail({ city }) {
  const taxonomy = useTaxonomy()
  const [trade, setTrade] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const { data, loading, error } = useLoad(
    () => marketApi.pros({ trade: trade || undefined, city: city || undefined, limit }),
    [trade, city || '', limit],
  )
  const items = data?.items || []
  if (error || (!loading && !items.length && !trade)) return null
  const trades = taxonomy?.trades || []

  return (
    <section className="mk-rail-section mk-pros">
      <div className="mk-rail-head">
        <h2><span className="mk-rail-ic"><FaTools /></span> Techniciens et artisans{city ? ` à ${cityLabel(taxonomy, city)}` : ''}</h2>
        {trades.length > 0 && (
          <select className="ui-input ui-select mk-pros-filter" value={trade} aria-label="Métier"
            onChange={(e) => { setTrade(e.target.value); setLimit(PAGE) }}>
            <option value="">Tous les métiers</option>
            {trades.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        )}
      </div>
      {loading && !items.length ? (
        <div className="mk-pros-grid" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mk-pro-card mk-skel" />)}
        </div>
      ) : !items.length ? (
        <p className="mk-muted">Aucun profil pour ce métier pour l’instant. L’assistant peut chercher pour vous sur WhatsApp.</p>
      ) : (
        <>
          <div className="mk-pros-grid">{items.map((p) => <ProCard key={p.shopId} pro={p} />)}</div>
          {data?.hasMore && (
            <div className="mk-more">
              <button type="button" className="ui-btn ui-btn-secondary" disabled={loading} onClick={() => setLimit((n) => n + PAGE)}>
                {loading ? 'Chargement…' : 'Voir plus de profils'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
