import { useState } from 'react'
import { FaWhatsapp, FaTelegramPlane, FaBars, FaTimes, FaShieldAlt, FaUserCheck, FaRobot, FaCheck } from 'react-icons/fa'
import { HiOutlineChatAlt2, HiOutlineSearch, HiOutlineCurrencyDollar, HiOutlineCreditCard } from 'react-icons/hi'
import './App.css'

const WHATSAPP_LINK = 'https://wa.me/243991880037'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNavClick = (e, targetId) => {
    e.preventDefault()
    setMenuOpen(false)
    document.body.style.overflow = ''
    const el = document.getElementById(targetId)
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }

  const navItems = [
    { id: 'home', label: t('nav.home') },
    { id: 'how', label: t('nav.how') },
    { id: 'trust', label: t('nav.trust') },
    { id: 'pricing', label: t('nav.pricing') },
    { id: 'contact', label: t('nav.contact') },
  ]

  return (
    <div className="app">

      {/* ============ NAVBAR ============ */}
      <nav className="navbar">
        <div className="nav-container">
          <a href="#" className="logo">
            {/* Placeholder logo — final logo coming later */}
            <svg className="logo-svg" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#C65D2E"/>
              <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="22">A</text>
            </svg>
            <div className="logo-text-group">
              <span className="logo-text" translate="no">ALIH</span>
              <span className="logo-tagline">AUTONOMOUS INTELLIGENT LIQUIDITY HUB</span>
            </div>
          </a>

          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.id}><a href={`#${item.id}`} onClick={(e) => handleNavClick(e, item.id)}>{item.label}</a></li>
            ))}
          </ul>

          <div className="nav-auth">
            <LanguageSwitcher />
            <ProfileMenu />
          </div>

          {/* Mobile-only menu panel */}
          <div className={`mobile-menu ${menuOpen ? 'active' : ''}`}>
            <ul className="mobile-menu-links">
              {navItems.map((item) => (
                <li key={item.id}><a href={`#${item.id}`} onClick={(e) => handleNavClick(e, item.id)}>{item.label}</a></li>
              ))}
            </ul>
            <div className="mobile-menu-auth">
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
            <span className="hero-badge">
              <span>◈</span> L'intelligence au service des proximités africaines
            </span>

            <h1 className="hero-title">
             <span className="hero-highlight"> {t('hero.title.highlight')}</span><br />
              {t('hero.title.rest')}
            </h1>

            <p className="hero-subtitle">
               ALIH vous aide à trouver, vendre ou échanger ce dont vous avez besoin grâce à une conversation simple. 
               Aussi naturel qu'un message.
            </p>

            {/* Platform CTAs — messaging is the primary action */}
            <div className="platforms">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="platform-btn whatsapp"
              >
                <FaWhatsapp className="platform-icon" />
                <span>{t('cta.whatsapp')}</span>
              </a>
              <a href="#telegram" className="platform-btn telegram">
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
                <span className="stat-label">Assistant disponible</span>
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
                    <p>Bonjour ! 👋 Je suis ALIH, votre assistant intelligent.</p>
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

      {/* ============ MERCHANT SPACE (auth-gated) ============ */}
      <MerchantPanel />

      {/* ============ HOW IT WORKS ============ */}
      <section className="how-it-works" id="how">
        <div className="container">
          <h2 className="section-title">Nos agents IA au travail</h2>
          <p className="section-subtitle">Quatre agents autonomes qui collaborent pour vous offrir la meilleure expérience de commerce</p>

          <div className="steps-grid">
            {/* Agent 1 — Commerce Agent */}
            <div className="step-card agent-card">
              <div className="agent-badge">Agent 01</div>
              <div className="agent-icon">
                <HiOutlineChatAlt2 size={28} />
              </div>
              <h3 className="agent-name">Commerce Agent</h3>
              <p className="agent-role">Compréhension & Recherche</p>
              <p className="agent-desc">Analyse votre intention, parcourt le catalogue et vous propose les produits les plus pertinents en temps réel.</p>
            </div>

            {/* Agent 2 — Pricing Agent */}
            <div className="step-card agent-card">
              <div className="agent-badge">Agent 02</div>
              <div className="agent-icon">
                <HiOutlineSearch size={28} />
              </div>
              <h3 className="agent-name">Pricing Agent</h3>
              <p className="agent-role">Évaluation & Valorisation</p>
              <p className="agent-desc">Calcule la valeur marché dynamique de chaque produit. Score la qualité et compare les prix pour vous éclairer.</p>
            </div>

            {/* Agent 3 — Negotiation Agent */}
            <div className="step-card agent-card">
              <div className="agent-badge">Agent 03</div>
              <div className="agent-icon">
                <HiOutlineCurrencyDollar size={28} />
              </div>
              <h3 className="agent-name">Negotiation Agent</h3>
              <p className="agent-role">Négociation Autonome</p>
              <p className="agent-desc">Négocie automatiquement avec le vendeur. Génère des contre-offres intelligentes en respectant les règles de prix.</p>
            </div>

            {/* Agent 4 — Payment Agent */}
            <div className="step-card agent-card">
              <div className="agent-badge">Agent 04</div>
              <div className="agent-icon">
                <HiOutlineCreditCard size={28} />
              </div>
              <h3 className="agent-name">Payment Agent</h3>
              <p className="agent-role">Transaction & Escrow</p>
              <p className="agent-desc">Initie le paiement sécurisé via Mobile Money. Gère l'escrow et confirme la transaction après livraison.</p>
            </div>
          </div>

          {/* Agent orchestration flow */}
          <div className="agent-flow">
            <span className="agent-flow-label">Orchestration</span>
            <div className="agent-flow-steps">
              <span>Intention détectée</span>
              <span className="flow-arrow">→</span>
              <span>Agent sélectionné</span>
              <span className="flow-arrow">→</span>
              <span>Outils exécutés</span>
              <span className="flow-arrow">→</span>
              <span>Réponse synthétisée</span>
              <span className="flow-arrow">→</span>
              <span>Règles validées</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST SECTION ============ */}
      <section className="trust" id="trust">
        <div className="network-pattern"></div>
        <div className="container">
          <h2 className="section-title">Pourquoi faire confiance à ALIH ?</h2>
          <p className="section-subtitle">Sécurité, transparence et intelligence à chaque transaction</p>

          <div className="trust-grid">
            <div className="trust-card">
              <div className="trust-icon">
                <FaShieldAlt size={24} color="#C65D2E" />
              </div>
              <h3>{t('trust.card1.title')}</h3>
              <p>{t('trust.card1.text')}</p>
            </div>

            <div className="trust-card">
              <div className="trust-icon">
                <FaUserCheck size={24} color="#C65D2E" />
              </div>
              <h3>{t('trust.card2.title')}</h3>
              <p>{t('trust.card2.text')}</p>
            </div>

            <div className="trust-card">
              <div className="trust-icon">
                <FaRobot size={24} color="#C65D2E" />
              </div>
              <h3>{t('trust.card3.title')}</h3>
              <p>{t('trust.card3.text')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING SECTION ============ */}
      <section className="pricing" id="pricing">
        <div className="container">
          <h2 className="section-title">Tarification basée sur votre volume d'activité</h2>
          <p className="section-subtitle">Vous ne payez que ce que ALIH génère pour vous. Plus vous vendez, moins c'est cher.</p>

          <div className="pricing-grid">
            {/* Starter — Low Volume */}
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="pricing-plan-name">Starter</h3>
                <div className="pricing-price">
                  <span className="pricing-amount">5%</span>
                  <span className="pricing-period">par transaction</span>
                </div>
                <p className="pricing-desc">Pour les vendeurs occasionnels avec un faible volume d'activité ALIH.</p>
              </div>
              <div className="pricing-volume">
                <span className="pricing-volume-label">Volume mensuel</span>
                <span className="pricing-volume-value">Jusqu'à 100 interactions</span>
              </div>
              <ul className="pricing-features">
                <li><FaCheck className="pricing-check" /> 100 conversations IA / mois</li>
                <li><FaCheck className="pricing-check" /> 30 négociations automatisées</li>
                <li><FaCheck className="pricing-check" /> Agent Commerce inclus</li>
                <li><FaCheck className="pricing-check" /> Paiement escrow standard</li>
                <li><FaCheck className="pricing-check" /> Support WhatsApp</li>
              </ul>
              <a href="https://wa.me/243991880037" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-secondary">
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
                <p className="pricing-desc">Pour les vendeurs actifs dont ALIH traite un volume significatif chaque mois.</p>
              </div>
              <div className="pricing-volume">
                <span className="pricing-volume-label">Volume mensuel</span>
                <span className="pricing-volume-value">100 à 500 interactions</span>
              </div>
              <ul className="pricing-features">
                <li><FaCheck className="pricing-check" /> 500 conversations IA / mois</li>
                <li><FaCheck className="pricing-check" /> 150 négociations automatisées</li>
                <li><FaCheck className="pricing-check" /> Agent Négociation avancé</li>
                <li><FaCheck className="pricing-check" /> Agent Pricing dynamique</li>
                <li><FaCheck className="pricing-check" /> Escrow prioritaire</li>
                <li><FaCheck className="pricing-check" /> Rapports d'activité hebdo</li>
                <li><FaCheck className="pricing-check" /> Support prioritaire 24/7</li>
              </ul>
              <a href="https://wa.me/243991880037" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-primary">
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
                <p className="pricing-desc">Pour les entreprises et gros vendeurs avec un haut volume d'activité ALIH.</p>
              </div>
              <div className="pricing-volume">
                <span className="pricing-volume-label">Volume mensuel</span>
                <span className="pricing-volume-value">500+ interactions</span>
              </div>
              <ul className="pricing-features">
                <li><FaCheck className="pricing-check" /> Conversations IA illimitées</li>
                <li><FaCheck className="pricing-check" /> Négociations illimitées</li>
                <li><FaCheck className="pricing-check" /> Tous les agents IA inclus</li>
                <li><FaCheck className="pricing-check" /> Agent Marketing automatique</li>
                <li><FaCheck className="pricing-check" /> API d'intégration catalogue</li>
                <li><FaCheck className="pricing-check" /> Dashboard & analytics complets</li>
                <li><FaCheck className="pricing-check" /> Gestionnaire de compte dédié</li>
              </ul>
              <a href="https://wa.me/243991880037" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-secondary">
                Contacter l'équipe
              </a>
            </div>
          </div>

          {/* Pricing note */}
          <p className="pricing-note">
            ◈ &nbsp;Une <strong>interaction</strong> = une conversation initiée par un acheteur via ALIH (recherche, négociation ou commande).<br />
            Aucun frais fixe. Commission uniquement sur les transactions conclues.
          </p>
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
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="platform-btn whatsapp"
            >
              <FaWhatsapp className="platform-icon" />
              <span>{t('cta.whatsapp')}</span>
            </a>
            <a href="#telegram" className="platform-btn telegram">
              <FaTelegramPlane className="platform-icon" />
              <span>{t('cta.telegram')}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="footer">
        <div className="container">
          <div className="footer-logo">
            {/* Placeholder dark logo — final logo coming later */}
            <svg className="footer-logo-svg" width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#C65D2E"/>
              <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="22">A</text>
            </svg>
            <span className="footer-logo-text" translate="no">ALIH</span>
          </div>
          <span className="footer-text">© 2026 ALIH — Autonomous Intelligent Liquidity Hub</span>
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
