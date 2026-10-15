import { useState } from 'react'
import { FaFileAlt } from 'react-icons/fa'
import ChatMarkdown from './ChatMarkdown.jsx'
import ChatLightbox from './ChatLightbox.jsx'

/*
 * Corps de conversation partagé (assistant Tindisa) : bulles utilisateur / assistant,
 * photos et fichiers joints, rendu riche des réponses (Markdown GFM, tableaux,
 * images et lignes MEDIA:, cartes produits, liens de paiement / vérification),
 * indicateur de saisie et erreurs.
 *
 * Message : { id, role: 'user'|'assistant', content, images?: [url],
 *             attachments?: [{ name, url?, type? }], pending?, error? }
 */

function Attachments({ m, onZoom }) {
  const imgs = [
    ...(Array.isArray(m.images) ? m.images.filter((u) => typeof u === 'string') : []),
    ...(Array.isArray(m.attachments) ? m.attachments.filter((a) => a?.url).map((a) => a.url) : []),
  ]
  const files = Array.isArray(m.attachments) ? m.attachments.filter((a) => a && !a.url) : []
  if (!imgs.length && !files.length) return null
  return (
    <div className="chat-atts">
      {imgs.map((src, i) => (
        <button key={`${src}-${i}`} type="button" className="chat-att-btn" onClick={() => onZoom(src)} aria-label="Agrandir la photo">
          <img src={src} alt="Photo envoyée" className="chat-att-img" />
        </button>
      ))}
      {files.map((a, i) => (
        <span key={`f-${i}`} className="chat-att-file"><FaFileAlt /> {String(a.name || 'Fichier')}</span>
      ))}
    </div>
  )
}

function Bubble({ m, onZoom }) {
  const assistant = m.role === 'assistant'
  const content = typeof m.content === 'string' ? m.content : ''
  return (
    <div className={`chat-msg-row ${assistant ? 'assistant' : 'user'}`}>
      {assistant && <span className="chat-ava" translate="no">T</span>}
      <div className={`chat-bubble ${assistant ? 'assistant' : 'user'}${assistant && !content && m.pending ? ' typing' : ''}`}>
        <Attachments m={m} onZoom={onZoom} />
        {assistant
          ? (content
            ? <ChatMarkdown text={content} />
            : m.pending && <><span></span><span></span><span></span></>)
          : content && <p className="chat-user-text">{content}</p>}
        {m.error && <p className="chat-msg-error">{String(m.error)}</p>}
      </div>
    </div>
  )
}

export default function ChatThread({ messages = [], typing = false }) {
  const [zoom, setZoom] = useState(null)
  return (
    <div className="chat-thread-list">
      {messages.map((m, i) => <Bubble key={m.id || i} m={m} onZoom={setZoom} />)}
      {typing && (
        <div className="chat-msg-row assistant">
          <span className="chat-ava" translate="no">T</span>
          <div className="chat-bubble assistant typing" aria-label="L'assistant écrit"><span></span><span></span><span></span></div>
        </div>
      )}
      <ChatLightbox src={zoom} onClose={() => setZoom(null)} />
    </div>
  )
}
