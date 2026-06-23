import { useState } from 'react'
import { FaWhatsapp, FaTelegramPlane, FaBars, FaTimes, FaShieldAlt, FaUserCheck, FaRobot, FaCheck } from 'react-icons/fa'
import { HiOutlineChatAlt2, HiOutlineSearch, HiOutlineCurrencyDollar, HiOutlineCreditCard } from 'react-icons/hi'
import tindisaLogo from './assets/tindisa-logo.png'
import tindisaFooterLogo from './assets/tindisa.png'
import './App.css'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pricingTab, setPricingTab] = useState('tindisa')

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
            <li><a href="#home" onClick={(e) => handleNavClick(e, 'home')}>Accueil</a></li>
            <li><a href="#how" onClick={(e) => handleNavClick(e, 'how')}>Comment ça marche</a></li>
            <li><a href="#trust" onClick={(e) => handleNavClick(e, 'trust')}>Confiance</a></li>
            <li><a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')}>Tarifs</a></li>
            <li><a href="#contact" onClick={(e) => handleNavClick(e, 'contact')}>Contact</a></li>
          </ul>

          <div className="nav-auth">
            <a href="#signin" className="btn-signin">Se connecter</a>
            <a href="#signup" className="btn-signup">S'inscrire</a>
          </div>

          {/* Mobile-only menu panel */}
          <div className={`mobile-menu ${menuOpen ? 'active' : ''}`}>
            <ul className="mobile-menu-links">
              <li><a href="#home" onClick={(e) => handleNavClick(e, 'home')}>Accueil</a></li>
              <li><a href="#how" onClick={(e) => handleNavClick(e, 'how')}>Comment ça marche</a></li>
              <li><a href="#trust" onClick={(e) => handleNavClick(e, 'trust')}>Confiance</a></li>
              <li><a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')}>Tarifs</a></li>
              <li><a href="#contact" onClick={(e) => handleNavClick(e, 'contact')}>Contact</a></li>
            </ul>
            <div className="mobile-menu-auth">
              <a href="#signin" className="btn-signin">Se connecter</a>
              <a href="#signup" className="btn-signup">S'inscrire</a>
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
             <span className="hero-highlight"> Achetez, vendez</span><br />
              depuis votre messagerie.
              
            </h1>

            <p className="hero-subtitle">
              Avec tindisa, plus besoin de parcourir des catalogues ou de visiter plusieurs boutiques. Trouvez ce dont vous avez besoin directement dans votre messagerie.
            </p>

            {/* Platform CTAs */}
            <div className="platforms">
              <a
                href="https://wa.me/243991880037"
                target="_blank"
                rel="noopener noreferrer"
                className="platform-btn whatsapp"
              >
                <FaWhatsapp className="platform-icon" />
                <span>Parler sur WhatsApp</span>
              </a>
              <a href="#telegram" className="platform-btn telegram">
                <FaTelegramPlane className="platform-icon" />
                <span>Ouvrir sur Telegram</span>
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
          <h2 className="section-title">Comment ça marche</h2>
          <p className="section-subtitle">Achetez et vendez en toute simplicité via WhatsApp ou Telegram, en 4 étapes</p>

          <div className="steps-grid">
            {/* Étape 1 */}
            <div className="step-card agent-card">
              <div className="agent-badge">Étape 01</div>
              <div className="agent-icon">
                <HiOutlineChatAlt2 size={28} />
              </div>
              <h3 className="agent-name">Envoyez un message</h3>
              <p className="agent-role">WhatsApp ou Telegram</p>
              <p className="agent-desc">Ouvrez une conversation sur WhatsApp ou Telegram et décrivez ce que vous cherchez ou ce que vous souhaitez vendre.</p>
            </div>

            {/* Étape 2 */}
            <div className="step-card agent-card">
              <div className="agent-badge">Étape 02</div>
              <div className="agent-icon">
                <HiOutlineSearch size={28} />
              </div>
              <h3 className="agent-name">Recevez des offres</h3>
              <p className="agent-role">Recherche intelligente</p>
              <p className="agent-desc">Parcourez les meilleures offres disponibles, comparées et vérifiées en temps réel selon vos critères.</p>
            </div>

            {/* Étape 3 */}
            <div className="step-card agent-card">
              <div className="agent-badge">Étape 03</div>
              <div className="agent-icon">
                <HiOutlineCurrencyDollar size={28} />
              </div>
              <h3 className="agent-name">Négociez le prix</h3>
              <p className="agent-role">Meilleur prix garanti</p>
              <p className="agent-desc">Proposez votre prix ou laissez Tindisa négocier pour vous. Obtenez toujours la meilleure offre possible.</p>
            </div>

            {/* Étape 4 */}
            <div className="step-card agent-card">
              <div className="agent-badge">Étape 04</div>
              <div className="agent-icon">
                <HiOutlineCreditCard size={28} />
              </div>
              <h3 className="agent-name">Payez en sécurité</h3>
              <p className="agent-role">Mobile Money & Escrow</p>
              <p className="agent-desc">Payez via Mobile Money en toute sécurité. Votre argent est protégé jusqu'à la confirmation de réception.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST SECTION ============ */}
      <section className="trust" id="trust">
        <div className="network-pattern"></div>
        <div className="container">
          <h2 className="section-title">Pourquoi faire confiance à tindisa ?</h2>
          <p className="section-subtitle">Sécurité, transparence et intelligence à chaque transaction</p>

          <div className="trust-grid">
            <div className="trust-card">
              <div className="trust-icon">
                <FaShieldAlt size={24} color="#C65D2E" />
              </div>
              <h3>Paiements sécurisés</h3>
              <p>Vos fonds sont protégés par un système d'escrow. Le vendeur ne reçoit le paiement qu'après votre confirmation.</p>
            </div>

            <div className="trust-card">
              <div className="trust-icon">
                <FaUserCheck size={24} color="#C65D2E" />
              </div>
              <h3>Vendeurs vérifiés</h3>
              <p>Chaque vendeur passe par un processus de vérification KYC. Seuls les profils de confiance sont actifs.</p>
            </div>

            <div className="trust-card">
              <div className="trust-icon">
                <FaRobot size={24} color="#C65D2E" />
              </div>
              <h3>IA responsable</h3>
              <p>Nos agents respectent des règles strictes : prix plancher, transparence des offres, aucune manipulation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING SECTION ============ */}
      <section className="pricing" id="pricing">
        <div className="container">
          <h2 className="section-title">Choisissez votre formule</h2>
          <p className="section-subtitle">Revendeurs, choisissez la formule adaptée à vos besoins : commission au volume ou abonnement mensuel.</p>

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
                    <li><FaCheck className="pricing-check" /> Pricing dynamique</li>
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
                  <a href="https://wa.me/243991880037" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-secondary">
                    Contacter l'équipe
                  </a>
                </div>
              </div>

              <p className="pricing-note">
                ◈ &nbsp;Une <strong>interaction</strong> = une conversation initiée par un acheteur (recherche, négociation ou commande).<br />
                Aucun frais fixe. Commission uniquement sur les transactions conclues.
              </p>
            </>
          )}

          {/* ===== TINDISA PURE — Monthly subscriptions ===== */}
          {pricingTab === 'tindisa' && (
            <>
              <div className="pricing-grid">
                {/* Basic */}
                <div className="pricing-card">
                  <div className="pricing-header">
                    <h3 className="pricing-plan-name">Basic</h3>
                    <div className="pricing-price">
                      <span className="pricing-amount">9$</span>
                      <span className="pricing-period">/ mois</span>
                    </div>
                    <p className="pricing-desc">Pour les particuliers qui veulent acheter et vendre simplement.</p>
                  </div>
                  <ul className="pricing-features">
                    <li><FaCheck className="pricing-check" /> Accès complet au catalogue</li>
                    <li><FaCheck className="pricing-check" /> 50 conversations / mois</li>
                    <li><FaCheck className="pricing-check" /> Négociation de prix incluse</li>
                    <li><FaCheck className="pricing-check" /> Paiement escrow standard</li>
                    <li><FaCheck className="pricing-check" /> Support WhatsApp & Telegram</li>
                  </ul>
                  <a href="https://wa.me/243991880037" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-secondary">
                    S'abonner
                  </a>
                </div>

                {/* Pro (Featured) */}
                <div className="pricing-card pricing-card-featured">
                  <div className="pricing-badge">Populaire</div>
                  <div className="pricing-header">
                    <h3 className="pricing-plan-name">Pro</h3>
                    <div className="pricing-price">
                      <span className="pricing-amount">25$</span>
                      <span className="pricing-period">/ mois</span>
                    </div>
                    <p className="pricing-desc">Pour les vendeurs réguliers qui veulent maximiser leurs ventes.</p>
                  </div>
                  <ul className="pricing-features">
                    <li><FaCheck className="pricing-check" /> Conversations illimitées</li>
                    <li><FaCheck className="pricing-check" /> Mise en avant des produits</li>
                    <li><FaCheck className="pricing-check" /> Négociation avancée</li>
                    <li><FaCheck className="pricing-check" /> Escrow prioritaire</li>
                    <li><FaCheck className="pricing-check" /> Rapports d'activité mensuels</li>
                    <li><FaCheck className="pricing-check" /> Support prioritaire 24/7</li>
                  </ul>
                  <a href="https://wa.me/243991880037" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-primary">
                    S'abonner
                  </a>
                </div>

                {/* Business */}
                <div className="pricing-card">
                  <div className="pricing-header">
                    <h3 className="pricing-plan-name">Business</h3>
                    <div className="pricing-price">
                      <span className="pricing-amount">59$</span>
                      <span className="pricing-period">/ mois</span>
                    </div>
                    <p className="pricing-desc">Pour les entreprises avec un gros volume de ventes mensuel.</p>
                  </div>
                  <ul className="pricing-features">
                    <li><FaCheck className="pricing-check" /> Tout du plan Pro</li>
                    <li><FaCheck className="pricing-check" /> Catalogue illimité</li>
                    <li><FaCheck className="pricing-check" /> Marketing automatique</li>
                    <li><FaCheck className="pricing-check" /> API d'intégration catalogue</li>
                    <li><FaCheck className="pricing-check" /> Dashboard & analytics complets</li>
                    <li><FaCheck className="pricing-check" /> Gestionnaire de compte dédié</li>
                  </ul>
                  <a href="https://wa.me/243991880037" target="_blank" rel="noopener noreferrer" className="pricing-btn pricing-btn-secondary">
                    Contacter l'équipe
                  </a>
                </div>
              </div>

              {/* <p className="pricing-note">
                ◈ &nbsp;Abonnement mensuel sans engagement. Résiliable à tout moment.<br />
                Paiement via Mobile Money (M-Pesa, Airtel Money, Orange Money).
              </p> */}
            </>
          )}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="final-cta" id="contact">
        <div className="network-pattern"></div>
        <div className="container">
          <div className="final-cta-accent"></div>
          <h2 className="final-cta-title">Commencer une conversation</h2>
          <p className="final-cta-subtitle">
            Rejoignez des milliers d'utilisateurs qui achètent et vendent intelligemment
            via leur messagerie préférée.
          </p>
          <div className="platforms">
            <a
              href="https://wa.me/243991880037"
              target="_blank"
              rel="noopener noreferrer"
              className="platform-btn whatsapp"
            >
              <FaWhatsapp className="platform-icon" />
              <span>WhatsApp</span>
            </a>
            <a href="#telegram" className="platform-btn telegram">
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
          <span className="footer-text">© 2026 Tindisa — Votre marché dans la messagerie</span>
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
