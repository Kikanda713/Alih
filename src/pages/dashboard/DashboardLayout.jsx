import { useAuth0 } from '@auth0/auth0-react'
import { Link, Navigate } from 'react-router-dom'
import { FaHome, FaBoxOpen, FaHandshake, FaWallet, FaCreditCard, FaAward, FaBan } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { loadTaxonomy, isIndividualType } from '../../api/taxonomy'
import { isAuth0Configured } from '../../auth/config'
import { useT } from '../../i18n'
import { Spinner } from '../../components/ui.jsx'
import AppShell from '../../components/AppShell.jsx'
import SidebarChannels from '../../components/SidebarChannels.jsx'
import { DEMO_MODE, isDemoSession } from '../../demo/demo' // DEMO: retirer en production

function MerchantShell() {
  const { t } = useT()
  const api = useTindisaApi()
  // Techniciens / artisans : entrée « Certificat pro » (certificat d'aptitude
  // professionnelle) ; autres établissements : « Certification » (établissement vérifié). Vendeur bloqué par Tindisa : bandeau avec le motif.
  const { data: info } = useLoad(async () => {
    const shop = await api.get('/v1/merchant/shop').then((r) => r?.shop || null, () => null)
    const isPro = shop?.shopType ? isIndividualType(await loadTaxonomy(), shop.shopType) : false
    return { isPro, hasShop: !!shop, blocked: shop?.status === 'blocked' }
  }, [])
  const isPro = !!info?.isPro
  const isEstablishment = !!info?.hasShop && !isPro
  const nav = [
    { to: '/dashboard', end: true, icon: <FaHome />, label: t('dash.nav.home') },
    { to: '/dashboard/catalogue', icon: <FaBoxOpen />, label: t('dash.nav.catalogue') },
    { to: '/dashboard/ventes', icon: <FaHandshake />, label: t('dash.nav.sales') },
    { to: '/dashboard/wallet', icon: <FaWallet />, label: t('dash.nav.wallet') },
    { to: '/dashboard/abonnement', icon: <FaCreditCard />, label: 'Facturation' },
    ...(isPro ? [{ to: '/dashboard/certificat-pro', icon: <FaAward />, label: 'Certificat pro' }] : []),
    ...(isEstablishment ? [{ to: '/dashboard/certificat-etablissement', icon: <FaAward />, label: 'Certification' }] : []),
  ]
  const notice = info?.blocked ? (
    <div className="dash-blocked-banner" role="alert">
      <FaBan />
      <span>
        <b>Votre compte vendeur est suspendu par Tindisa.</b>
        <small>Vos offres ne sont plus visibles et vous ne pouvez plus publier. Contactez Tindisa pour connaître le motif et le réactiver.</small>
      </span>
    </div>
  ) : null
  return <AppShell nav={nav} sidebarExtra={<SidebarChannels />} notice={notice} />
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
