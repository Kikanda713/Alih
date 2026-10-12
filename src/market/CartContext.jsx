import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/*
 * Panier du visiteur, local au navigateur (aucune connexion requise). Il est
 * transmis à l'assistant Tindisa dans la messagerie, où la commande est
 * confirmée, négociée et payée en séquestre.
 */

const STORAGE_KEY = 'tindisa_cart_v1'
const CartContext = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// Clé de ligne : un même service peut être réservé à plusieurs dates.
function lineKey(listing, booking) {
  if (!booking) return listing.id
  return `${listing.id}|${booking.start || ''}|${booking.end || ''}|${booking.time || ''}`
}

// Instantané minimal de l'annonce (le prix est re-vérifié par l'agent).
function snapshot(listing) {
  return {
    id: listing.id,
    ref: listing.ref,
    name: listing.name,
    type: listing.type,
    image: listing.images?.[0] || null,
    price: listing.price,
    currency: listing.currency,
    billingUnit: listing.billingUnit,
    city: listing.city,
    shop: listing.shop ? { id: listing.shop.id, name: listing.shop.name, isP2P: listing.shop.isP2P } : null,
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* mode privé */ }
  }, [items])

  // Synchronise plusieurs onglets.
  useEffect(() => {
    const onStorage = (e) => e.key === STORAGE_KEY && setItems(load())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback((listing, { qty = 1, booking = null } = {}) => {
    const key = lineKey(listing, booking)
    setItems((list) => {
      const found = list.find((it) => it.key === key)
      if (found && !booking) {
        return list.map((it) => (it.key === key ? { ...it, qty: Math.min(999, it.qty + qty) } : it))
      }
      if (found) return list.map((it) => (it.key === key ? { ...it, booking } : it))
      return [...list, { ...snapshot(listing), key, qty: booking ? 1 : qty, booking }]
    })
  }, [])

  const setQty = useCallback((key, qty) => {
    setItems((list) => list.map((it) => (it.key === key ? { ...it, qty: Math.max(1, Math.min(999, qty)) } : it)))
  }, [])
  const remove = useCallback((key) => setItems((list) => list.filter((it) => it.key !== key)), [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo(() => ({
    items,
    count: items.reduce((n, it) => n + (it.booking ? 1 : it.qty), 0),
    add, setQty, remove, clear,
    open, setOpen,
  }), [items, add, setQty, remove, clear, open])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>')
  return ctx
}
