import { Auth0Provider } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { auth0Config, isAuth0Configured } from './config'

// Wraps the app in Auth0Provider only when configured. Before Auth0 env vars
// are set, the app still renders (auth buttons degrade to a configure hint).
//
// - Login : pages NATIVES Auth0 (Universal Login) via loginWithRedirect.
// - Callback : chemin dédié `/auth/callback` (convention Wanzo) ; le SDK y
//   échange le code, puis onRedirectCallback renvoie vers `appState.returnTo`
//   (le dashboard par défaut).
// - Tokens : access token en mémoire + refresh token (rotation) persistés en
//   localStorage → session conservée entre rechargements, refresh silencieux.
export default function Auth0ProviderWithConfig({ children }) {
  const navigate = useNavigate()
  if (!isAuth0Configured) {
    return children
  }
  const onRedirectCallback = (appState) => {
    // Après authentification : entrer dans le dashboard (ou la cible mémorisée).
    navigate(appState?.returnTo || '/dashboard', { replace: true })
  }
  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: auth0Config.callbackUrl,
        scope: 'openid profile email offline_access',
        ...(auth0Config.audience ? { audience: auth0Config.audience } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
    >
      {children}
    </Auth0Provider>
  )
}
