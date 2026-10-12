import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { FaShoppingCart, FaBars, FaTimes, FaShieldAlt, FaStore, FaWhatsapp, FaTelegramPlane, FaWifi, FaSearch } from 'react-icons/fa'
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

  // Une page qui affiche sa propre grande recherche ([data-body-search], ex. l'accueil)
  // masque celle de l'en-tête tant qu'elle est visible : jamais deux recherches à l'écran,
  // et la recherche revient dans l'en-tête dès qu'on a défilé au-delà.
  const [bodySearch, setBodySearch] = useState({ path: null, visible: false })
  useEffect(() => {
    const el = document.querySelector('[data-body-search]')
    if (!el) return
    const header = document.querySelector('.mk-header')
    const io = new IntersectionObserver(
      ([entry]) => setBodySearch({ path: location.pathname, visible: entry.isIntersecting }),
      { rootMargin: `-${header?.offsetHeight || 0}px 0px 0px 0px` },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [location.pathname])
  const hasBodySearch = bodySearch.path === location.pathname
  const hideSearch = hasBodySearch && bodySearch.visible
  // Mobile : ramène à la grande recherche de la page (pas de ligne qui apparaît / disparaît).
  const goToBodySearch = () => {
    const el = document.querySelector('[data-body-search]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.querySelector('input')?.focus({ preventScroll: true })
  }

  return (
    <header className="mk-header">
      <div className="mk-header-top mk-container">
        <Link to="/" className="mk-logo" aria-label="Tindisa, accueil">
          <img src={tindisaLogo} alt="Tindisa" />
        </Link>
        <div className={`mk-header-search${hideSearch ? " is-hidden" : ""}`} aria-hidden={hideSearch || undefined}>
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
          {hasBodySearch && !hideSearch && (
            <button type="button" className="mk-icon-btn mk-show-md" onClick={goToBodySearch} aria-label="Rechercher">
              <FaSearch />
            </button>
          )}
          <button type="button" className="mk-icon-btn mk-show-md" onClick={() => setMenu(true)} aria-label="Menu">
            <FaBars />
          </button>
        </div>
      </div>
      <div className={`mk-header-search-mobile mk-container${hasBodySearch ? " is-hidden" : ""}`} aria-hidden={hasBodySearch || undefined}>
        <SearchBar key={`m-${searchKey}`} size="sm" placeholder="Rechercher produits, services…" />
      </div>
      <nav className="mk-unav" aria-label="Univers du marché">
        <div className="mk-container mk-unav-inner">
          <NavLink to="/marche" end className={() => `mk-unav-link${location.pathname === '/marche' && !current ? ' active' : ''}`}>
            Tout le marché
          </NavLink>
          {UNIVERSES.map((u) => <UniverseNavLink key={u.id} universe={u} active={current?.id === u.id} />)}
          <Link to="/centres" className={`mk-unav-link mk-unav-accent${location.pathname.startsWith("/centres") ? " active" : ""}`}><FaWifi /> Wifi Zone</Link>
          <Link to="/vendre" className={`mk-unav-link${location.pathname === "/vendre" ? " active" : ""}`}><FaStore /> Vendre</Link>
        </div>
      </nav>

      {/* Portail vers <body> : le flou (backdrop-filter) de l'en-tête enfermerait
          le menu « fixed » dans sa hauteur, derrière la zone de recherche. */}
      {menu && createPortal(
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
              <Link to="/centres" className="mk-menu-link"><FaWifi /> Wifi Zone</Link>
              <Link to="/vendre" className="mk-menu-link"><FaStore /> Vendre sur Tindisa</Link>
              <Link to="/verify" className="mk-menu-link"><FaShieldAlt /> Vérifier un certificat</Link>
              <a href={channels.whatsapp} target="_blank" rel="noopener noreferrer" className="mk-menu-link mk-menu-wa">
                <FaWhatsapp /> Discuter sur WhatsApp
              </a>
              <a href={channels.telegram} target="_blank" rel="noopener noreferrer" className="mk-menu-link mk-menu-tg">
                <FaTelegramPlane /> Discuter sur Telegram
              </a>
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </header>
  )
}
