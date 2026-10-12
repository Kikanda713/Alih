import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { FaLink, FaSyncAlt, FaCheckCircle } from 'react-icons/fa'
import { useTindisaApi } from '../api/client'
import { useLoad } from '../api/useLoad'
import { useT } from '../i18n'

/*
 * Light authenticated merchant space. Rendered only when the user is signed in.
 * Wires to the Tindisa gateway BFF:
 *   GET  /v1/wanzo/link  → { linked, companyId, verified }
 *   POST /v1/wanzo/link  { companyId }
 *   POST /v1/wanzo/sync  → { synced, reason }
 */
export default function MerchantPanel() {
  const { isAuthenticated } = useAuth0()
  const api = useTindisaApi()
  const { t } = useT()

  // Statut de liaison Wanzo, chargé une fois au montage.
  const { data: link, loading, error: loadError, setData: setLink } = useLoad(
    () => api.get('/v1/wanzo/link'),
    [],
  )
  const error = loadError ? t('merchant.error') : ''

  const [companyId, setCompanyId] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectMsg, setConnectMsg] = useState('')

  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const handleConnect = async (e) => {
    e.preventDefault()
    setConnectMsg('')
    if (!companyId.trim()) {
      setConnectMsg(t('merchant.connect.empty'))
      return
    }
    setConnecting(true)
    try {
      const data = await api.post('/v1/wanzo/link', { companyId: companyId.trim() })
      setLink(data || { linked: true, companyId: companyId.trim() })
      setConnectMsg(t('merchant.connect.success'))
      setCompanyId('')
    } catch {
      setConnectMsg(t('merchant.error'))
    } finally {
      setConnecting(false)
    }
  }

  const syncReasonMessage = (reason) => {
    switch (reason) {
      case 'not-active-premium':
        return t('merchant.sync.notActive')
      case 'source-unavailable':
        return t('merchant.sync.sourceUnavailable')
      default:
        return t('merchant.sync.unknown')
    }
  }

  const handleSync = async () => {
    setSyncMsg('')
    setSyncing(true)
    try {
      const data = await api.post('/v1/wanzo/sync')
      if (data && typeof data.synced === 'number') {
        setSyncMsg(t('merchant.sync.success', { count: data.synced }))
      } else if (data && data.reason) {
        setSyncMsg(syncReasonMessage(data.reason))
      } else {
        setSyncMsg(t('merchant.sync.unknown'))
      }
    } catch {
      setSyncMsg(t('merchant.error'))
    } finally {
      setSyncing(false)
    }
  }

  if (!isAuthenticated) return null

  const isLinked = link && (link.linked || link.companyId)

  return (
    <section className="merchant-panel" id="merchant">
      <div className="container">
        <div className="merchant-card">
          <h2 className="merchant-title">{t('merchant.title')}</h2>
          <p className="merchant-subtitle">{t('merchant.subtitle')}</p>

          {loading ? (
            <p className="merchant-loading">{t('merchant.loading')}</p>
          ) : error ? (
            <p className="merchant-msg error">{error}</p>
          ) : (
            <>
              {/* Link status */}
              <div className="merchant-status">
                {isLinked ? (
                  <>
                    <span className="merchant-badge ok">
                      <FaCheckCircle /> {t('merchant.status.linked')}
                    </span>
                    {link.companyId && (
                      <span className="merchant-status-detail">
                        {t('merchant.status.company')} : <strong>{link.companyId}</strong>
                      </span>
                    )}
                    <span className={`merchant-status-detail ${link.verified ? 'ok' : 'pending'}`}>
                      {link.verified ? t('merchant.status.verified') : t('merchant.status.notVerified')}
                    </span>
                  </>
                ) : (
                  <span className="merchant-badge muted">{t('merchant.status.notLinked')}</span>
                )}
              </div>

              {/* Connect Wanzo account */}
              {!isLinked && (
                <form className="merchant-block" onSubmit={handleConnect}>
                  <h3 className="merchant-block-title">
                    <FaLink /> {t('merchant.connect.title')}
                  </h3>
                  <div className="merchant-form-row">
                    <input
                      type="text"
                      className="merchant-input"
                      placeholder={t('merchant.connect.placeholder')}
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      disabled={connecting}
                    />
                    <button type="submit" className="btn-signup merchant-btn" disabled={connecting}>
                      {connecting ? t('merchant.loading') : t('merchant.connect.button')}
                    </button>
                  </div>
                  {connectMsg && <p className="merchant-msg">{connectMsg}</p>}
                </form>
              )}

              {/* Sync catalogue */}
              <div className="merchant-block">
                <h3 className="merchant-block-title">
                  <FaSyncAlt /> {t('merchant.sync.title')}
                </h3>
                <button
                  type="button"
                  className="btn-signup merchant-btn"
                  onClick={handleSync}
                  disabled={syncing || !isLinked}
                >
                  {syncing ? t('merchant.loading') : t('merchant.sync.button')}
                </button>
                {syncMsg && <p className="merchant-msg">{syncMsg}</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
