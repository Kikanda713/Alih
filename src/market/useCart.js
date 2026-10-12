import { createContext, useContext } from 'react'

// Contexte du panier (fourni par <CartProvider>, voir CartContext.jsx). Séparé du
// composant pour que le rafraîchissement à chaud reste fiable (react-refresh).
export const CartContext = createContext(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>')
  return ctx
}
