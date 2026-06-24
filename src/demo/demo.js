/* ============================================================
 * MODE DÉMO — À SUPPRIMER EN PRODUCTION.
 * Permet d'explorer le dashboard sans Auth0 ni backend, avec des
 * données fictives. Tout le code démo vit dans src/demo/.
 *
 * Pour retirer la démo en production :
 *   1. supprimer le dossier src/demo/
 *   2. retirer les 3 branches `if (DEMO_MODE)` dans :
 *        - src/api/client.js
 *        - src/components/ProfileMenu.jsx
 *        - src/pages/dashboard/DashboardLayout.jsx
 *   3. (optionnel) retirer VITE_DEMO_MODE de .env
 *
 * SÉCURITÉ : la démo est IMPOSSIBLE dans un build de production (`vite build`).
 * En dev uniquement, elle s'active si VITE_DEMO_MODE=true OU si Auth0 n'est pas
 * configuré. Ainsi la prod ne peut jamais accorder le compte démo (qui cumule
 * les rôles merchant + Admin-tindisa) par simple oubli de variable d'env.
 * ============================================================ */
import { isAuth0Configured } from '../auth/config'

export const DEMO_MODE =
  !import.meta.env.PROD &&
  (import.meta.env.VITE_DEMO_MODE === 'true' || !isAuth0Configured)

const SESSION_KEY = 'tindisa_demo_session'

export const demoUser = {
  sub: 'demo-merchant',
  name: 'Marchand Démo',
  email: 'demo@tindisa.cd',
  picture: null,
  // En démo, l'utilisateur cumule les rôles pour explorer marchand ET back-office.
  roles: ['merchant', 'Admin-tindisa'],
}

export function isDemoSession() {
  try {
    return localStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function startDemoSession() {
  try {
    localStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function endDemoSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
