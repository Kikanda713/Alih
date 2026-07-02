import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate, Link } from 'react-router-dom'
import { FaWhatsapp, FaTelegramPlane, FaBars, FaTimes, FaShieldAlt, FaUserCheck, FaRobot, FaCheck, FaCamera, FaStore, FaMapMarkerAlt, FaTruck, FaMoneyBillWave, FaCertificate, FaBalanceScale, FaClipboardCheck, FaInfoCircle } from 'react-icons/fa'
import tindisaLogo from './assets/tindisa-logo.png'
import tindisaFooterLogo from './assets/tindisa.png'
import mpesaLogo from './assets/MPESA.png'
import airtelLogo from './assets/AIRTEL.png'
import orangeLogo from './assets/ORANGE.png'
import { LanguageSwitcher, useT } from './i18n'
import ProfileMenu from './components/ProfileMenu'
import { isAuth0Configured } from './auth/config'
import { DEMO_MODE } from './demo/demo'
import './App.css'

/* CTA d'un plan d'abonnement (landing) :
   - non connecté → login/inscription Auth0 natif, retour vers la page Abonnement
     (avec le plan présélectionné) ;
   - connecté → va directement à la page Abonnement (form de paiement) avec le plan.
   Fallback (Auth0 non configuré / démo) → lien WhatsApp. */
