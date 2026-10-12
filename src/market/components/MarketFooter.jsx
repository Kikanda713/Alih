import { Link } from 'react-router-dom'
import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa'
import tindisaFooterLogo from '../../assets/tindisa.png'
import { channels } from '../../auth/config'
import { UNIVERSES, universeHref } from '../lib/universes'

/** Pied de page compact : liens en lignes (pas de hautes colonnes), messagerie une seule fois. */
export default function MarketFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container mk-footer-main">
        <div className="mk-footer-brand">
          <img src={tindisaFooterLogo} alt="Tindisa" />
          <a href="tel:+243991880037" className="mk-footer-phone">0991880037</a>
          <div className="mk-footer-social">
            <a href={channels.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><FaWhatsapp /></a>
            <a href={channels.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram"><FaTelegramPlane /></a>
          </div>
        </div>
        <nav className="mk-footer-links" aria-label="Pied de page">
          <p>
            <b>Le marché</b>
            {UNIVERSES.map((u) => <Link key={u.id} to={universeHref(u)}>{u.label}</Link>)}
          </p>
          <p>
            <b>Tindisa</b>
            <Link to="/centres">Wifi Zone</Link>
            <Link to="/vendre">Vendre</Link>
            <Link to="/verify">Vérifier un certificat</Link>
            <Link to="/panier">Mon panier</Link>
          </p>
        </nav>
      </div>
      <div className="mk-container mk-footer-bottom">
        <span>© {new Date().getFullYear()} Tindisa · Le marché du Congo, en ligne et dans votre messagerie</span>
        <span>Cash ou Mobile Money · Séquestre · Livraison ou retrait</span>
      </div>
    </footer>
  )
}
