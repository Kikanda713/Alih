import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { apiFetch } from '../api/client'
import { auth0Config } from '../auth/config'

// Page de LIAISON de compte (route /link?state=...).
// Le lien est envoyé à l'utilisateur dans la messagerie (WhatsApp/Telegram) par
// l'agent. Le `state` (signé côté serveur) encode son numéro VÉRIFIÉ par le canal.
// Ici : on le connecte via les pages NATIVES Auth0, puis on appelle le backend
// qui associe son numéro à son compte (sub) — donc à sa boutique unique.
export default function LinkPage() {
  const [params] = useSearchParams()
  const state = params.get('state') || ''
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } =
    useAuth0()
  const [status, setStatus] = useState('init') // init | linking | done | error
  const [msg, setMsg] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (isLoading || ran.current) return
    if (!state) {
      setStatus('error')
      setMsg('Lien invalide ou incomplet.')
      return
    }
    if (!isAuthenticated) {
      // Connexion / inscription NATIVE Auth0, puis retour ici pour finaliser.
      ran.current = true
      loginWithRedirect({
        appState: { returnTo: `/link?state=${encodeURIComponent(state)}` },
      })
      return
    }
    ran.current = true
    ;(async () => {
      setStatus('linking')
      try {
        const token = await getAccessTokenSilently(
          auth0Config.audience
            ? { authorizationParams: { audience: auth0Config.audience } }
            : undefined,
        )
        await apiFetch('/v1/link/complete', {
          method: 'POST',
          body: { state },
          token,
        })
        setStatus('done')
      } catch (e) {
        setStatus('error')
        setMsg(e?.message || 'Échec de la liaison. Le lien a peut-être expiré.')
      }
    })()
  }, [isAuthenticated, isLoading, state])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif',
        color: '#1a1a2e',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 8 }}>🛍️ Tindisa</h1>
        {status === 'done' ? (
          <>
            <p style={{ fontSize: '1.1rem', color: '#1a9e54', fontWeight: 600 }}>
              ✅ Votre compte est lié !
            </p>
            <p>
              Vous pouvez maintenant gérer votre boutique directement depuis
              WhatsApp. Retournez à votre conversation Tindisa.
            </p>
            <Link to="/dashboard" style={{ color: '#635dff' }}>
              Ouvrir mon tableau de bord
            </Link>
          </>
        ) : status === 'error' ? (
          <>
            <p style={{ color: '#d33', fontWeight: 600 }}>{msg}</p>
            <Link to="/" style={{ color: '#635dff' }}>
              Retour à l’accueil
            </Link>
          </>
        ) : (
          <p aria-busy="true" role="status">
            {isAuthenticated
              ? 'Association de votre compte en cours…'
              : 'Redirection vers la connexion…'}
          </p>
        )}
      </div>
    </div>
  )
}
