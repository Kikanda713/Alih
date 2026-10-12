import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaSlidersH, FaTimes, FaWhatsapp, FaSearch } from 'react-icons/fa'
import { Button, EmptyState } from '../../components/ui'
import { useTaxonomy } from '../../api/taxonomy'
import FiltersPanel from '../components/FiltersPanel'
import { ListingGrid } from '../components/ListingCard'
import BookingModal from '../components/BookingModal'
import { useListings } from '../lib/useListings'
import { activeUniverse, UNIVERSES } from '../lib/universes'
import IntentBar from '../components/IntentBar'
import UniverseRail from '../components/UniverseRail'
import ProsRail from '../components/ProsRail'
import { categoryLabel, cityLabel, subcategoryLabel } from '../lib/format'
import { whatsappLink } from '../lib/chat'

const FILTER_KEYS = ['q', 'type', 'category', 'subcategory', 'city', 'condition', 'priceMin', 'priceMax', 'currency', 'certified', 'sort']
const SORTS = [
  { id: '', label: 'Pertinence / récents' },
  { id: 'recent', label: 'Plus récents' },
  { id: 'price_asc', label: 'Prix croissant' },
  { id: 'price_desc', label: 'Prix décroissant' },
  { id: 'popular', label: 'Plus consultés' },
]

