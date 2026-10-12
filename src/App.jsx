import { useEffect } from 'react'
import HomeHero from './landing/HomeHero'
import MarketRails from './landing/MarketRails'

/*
 * Page d'accueil = vitrine du marché (site multi-pages : /marche, /centres,
 * /connectivite, /vendre…) : la recherche, puis les annonces réelles.
 * En-tête, pied de page et accès messagerie : MarketLayout.
 */
function App() {
  useEffect(() => { document.title = 'Tindisa · Le marché du Congo, par message' }, [])

  return (
    <div className="app mk-home">
      <HomeHero />
      <MarketRails />
    </div>
  )
}

export default App
