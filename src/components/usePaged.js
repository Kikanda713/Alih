import { useState, useMemo } from 'react'

/**
 * Pagination côté client, réutilisable. Convient à l'échelle d'un marchand ;
 * pour de très gros volumes, basculer vers une pagination serveur (limit/offset).
 * (Fichier séparé du composant <Pagination> pour le Fast Refresh.)
 */
export function usePaged(items, size = 10) {
  const [page, setPage] = useState(1)
  // Liste stable : `items || []` recréerait un tableau à chaque rendu et
  // invaliderait le useMemo ci-dessous.
  const list = useMemo(() => items || [], [items])
  const totalPages = Math.max(1, Math.ceil(list.length / size))
  const safePage = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => list.slice((safePage - 1) * size, safePage * size),
    [list, safePage, size],
  )
  return { pageItems, page: safePage, setPage, totalPages, count: list.length }
}
