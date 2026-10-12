import { Component } from 'react'
import { useLocation } from 'react-router-dom'

/*
 * Filet de sécurité de l'application : une erreur d'affichage ne doit JAMAIS
 * donner une page blanche.
 *  - Fichier de page introuvable après un déploiement (onglet resté ouvert sur
 *    l'ancienne version) : rechargement automatique, une seule fois.
 *  - Toute autre erreur : message clair + « Réessayer » / « Retour à l'accueil ».
 * Le filet est réinitialisé à chaque changement de page.
 */

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|error loading dynamically/i
const RELOAD_KEY = 'tindisa_chunk_reload'

function isChunkError(error) {
  return CHUNK_ERROR.test(String(error?.message || error || ''))
}

class Boundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  // Drapeau « déjà rechargé » effacé seulement après 10 s sans erreur : si le
  // fichier manque vraiment, on affiche le message au lieu de boucler.
  componentDidMount() {
    this.timer = setTimeout(() => {
      try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* stockage indisponible */ }
    }, 10_000)
  }

  componentWillUnmount() {
    clearTimeout(this.timer)
  }

  componentDidCatch(error, info) {
    if (isChunkError(error)) {
      let already = false
      try {
        already = sessionStorage.getItem(RELOAD_KEY) === '1'
        sessionStorage.setItem(RELOAD_KEY, '1')
      } catch { /* stockage indisponible : on recharge quand même une fois */ }
      if (!already) {
        window.location.reload()
        return
      }
    }
    console.error('Erreur d’affichage', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const chunk = isChunkError(error)
    return (
      <div className="app-error" role="alert">
        <div className="app-error-card">
          <h1>{chunk ? 'Une nouvelle version de Tindisa est disponible' : 'Cette page a rencontré un problème'}</h1>
          <p>
            {chunk
              ? 'Rechargez la page pour continuer.'
              : 'Le reste du site fonctionne. Réessayez ; si le problème persiste, contactez Tindisa.'}
          </p>
          <div className="app-error-actions">
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => window.location.reload()}>Réessayer</button>
            <a className="ui-btn ui-btn-secondary" href="/">Retour à l’accueil</a>
          </div>
        </div>
      </div>
    )
  }
}

/** Réinitialisé à chaque page (clé = chemin). */
export default function ErrorBoundary({ children }) {
  const { pathname } = useLocation()
  return <Boundary key={pathname}>{children}</Boundary>
}
