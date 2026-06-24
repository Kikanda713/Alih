import { useAuth0 } from '@auth0/auth0-react'
import { auth0Config, isAuth0Configured } from './config'

// Auth-aware buttons for the navbar. Logged out → "Se connecter" / "S'inscrire".
// Logged in → user name + "Se déconnecter".
function Auth0Buttons() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0()

  if (isLoading) {
    return <span className="btn-signin" aria-busy="true">…</span>
  }

  if (isAuthenticated) {
    return (
      <>
        <span className="nav-user" title={user?.email}>
          {user?.name || user?.email}
        </span>
        <button
          type="button"
          className="btn-signup"
          onClick={() => logout({ logoutParams: { returnTo: auth0Config.logoutUrl } })}
        >
          Se déconnecter
        </button>
      </>
    )
  }

  // Pages NATIVES Auth0 (Universal Login). Après login → /dashboard (returnTo).
  return (
    <>
      <button
        type="button"
        className="btn-signin"
        onClick={() => loginWithRedirect({ appState: { returnTo: '/dashboard' } })}
      >
        Se connecter
      </button>
      <button
        type="button"
        className="btn-signup"
        onClick={() =>
          loginWithRedirect({
            appState: { returnTo: '/dashboard' },
            authorizationParams: { screen_hint: 'signup' },
          })
        }
      >
        S'inscrire
      </button>
    </>
  )
}

// Fallback when Auth0 is not configured yet — keeps the layout, hints at setup.
function DisabledButtons() {
  const warn = () => alert('Auth0 non configuré. Renseignez VITE_AUTH0_DOMAIN et VITE_AUTH0_CLIENT_ID dans .env')
  return (
    <>
      <button type="button" className="btn-signin" onClick={warn}>Se connecter</button>
      <button type="button" className="btn-signup" onClick={warn}>S'inscrire</button>
    </>
  )
}

export default function AuthButtons() {
  return isAuth0Configured ? <Auth0Buttons /> : <DisabledButtons />
}
