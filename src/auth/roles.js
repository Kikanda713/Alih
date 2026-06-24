import { useAuth0 } from '@auth0/auth0-react'
import { DEMO_MODE, demoUser } from '../demo/demo'

// Seuls ces rôles donnent accès au back-office Tindisa.
export const ADMIN_ROLES = ['Admin-tindisa', 'crm-tindisa']

// Auth0 expose les rôles via un claim namespacé (cf. Action post-login).
const ROLES_CLAIM = 'https://tindisa.com/roles'

export function getRoles(user) {
  if (!user) return []
  return user[ROLES_CLAIM] || user.roles || user.permissions || []
}

export function isAdminRoles(roles) {
  return (roles || []).some((r) => ADMIN_ROLES.includes(r))
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
