import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

/** Contrôles de pagination (à combiner avec le hook usePaged, cf. usePaged.js). */
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
