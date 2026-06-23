import { useAuth0 } from '@auth0/auth0-react'
import { NavLink, Outlet, Link, Navigate } from 'react-router-dom'
import { FaHome, FaBoxOpen, FaArrowLeft, FaHandshake } from 'react-icons/fa'
import { isAuth0Configured } from '../../auth/config'
import ProfileMenu from '../../components/ProfileMenu.jsx'
import { LanguageSwitcher, useT } from '../../i18n/index.jsx'
import { Spinner } from '../../components/ui.jsx'
import { DEMO_MODE, isDemoSession } from '../../demo/demo' // DEMO: retirer en production

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
  return (
    <div className="dash">
      {DEMO_MODE && <div className="demo-banner">{t('demo.banner')}</div>}
      <header className="dash-header">
        <div className="dash-header-inner">
          <Logo />
          <div className="dash-header-right">
            <LanguageSwitcher />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <div className="dash-body">
        <aside className="dash-sidebar">
          <nav className="dash-nav">
            <NavLink to="/dashboard" end className={({ isActive }) => `dash-nav-item${isActive ? ' active' : ''}`}>
              <FaHome /> <span>{t('dash.nav.home')}</span>
            </NavLink>
            <NavLink to="/dashboard/catalogue" className={({ isActive }) => `dash-nav-item${isActive ? ' active' : ''}`}>
              <FaBoxOpen /> <span>{t('dash.nav.catalogue')}</span>
            </NavLink>
            <NavLink to="/dashboard/ventes" className={({ isActive }) => `dash-nav-item${isActive ? ' active' : ''}`}>
              <FaHandshake /> <span>{t('dash.nav.sales')}</span>
            </NavLink>
          </nav>
          <Link to="/" className="dash-nav-item dash-nav-back">
            <FaArrowLeft /> <span>{t('dash.backToSite')}</span>
          </Link>
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
