import { useCallback, useEffect, useRef, useState } from 'react'
import { marketApi } from './api'

/*
 * Chargement paginé des annonces publiques. `params` = objet de filtres (clé
 * stable via JSON). `loadMore()` ajoute la page suivante ; tout changement de
 * filtres repart de zéro. Les réponses obsolètes (requêtes croisées) sont ignorées.
 */
export function useListings(params, { limit = 24, shopId = null, enabled = true } = {}) {
  const [state, setState] = useState({ items: [], total: 0, hasMore: false, facets: null, loading: true, error: null })
  const key = JSON.stringify({ ...params, shopId, limit })
  const seq = useRef(0)

  const fetchPage = useCallback(async (offset) => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null, ...(offset === 0 ? { items: [] } : {}) }))
    try {
      const p = { ...JSON.parse(key), offset, limit }
      delete p.shopId
      const r = shopId ? await marketApi.shopListings(shopId, p) : await marketApi.listings(p)
      if (id !== seq.current) return
      setState((s) => ({
        items: offset === 0 ? r.items || [] : [...s.items, ...(r.items || [])],
        total: r.total || 0,
        hasMore: !!r.hasMore,
        facets: offset === 0 ? r.facets : s.facets,
        loading: false,
        error: null,
      }))
    } catch (e) {
      if (id !== seq.current) return
      setState((s) => ({ ...s, loading: false, error: e }))
    }
  }, [key, limit, shopId])

  useEffect(() => {
    if (enabled) fetchPage(0)
  }, [fetchPage, enabled])

  const loadMore = useCallback(() => fetchPage(state.items.length), [fetchPage, state.items.length])
  const retry = useCallback(() => fetchPage(0), [fetchPage])
  return { ...state, loadMore, retry }
}
