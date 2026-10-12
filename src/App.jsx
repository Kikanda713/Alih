import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaWhatsapp, FaTelegramPlane, FaShieldAlt, FaUserCheck, FaRobot, FaCamera, FaStore, FaMapMarkerAlt, FaMoneyBillWave, FaCertificate, FaBalanceScale, FaClipboardCheck, FaArrowRight } from 'react-icons/fa'
import mpesaLogo from './assets/MPESA.png'
import airtelLogo from './assets/AIRTEL.png'
import orangeLogo from './assets/ORANGE.png'
import { useT } from './i18n'
import { channels } from './auth/config'
import HomeHero from './landing/HomeHero'
import MarketRails from './landing/MarketRails'
import ChatFlow from './landing/ChatFlow'
import ConnectSection from './landing/ConnectSection'

/*
 * Page d'accueil = vitrine du marché (site multi-pages : /marche, /centres,
 * /connectivite, /vendre…). Ordre : recherche + univers, annonces réelles,
 * parcours site → messagerie, comment ça marche, connectivité Starlink,
 * confiance, vendre, appel final. En-tête/pied : MarketLayout.
 */

function App() {
  const { t } = useT()
  const location = useLocation()
  const [howProfile, setHowProfile] = useState('client')

  useEffect(() => { document.title = 'Tindisa · Le marché du Congo, par message' }, [])

  // Ancres (/#connect, /#vendre…) depuis les autres pages : défilement après rendu.
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    return () => clearTimeout(timer)
  }, [location.hash])

  // « Comment ça marche » : ce que Tindisa fait vraiment, selon le profil.
  const howBubbles = {
    client: [
      { ic: <FaCamera />, t: 'Cherchez par photo ou par message', s: 'Sur le site ou directement dans la conversation' },
      { ic: <FaStore />, t: 'Tout le marché ici', s: 'Produits, services, hôtels, artisans, livraison' },
      { ic: <FaMapMarkerAlt />, t: 'Le produit et la boutique', s: 'Prix, disponibilité et adresse du vendeur' },
      { ic: <FaMoneyBillWave />, t: 'Payez cash ou Mobile Money', s: 'Livraison ou retrait en boutique, au choix', logos: [mpesaLogo, airtelLogo, orangeLogo] },
    ],
    merchant: [
      { ic: <FaStore />, t: 'Votre vitrine en ligne', s: 'Visible sur le site et dans la messagerie' },
      { ic: <FaCamera />, t: 'Produits et services faciles à trouver', s: 'Par photo, par message ou par recherche' },
      { ic: <FaRobot />, t: 'On vend et discute le prix pour vous', s: 'Sans jamais descendre sous votre prix' },
      { ic: <FaMoneyBillWave />, t: 'Encaissez cash ou Mobile Money', s: 'Vous êtes payé après la livraison', logos: [mpesaLogo, airtelLogo, orangeLogo] },
    ],
  }

  // Alternance automatique Acheteur/Commerçant toutes les 8 s (réinitialisée au clic).
  useEffect(() => {
    const id = setTimeout(() => setHowProfile((p) => (p === 'client' ? 'merchant' : 'client')), 8000)
    return () => clearTimeout(id)
  }, [howProfile])

  return (
    <div className="app mk-home">
      <HomeHero />
      <MarketRails />
      <ChatFlow />

      {/* ============ COMMENT ÇA MARCHE ============ */}
      <section className="how-it-works" id="how">
        <div className="container">
          <h2 className="section-title">{t('how.title')}</h2>
          <p className="section-subtitle">
            Tout le marché dans votre messagerie : cherchez même par photo, plus besoin de courir les boutiques.
          </p>

          <div className="how-toggle" role="tablist">
            <button className={`how-toggle-btn${howProfile === 'client' ? ' active' : ''}`} onClick={() => setHowProfile('client')}>
              <FaUserCheck /> Je suis acheteur
            </button>
            <button className={`how-toggle-btn${howProfile === 'merchant' ? ' active' : ''}`} onClick={() => setHowProfile('merchant')}>
              <FaStore /> Je suis commerçant
            </button>
          </div>

          <div className="how-stage">
            <img
              key={howProfile}
              src={howProfile === 'merchant' ? '/TINDISA Persone H1.webp' : '/TINDISA Persone Fok OK.webp'}
              alt={howProfile === 'merchant' ? 'Un commerçant utilise Tindisa' : 'Une cliente utilise Tindisa sur son téléphone'}
              className="how-person"
              loading="lazy"
            />
            {howBubbles[howProfile].map((b, i) => (
              <div className={`how-bubble how-b${i + 1}`} key={`${howProfile}-${i}`}>
                <span className="how-bubble-ic">{b.ic}</span>
                <span className="how-bubble-tx">
                  <b>{b.t}</b>{b.s}
                  {b.logos && (
                    <span className="how-bubble-logos">
                      {b.logos.map((src, k) => <img key={k} src={src} alt="" />)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConnectSection />

      {/* ============ CONFIANCE ============ */}
      <section className="trust" id="trust">
        <div className="network-pattern"></div>
        <div className="container">
          <h2 className="section-title">{t('trust.title')}</h2>
          <p className="section-subtitle">
            Vendeurs et produits certifiés, paiements garantis, accompagnement juridique : la confiance à chaque transaction.
          </p>

          <div className="trust-flow">
            <div className="trust-flow-step"><span className="trust-flow-num">1</span><FaClipboardCheck className="trust-flow-ic" /><span>Vérification</span></div>
            <span className="trust-flow-arrow">→</span>
            <div className="trust-flow-step"><span className="trust-flow-num">2</span><FaCertificate className="trust-flow-ic" /><span>Certification</span></div>
            <span className="trust-flow-arrow">→</span>
            <div className="trust-flow-step"><span className="trust-flow-num">3</span><FaShieldAlt className="trust-flow-ic" /><span>Garantie</span></div>
          </div>

          <div className="trust-grid">
            <div className="trust-card">
              <div className="trust-icon"><FaUserCheck size={24} color="#C65D2E" /></div>
              <h3>Vendeurs vérifiés &amp; certifiés</h3>
              <p>Identité et informations vérifiées, inspection technique : chaque vendeur reçoit son <strong>certificat d'authentification</strong>.</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon"><FaCertificate size={24} color="#C65D2E" /></div>
              <h3>Certificats produits</h3>
              <p>Certificat numérique d'authenticité et <strong>fiche de contrôle technique</strong> (véhicules, électronique, smartphones).</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon"><FaShieldAlt size={24} color="#C65D2E" /></div>
              <h3>Paiement garanti</h3>
              <p>Votre argent est protégé en <strong>séquestre</strong> : le vendeur n'est payé qu'après votre confirmation de réception.</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon"><FaBalanceScale size={24} color="#C65D2E" /></div>
              <h3>Assistance juridique</h3>
              <p>En cas de litige, Tindisa vous <strong>accompagne et facilite la médiation</strong> entre acheteur et vendeur.</p>
            </div>
          </div>

          <div className="trust-verify-cta">
            <Link to="/verify" className="trust-verify-btn" title="Vérifier l'authenticité d'un certificat (blockchain)">
              <FaShieldAlt /> Vérifier un certificat
            </Link>
          </div>
        </div>
      </section>

      {/* ============ VENDRE (aperçu → /vendre) ============ */}
      <section className="mk-sell-teaser" id="vendre">
        <div className="mk-container mk-join">
          <div>
            <h2>Vous vendez, louez ou proposez un service ?</h2>
            <p>Boutique, hôtel, salle, artisan, transporteur ou producteur : publiez vos offres, elles apparaissent sur le site et dans la messagerie. Pas d’abonnement, une commission seulement à la vente.</p>
          </div>
          <Link to="/vendre" className="pricing-btn pricing-btn-primary">Vendre sur Tindisa <FaArrowRight /></Link>
        </div>
      </section>

      {/* ============ APPEL FINAL ============ */}
      <section className="final-cta" id="contact">
        <div className="network-pattern"></div>
        <div className="container">
          <div className="final-cta-accent"></div>
          <h2 className="final-cta-title">{t('finalcta.title')}</h2>
          <p className="final-cta-subtitle">{t('finalcta.subtitle')}</p>
          <div className="platforms">
            <a href={channels.whatsapp} target="_blank" rel="noopener noreferrer" className="platform-btn whatsapp">
              <FaWhatsapp className="platform-icon" />
              <span>WhatsApp</span>
            </a>
            <a href={channels.telegram} target="_blank" rel="noopener noreferrer" className="platform-btn telegram">
              <FaTelegramPlane className="platform-icon" />
              <span>Telegram</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
