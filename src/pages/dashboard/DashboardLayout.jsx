import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { NavLink, Outlet, Link, Navigate } from 'react-router-dom'
import { FaHome, FaBoxOpen, FaArrowLeft, FaHandshake, FaBars, FaAngleLeft, FaAngleRight } from 'react-icons/fa'
import { isAuth0Configured } from '../../auth/config'
import ProfileMenu from '../../components/ProfileMenu.jsx'
import { LanguageSwitcher, useT } from '../../i18n/index.jsx'
import { Spinner } from '../../components/ui.jsx'
import { DEMO_MODE, isDemoSession } from '../../demo/demo' // DEMO: retirer en production

const COLLAPSE_KEY = 'tindisa_sidebar_collapsed'

function Logo() {
  return (
    <Link to="/" className="dash-logo">
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#C65D2E" />
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="22">T</text>
      </svg>
      <span className="dash-logo-text" translate="no">Tindisa</span>
    </Link>
  )
}

// Coquille de mise en page partagée (aucun hook d'auth ici).
function DashboardShell() {
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

  const nav = [
    { to: '/dashboard', end: true, icon: <FaHome />, label: t('dash.nav.home') },
    { to: '/dashboard/catalogue', icon: <FaBoxOpen />, label: t('dash.nav.catalogue') },
    { to: '/dashboard/ventes', icon: <FaHandshake />, label: t('dash.nav.sales') },
  ]

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

function DashboardLayoutInner() {
  const { isAuthenticated, isLoading } = useAuth0()
  const { t } = useT()

  if (isLoading) {
    return <div className="dash-loading"><Spinner label={t('merchant.loading')} /></div>
  }
  if (!isAuthenticated) {
    return (
      <div className="dash-loading">
        <p>{t('dash.loginRequired')}</p>
        <Link to="/" className="ui-btn ui-btn-primary">{t('dash.backToSite')}</Link>
      </div>
    )
  }
  return <DashboardShell />
}

export default function DashboardLayout() {
  // DEMO: garde fictive (session démo). Retirer ce bloc en production.
  if (DEMO_MODE) {
    return isDemoSession() ? <DashboardShell /> : <Navigate to="/" replace />
  }
  if (!isAuth0Configured) return <Navigate to="/" replace />
  return <DashboardLayoutInner />
}
