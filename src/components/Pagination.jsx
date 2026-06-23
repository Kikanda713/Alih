import { useState, useMemo } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

/**
 * Pagination côté client, réutilisable. Convient à l'échelle d'un marchand ;
 * pour de très gros volumes, basculer vers une pagination serveur (limit/offset).
 */
export function usePaged(items, size = 10) {
  const [page, setPage] = useState(1)
  const list = items || []
  const totalPages = Math.max(1, Math.ceil(list.length / size))
  const safePage = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => list.slice((safePage - 1) * size, safePage * size),
    [list, safePage, size],
  )
  return { pageItems, page: safePage, setPage, totalPages, count: list.length }
}

export function Pagination({ page, totalPages, count, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <span className="pagination-count">{count} élément(s)</span>
      <div className="pagination-ctrl">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Page précédente"
        >
          <FaChevronLeft />
        </button>
        <span className="pagination-info">{page} / {totalPages}</span>
        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Page suivante"
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  )
}
