import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa'
import { useT } from './i18n'
import { channels } from './auth/config'
import HomeHero from './landing/HomeHero'
import MarketRails from './landing/MarketRails'

/*
 * Page d'accueil = vitrine du marché (site multi-pages : /marche, /centres,
 * /connectivite, /vendre…). Ordre : recherche + univers, annonces réelles,
 * appel final. En-tête/pied : MarketLayout.
 */

function App() {
  const { t } = useT()
  const location = useLocation()

  useEffect(() => { document.title = 'Tindisa · Le marché du Congo, par message' }, [])

  // Ancres (/#contact…) depuis les autres pages : défilement après rendu.
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    return () => clearTimeout(timer)
  }, [location.hash])

  return (
    <div className="app mk-home">
      <HomeHero />
      <MarketRails />

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
