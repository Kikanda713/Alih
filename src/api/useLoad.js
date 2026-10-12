import { useCallback, useEffect, useEffectEvent, useState } from 'react'

/*
 * Chargement de données lié à des dépendances (ville, filtres, page…).
 *
 * Pourquoi un hook commun : appeler depuis un effet une fonction qui fait
 * `setLoading(true)` provoque des rendus en cascade (règle
 * react-hooks/set-state-in-effect). Ici l'état n'est écrit QUE dans les rappels
 * de la promesse, et `loading` est DÉRIVÉ : vrai tant que la dernière réponse
 * reçue ne correspond pas aux dépendances courantes.
 *
 *   const { data, loading, error, reload, setData } = useLoad(
 *     () => api.get(withCity('/v1/admin/p2p')),
 *     [city],
 *   )
 *
 * - `deps` doit être sérialisable (chaînes, nombres, booléens, objets simples) ;
 * - `reload()` relance le chargement (après une action) ;
 * - `setData` met à jour localement (optimiste) sans recharger ;
 * - les réponses obsolètes (dépendances changées entre-temps) sont ignorées.
 */
export function useLoad(fetcher, deps = []) {
  const [nonce, setNonce] = useState(0)
  const key = JSON.stringify([deps, nonce])
  const [res, setRes] = useState({ key: null, data: undefined, error: null })
  const run = useEffectEvent(() => fetcher())

  useEffect(() => {
    let alive = true
    Promise.resolve()
      .then(run)
      .then(
        (data) => { if (alive) setRes({ key, data, error: null }) },
        (error) => { if (alive) setRes({ key, data: undefined, error }) },
      )
    return () => { alive = false }
  }, [key])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const setData = useCallback((next) => {
    setRes((r) => ({ ...r, data: typeof next === 'function' ? next(r.data) : next }))
  }, [])

  return { data: res.data, error: res.error, loading: res.key !== key, reload, setData }
}
