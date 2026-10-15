import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { FaArrowLeft, FaBars, FaAngleLeft, FaAngleRight, FaTimes } from 'react-icons/fa'
import ProfileMenu from './ProfileMenu.jsx'
import { LanguageSwitcher, useT } from '../i18n'
import { DEMO_MODE } from '../demo/demo' // DEMO: retirer en production
import tindisaLogo from '../assets/tindisa-logo.png'

const COLLAPSE_KEY = 'tindisa_sidebar_collapsed'

function Logo() {
  // Même logo que la landing (cohérence de marque).
  return (
    <Link to="/" className="dash-logo">
      <img src={tindisaLogo} alt="Tindisa" className="dash-logo-img" />
    </Link>
  )
}

/**
 * Coquille d'application réutilisable (back-office marchand ET admin).
 * - nav: [{ to, end, icon, label }]
 * - sidebarExtra: nœud optionnel rendu dans la nav (ex. menu Canaux marchand)
 * - badge: petit libellé sous le logo (ex. "Back-office")
 * - floating: éléments flottants (ex. assistant) rendus hors de la grille
 * Rend <Outlet/> pour les routes enfants.
 *
 * Mobile (≤ 860 px) : la sidebar devient un tiroir pleine hauteur ouvert par le
 * hamburger, avec voile cliquable, bouton fermer, Échap et page bloquée derrière.
 * Le tiroir se referme tout seul au changement de page (état lié au chemin).
 */
export default function AppShell({ nav = [], sidebarExtra = null, badge = null, headerExtra = null, notice = null, floating = null }) {
  const { t } = useT()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  // Chemin sur lequel le tiroir a été ouvert : naviguer ailleurs le ferme.
  const [openedOn, setOpenedOn] = useState(null)
  const mobileOpen = openedOn === location.pathname

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  const closeMobile = () => setOpenedOn(null)
  const toggleMobile = () => setOpenedOn((p) => (p === location.pathname ? null : location.pathname))

  // Tiroir ouvert : Échap le ferme et la page derrière ne défile pas.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setOpenedOn(null) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  return (
    <div className={`dash${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {DEMO_MODE && <div className="demo-banner">{t('demo.banner')}</div>}

      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-header-left">
            <button
              className="dash-hamburger"
              onClick={toggleMobile}
              aria-label={t('dash.toggleSidebar')}
              aria-expanded={mobileOpen}
              aria-controls="dash-sidebar"
            >
              <FaBars />
            </button>
            <Logo />
            {badge && <span className="dash-badge">{badge}</span>}
          </div>
          <div className="dash-header-right">
            {headerExtra}
            <LanguageSwitcher />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <div className="dash-body">
        <div className="dash-backdrop" onClick={closeMobile} aria-hidden="true" />

        <aside className="dash-sidebar" id="dash-sidebar" aria-label="Menu">
          <div className="dash-drawer-head">
            <Logo />
            <button type="button" className="dash-drawer-close" onClick={closeMobile} aria-label="Fermer le menu">
              <FaTimes />
            </button>
          </div>
          <nav className="dash-nav">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                onClick={closeMobile}
                className={({ isActive }) => `dash-nav-item${isActive ? ' active' : ''}`}
              >
                {item.icon} <span>{item.label}</span>
              </NavLink>
            ))}
            {sidebarExtra}
          </nav>

          <div className="dash-sidebar-foot">
            <Link to="/" className="dash-nav-item dash-nav-back" title={t('dash.backToSite')} onClick={closeMobile}>
              <FaArrowLeft /> <span>{t('dash.backToSite')}</span>
            </Link>
            <button className="dash-collapse-btn" onClick={toggleCollapsed} title={t('dash.toggleSidebar')} aria-label={t('dash.toggleSidebar')}>
              {collapsed ? <FaAngleRight /> : <FaAngleLeft />}
            </button>
          </div>
        </aside>

        <main className="dash-main">
          {notice}
          <Outlet />
        </main>
      </div>
      {floating}
    </div>
  )
}
