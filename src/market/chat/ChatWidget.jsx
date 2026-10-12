import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaCommentDots, FaTimes, FaPaperPlane, FaCamera, FaWhatsapp, FaTelegramPlane, FaUserCircle, FaTrashAlt, FaSpinner,
} from 'react-icons/fa'
import ChatMarkdown from '../../components/ChatMarkdown.jsx'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { useToast } from '../../components/useToast'
import { whatsappLink, openTelegram } from '../lib/chat'
import { useChat } from './useChat'

const SUGGESTIONS = [
  'Je cherche une chambre d’hôtel à Goma',
  'Quel est le prix du ciment ?',
  'Je cherche un maçon',
]

/*
 * Chat de l'agent Tindisa intégré au site : bouton flottant + panneau (plein
 * écran sur mobile). Texte ou photo ; la commande se conclut ici, et l'on peut à
 * tout moment poursuivre sur WhatsApp ou Telegram.
 */
export default function ChatWidget() {
  const { open, setOpen, messages, busy, draft, setDraft, send, reset, photoRequest, connected, canLogin, login } = useChat()
  const { notify } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // Retour de connexion (?chat=1) : on retire le marqueur de l'URL.
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    if (!p.has('chat')) return
    p.delete('chat')
    navigate({ pathname: location.pathname, search: p.toString() ? `?${p}` : '' }, { replace: true })
  }, [location.pathname, location.search, navigate])

  // Recherche par photo demandée ailleurs (barre de recherche) : ouvre le sélecteur.
  useEffect(() => {
    if (photoRequest) fileRef.current?.click()
  }, [photoRequest])

  // Défilement vers le dernier message ; focus de la saisie à l'ouverture.
  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [open, messages])
  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true })
  }, [open])

  // Plein écran mobile : pas de défilement de la page derrière le chat.
  useEffect(() => {
    if (!open || window.innerWidth > 640) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const onPhotos = async (e) => {
    const files = [...(e.target.files || [])].slice(0, 3 - images.length)
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map((f) => uploadImage(f)))
      setImages((list) => [...list, ...urls].slice(0, 3))
    } catch {
      notify('Envoi de la photo impossible, réessayez.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const submit = (e) => {
    e?.preventDefault()
    if (busy || uploading || (!draft.trim() && !images.length)) return
    send(draft, images)
    setDraft('')
    setImages([])
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content
  const handoff = lastUser
    ? `Bonjour Tindisa, je continue ici la conversation commencée sur le site : ${lastUser}`
    : 'Bonjour Tindisa, je viens du site.'

  if (!open) {
    return (
      <button type="button" className="mk-chat-launcher" onClick={() => setOpen(true)} aria-label="Discuter avec l’assistant Tindisa">
        <FaCommentDots /> <span>Assistant</span>
      </button>
    )
  }

  return (
    <section className="mk-chat" role="dialog" aria-label="Assistant Tindisa">
      <header className="mk-chat-head">
        <span className="mk-chat-avatar" aria-hidden="true">T</span>
        <div className="mk-chat-title">
          <b>Assistant Tindisa</b>
          <small>{connected ? 'Connecté : vous pouvez commander ici' : 'Recherche, conseils, commande'}</small>
        </div>
        <a className="mk-chat-icon" href={whatsappLink(handoff)} target="_blank" rel="noopener noreferrer" title="Continuer sur WhatsApp" aria-label="Continuer sur WhatsApp"><FaWhatsapp /></a>
        <button type="button" className="mk-chat-icon" title="Continuer sur Telegram" aria-label="Continuer sur Telegram"
          onClick={() => { openTelegram(handoff); notify('Message copié : collez-le dans Telegram.', 'info', 4000) }}><FaTelegramPlane /></button>
        <button type="button" className="mk-chat-icon" onClick={() => setOpen(false)} aria-label="Fermer"><FaTimes /></button>
      </header>

      <div className="mk-chat-list" ref={listRef} aria-live="polite">
        {messages.length === 0 ? (
          <div className="mk-chat-welcome">
            <p><b>Bonjour 👋</b> Décrivez ce que vous cherchez, ou envoyez une photo : je trouve, compare, négocie et organise la commande.</p>
            <div className="mk-chat-sugg">
              {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        ) : messages.map((m) => (
          <div key={m.id} className={`mk-chat-msg mk-chat-${m.role}`}>
            {m.images?.length > 0 && (
              <div className="mk-chat-imgs">{m.images.map((src) => <img key={src} src={src} alt="Photo envoyée" />)}</div>
            )}
            {m.role === 'assistant'
              ? (m.content ? <ChatMarkdown text={m.content} /> : m.pending && <span className="mk-chat-typing"><i /><i /><i /></span>)
              : <p>{m.content}</p>}
            {m.error && <p className="mk-chat-error">{m.error}</p>}
          </div>
        ))}
      </div>

      {!connected && canLogin && messages.length > 0 && (
        <div className="mk-chat-login">
          <span>Pour valider une commande, connectez-vous.</span>
          <button type="button" onClick={login}><FaUserCircle /> Se connecter</button>
        </div>
      )}

      <form className="mk-chat-form" onSubmit={submit}>
        {images.length > 0 && (
          <div className="mk-chat-previews">
            {images.map((src) => (
              <span key={src}>
                <img src={src} alt="" />
                <button type="button" onClick={() => setImages((l) => l.filter((x) => x !== src))} aria-label="Retirer la photo"><FaTimes /></button>
              </span>
            ))}
          </div>
        )}
        <div className="mk-chat-input">
          {isCloudinaryConfigured && (
            <>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPhotos} />
              <button type="button" className="mk-chat-icon" onClick={() => fileRef.current?.click()} disabled={uploading || images.length >= 3}
                title="Chercher avec une photo" aria-label="Chercher avec une photo">
                {uploading ? <FaSpinner className="spin" /> : <FaCamera />}
              </button>
            </>
          )}
          <textarea ref={inputRef} rows={1} value={draft} maxLength={2000} placeholder="Écrivez votre message…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e) }} />
          <button type="submit" className="mk-chat-send" disabled={busy || uploading || (!draft.trim() && !images.length)} aria-label="Envoyer">
            {busy ? <FaSpinner className="spin" /> : <FaPaperPlane />}
          </button>
        </div>
        {messages.length > 0 && (
          <button type="button" className="mk-chat-reset" onClick={reset}><FaTrashAlt /> Nouvelle conversation</button>
        )}
      </form>
    </section>
  )
}
