import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaUsers, FaStore, FaShoppingBag, FaUserClock } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { Card, Button, Spinner } from '../../components/ui.jsx'

export default function AdminHome() {
  const api = useTindisaApi()
  const { t } = useT()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let alive = true
    api.get('/v1/admin/stats')
      .then((r) => alive && setStats(r || {}))
      .catch(() => alive && setStats({ users: 0, merchants: 0, buyers: 0, pending: 0 }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!stats) return <div className="dash-page"><Spinner label={t('merchant.loading')} /></div>

  const cards = [
    { icon: <FaUsers />, value: stats.users ?? 0, label: t('admin.stats.users') },
    { icon: <FaStore />, value: stats.merchants ?? 0, label: t('admin.stats.merchants') },
    { icon: <FaShoppingBag />, value: stats.buyers ?? 0, label: t('admin.stats.buyers') },
    { icon: <FaUserClock />, value: stats.pending ?? 0, label: t('admin.stats.pending') },
  ]

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1">{t('admin.home.title')}</h1>
        <p className="dash-sub">{t('admin.home.subtitle')}</p>
      </header>

      <div className="dash-stats admin-stats">
        {cards.map((c, i) => (
          <Card key={i} className="dash-stat">
            <div className="dash-stat-icon">{c.icon}</div>
            <div>
              <span className="dash-stat-value">{c.value}</span>
              <span className="dash-stat-label">{c.label}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="dash-quick">
        <Button as={Link} to="/admin/users" variant="primary"><FaUsers /> {t('admin.home.manageUsers')}</Button>
      </div>
    </div>
  )
}
