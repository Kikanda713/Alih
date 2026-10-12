import { useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { useTaxonomy } from '../../api/taxonomy'
import { cityLabel } from '../lib/format'

/*
 * Filtres du marché, pilotés par l'URL (?type=&category=&subcategory=&city=…).
 * `facets` (comptes serveur) montre ce qui existe réellement. Sur mobile, le
 * panneau s'affiche en feuille basse (prop `sheet`).
 */
export default function FiltersPanel({ params, setParam, facets, sheet = false, onClose }) {
  const taxonomy = useTaxonomy()
  const type = params.get('type') || ''
  const selectedCats = (params.get('category') || '').split(',').filter(Boolean)
  const selectedSubs = (params.get('subcategory') || '').split(',').filter(Boolean)
  const [pmin, setPmin] = useState(params.get('priceMin') || '')
  const [pmax, setPmax] = useState(params.get('priceMax') || '')
  const currency = params.get('currency') || 'USD'

  const catCounts = new Map((facets?.categories || []).map((f) => [f.id, f.count]))
  const cityCounts = facets?.cities || []
  const typeCounts = new Map((facets?.types || []).map((f) => [f.id, f.count]))

  // Catégories proposées : celles du type choisi ; celles ayant des annonces d'abord.
  const cats = (taxonomy?.categories || [])
    .filter((c) => !type || c.itemType === type)
    .map((c) => ({ ...c, count: catCounts.get(c.id) || 0 }))
    .sort((a, b) => (b.count > 0) - (a.count > 0))

  const toggleCat = (id) => {
    const next = selectedCats.includes(id) ? selectedCats.filter((c) => c !== id) : [...selectedCats, id]
    setParam({ category: next.join(','), subcategory: '' })
  }
  const toggleSub = (id) => {
    const next = selectedSubs.includes(id) ? selectedSubs.filter((s) => s !== id) : [...selectedSubs, id]
    setParam({ subcategory: next.join(',') })
  }
  const subs = selectedCats.length === 1
    ? (taxonomy?.categories || []).find((c) => c.id === selectedCats[0])?.subcategories || []
    : []

  const applyPrice = (e) => {
    e.preventDefault()
    setParam({ priceMin: pmin, priceMax: pmax, currency: pmin || pmax ? currency : '' })
  }

  return (
    <aside className={`mk-filters${sheet ? ' mk-filters-sheet' : ''}`} aria-label="Filtres">
      {sheet && (
        <div className="mk-filters-head">
          <h2>Filtres</h2>
          <button type="button" className="mk-icon-btn" onClick={onClose} aria-label="Fermer"><FaTimes /></button>
        </div>
      )}

      <section className="mk-fsec">
        <h3>Type d’offre</h3>
        <div className="mk-seg">
          {[['', 'Tout'], ['product', 'Produits'], ['service', 'Services']].map(([id, label]) => (
            <button key={id || 'all'} type="button" className={type === id ? 'active' : ''}
              onClick={() => setParam({ type: id, category: '', subcategory: '' })}>
              {label}{id && typeCounts.get(id) != null ? <small> {typeCounts.get(id)}</small> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="mk-fsec">
        <h3>Catégories</h3>
        <div className="mk-checklist">
          {cats.map((c) => (
            <label key={c.id} className={`mk-check${c.count === 0 ? ' mk-check-empty' : ''}`}>
              <input type="checkbox" checked={selectedCats.includes(c.id)} onChange={() => toggleCat(c.id)} />
              <span>{c.label}</span>
              {c.count > 0 && <small>{c.count}</small>}
            </label>
          ))}
        </div>
      </section>

      {subs.length > 0 && (
        <section className="mk-fsec">
          <h3>Précisez</h3>
          <div className="mk-chips">
            {subs.map((s) => (
              <button key={s.id} type="button" className={`mk-chip${selectedSubs.includes(s.id) ? ' active' : ''}`} onClick={() => toggleSub(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mk-fsec">
        <h3>Ville</h3>
        <select className="ui-input ui-select" value={params.get('city') || ''} onChange={(e) => setParam({ city: e.target.value })}>
          <option value="">Toute la RDC</option>
          {(taxonomy?.cities || []).map((c) => {
            const n = cityCounts.find((f) => f.id === c.id)?.count
            return <option key={c.id} value={c.id}>{c.name}{n ? ` (${n})` : ''}</option>
          })}
        </select>
        {cityCounts.length > 0 && !params.get('city') && (
          <div className="mk-chips mk-chips-tight">
            {cityCounts.slice(0, 6).map((f) => (
              <button key={f.id} type="button" className="mk-chip" onClick={() => setParam({ city: f.id })}>
                {cityLabel(taxonomy, f.id)} <small>{f.count}</small>
              </button>
            ))}
          </div>
        )}
      </section>

      {type !== 'service' && (
        <section className="mk-fsec">
          <h3>État</h3>
          <div className="mk-seg">
            {[['', 'Tous'], ['new', 'Neuf'], ['used', 'Occasion']].map(([id, label]) => (
              <button key={id || 'all'} type="button" className={(params.get('condition') || '') === id ? 'active' : ''}
                onClick={() => setParam({ condition: id })}>{label}</button>
            ))}
          </div>
        </section>
      )}

      <section className="mk-fsec">
        <h3>Budget</h3>
        <form className="mk-price" onSubmit={applyPrice}>
          <input className="ui-input" inputMode="numeric" placeholder="Min" value={pmin} onChange={(e) => setPmin(e.target.value.replace(/[^\d]/g, ''))} aria-label="Prix minimum" />
          <input className="ui-input" inputMode="numeric" placeholder="Max" value={pmax} onChange={(e) => setPmax(e.target.value.replace(/[^\d]/g, ''))} aria-label="Prix maximum" />
          <select className="ui-input ui-select" value={currency} onChange={(e) => setParam({ currency: e.target.value })} aria-label="Devise">
            <option value="USD">$</option>
            <option value="CDF">FC</option>
          </select>
          <button type="submit" className="ui-btn ui-btn-secondary ui-btn-sm">OK</button>
        </form>
      </section>

      <section className="mk-fsec">
        <label className="mk-check">
          <input type="checkbox" checked={params.get('certified') === '1'} onChange={(e) => setParam({ certified: e.target.checked ? '1' : '' })} />
          <span>Uniquement les articles certifiés</span>
        </label>
      </section>

      {sheet && (
        <div className="mk-filters-foot">
          <button type="button" className="ui-btn ui-btn-primary mk-btn-block" onClick={onClose}>Voir les résultats</button>
        </div>
      )}
    </aside>
  )
}
