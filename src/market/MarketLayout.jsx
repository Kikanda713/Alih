import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import MarketHeader from './components/MarketHeader'
import MarketFooter from './components/MarketFooter'
import CartDrawer from './components/CartDrawer'
import ChatWidget from './chat/ChatWidget'
import { ChatProvider } from './chat/ChatProvider'
import '../App.css'
import './market.css'

/** Gabarit des pages publiques : en-tête, contenu, pied, tiroir panier et chat de l'agent. */
export default function MarketLayout() {
  const { pathname, hash } = useLocation()
  // Nouvelle page = haut de page (sauf ancre gérée par la page elle-même).
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <ChatProvider>
      <div className="mk-app">
        <MarketHeader />
        <main className="mk-main">
          <Outlet />
        </main>
        <MarketFooter />
        <CartDrawer />
        <ChatWidget />
      </div>
    </ChatProvider>
  )
}
