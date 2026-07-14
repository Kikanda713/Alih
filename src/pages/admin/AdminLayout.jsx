import { useAuth0 } from '@auth0/auth0-react'
import { Link, Navigate } from 'react-router-dom'
import { FaChartPie, FaUsers, FaCreditCard, FaMotorcycle, FaMapMarkedAlt, FaPercent } from 'react-icons/fa'
import { isAuth0Configured } from '../../auth/config'
import { useT } from '../../i18n/index.jsx'
import { Spinner } from '../../components/ui.jsx'
import AppShell from '../../components/AppShell.jsx'
import { useIsAdmin, isAdminRoles } from '../../auth/roles'
import { DEMO_MODE, isDemoSession, demoUser } from '../../demo/demo' // DEMO: retirer en production

function AdminShell() {
  const { t } = useT()
  const nav = [
    { to: '/admin', end: true, icon: <FaChartPie />, label: t('admin.nav.overview') },
    { to: '/admin/users', icon: <FaUsers />, label: t('admin.nav.users') },
    { to: '/admin/subscriptions', icon: <FaCreditCard />, label: t('admin.nav.subs') },
    { to: '/admin/commissions', icon: <FaPercent />, label: 'Commissions' },
    { to: '/admin/drivers', icon: <FaMotorcycle />, label: 'Livreurs' },
    { to: '/admin/map', icon: <FaMapMarkedAlt />, label: 'Carte' },
  ]
  return <AppShell nav={nav} badge={t('admin.badge')} />
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
