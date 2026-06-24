import { useAuth0 } from '@auth0/auth0-react'
import { Link, Navigate } from 'react-router-dom'
import { FaHome, FaBoxOpen, FaHandshake, FaWallet } from 'react-icons/fa'
import { isAuth0Configured } from '../../auth/config'
import { useT } from '../../i18n/index.jsx'
import { Spinner } from '../../components/ui.jsx'
import AppShell from '../../components/AppShell.jsx'
import SidebarChannels from '../../components/SidebarChannels.jsx'
import { DEMO_MODE, isDemoSession } from '../../demo/demo' // DEMO: retirer en production

function MerchantShell() {
  const { t } = useT()
  const nav = [
    { to: '/dashboard', end: true, icon: <FaHome />, label: t('dash.nav.home') },
    { to: '/dashboard/catalogue', icon: <FaBoxOpen />, label: t('dash.nav.catalogue') },
    { to: '/dashboard/ventes', icon: <FaHandshake />, label: t('dash.nav.sales') },
    { to: '/dashboard/wallet', icon: <FaWallet />, label: t('dash.nav.wallet') },
  ]
  return <AppShell nav={nav} sidebarExtra={<SidebarChannels />} />
}

function MerchantLayoutInner() {
  const { isAuthenticated, isLoading } = useAuth0()
  const { t } = useT()
  if (isLoading) return <div className="dash-loading"><Spinner label={t('merchant.loading')} /></div>
  if (!isAuthenticated) {
    return (
      <div className="dash-loading">
        <p>{t('dash.loginRequired')}</p>
        <Link to="/" className="ui-btn ui-btn-primary">{t('dash.backToSite')}</Link>
      </div>
    )
  }
  return <MerchantShell />
}

export default function DashboardLayout() {
  // DEMO: garde fictive (session démo). Retirer ce bloc en production.
  if (DEMO_MODE) {
    return isDemoSession() ? <MerchantShell /> : <Navigate to="/" replace />
  }
  if (!isAuth0Configured) return <Navigate to="/" replace />
  return <MerchantLayoutInner />
}
