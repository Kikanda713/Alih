import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaStore, FaTools, FaUserFriends, FaArrowRight, FaWhatsapp } from 'react-icons/fa'
import { whatsappLink } from '../lib/chat'

const TIERS = [['10 %', '0 à 10 $'], ['3 %', '10 à 100 $'], ['2 %', '100 à 1 000 $'], ['1,5 %', '1 000 à 10 000 $'], ['0,5 %', '+ de 10 000 $']]

/** Vendre sur Tindisa : trois portes d'entrée, sans surcharge. */
export default function SellPage() {
  useEffect(() => { document.title = 'Vendre sur Tindisa' }, [])

  return (
    <div className="mk-container mk-sell">
      <h1>Vendez sur Tindisa</h1>
      <p className="mk-muted">Pas d’abonnement : une commission seulement quand vous vendez.</p>

      <div className="mk-sell-choices">
        <Link to="/vendre/boutique" className="mk-sell-choice">
          <FaStore />
          <span><b>Ouvrir mon établissement</b><small>Commerce, agence immobilière, garage, atelier, pressing, hôtel, salle, restaurant…</small></span>
          <FaArrowRight className="mk-sell-go" />
        </Link>
        <Link to="/vendre/pro" className="mk-sell-choice">
          <FaTools />
          <span><b>Je suis technicien ou artisan</b><small>Plombier, électricien, mécanicien, maçon… : votre profil pro avec vos réalisations</small></span>
          <FaArrowRight className="mk-sell-go" />
        </Link>
        {/* Vente entre particuliers : rattachée au NUMÉRO WhatsApp (3 annonces max par numéro),
            donc publiée depuis WhatsApp et non depuis le chat anonyme du site. */}
        <a className="mk-sell-choice" href={whatsappLink('Bonjour Tindisa, je veux vendre un article : ')} target="_blank" rel="noopener noreferrer">
          <FaUserFriends />
          <span><b>Vendre un article</b><small>En tant que particulier, sur WhatsApp : une photo et un prix suffisent</small></span>
          <FaWhatsapp className="mk-sell-go" />
        </a>
      </div>

      <details className="mk-sell-fees">
        <summary>Barème de la commission</summary>
        <ul>{TIERS.map(([rate, range]) => <li key={range}><b>{rate}</b> {range}</li>)}</ul>
      </details>
    </div>
  )
}
