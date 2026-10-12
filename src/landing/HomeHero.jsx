import { Link } from 'react-router-dom'
import SearchBar from '../market/components/SearchBar'

const SUGGESTIONS = [
  ['Chambre d’hôtel', { q: 'chambre', type: 'service' }],
  ['Salle de conférence', { q: 'salle' }],
  ['Ciment', { q: 'ciment' }],
  ['Maçon', { q: 'maçon' }],
  ['Haricots', { q: 'haricot' }],
  ['Smartphone', { q: 'téléphone' }],
  ['Livraison', { category: 'transport-logistique' }],
]

/*
 * Hero du marché : la recherche est la zone centrale, sans rien qui la
 * concurrence. Les univers sont dans l'en-tête (détail au survol).
 */
export default function HomeHero() {
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
      </div>
    </section>
  )
}
