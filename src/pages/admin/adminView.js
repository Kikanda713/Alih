import { createContext, useContext } from 'react'

/**
 * Contexte du périmètre ville du back-office (fourni par <AdminScopeProvider>,
 * cf. AdminScopeContext.jsx). Séparé des composants pour le Fast Refresh.
 */
export const AdminScopeCtx = createContext({ loading: true, global: true, city: null, lockedCity: null, cities: [], setCity: () => {}, withCity: (p) => p })

export function useAdminView() {
  return useContext(AdminScopeCtx)
}