function PlanCTA({ planId, className, children }) {
  if (!isAuth0Configured || DEMO_MODE) {
    return (
      <a href="https://wa.me/243995193113" target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return <PlanCTAAuth planId={planId} className={className}>{children}</PlanCTAAuth>
}

function PlanCTAAuth({ planId, className, children }) {
  const { isAuthenticated, loginWithRedirect } = useAuth0()
  const navigate = useNavigate()
  const dest = planId === 'free' ? '/dashboard' : `/dashboard/abonnement?plan=${planId}`
  const onClick = () => {
    if (isAuthenticated) navigate(dest)
    else loginWithRedirect({ appState: { returnTo: dest } })
  }
  return <button type="button" className={className} onClick={onClick}>{children}</button>
}

function App() {
  const { t } = useT()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pricingTab, setPricingTab] = useState('tindisa')
  const [howProfile, setHowProfile] = useState('client')

  // « Comment ça marche » — ce que Tindisa fait vraiment, selon le profil.
  const howBubbles = {
    client: [
      { ic: <FaCamera />, t: 'Cherchez par photo ou par message', s: 'Envoyez une photo ou décrivez ce que vous voulez' },
      { ic: <FaStore />, t: 'Tout le marché ici', s: 'Plus besoin d’aller de boutique en boutique' },
      { ic: <FaMapMarkerAlt />, t: 'Le produit et la boutique', s: 'Prix, disponibilité et adresse du vendeur' },
      { ic: <FaMoneyBillWave />, t: 'Payez cash ou Mobile Money', s: 'Livraison ou retrait en boutique, au choix', logos: [mpesaLogo, airtelLogo, orangeLogo] },
    ],
    merchant: [
      { ic: <FaStore />, t: 'Vendez sans site internet', s: 'Votre boutique vit dans la messagerie' },
      { ic: <FaCamera />, t: 'Vos produits faciles à trouver', s: 'Par photo ou par simple message' },
      { ic: <FaRobot />, t: 'On vend et discute le prix pour vous', s: 'Sans jamais descendre sous votre prix' },
      { ic: <FaMoneyBillWave />, t: 'Encaissez cash ou Mobile Money', s: 'Vous êtes payé après la livraison', logos: [mpesaLogo, airtelLogo, orangeLogo] },
    ],
  }

  // Alternance automatique Acheteur/Commerçant toutes les 8 s. Le minuteur se
  // réinitialise à chaque changement (donc aussi après un clic manuel).
  useEffect(() => {
    const id = setTimeout(
      () => setHowProfile((p) => (p === 'client' ? 'merchant' : 'client')),
      8000,
    )
    return () => clearTimeout(id)
  }, [howProfile])

  const handleNavClick = (e, targetId) => {
    e.preventDefault()
    setMenuOpen(false)
    document.body.style.overflow = ''
    const el = document.getElementById(targetId)
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }

  return (
    <div className="app">

      {/* ============ NAVBAR ============ */}
      <nav className="navbar">
        <div className="nav-container">
          <a href="#" className="logo">
            <img src={tindisaLogo} alt="Tindisa" className="logo-img" />
          </a>

          <ul className="nav-links">
            <li><a href="#home" onClick={(e) => handleNavClick(e, 'home')}>{t('nav.home')}</a></li>
            <li><a href="#how" onClick={(e) => handleNavClick(e, 'how')}>{t('nav.how')}</a></li>
            <li><a href="#trust" onClick={(e) => handleNavClick(e, 'trust')}>{t('nav.trust')}</a></li>
            <li><a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')}>{t('nav.pricing')}</a></li>
            <li><a href="#contact" onClick={(e) => handleNavClick(e, 'contact')}>{t('nav.contact')}</a></li>
          </ul>

          <div className="nav-auth">
            <Link
              to="/verify"
              className="nav-verify"
              title="Vérifier l'authenticité d'un certificat produit (blockchain)"
              aria-label="Vérifier un certificat"
            >
              <FaShieldAlt />
            </Link>
            <LanguageSwitcher />
            <ProfileMenu />
          </div>

          {/* Mobile-only menu panel */}
          <div className={`mobile-menu ${menuOpen ? 'active' : ''}`}>
            <ul className="mobile-menu-links">
              <li><a href="#home" onClick={(e) => handleNavClick(e, 'home')}>{t('nav.home')}</a></li>
              <li><a href="#how" onClick={(e) => handleNavClick(e, 'how')}>{t('nav.how')}</a></li>
              <li><a href="#trust" onClick={(e) => handleNavClick(e, 'trust')}>{t('nav.trust')}</a></li>
              <li><a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')}>{t('nav.pricing')}</a></li>
              <li><a href="#contact" onClick={(e) => handleNavClick(e, 'contact')}>{t('nav.contact')}</a></li>
            </ul>
            <div className="mobile-menu-auth">
              <Link to="/verify" className="nav-verify" aria-label="Vérifier un certificat" onClick={() => { setMenuOpen(false); document.body.style.overflow = '' }}>
                <FaShieldAlt /> <span>Vérifier un certificat</span>
              </Link>
              <LanguageSwitcher />
              <ProfileMenu />
            </div>
          </div>

          <button className="hamburger" onClick={() => {
            const next = !menuOpen
            setMenuOpen(next)
            document.body.style.overflow = next ? 'hidden' : ''
          }} aria-label="Menu">
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="hero" id="home">
        <div className="network-pattern"></div>

        <div className="hero-container">
          <div className="hero-content">
            {/* <span className="hero-badge">
              <span>◈</span> L'intelligence au service des proximités africaines
            </span> */}

            <h1 className="hero-title">
             <span className="hero-highlight"> {t('hero.title.highlight')}</span><br />
              {t('hero.title.rest')}
              
            </h1>

            <p className="hero-subtitle">
              {t('hero.subtitle')}
            </p>

            {/* Platform CTAs */}
            <div className="platforms">
              <a
                href="https://wa.me/243995193113"
                target="_blank"
                rel="noopener noreferrer"
                className="platform-btn whatsapp"
              >
                <FaWhatsapp className="platform-icon" />
                <span>{t('cta.whatsapp')}</span>
              </a>
              <a href="https://t.me/Tindisa_tbot" target="_blank" rel="noopener noreferrer" className="platform-btn telegram">
                <FaTelegramPlane className="platform-icon" />
                <span>{t('cta.telegram')}</span>
              </a>
            </div>

            {/* Stats */}
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">5 000+</span>
                <span className="stat-label">Utilisateurs actifs</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat">
                <span className="stat-number">200+</span>
                <span className="stat-label">Produits disponibles</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Agent IA disponible</span>
              </div>
            </div>
          </div>

          {/* Hero Visual — Phone Mockup */}
          <div className="hero-visual">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="chat-header">
                  <div className="chat-avatar" translate="no">T</div>
                  <div>
                    <p className="chat-name" translate="no">Tindisa</p>
                    <p className="chat-status">en ligne</p>
                  </div>
                </div>
                <div className="chat-body">
                  <div className="chat-msg bot">
                    <p>Bonjour ! 👋 Je suis tindisa, votre assistant intelligent.</p>
                  </div>
                  <div className="chat-msg bot">
                    <p>Que recherchez-vous aujourd'hui ?</p>
                  </div>
                  <div className="chat-msg user">
                    <p>Je cherche un Samsung Galaxy à bon prix</p>
                  </div>
                  <div className="chat-msg bot">
                    <p>J'ai trouvé 3 offres. Le meilleur prix : 185$ — je négocie pour vous. 🤝</p>
                  </div>
                  <div className="chat-msg user">
                    <p>Super, propose 170$</p>
                  </div>
                  <div className="chat-msg bot">
                    <p>Contre-offre envoyée ! Réponse dans quelques instants… ⏳</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS — AGENTS IA ============ */}
      <section className="how-it-works" id="how">
        <div className="container">
          <h2 className="section-title">{t('how.title')}</h2>
          <p className="section-subtitle">
            Tout le marché dans votre messagerie — cherchez même par photo, plus besoin de courir les boutiques.
          </p>

          <div className="how-toggle" role="tablist">
            <button
              className={`how-toggle-btn${howProfile === 'client' ? ' active' : ''}`}
              onClick={() => setHowProfile('client')}
            >
              <FaUserCheck /> Je suis acheteur
            </button>
            <button
              className={`how-toggle-btn${howProfile === 'merchant' ? ' active' : ''}`}
              onClick={() => setHowProfile('merchant')}
            >
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

      {/* ============ TRUST SECTION ============ */}
      <section className="trust" id="trust">
        <div className="network-pattern"></div>
        <div className="container">
          <h2 className="section-title">{t('trust.title')}</h2>
          <p className="section-subtitle">
            Vendeurs et produits certifiés, paiements garantis, accompagnement juridique — la confiance à chaque transaction.
          </p>

          {/* Illustration simple de la stratégie de certification (parcours en 3 temps) */}
          <div className="trust-flow">
            <div className="trust-flow-step">
              <span className="trust-flow-num">1</span>
              <FaClipboardCheck className="trust-flow-ic" />
              <span>Vérification</span>
            </div>
            <span className="trust-flow-arrow">→</span>
            <div className="trust-flow-step">
              <span className="trust-flow-num">2</span>
              <FaCertificate className="trust-flow-ic" />
              <span>Certification</span>
            </div>
            <span className="trust-flow-arrow">→</span>
            <div className="trust-flow-step">
              <span className="trust-flow-num">3</span>
              <FaShieldAlt className="trust-flow-ic" />
              <span>Garantie</span>
            </div>
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

          {/* Accès subtil : vérifier un certificat (PDF / hash / QR → blockchain) */}
          <div className="trust-verify-cta">
            <Link to="/verify" className="trust-verify-btn" title="Vérifier l'authenticité d'un certificat (blockchain)">
              <FaShieldAlt /> Vérifier un certificat
            </Link>
          </div>
        </div>
      </section>

      {/* ============ PRICING SECTION ============ */}
      <section className="pricing" id="pricing">
        <div className="container">
          <h2 className="section-title">Tarifs pour les vendeurs</h2>
          <p className="section-subtitle">
            Acheter sur Tindisa est <strong>100% gratuit</strong>. Ces formules concernent uniquement les vendeurs : commission au volume ou abonnement mensuel.
          </p>

          {/* Pricing Tabs */}
          <div className="pricing-tabs">

            <button
              className={`pricing-tab ${pricingTab === 'tindisa' ? 'active' : ''}`}
              onClick={() => setPricingTab('tindisa')}
            >
              Tindisa Pure
            </button>

            <button
              className={`pricing-tab ${pricingTab === 'wanzzo' ? 'active' : ''}`}
              onClick={() => setPricingTab('wanzzo')}
            >
              Wanzo
            </button>
            
          </div>

          {/* ===== WANZZO — Volume-based pricing ===== */}
          {pricingTab === 'wanzzo' && (
            <>
              <div className="pricing-grid">
                {/* Starter — Low Volume */}
                <div className="pricing-card">
                  <div className="pricing-header">
                    <h3 className="pricing-plan-name">Starter</h3>
                    <div className="pricing-price">
                      <span className="pricing-amount">5%</span>
                      <span className="pricing-period">par transaction</span>
                    </div>
                    <p className="pricing-desc">Pour les vendeurs occasionnels avec un faible volume d'activité.</p>
                  </div>
                  <div className="pricing-volume">
                    <span className="pricing-volume-label">Volume mensuel</span>
                    <span className="pricing-volume-value">Jusqu'à 100 interactions</span>
                  </div>
                  <ul className="pricing-features">
                    <li><FaCheck className="pricing-check" /> 100 conversations / mois</li>
                    <li><FaCheck className="pricing-check" /> 30 négociations automatisées</li>
                    <li><FaCheck className="pricing-check" /> Recherche produits incluse</li>
                    <li><FaCheck className="pricing-check" /> Paiement sécurisé</li>
                    <li><FaCheck className="pricing-check" /> Support WhatsApp</li>
                  </ul>
                  <a href="https://wa.me/243995193113" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-secondary">
                    Démarrer
                  </a>
                </div>

                {/* Croissance — Medium Volume (Featured) */}
                <div className="pricing-card pricing-card-featured">
                  <div className="pricing-badge">Recommandé</div>
                  <div className="pricing-header">
                    <h3 className="pricing-plan-name">Croissance</h3>
                    <div className="pricing-price">
                      <span className="pricing-amount">3.5%</span>
                      <span className="pricing-period">par transaction</span>
                    </div>
                    <p className="pricing-desc">Pour les vendeurs actifs avec un volume significatif chaque mois.</p>
                  </div>
                  <div className="pricing-volume">
                    <span className="pricing-volume-label">Volume mensuel</span>
                    <span className="pricing-volume-value">100 à 500 interactions</span>
                  </div>
                  <ul className="pricing-features">
                    <li><FaCheck className="pricing-check" /> 500 conversations / mois</li>
                    <li><FaCheck className="pricing-check" /> 150 négociations automatisées</li>
                    <li><FaCheck className="pricing-check" /> Négociation avancée</li>
                    <li><FaCheck className="pricing-check" /> Prix dynamiques</li>
                    <li><FaCheck className="pricing-check" /> Paiement sécurisé prioritaire</li>
                    <li><FaCheck className="pricing-check" /> Rapports d'activité hebdo</li>
                    <li><FaCheck className="pricing-check" /> Support prioritaire 24/7</li>
                  </ul>
                  <a href="https://wa.me/243995193113" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-primary">
                    Choisir Croissance
                  </a>
                </div>

                {/* Échelle — High Volume */}
                <div className="pricing-card">
                  <div className="pricing-header">
                    <h3 className="pricing-plan-name">Échelle</h3>
                    <div className="pricing-price">
                      <span className="pricing-amount">2%</span>
                      <span className="pricing-period">par transaction</span>
                    </div>
                    <p className="pricing-desc">Pour les entreprises et gros vendeurs avec un haut volume.</p>
                  </div>
                  <div className="pricing-volume">
                    <span className="pricing-volume-label">Volume mensuel</span>
                    <span className="pricing-volume-value">500+ interactions</span>
                  </div>
                  <ul className="pricing-features">
                    <li><FaCheck className="pricing-check" /> Conversations illimitées</li>
                    <li><FaCheck className="pricing-check" /> Négociations illimitées</li>
                    <li><FaCheck className="pricing-check" /> Tous les services inclus</li>
                    <li><FaCheck className="pricing-check" /> Marketing automatique</li>
                    <li><FaCheck className="pricing-check" /> API d'intégration catalogue</li>
                    <li><FaCheck className="pricing-check" /> Dashboard & analytics complets</li>
                    <li><FaCheck className="pricing-check" /> Gestionnaire de compte dédié</li>
                  </ul>
                  <a href="https://wa.me/243995193113" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-secondary">
                    Contacter l'équipe
                  </a>
                </div>
              </div>

              <p className="pricing-note">
                <FaInfoCircle className="pricing-note-ic" />&nbsp;Une <strong>interaction</strong> = une conversation initiée par un acheteur (recherche, négociation ou commande).<br />
                Aucun frais fixe. Commission uniquement sur les transactions conclues.
              </p>
            </>
          )}

          {/* ===== TINDISA PURE — Monthly subscriptions ===== */}
          {pricingTab === 'tindisa' && (
            <>
              <div className="pricing-grid">
                {/* Gratuit */}
                <div className="pricing-card">
                  <div className="pricing-header">
                    <h3 className="pricing-plan-name">Gratuit</h3>
                    <div className="pricing-price">
                      <span className="pricing-amount">0$</span>
                      <span className="pricing-period">/ mois</span>
                    </div>
                    <p className="pricing-desc">Pour démarrer et tester, sans payer.</p>
                  </div>
                  <ul className="pricing-features">
                    <li><FaCheck className="pricing-check" /> 5 articles</li>
                    <li><FaCheck className="pricing-check" /> 150 recommandations / mois</li>
                    <li><FaCheck className="pricing-check" /> Vente de base</li>
                    <li><FaCheck className="pricing-check" /> Paiement sécurisé</li>
                    <li><FaCheck className="pricing-check" /> WhatsApp & Telegram</li>
                  </ul>
                  <PlanCTA planId="free" className="pricing-btn pricing-btn-secondary">
                    Commencer gratuitement
                  </PlanCTA>
                </div>

                {/* Basic */}
                <div className="pricing-card">
                  <div className="pricing-header">
                    <h3 className="pricing-plan-name">Basic</h3>
                    <div className="pricing-price">
                      <span className="pricing-amount">9$</span>
                      <span className="pricing-period">/ mois</span>
                    </div>
                    <p className="pricing-desc">Pour les petits vendeurs qui se lancent.</p>
                  </div>
                  <ul className="pricing-features">
                    <li><FaCheck className="pricing-check" /> 80 articles</li>
                    <li><FaCheck className="pricing-check" /> 1 500 recommandations / mois</li>
                    <li><FaCheck className="pricing-check" /> Produits ET services</li>
                    <li><FaCheck className="pricing-check" /> Publication Facebook</li>
                    <li><FaCheck className="pricing-check" /> Support WhatsApp & Telegram</li>
                  </ul>
                  <PlanCTA planId="basic" className="pricing-btn pricing-btn-secondary">
                    S'abonner
                  </PlanCTA>
                </div>

                {/* Pro (Featured) */}
                <div className="pricing-card pricing-card-featured">
                  <div className="pricing-badge">Populaire</div>
                  <div className="pricing-header">
                    <h3 className="pricing-plan-name">Pro</h3>
                    <div className="pricing-price">
                      <span className="pricing-amount">29$</span>
                      <span className="pricing-period">/ mois</span>
                    </div>
                    <p className="pricing-trial">1 mois d'essai gratuit</p>
                    <p className="pricing-desc">Pour les vendeurs réguliers qui veulent maximiser leurs ventes.</p>
                  </div>
                  <ul className="pricing-features">
                    <li><FaCheck className="pricing-check" /> 1 mois offert, sans engagement</li>
                    <li><FaCheck className="pricing-check" /> 500 articles</li>
                    <li><FaCheck className="pricing-check" /> 8 000 recommandations / mois</li>
                    <li><FaCheck className="pricing-check" /> Certificats Wanzo</li>
                    <li><FaCheck className="pricing-check" /> Mise en avant des produits</li>
                    <li><FaCheck className="pricing-check" /> Statistiques avancées</li>
                    <li><FaCheck className="pricing-check" /> Support prioritaire 24/7</li>
                  </ul>
                  <PlanCTA planId="pro" className="pricing-btn pricing-btn-primary">
                    Essayer 1 mois gratuit
                  </PlanCTA>
                </div>

                {/* Business — masqué sur la landing (reste disponible sur le dashboard). */}
              </div>

              <p className="pricing-note">
                <FaInfoCircle className="pricing-note-ic" />&nbsp;Abonnement sans engagement, résiliable à tout moment. Paiement par Mobile Money ou cash.<br />
                Côté acheteur, Tindisa reste 100% gratuit.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="final-cta" id="contact">
        <div className="network-pattern"></div>
        <div className="container">
          <div className="final-cta-accent"></div>
          <h2 className="final-cta-title">{t('finalcta.title')}</h2>
          <p className="final-cta-subtitle">
            {t('finalcta.subtitle')}
          </p>
          <div className="platforms">
            <a
              href="https://wa.me/243995193113"
              target="_blank"
              rel="noopener noreferrer"
              className="platform-btn whatsapp"
            >
              <FaWhatsapp className="platform-icon" />
              <span>WhatsApp</span>
            </a>
            <a href="https://t.me/Tindisa_tbot" target="_blank" rel="noopener noreferrer" className="platform-btn telegram">
              <FaTelegramPlane className="platform-icon" />
              <span>Telegram</span>
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="footer">
        <div className="container">
          <div className="footer-logo">
            <img src={tindisaFooterLogo} alt="Tindisa" className="footer-logo-img" />
          </div>
          <span className="footer-text">{t('footer.text')}</span>
          <div className="footer-links">
            <a href="#privacy">Confidentialité</a>
            <a href="#terms">Conditions</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
