import { useAuth0 } from '@auth0/auth0-react'
import { DEMO_MODE, demoUser } from '../demo/demo'

// Rôles GLOBAUX (voient tout le back-office, toutes villes).
export const GLOBAL_ADMIN_ROLES = ['Admin-tindisa', 'crm-tindisa']

// Un rôle `admin-<ville>` (ex. admin-goma, admin-kin, admin-butembo) donne un accès
// back-office LIMITÉ à cette ville (isolation totale).
const CITY_ADMIN_RE = /^admin[-_]([a-z0-9-]+)$/i
// Alias de saisie → ville canonique (aligné sur le backend admin-scope.ts).
const CITY_ALIASES = { kin: 'kinshasa', lubum: 'lubumbashi', mbuji: 'mbuji-mayi', mbujimayi: 'mbuji-mayi' }
function canonCity(s) {
  const r = String(s || '').trim().toLowerCase()
  return CITY_ALIASES[r] || r
}

// Auth0 expose les rôles via un claim namespacé (cf. Action post-login).
const ROLES_CLAIM = 'https://tindisa.com/roles'

export function getRoles(user) {
  if (!user) return []
  return user[ROLES_CLAIM] || user.roles || user.permissions || []
}

// Périmètre admin déduit des rôles : { isAdmin, global, city }.
export function getAdminScope(roles) {
  const list = roles || []
  if (list.some((r) => GLOBAL_ADMIN_ROLES.includes(r))) {
    return { isAdmin: true, global: true, city: null }
  }
  for (const r of list) {
    const m = CITY_ADMIN_RE.exec(String(r).trim())
    if (m) return { isAdmin: true, global: false, city: canonCity(m[1]) }
  }
  return { isAdmin: false, global: false, city: null }
}

export function isAdminRoles(roles) {
  return getAdminScope(roles).isAdmin
}

// Rôles de l'utilisateur courant. DEMO_MODE est constant -> branche stable.
export function useRoles() {
  if (DEMO_MODE) return demoUser.roles || []
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user } = useAuth0()
  return getRoles(user)
}

export function useIsAdmin() {
  return isAdminRoles(useRoles())
}

// Scope admin (global vs ville) de l'utilisateur courant.
export function useAdminScope() {
  return getAdminScope(useRoles())
}
