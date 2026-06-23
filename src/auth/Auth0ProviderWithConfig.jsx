import { Auth0Provider } from '@auth0/auth0-react'
import { auth0Config, isAuth0Configured } from './config'

// Wraps the app in Auth0Provider only when configured. Before Auth0 env vars
// are set, the app still renders (auth buttons degrade to a configure hint).
export default function Auth0ProviderWithConfig({ children }) {
  if (!isAuth0Configured) {
    return children
  }
  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(auth0Config.audience ? { audience: auth0Config.audience } : {}),
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      {children}
    </Auth0Provider>
  )
}
