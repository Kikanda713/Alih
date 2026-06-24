import { useAuth0 } from '@auth0/auth0-react'
import { Link } from 'react-router-dom'

// Page de retour Auth0 (route /auth/callback).
// @auth0/auth0-react détecte automatiquement le `?code=&state=` à ce chemin,
// échange le code contre les tokens (PKCE), puis déclenche onRedirectCallback
// (cf. Auth0ProviderWithConfig) qui redirige vers le dashboard.
// On affiche seulement un état transitoire pendant ce court instant.
export default function Callback() {
  const { error } = useAuth0()

  if (error) {
    return (
      <div className="auth-callback">
        <p>Échec de la connexion : {error.message}</p>
        <Link to="/">Retour à l'accueil</Link>
      </div>
    )
  }

  return (
    <div className="auth-callback" aria-busy="true" role="status">
      <p>Connexion en cours…</p>
    </div>
  )
}
