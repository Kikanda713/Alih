import { Link } from 'react-router-dom'
import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa'
import tindisaFooterLogo from '../../assets/tindisa.png'
import { channels } from '../../auth/config'
import { UNIVERSES, universeHref } from '../lib/universes'

export default function MarketFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container mk-footer-grid">
        <div className="mk-footer-brand">
          <img src={tindisaFooterLogo} alt="Tindisa" />
          <p>Le marché du Congo, en ligne et dans votre messagerie. Produits, services, hébergement, main d'œuvre et livraison.</p>
          <div className="mk-footer-social">
            <a href={channels.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><FaWhatsapp /></a>
            <a href={channels.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram"><FaTelegramPlane /></a>
          </div>
        </div>
        <div>
          <h4>Le marché</h4>
          {UNIVERSES.map((u) => <Link key={u.id} to={universeHref(u)}>{u.title}</Link>)}
        </div>
        <div>
          <h4>Tindisa</h4>
          <Link to="/#parcours">Comment ça marche</Link>
          <Link to="/centres">Centres & Wi-Fi</Link>
          <Link to="/connectivite">Connectivité Starlink</Link>
          <Link to="/#trust">Confiance et séquestre</Link>
          <Link to="/vendre">Vendre sur Tindisa</Link>
          <Link to="/verify">Vérifier un certificat</Link>
        </div>
        <div>
          <h4>Aide</h4>
          <Link to="/panier">Mon panier</Link>
          <a href={channels.whatsapp} target="_blank" rel="noopener noreferrer">Assistance WhatsApp</a>
          <a href={channels.telegram} target="_blank" rel="noopener noreferrer">Assistance Telegram</a>
        </div>
      </div>
      <div className="mk-container mk-footer-bottom">
        <span>© {new Date().getFullYear()} Tindisa. Acheter et vendre par message.</span>
        <span>Paiement cash ou Mobile Money · Séquestre · Livraison ou retrait</span>
      </div>
    </footer>
  )
}
