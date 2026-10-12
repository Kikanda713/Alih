import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { FaShoppingCart, FaBars, FaTimes, FaShieldAlt, FaSatelliteDish, FaStore, FaWhatsapp, FaWifi } from 'react-icons/fa'
import tindisaLogo from '../../assets/tindisa-logo.png'
import { LanguageSwitcher } from '../../i18n'
import ProfileMenu from '../../components/ProfileMenu'
import { channels } from '../../auth/config'
import SearchBar from './SearchBar'
import UniverseNavLink from './UniverseNavLink'
import { UNIVERSES, universeHref, activeUniverse } from '../lib/universes'
import { useCart } from '../useCart'

/*
 * En-tête du marché : logo, recherche centrale, panier, compte. Seconde ligne :
 * les univers (portes d'entrée) défilables, détail au survol. Menu tiroir sur mobile.
 */
export default function MarketHeader() {
  const location = useLocation()
  const [params] = useSearchParams()
  const { count, setOpen } = useCart()
  const [menu, setMenu] = useState(false)
  const current = location.pathname === '/marche' ? activeUniverse(params) : null
  const searchKey = `${location.pathname}|${params.get('q') || ''}|${params.get('type') || ''}`

  // Ferme le menu à chaque navigation ; bloque le scroll de fond quand il est ouvert.
  const [lastPath, setLastPath] = useState(location.pathname + location.search)
  if (lastPath !== location.pathname + location.search) {
    setLastPath(location.pathname + location.search)
    if (menu) setMenu(false)
  }
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menu])

  return (
    <header className="mk-header">
      <div className="mk-header-top mk-container">
        <Link to="/" className="mk-logo" aria-label="Tindisa, accueil">
          <img src={tindisaLogo} alt="Tindisa" />
        </Link>
        <div className="mk-header-search">
          <SearchBar key={searchKey} />
        </div>
        <div className="mk-header-actions">
          <Link to="/verify" className="mk-icon-btn mk-hide-sm" title="Vérifier un certificat" aria-label="Vérifier un certificat">
            <FaShieldAlt />
          </Link>
          <span className="mk-hide-md"><LanguageSwitcher /></span>
          <span className="mk-hide-md"><ProfileMenu /></span>
          <button type="button" className="mk-cart-btn" onClick={() => setOpen(true)} aria-label={`Panier (${count})`}>
            <FaShoppingCart />
            <span className="mk-hide-sm">Panier</span>
            {count > 0 && <span className="mk-cart-count">{count}</span>}
          </button>
          <button type="button" className="mk-icon-btn mk-show-md" onClick={() => setMenu(true)} aria-label="Menu">
            <FaBars />
          </button>
        </div>
      </div>
      <div className="mk-header-search-mobile mk-container">
        <SearchBar key={`m-${searchKey}`} size="sm" placeholder="Rechercher produits, services…" />
      </div>
      <nav className="mk-unav" aria-label="Univers du marché">
        <div className="mk-container mk-unav-inner">
          <NavLink to="/marche" end className={() => `mk-unav-link${location.pathname === '/marche' && !current ? ' active' : ''}`}>
            Tout le marché
          </NavLink>
          {UNIVERSES.map((u) => <UniverseNavLink key={u.id} universe={u} active={current?.id === u.id} />)}
          <Link to="/centres" className={`mk-unav-link mk-unav-accent${location.pathname.startsWith("/centres") ? " active" : ""}`}><FaWifi /> Centres & Wi-Fi</Link>
          <Link to="/connectivite" className={`mk-unav-link${location.pathname === "/connectivite" ? " active" : ""}`}><FaSatelliteDish /> Connectivité</Link>
          <Link to="/vendre" className={`mk-unav-link${location.pathname === "/vendre" ? " active" : ""}`}><FaStore /> Vendre</Link>
        </div>
      </nav>

      {menu && (
        <div className="mk-drawer-overlay" onMouseDown={() => setMenu(false)}>
          <aside className="mk-drawer mk-drawer-left" onMouseDown={(e) => e.stopPropagation()} aria-label="Menu">
            <div className="mk-drawer-head">
              <img src={tindisaLogo} alt="Tindisa" className="mk-drawer-logo" />
              <button type="button" className="mk-icon-btn" onClick={() => setMenu(false)} aria-label="Fermer"><FaTimes /></button>
            </div>
            <div className="mk-drawer-body">
              <div className="mk-menu-account"><ProfileMenu /><LanguageSwitcher /></div>
              <p className="mk-menu-label">Le marché</p>
              <Link to="/marche" className="mk-menu-link">Tout le marché</Link>
              {UNIVERSES.map((u) => (
                <Link key={u.id} to={universeHref(u)} className="mk-menu-link"><u.icon /> {u.title}</Link>
              ))}
              <p className="mk-menu-label">Tindisa</p>
              <Link to="/centres" className="mk-menu-link"><FaWifi /> Centres & Wi-Fi</Link>
              <Link to="/connectivite" className="mk-menu-link"><FaSatelliteDish /> Connectivité Starlink</Link>
              <Link to="/vendre" className="mk-menu-link"><FaStore /> Vendre sur Tindisa</Link>
              <Link to="/verify" className="mk-menu-link"><FaShieldAlt /> Vérifier un certificat</Link>
              <a href={channels.whatsapp} target="_blank" rel="noopener noreferrer" className="mk-menu-link mk-menu-wa">
                <FaWhatsapp /> Discuter sur WhatsApp
              </a>
            </div>
          </aside>
        </div>
      )}
    </header>
  )
}