export default function ExplorePage() {
  const taxonomy = useTaxonomy()
  const [params, setParams] = useSearchParams()
  const [sheet, setSheet] = useState(false)
  const [booking, setBooking] = useState(null)

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || undefined]).filter(([, v]) => v))
  // Sans aucun filtre : vue d'ensemble multiservice (un rayon par intention), pas une grille plate.
  const overview = Object.keys(filters).length === 0
  const { items, total, hasMore, facets, loading, error, loadMore, retry } = useListings(filters, { enabled: !overview })
  const universe = activeUniverse(params)
  const q = params.get('q')

  useEffect(() => {
    document.title = q ? `${q} · Marché Tindisa` : `${universe?.title || 'Le marché'} · Tindisa`
  }, [q, universe])

  const setParam = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: false })
  }

  // Puces des filtres actifs (retirables une à une).
  const chips = []
  if (q) chips.push({ k: 'q', label: `« ${q} »` })
  if (params.get('type')) chips.push({ k: 'type', label: params.get('type') === 'service' ? 'Services' : 'Produits' })
  for (const c of (params.get('category') || '').split(',').filter(Boolean)) {
    chips.push({ k: 'category', v: c, label: categoryLabel(taxonomy, c) })
  }
  const firstCat = (params.get('category') || '').split(',')[0]
  for (const s of (params.get('subcategory') || '').split(',').filter(Boolean)) {
    chips.push({ k: 'subcategory', v: s, label: subcategoryLabel(taxonomy, firstCat, s) || s })
  }
  if (params.get('city')) chips.push({ k: 'city', label: cityLabel(taxonomy, params.get('city')) })
  if (params.get('condition')) chips.push({ k: 'condition', label: params.get('condition') === 'new' ? 'Neuf' : 'Occasion' })
  if (params.get('priceMin') || params.get('priceMax')) {
    const cur = params.get('currency') === 'CDF' ? 'FC' : '$'
    chips.push({ k: 'price', label: `${params.get('priceMin') || 0} à ${params.get('priceMax') || '∞'} ${cur}` })
  }
  if (params.get('certified')) chips.push({ k: 'certified', label: 'Certifiés' })

  const removeChip = (chip) => {
    if (chip.k === 'price') return setParam({ priceMin: '', priceMax: '', currency: '' })
    if (chip.v) {
      const rest = (params.get(chip.k) || '').split(',').filter((x) => x && x !== chip.v).join(',')
      return setParam({ [chip.k]: rest, ...(chip.k === 'category' ? { subcategory: '' } : {}) })
    }
    setParam({ [chip.k]: '' })
  }

  const askText = `Bonjour Tindisa, je cherche : ${q || universe?.title || 'un article'}${params.get('city') ? ` à ${cityLabel(taxonomy, params.get('city'))}` : ''}. Pouvez-vous m'aider à trouver et commander ?`

  if (overview) {
    return (
      <div className="mk-container mk-explore">
        <div className="mk-explore-head">
          <div>
            <h1>Le marché multiservice</h1>
            <p className="mk-muted">Que voulez-vous faire aujourd’hui ? Acheter, réserver, engager un artisan, faire livrer…</p>
          </div>
        </div>
        <IntentBar />
        {UNIVERSES.map((u) => <UniverseRail key={u.id} universe={u} onBook={setBooking} />)}
        <div className="mk-assist">
          <span>Vous ne trouvez pas ? L’assistant cherche aussi chez les vendeurs pas encore en ligne.</span>
          <a href={whatsappLink(askText)} target="_blank" rel="noopener noreferrer"><FaWhatsapp /> Demander sur WhatsApp</a>
        </div>
        {booking && <BookingModal item={booking} onClose={() => setBooking(null)} />}
      </div>
    )
  }

  return (
    <div className="mk-container mk-explore">
      <IntentBar active={universe} />
      <div className="mk-explore-head">
        <div>
          <h1>{q ? <>Résultats pour « {q} »</> : universe?.title || 'Tout le marché'}</h1>
          <p className="mk-muted">
            {loading && !items.length ? 'Recherche en cours…' : `${total} annonce${total > 1 ? 's' : ''}`}
            {universe && !q ? ` · ${universe.desc}` : ''}
          </p>
        </div>
        <div className="mk-explore-tools">
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm mk-show-md" onClick={() => setSheet(true)}>
            <FaSlidersH /> Filtres{chips.length ? ` (${chips.length})` : ''}
          </button>
          <select className="ui-input ui-select mk-sort" value={params.get('sort') || ''} onChange={(e) => setParam({ sort: e.target.value })} aria-label="Trier">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mk-active">
          {chips.map((c) => (
            <button key={`${c.k}-${c.v || ''}`} type="button" className="mk-chip active" onClick={() => removeChip(c)}>
              {c.label} <FaTimes />
            </button>
          ))}
          <button type="button" className="mk-link-btn" onClick={() => setParams(new URLSearchParams())}>Tout effacer</button>
        </div>
      )}

      {/* Main d'œuvre : profils de techniciens et artisans au-dessus des annonces. */}
      {universe?.id === 'main-oeuvre' && !q && <ProsRail city={params.get('city') || ''} />}

      <div className="mk-explore-body">
        <div className="mk-hide-md">
          <FiltersPanel key={params.toString()} params={params} setParam={setParam} facets={facets} />
        </div>

        <div className="mk-results">
          {error ? (
            <EmptyState icon={<FaSearch />} title="Le marché ne répond pas" text="Vérifiez votre connexion puis réessayez."
              action={<Button onClick={retry}>Réessayer</Button>} />
          ) : !loading && items.length === 0 ? (
            <EmptyState
              icon={<FaSearch />}
              title="Aucune annonce pour ces critères"
              text="Élargissez la recherche (autre ville, moins de filtres) ou demandez directement à l’assistant : il cherche aussi chez les vendeurs pas encore en ligne."
              action={(
                <div className="mk-empty-actions">
                  {chips.length > 0 && <Button variant="ghost" onClick={() => setParams(new URLSearchParams())}>Effacer les filtres</Button>}
                  <Button as="a" href={whatsappLink(askText)} target="_blank" rel="noopener noreferrer"><FaWhatsapp /> Demander sur WhatsApp</Button>
                </div>
              )}
            />
          ) : (
            <>
              <ListingGrid items={items} loading={loading} onBook={setBooking} />
              {hasMore && (
                <div className="mk-more">
                  <Button variant="secondary" onClick={loadMore} disabled={loading}>{loading ? 'Chargement…' : 'Voir plus d’annonces'}</Button>
                </div>
              )}
              <div className="mk-assist">
                <span>Vous ne trouvez pas exactement ce qu’il faut ?</span>
                <a href={whatsappLink(askText)} target="_blank" rel="noopener noreferrer"><FaWhatsapp /> L’assistant cherche pour vous</a>
              </div>
            </>
          )}
        </div>
      </div>

      {sheet && (
        <div className="mk-drawer-overlay" onMouseDown={() => setSheet(false)}>
          <div onMouseDown={(e) => e.stopPropagation()}>
            <FiltersPanel key={params.toString()} sheet params={params} setParam={setParam} facets={facets} onClose={() => setSheet(false)} />
          </div>
        </div>
      )}
      {booking && <BookingModal item={booking} onClose={() => setBooking(null)} />}
    </div>
  )
}
