import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { FaLock, FaCheckCircle } from 'react-icons/fa'
import { apiFetch } from '../api/client'
import { auth0Config } from '../auth/config'

// ACR demandé à Auth0 pour forcer un facteur fort (MFA) — WebAuthn/empreinte,
// OTP email, etc. selon les facteurs activés dans le tenant.
const MFA_ACR = 'http://schemas.openid.net/pape/policies/2007/06/multi-factor'

// Page de STEP-UP d'identité (route /step-up).
// Envoyée par l'agent quand une opération sensible (≥ seuil) doit être confirmée.
// Force une re-authentification MFA Auth0 puis enregistre la preuve côté backend
// (réutilisée par le canal lié — WhatsApp/Telegram).
export default function StepUpPage() {
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0()
  const [status, setStatus] = useState('init') // init | verifying | done | error
  const [msg, setMsg] = useState('')
  const ran = useRef(false)

  const reauthMfa = () =>
    loginWithRedirect({
      appState: { returnTo: '/step-up' },
      authorizationParams: {
        acr_values: MFA_ACR,
        prompt: 'login', // ré-authentifie même si session existante
        ...(auth0Config.audience ? { audience: auth0Config.audience } : {}),
      },
    })

  useEffect(() => {
    if (isLoading || ran.current) return
    ran.current = true
    if (!isAuthenticated) {
      reauthMfa()
      return
    }
    ;(async () => {
      setStatus('verifying')
      try {
        const token = await getAccessTokenSilently(
          auth0Config.audience ? { authorizationParams: { audience: auth0Config.audience } } : undefined,
        )
        await apiFetch('/v1/stepup/complete', { method: 'POST', body: {}, token })
        setStatus('done')
      } catch (e) {
        // Token pas assez frais / MFA non effectué → relancer une re-auth MFA.
        if (e?.status === 403) {
          ran.current = false
          reauthMfa()
          return
        }
        setStatus('error')
        setMsg(e?.message || 'Échec de la vérification. Réessayez.')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', color: '#1a1a2e',
      textAlign: 'center', background: '#F8F5EF',
    }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 44, marginBottom: 6, color: '#C65D2E' }}><FaLock /></div>
        <h1 style={{ fontSize: '1.3rem', marginBottom: 8 }}>Confirmation d'identité</h1>
        {status === 'done' ? (
          <>
            <p style={{ color: '#1a9e54', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FaCheckCircle /> Identité confirmée !</p>
            <p>Vous pouvez retourner à votre conversation Tindisa et valider votre commande.</p>
            <Link to="/dashboard" style={{ color: '#635dff' }}>Ouvrir mon tableau de bord</Link>
          </>
        ) : status === 'error' ? (
          <>
            <p style={{ color: '#d33', fontWeight: 600 }}>{msg}</p>
            <button onClick={reauthMfa} style={{ marginTop: 12, padding: '11px 18px', border: 0, borderRadius: 10, background: '#C65D2E', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Réessayer
            </button>
          </>
        ) : (
          <p aria-busy="true" role="status">Vérification de votre identité en cours…</p>
        )}
      </div>
    </div>
  )
}
