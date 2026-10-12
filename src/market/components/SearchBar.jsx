import { useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { FaSearch, FaCamera } from 'react-icons/fa'
import { useChat } from '../chat/useChat'

/*
 * Barre de recherche centrale (zone principale du marché). Le sélecteur de type
 * permet de viser directement produits ou services. Soumet vers /marche en
 * conservant les filtres utiles déjà posés (ville). L'appareil photo ouvre le
 * chat de l'agent pour une recherche par image.
 */
export default function SearchBar({ size = 'md', autoFocus = false, placeholder }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const onMarket = location.pathname === '/marche'
  const { openChat } = useChat()
  const [q, setQ] = useState(onMarket ? params.get('q') || '' : '')
  // État initialisé depuis l'URL ; le parent remonte le composant (key) quand
  // q/type changent dans l'URL (navigation arrière, puce d'univers…).
  const [type, setType] = useState(onMarket ? params.get('type') || '' : '')

  const submit = (e) => {
    e.preventDefault()
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    if (type) next.set('type', type)
    if (onMarket && params.get('city')) next.set('city', params.get('city'))
    navigate(`/marche${next.toString() ? `?${next}` : ''}`)
  }

  return (
    <form className={`mk-search mk-search-${size}`} role="search" onSubmit={submit}>
      <select className="mk-search-type" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
        <option value="">Tout</option>
        <option value="product">Produits</option>
        <option value="service">Services</option>
      </select>
      <input
        className="mk-search-input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder || 'Que cherchez-vous ? Ciment, chambre à Goma, maçon, iPhone…'}
        aria-label="Rechercher sur le marché"
        autoFocus={autoFocus}
        enterKeyHint="search"
      />
      <button type="button" className="mk-search-photo" onClick={() => openChat({ photo: true })} title="Chercher avec une photo" aria-label="Chercher avec une photo">
        <FaCamera />
      </button>
      <button type="submit" className="mk-search-btn" aria-label="Rechercher">
        <FaSearch /> <span>Rechercher</span>
      </button>
    </form>
  )
}
