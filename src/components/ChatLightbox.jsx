import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FaTimes, FaExternalLinkAlt } from 'react-icons/fa'

/**
 * Visionneuse plein écran d'une image du chat (photo envoyée, image de
 * l'assistant, ligne MEDIA:). Échap, clic hors image ou bouton pour fermer.
 * L'écouteur Échap est posé en capture : il ne ferme pas aussi le panneau parent.
 */
export default function ChatLightbox({ src, alt = '', onClose }) {
  useEffect(() => {
    if (!src) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [src, onClose])

  if (!src) return null
  return createPortal(
    <div className="chat-lightbox" role="dialog" aria-modal="true" aria-label="Image agrandie" onClick={onClose}>
      <div className="chat-lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <a href={src} target="_blank" rel="noopener noreferrer" className="chat-lightbox-btn" aria-label="Ouvrir dans un nouvel onglet">
          <FaExternalLinkAlt />
        </a>
        <button type="button" className="chat-lightbox-btn" onClick={onClose} aria-label="Fermer">
          <FaTimes />
        </button>
      </div>
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body,
  )
}
