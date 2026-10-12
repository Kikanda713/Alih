import { createContext, useContext } from 'react'

// Contexte des notifications (fourni par <ToastProvider>, cf. Toast.jsx).
// Séparé du composant pour le Fast Refresh.
export const ToastContext = createContext({ notify: () => {} })

export function useToast() {
  return useContext(ToastContext)
}
