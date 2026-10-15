import { Link } from 'react-router-dom'
import { FaStore, FaMapMarkerAlt } from 'react-icons/fa'
import { useLoad } from '../../api/useLoad'
import { useTaxonomy } from '../../api/taxonomy'
import { marketApi } from '../lib/api'
import { imageUrl, cityLabel } from '../lib/format'
import { cashDiffText, txt, usd } from '../lib/bata'

/**
 * Biens comparables du marché pour un BATA : même famille, classés du plus proche
 * au plus éloigné en valeur (marques et modèles différents compris). Aucune donnée
 * de propriétaire : seulement le lien de l'annonce.
 */
export default function BataComparables({ family = 'vehicule', value, city, exclude, limit = 6, title, compact = false }) {
  const taxonomy = useTaxonomy()
  const v = Number(value)
  const { data, loading } = useLoad(
    () => marketApi.bataComparables({ family, value: Number.isFinite(v) && v > 0 ? Math.round(v) : undefined, city, limit: limit + 1 }).catch(() => null),
    [family, v, city, limit],
  )
  const items = (Array.isArray(data?.items) ? data.items : [])
    .filter((i) => i && typeof i === 'object' && txt(i.productId) !== txt(exclude))
    .slice(0, limit)
  if (loading && !items.length) return null
  if (!items.length) return null
  const hasValue = Number.isFinite(v) && v > 0
  return (
    <section className={`mk-bata-comp${compact ? ' mk-bata-comp-compact' : ''}`} aria-label={title || 'Biens comparables'}>
      <h2>{title || (family === 'appareil' ? 'Appareils comparables sur le marché' : 'Véhicules comparables sur le marché')}</h2>
      <ul>
        {items.map((it, i) => {
          const img = imageUrl(txt(it.image), 160)
          const id = txt(it.productId)
          const diff = hasValue ? cashDiffText(it.cashDifferenceUsd) : ''
          return (
            <li key={id || i}>
              <Link to={id ? `/annonce/${id}` : '/bata'}>
                <span className="mk-bata-comp-img">{img ? <img src={img} alt="" loading="lazy" /> : <FaStore />}</span>
                <span className="mk-bata-comp-body">
                  <strong>{txt(it.name) || 'Bien'}</strong>
                  <span className="mk-muted">
                    {[usd(it.valueUsd), txt(it.summary)].filter(Boolean).join(' · ')}
                  </span>
                  <span className="mk-bata-comp-meta">
                    {hasValue && txt(it.tier) && <span className={`mk-tag mk-tier-${it.tierRank || 5}`}>{txt(it.tier)}</span>}
                    {it.kind === 'bata_offer' && <span className="mk-tag mk-tag-bata">BATA</span>}
                    {it.certified && <span className="mk-tag mk-tag-cert">Certifié</span>}
                    {txt(it.city) && <span><FaMapMarkerAlt /> {cityLabel(taxonomy, txt(it.city))}</span>}
                  </span>
                  {diff && <span className="mk-bata-comp-diff">{diff}</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
