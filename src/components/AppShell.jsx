import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { FaArrowLeft, FaBars, FaAngleLeft, FaAngleRight } from 'react-icons/fa'
import ProfileMenu from './ProfileMenu.jsx'
import { LanguageSwitcher, useT } from '../i18n/index.jsx'
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
 * Rend <Outlet/> pour les routes enfants.
 */
export default function AppShell({ nav = [], sidebarExtra = null, badge = null }) {
  const { t } = useT()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  const closeMobile = () => setMobileOpen(false)

  return (
    <div className={`dash${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {DEMO_MODE && <div className="demo-banner">{t('demo.banner')}</div>}

      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-header-left">
            <button className="dash-hamburger" onClick={() => setMobileOpen((o) => !o)} aria-label={t('dash.toggleSidebar')}>
              <FaBars />
            </button>
            <Logo />
            {badge && <span className="dash-badge">{badge}</span>}
          </div>
          <div className="dash-header-right">
            <LanguageSwitcher />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <div className="dash-body">
        <div className="dash-backdrop" onClick={closeMobile} />

        <aside className="dash-sidebar">
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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
