import { useState } from 'react'
import { FaWhatsapp, FaTelegramPlane, FaBars, FaTimes, FaShieldAlt, FaUserCheck, FaRobot, FaCheck } from 'react-icons/fa'
import { HiOutlineChatAlt2, HiOutlineSearch, HiOutlineCurrencyDollar, HiOutlineCreditCard } from 'react-icons/hi'
import ProfileMenu from './components/ProfileMenu.jsx'
import MerchantPanel from './components/MerchantPanel.jsx'
import { useT, LanguageSwitcher } from './i18n/index.jsx'
import './App.css'

const WHATSAPP_LINK = 'https://wa.me/243991880037'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useT()

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
              <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="22">T</text>
            </svg>
            <div className="logo-text-group">
              <span className="logo-text" translate="no">Tindisa</span>
              <span className="logo-tagline">Acheter et vendre par message</span>
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
              <span>◈</span> {t('hero.badge')}
            </span>

            <h1 className="hero-title">
             <span className="hero-highlight"> {t('hero.title.highlight')}</span><br />
              {t('hero.title.rest')}
            </h1>

            <p className="hero-subtitle">
               {t('hero.subtitle')}
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
                    <p>Bonjour ! 👋 Je suis Tindisa, votre assistant.</p>
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
          <h2 className="section-title">{t('how.title')}</h2>
          <p className="section-subtitle">{t('how.subtitle')}</p>

          <div className="steps-grid">
            <div className="step-card agent-card">
              <div className="agent-badge">Étape 01</div>
              <div className="agent-icon">
                <HiOutlineChatAlt2 size={28} />
              </div>
              <h3 className="agent-name">Discuter</h3>
              <p className="agent-role">Sur WhatsApp ou Telegram</p>
              <p className="agent-desc">Dites ce que vous cherchez à vendre ou à acheter. L'assistant comprend et vous propose les bonnes offres.</p>
            </div>

            <div className="step-card agent-card">
              <div className="agent-badge">Étape 02</div>
              <div className="agent-icon">
                <HiOutlineSearch size={28} />
              </div>
              <h3 className="agent-name">Comparer</h3>
              <p className="agent-role">Le bon prix</p>
              <p className="agent-desc">Voyez plusieurs offres et leurs prix. L'assistant vous aide à choisir l'option la plus avantageuse.</p>
            </div>

            <div className="step-card agent-card">
              <div className="agent-badge">Étape 03</div>
              <div className="agent-icon">
                <HiOutlineCurrencyDollar size={28} />
              </div>
              <h3 className="agent-name">Négocier</h3>
              <p className="agent-role">À votre place</p>
              <p className="agent-desc">L'assistant négocie avec le vendeur pour obtenir le meilleur prix, en toute transparence.</p>
            </div>

            <div className="step-card agent-card">
              <div className="agent-badge">Étape 04</div>
              <div className="agent-icon">
                <HiOutlineCreditCard size={28} />
              </div>
              <h3 className="agent-name">Payer & recevoir</h3>
              <p className="agent-role">En sécurité</p>
              <p className="agent-desc">Payez par Mobile Money en toute sécurité. Le vendeur n'est payé qu'après la livraison.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST SECTION ============ */}
      <section className="trust" id="trust">
        <div className="network-pattern"></div>
        <div className="container">
          <h2 className="section-title">{t('trust.title')}</h2>
          <p className="section-subtitle">Sécurité, transparence et simplicité à chaque transaction</p>

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
          <p className="section-subtitle">Vous ne payez que ce que Tindisa génère pour vous. Plus vous vendez, moins c'est cher.</p>

          <div className="pricing-grid">
            {/* Starter — Low Volume */}
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="pricing-plan-name">Starter</h3>
                <div className="pricing-price">
                  <span className="pricing-amount">5%</span>
                  <span className="pricing-period">par transaction</span>
                </div>
                <p className="pricing-desc">Pour les vendeurs occasionnels avec un faible volume d'activité Tindisa.</p>
              </div>
              <div className="pricing-volume">
                <span className="pricing-volume-label">Volume mensuel</span>
                <span className="pricing-volume-value">Jusqu'à 100 interactions</span>
              </div>
              <ul className="pricing-features">
                <li><FaCheck className="pricing-check" /> 100 conversations / mois</li>
                <li><FaCheck className="pricing-check" /> 30 négociations automatisées</li>
                <li><FaCheck className="pricing-check" /> Assistant commerce inclus</li>
                <li><FaCheck className="pricing-check" /> Paiement sécurisé standard</li>
                <li><FaCheck className="pricing-check" /> Support WhatsApp</li>
              </ul>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-secondary">
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
                <p className="pricing-desc">Pour les vendeurs actifs dont Tindisa traite un volume significatif chaque mois.</p>
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
                <li><FaCheck className="pricing-check" /> Paiement prioritaire</li>
                <li><FaCheck className="pricing-check" /> Rapports d'activité hebdo</li>
                <li><FaCheck className="pricing-check" /> Support prioritaire 24/7</li>
              </ul>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-primary">
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
                <p className="pricing-desc">Pour les entreprises et gros vendeurs avec un haut volume d'activité Tindisa.</p>
              </div>
              <div className="pricing-volume">
                <span className="pricing-volume-label">Volume mensuel</span>
                <span className="pricing-volume-value">500+ interactions</span>
              </div>
              <ul className="pricing-features">
                <li><FaCheck className="pricing-check" /> Conversations illimitées</li>
                <li><FaCheck className="pricing-check" /> Négociations illimitées</li>
                <li><FaCheck className="pricing-check" /> Toutes les fonctions incluses</li>
                <li><FaCheck className="pricing-check" /> Marketing automatique</li>
                <li><FaCheck className="pricing-check" /> API d'intégration catalogue</li>
                <li><FaCheck className="pricing-check" /> Dashboard & analytics complets</li>
                <li><FaCheck className="pricing-check" /> Gestionnaire de compte dédié</li>
              </ul>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-secondary">
                Contacter l'équipe
              </a>
            </div>
          </div>

          {/* Pricing note */}
          <p className="pricing-note">
            ◈ &nbsp;Une <strong>interaction</strong> = une conversation initiée par un acheteur via Tindisa (recherche, négociation ou commande).<br />
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
              <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="22">T</text>
            </svg>
            <span className="footer-logo-text" translate="no">Tindisa</span>
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
