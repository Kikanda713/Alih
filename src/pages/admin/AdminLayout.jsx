import { useAuth0 } from '@auth0/auth0-react'
import { Link, Navigate } from 'react-router-dom'
import { FaChartPie, FaUsers, FaMotorcycle, FaMapMarkedAlt, FaPercent, FaCertificate, FaHandshake, FaGlobeAfrica, FaWifi, FaRobot, FaStore, FaExchangeAlt, FaBullhorn } from 'react-icons/fa'
import { isAuth0Configured } from '../../auth/config'
import { useT } from '../../i18n'
import { Spinner } from '../../components/ui.jsx'
import AppShell from '../../components/AppShell.jsx'
import { useIsAdmin, isAdminRoles } from '../../auth/roles'
import { AdminScopeProvider, CityScopeBar } from './AdminScopeContext.jsx'
import { DEMO_MODE, isDemoSession, demoUser } from '../../demo/demo' // DEMO: retirer en production

function AdminShell() {
  const { t } = useT()
  // Modèle commission (abonnement EN VEILLE) → plus d'onglet « Abonnements » ;
  // la facturation admin passe par « Commissions ».
  const nav = [
    { to: '/admin', end: true, icon: <FaChartPie />, label: t('admin.nav.overview') },
    { to: '/admin/users', icon: <FaUsers />, label: t('admin.nav.users') },
    { to: '/admin/vendeurs', icon: <FaStore />, label: 'Vendeurs' },
    { to: '/admin/commissions', icon: <FaPercent />, label: 'Commissions' },
    { to: '/admin/influenceurs', icon: <FaBullhorn />, label: 'Influenceurs' },
    { to: '/admin/certification', icon: <FaCertificate />, label: 'Certification' },
    { to: '/admin/marche', icon: <FaGlobeAfrica />, label: 'Marché web' },
    { to: '/admin/centres', icon: <FaWifi />, label: 'Wifi Zone' },
    { to: '/admin/ia', icon: <FaRobot />, label: 'Réglages IA' },
    { to: '/admin/p2p', icon: <FaHandshake />, label: 'Marché P2P' },
    { to: '/admin/bata', icon: <FaExchangeAlt />, label: 'BATA' },
    { to: '/admin/drivers', icon: <FaMotorcycle />, label: 'Livreurs' },
    { to: '/admin/map', icon: <FaMapMarkedAlt />, label: 'Carte' },
  ]
  return (
    <AdminScopeProvider>
      <AppShell nav={nav} badge={t('admin.badge')} headerExtra={<CityScopeBar />} />
    </AdminScopeProvider>
  )
}

function AdminDenied() {
  const { t } = useT()
  return (
    <div className="dash-loading">
      <h2 className="dash-h2">{t('admin.denied.title')}</h2>
      <p>{t('admin.denied.text')}</p>
      <Link to="/dashboard" className="ui-btn ui-btn-primary">{t('admin.denied.cta')}</Link>
    </div>
  )
}

function AdminLayoutInner() {
  const { isAuthenticated, isLoading } = useAuth0()
  const isAdmin = useIsAdmin()
  const { t } = useT()
  if (isLoading) return <div className="dash-loading"><Spinner label={t('merchant.loading')} /></div>
  if (!isAuthenticated) return <Navigate to="/" replace />
  return isAdmin ? <AdminShell /> : <AdminDenied />
}

export default function AdminLayout() {
  // DEMO: accès admin si la session démo a un rôle admin. Retirer en production.
  if (DEMO_MODE) {
    if (!isDemoSession()) return <Navigate to="/" replace />
    return isAdminRoles(demoUser.roles) ? <AdminShell /> : <AdminDenied />
  }
  if (!isAuth0Configured) return <Navigate to="/" replace />
  return <AdminLayoutInner />
}
