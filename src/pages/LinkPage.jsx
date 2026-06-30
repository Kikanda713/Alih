import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { apiFetch } from '../api/client'
import { auth0Config } from '../auth/config'

// Page de LIAISON de compte (route /link?c=CODE, legacy ?state=TOKEN).
// Le lien est envoyé dans la messagerie (WhatsApp/Telegram) ; le code/state
// encode le numéro VÉRIFIÉ par le canal. Après connexion Auth0, on associe ce
// numéro au compte (sub).
//
// IMPORTANT (anti mauvaise liaison) : on NE lie PAS automatiquement au compte
// déjà connecté sur l'appareil. Si une session existe (ex. le téléphone d'un
// tiers), on AFFICHE le compte et on demande CONFIRMATION, avec « Changer de
// compte » (prompt select_account). Sinon un numéro pourrait être lié au mauvais
// compte (cas vécu : numéro lié au compte d'un autre déjà connecté).
export default function LinkPage() {
  const [params] = useSearchParams()
  const code = params.get('c') || ''
  const state = params.get('state') || ''
  const linkParam = code ? `c=${encodeURIComponent(code)}` : `state=${encodeURIComponent(state)}`
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently, user } = useAuth0()
  const [status, setStatus] = useState('init') // init | confirm | linking | done | error
  const [msg, setMsg] = useState('')
  const redirecting = useRef(false)

  const login = (extra) =>
    loginWithRedirect({
      appState: { returnTo: `/link?${linkParam}` },
      authorizationParams: { prompt: 'select_account', ...extra },
    })

  useEffect(() => {
    if (isLoading) return
    if (!code && !state) {
      setStatus('error')
      setMsg('Lien invalide ou incomplet.')
      return
    }
    if (!isAuthenticated) {
      // Connexion en CHOISISSANT le compte (évite de réutiliser une session SSO
      // d'un tiers déjà connecté sur l'appareil).
      if (!redirecting.current) {
        redirecting.current = true
        login()
      }
      return
    }
    // Connecté : on NE lie pas tout de suite → on demande confirmation du compte.
    setStatus((s) => (s === 'init' ? 'confirm' : s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, code, state])

  const doLink = async () => {
    setStatus('linking')
    try {
      const token = await getAccessTokenSilently(
        auth0Config.audience ? { authorizationParams: { audience: auth0Config.audience } } : undefined,
      )
      await apiFetch('/v1/link/complete', {
        method: 'POST',
        body: code ? { code } : { state },
        token,
      })
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setMsg(e?.message || 'Échec de la liaison. Demandez un nouveau lien sur WhatsApp.')
    }
  }

  const wrap = {
    minHeight: '100vh', minHeight: '100dvh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 24, fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif',
    color: '#1a1a2e', textAlign: 'center', background: '#F8F5EF',
  }
  const btnPrimary = {
    display: 'block', width: '100%', padding: '13px', marginTop: 14, border: 0, borderRadius: 12,
    background: '#C65D2E', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
  }
  const btnGhost = {
    display: 'block', width: '100%', padding: '12px', marginTop: 10, borderRadius: 12,
    background: 'none', border: '1.5px solid rgba(18,18,18,0.12)', color: '#6b6560',
    fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
  }

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 8 }}>🛍️ Tindisa</h1>

        {status === 'confirm' && (
          <>
            <p style={{ color: '#6b6560', marginBottom: 4 }}>Lier votre numéro WhatsApp au compte :</p>
            <p style={{ fontSize: '1.05rem', fontWeight: 700 }}>{user?.email || user?.name}</p>
            <p style={{ color: '#6b6560', fontSize: '0.9rem', marginTop: 8 }}>
              Confirmez que c'est bien <strong>votre</strong> compte. Sinon, changez de compte.
            </p>
            <button style={btnPrimary} onClick={doLink}>Oui, lier à ce compte</button>
            <button style={btnGhost} onClick={() => login()}>Ce n'est pas moi — changer de compte</button>
          </>
        )}

        {status === 'done' && (
          <>
            <p style={{ fontSize: '1.1rem', color: '#1a9e54', fontWeight: 600 }}>✅ Votre compte est lié !</p>
            <p>Vous pouvez maintenant gérer votre boutique depuis WhatsApp. Retournez à votre conversation Tindisa.</p>
            <Link to="/dashboard" style={{ color: '#635dff' }}>Ouvrir mon tableau de bord</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <p style={{ color: '#d33', fontWeight: 600 }}>{msg}</p>
            <Link to="/" style={{ color: '#635dff' }}>Retour à l’accueil</Link>
          </>
        )}

        {(status === 'init' || status === 'linking') && (
          <p aria-busy="true" role="status">
            {status === 'linking' ? 'Association de votre compte en cours…' : 'Redirection vers la connexion…'}
          </p>
        )}
      </div>
    </div>
  )
}
