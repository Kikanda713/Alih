import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Link, useNavigate } from 'react-router-dom'
import { FaGlobeAfrica, FaUserFriends, FaInfoCircle, FaWhatsapp, FaWifi, FaChartLine, FaHandshake, FaCertificate } from 'react-icons/fa'
import { isAuth0Configured } from '../../auth/config'
import { DEMO_MODE } from '../../demo/demo'
import { UNIVERSES } from '../lib/universes'
import { whatsappLink } from '../lib/chat'

/* CTA vendeur : non connecté → login Auth0 puis dashboard ; connecté → dashboard.
   Fallback (Auth0 non configuré / démo) → WhatsApp. */
function OpenShopCTA({ className, children }) {
  if (!isAuth0Configured || DEMO_MODE) {
    return <a href={whatsappLink('Bonjour Tindisa, je veux ouvrir ma boutique.')} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  }
  return <OpenShopAuth className={className}>{children}</OpenShopAuth>
}
function OpenShopAuth({ className, children }) {
  const { isAuthenticated, loginWithRedirect } = useAuth0()
  const navigate = useNavigate()
  const onClick = () => (isAuthenticated ? navigate('/dashboard') : loginWithRedirect({ appState: { returnTo: '/dashboard' } }))
  return <button type="button" className={className} onClick={onClick}>{children}</button>
}

const WHY = [
  { ic: <FaGlobeAfrica />, t: 'Visible partout', s: 'Sur le site, dans WhatsApp et Telegram : l’assistant recommande vos offres aux bons acheteurs.' },
  { ic: <FaHandshake />, t: 'On négocie pour vous', s: 'Jamais sous votre prix plancher, qui reste secret.' },
  { ic: <FaCertificate />, t: 'Confiance', s: 'Vendeur vérifié, certificats produits, paiement en séquestre.' },
  { ic: <FaChartLine />, t: 'Pilotage', s: 'Vues, offres et ventes par article dans votre espace commerçant.' },
]

export default function SellPage() {
  useEffect(() => { document.title = 'Vendre sur Tindisa' }, [])
  return (
    <div className="mk-sell">
      <section className="mk-page-hero">
        <div className="mk-container">
          <p className="mk-eyebrow">Vendre sur Tindisa</p>
          <h1>Produits, chambres, salles, savoir-faire ou récoltes : vendez-les par message</h1>
          <p className="mk-muted">Pas d’abonnement. Une commission seulement quand une vente est conclue.</p>
        </div>
      </section>

      <div className="mk-container mk-cx-section">
        <h2 className="section-title">Tout ce que vous pouvez proposer</h2>
        <div className="mk-sell-universes">
          {UNIVERSES.map((u) => (
            <div key={u.id} className="mk-universe mk-universe-static">
              <span className="mk-universe-ic"><u.icon /></span>
              <span className="mk-universe-tx"><b>{u.title}</b><small>{u.desc}</small></span>
            </div>
          ))}
        </div>

        <div className="mk-sell-paths">
          <div className="mk-sell-path">
            <FaGlobeAfrica />
            <b>Professionnels</b>
            <span>Boutique en ligne, catalogue produits et services avec unités (nuit, heure, sac…), statistiques, certificats et paiements.</span>
            <OpenShopCTA className="pricing-btn pricing-btn-primary">Ouvrir ma boutique</OpenShopCTA>
          </div>
          <div className="mk-sell-path">
            <FaUserFriends />
            <b>Particuliers</b>
            <span>Vendez un article sans boutique : envoyez une photo et un prix à l’assistant, l’annonce est publiée puis modérée.</span>
            <a className="pricing-btn pricing-btn-secondary" href={whatsappLink('Bonjour Tindisa, je veux vendre un article : ')} target="_blank" rel="noopener noreferrer">
              Vendre un article
            </a>
          </div>
          <div className="mk-sell-path">
            <FaWifi />
            <b>Dans un centre connecté</b>
            <span>Installé dans un centre commercial ou une coopérative ? Rejoignez son Wi-Fi Tindisa et ses livraisons groupées.</span>
            <Link className="pricing-btn pricing-btn-secondary" to="/centres">Voir les centres</Link>
          </div>
        </div>

        <div className="mk-layers">
          {WHY.map((w) => (
            <article key={w.t} className="mk-layer"><span className="mk-layer-ic">{w.ic}</span><h3>{w.t}</h3><p>{w.s}</p></article>
          ))}
        </div>
      </div>

      <section className="pricing">
        <div className="container">
          <h2 className="section-title">Commission dégressive</h2>
          <p className="section-subtitle">Calculée sur le montant de chaque vente conclue, payable par Mobile Money dès 10 $.</p>
          <div className="pricing-commission">
            <div className="pricing-tiers">
              <div className="pricing-tier"><span className="pt-rate">10%</span><span className="pt-range">0 à 10 $</span></div>
              <div className="pricing-tier"><span className="pt-rate">3%</span><span className="pt-range">10 à 100 $</span></div>
              <div className="pricing-tier"><span className="pt-rate">2%</span><span className="pt-range">100 à 1 000 $</span></div>
              <div className="pricing-tier"><span className="pt-rate">1,5%</span><span className="pt-range">1 000 à 10 000 $</span></div>
              <div className="pricing-tier"><span className="pt-rate">0,5%</span><span className="pt-range">+ de 10 000 $</span></div>
            </div>
            <OpenShopCTA className="pricing-btn pricing-btn-primary">Commencer à vendre</OpenShopCTA>
          </div>
          <p className="pricing-note">
            <FaInfoCircle className="pricing-note-ic" />&nbsp;Aucun abonnement : chargez vos offres <strong>sans limite</strong> et ne payez qu’à la vente.
            Côté acheteur : <strong>100% gratuit</strong>, avec des <strong>crédits Tinda</strong> (fidélité) à chaque achat.
          </p>
          <div className="platforms mk-center">
            <a className="platform-btn whatsapp" href={whatsappLink('Bonjour Tindisa, j’ai des questions pour vendre sur Tindisa.')} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp className="platform-icon" /> <span>Une question ? L’assistant répond</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
