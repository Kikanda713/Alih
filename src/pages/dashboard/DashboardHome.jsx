import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Link } from 'react-router-dom'
import { FaBoxOpen, FaWarehouse, FaPlug, FaPlus } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Card, Button, Spinner } from '../../components/ui.jsx'

export default function DashboardHome() {
  const { user } = useAuth0()
  const api = useTindisaApi()
  const { t } = useT()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [cat, link] = await Promise.allSettled([
          api.get('/v1/merchant/products'),
          api.get('/v1/wanzo/link'),
        ])
        if (!alive) return
        const products = cat.status === 'fulfilled' ? cat.value?.products || [] : []
        const inStock = products.filter((p) => (p.quantity || 0) > 0).length
        const linked = link.status === 'fulfilled' ? !!link.value?.linked : false
        setStats({ count: products.length, inStock, linked })
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const name = user?.given_name || user?.name?.split(' ')[0] || ''

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">{t('dash.home.hello', { name })}</h1>
        <p className="dash-sub">{t('dash.home.subtitle')}</p>
      </header>

      {loading ? (
        <Spinner label={t('merchant.loading')} />
      ) : (
        <>
          <div className="dash-stats">
            <Card className="dash-stat">
              <div className="dash-stat-icon"><FaBoxOpen /></div>
              <div>
                <span className="dash-stat-value">{stats.count}</span>
                <span className="dash-stat-label">{t('dash.home.products')}</span>
              </div>
            </Card>
            <Card className="dash-stat">
              <div className="dash-stat-icon"><FaWarehouse /></div>
              <div>
                <span className="dash-stat-value">{stats.inStock}</span>
                <span className="dash-stat-label">{t('dash.home.inStock')}</span>
              </div>
            </Card>
            <Card className="dash-stat">
              <div className="dash-stat-icon"><FaPlug /></div>
              <div>
                <span className="dash-stat-value">
                  {stats.linked ? t('dash.home.wanzoLinked') : t('dash.home.wanzoNotLinked')}
                </span>
                <span className="dash-stat-label">{t('dash.home.wanzo')}</span>
              </div>
            </Card>
          </div>

          <div className="dash-quick">
            <Button as={Link} to="/dashboard/catalogue" variant="primary">
              <FaBoxOpen /> {t('dash.home.manageCatalogue')}
            </Button>
            <Button as={Link} to="/dashboard/catalogue?new=1" variant="secondary">
              <FaPlus /> {t('dash.home.quickAdd')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
