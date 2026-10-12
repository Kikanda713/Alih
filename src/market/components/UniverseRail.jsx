import { Link } from 'react-router-dom'
import { FaArrowRight } from 'react-icons/fa'
import { ListingGrid } from './ListingCard'
import { useListings } from '../lib/useListings'
import { universeHref } from '../lib/universes'

/**
 * Rayon horizontal d'annonces réelles (un univers ou un tri). Masqué s'il est vide
 * ou en erreur : la page ne montre jamais de rayon creux.
 */
export default function UniverseRail({ universe, title, params, href, onBook, limit = 8 }) {
  const query = { ...(universe?.params || params), facets: '0' }
  const { items, loading, error } = useListings(query, { limit })
  if (error || (!loading && items.length === 0)) return null
  return (
    <section className="mk-rail-section">
      <div className="mk-rail-head">
        <h2>
          {universe?.verb && <span className="mk-rail-verb"><universe.icon /> {universe.verb}</span>}
          {title || universe?.title}
        </h2>
        <Link to={href || universeHref(universe)}>Tout voir <FaArrowRight /></Link>
      </div>
      <ListingGrid items={items} loading={loading} onBook={onBook} skeleton={4} className="mk-grid-rail" />
    </section>
  )
}
