import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../market/components/SearchBar'
import { UNIVERSES, universeHref } from '../market/lib/universes'
import { marketApi } from '../market/lib/api'

const SUGGESTIONS = [
  ['Chambre d’hôtel', { q: 'chambre', type: 'service' }],
  ['Salle de conférence', { q: 'salle' }],
  ['Ciment', { q: 'ciment' }],
  ['Maçon', { q: 'maçon' }],
  ['Haricots', { q: 'haricot' }],
  ['Smartphone', { q: 'téléphone' }],
  ['Livraison', { category: 'transport-logistique' }],
]

const nf = new Intl.NumberFormat('fr-FR')

/*
 * Hero du marché : la recherche est la zone centrale. Dessous, les univers
 * (portes d'entrée) et des chiffres RÉELS du catalogue (pas de compteurs fictifs).
 */
export default function HomeHero() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    let alive = true
    marketApi.stats().then((s) => alive && setStats(s)).catch(() => {})
    return () => { alive = false }
  }, [])

  return (
    <section className="mk-hero" id="home">
      <div className="mk-hero-pattern" aria-hidden="true" />
      <div className="mk-container mk-hero-inner">
        <p className="mk-eyebrow">Le marché du Congo, en ligne et dans votre messagerie</p>
        <h1 className="mk-hero-title">
          Trouvez tout. <span>Concluez par message.</span>
        </h1>
        <p className="mk-hero-sub">
          Produits, hôtels et salles, main d’œuvre, livraison, récoltes : comparez ici, puis l’assistant Tindisa
          négocie, sécurise le paiement et organise la livraison sur WhatsApp ou Telegram.
        </p>
        <div className="mk-hero-search">
          <SearchBar size="lg" />
        </div>
        <div className="mk-suggest">
          <span>Populaire :</span>
          {SUGGESTIONS.map(([label, p]) => (
            <Link key={label} to={`/marche?${new URLSearchParams(p)}`} className="mk-chip">{label}</Link>
          ))}
        </div>

        <div className="mk-universes">
          {UNIVERSES.map((u) => (
            <Link key={u.id} to={universeHref(u)} className={`mk-universe mk-u-${u.id}`}>
              <span className="mk-universe-ic"><u.icon /></span>
              <span className="mk-universe-tx"><b>{u.title}</b><small>{u.desc}</small></span>
            </Link>
          ))}
        </div>

        {stats && stats.listings > 0 && (
          <div className="mk-stats" aria-label="Le marché en chiffres">
            <div><strong>{nf.format(stats.products)}</strong><span>produits</span></div>
            <div><strong>{nf.format(stats.services)}</strong><span>services et réservations</span></div>
            <div><strong>{nf.format(stats.shops)}</strong><span>vendeurs</span></div>
            <div><strong>{nf.format(stats.cities)}</strong><span>ville{stats.cities > 1 ? 's' : ''}</span></div>
          </div>
        )}
      </div>
    </section>
  )
}
