import { useEffect, useRef, useState } from 'react'
import {
  FaPaperPlane, FaPaperclip, FaPlus, FaRegComments, FaTrash, FaTimes, FaFileAlt,
  FaHandshake, FaBoxOpen, FaTags, FaImage, FaCommentDots, FaArrowLeft,
} from 'react-icons/fa'
import { useT } from '../../../i18n'
import ChatThread from '../../../components/ChatThread.jsx'
import { Spinner } from '../../../components/ui.jsx'
import { useAssistant } from './assistantContext'

/*
 * Assistant Tindisa du tableau de bord : panneau latéral (bureau) ou plein écran
 * (mobile), ouvert par le bouton flottant ou celui de l'en-tête. Conversations,
 * pièces jointes, suggestions et rendu riche des réponses (ChatThread).
 */

function Composer() {
  const { t } = useT()
  const { input, setInput, send, attachments, onAttach, removeAttachment, uploading, sending, open } = useAssistant()
  const fileRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true })
  }, [open])

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }
  return (
    <div className="composer asst-composer">
      {attachments.length > 0 && (
        <div className="composer-atts">
          {attachments.map((a, i) => (
            <span key={i} className="composer-att">
              {a.url ? <img src={a.url} alt="" /> : <FaFileAlt />}
              <span className="composer-att-name">{String(a.name || '')}</span>
              <button type="button" onClick={() => removeAttachment(i)} aria-label="Retirer"><FaTimes /></button>
            </span>
          ))}
        </div>
      )}
      <div className="composer-row">
        <input ref={fileRef} type="file" hidden onChange={onAttach} accept="image/*,.pdf,.doc,.docx" />
        <button type="button" className="composer-icon" onClick={() => fileRef.current?.click()} disabled={uploading} title={t('chat.attach')} aria-label={t('chat.attach')}>
          <FaPaperclip />
        </button>
        <textarea
          ref={inputRef}
          className="composer-input"
          rows={1}
          maxLength={4000}
          placeholder={t('chat.placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="button" className="composer-send" onClick={send} disabled={sending || uploading || (!input.trim() && attachments.length === 0)} aria-label={t('chat.send')}>
          <FaPaperPlane />
        </button>
      </div>
      {uploading && <span className="composer-hint">{t('form.imageUploading')}</span>}
    </div>
  )
}

function ConversationList({ onPicked }) {
  const { t } = useT()
  const { conversations, conversationsLoading, currentId, selectConversation, deleteConversation } = useAssistant()
  if (conversationsLoading && conversations.length === 0) return <div className="asst-center"><Spinner label="Chargement…" /></div>
  if (conversations.length === 0) return <p className="asst-empty-list">{t('chat.noConversations')}</p>
  return (
    <ul className="asst-conv-list">
      {conversations.map((c) => (
        <li key={c.id} className={`chat-conv-item${c.id === currentId ? ' active' : ''}`}>
          <button type="button" className="chat-conv-open" onClick={() => { selectConversation(c.id); onPicked() }}>
            <FaRegComments /> <span>{typeof c.title === 'string' && c.title ? c.title : t('chat.untitled')}</span>
          </button>
          <button type="button" className="chat-conv-del" aria-label={t('cat.delete')} onClick={() => deleteConversation(c.id)}>
            <FaTrash />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function AssistantLauncher() {
  const { open, openAssistant } = useAssistant()
  if (open) return null
  return (
    <button type="button" className="asst-launcher" onClick={() => openAssistant()} aria-label="Ouvrir l'assistant Tindisa">
      <FaCommentDots /> <span>Assistant</span>
    </button>
  )
}

export function AssistantHeaderButton() {
  const { open, openAssistant, closeAssistant } = useAssistant()
  return (
    <button
      type="button"
      className={`dash-assistant-btn${open ? ' active' : ''}`}
      onClick={() => (open ? closeAssistant() : openAssistant())}
      aria-pressed={open}
      aria-label="Assistant Tindisa"
      title="Assistant Tindisa"
    >
      <FaCommentDots /> <span>Assistant</span>
    </button>
  )
}

export default function AssistantPanel() {
  const { t } = useT()
  const { open, closeAssistant, messages, sending, loadingConv, newConversation, sendText } = useAssistant()
  const [view, setView] = useState('chat')
  const listRef = useRef(null)

  // Défilement vers le dernier message.
  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [open, messages, sending])

  // Échap ferme ; plein écran mobile : pas de défilement de la page derrière.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') closeAssistant() }
    document.addEventListener('keydown', onKey)
    const mobile = window.matchMedia('(max-width: 640px)').matches
    if (mobile) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      if (mobile) document.body.style.overflow = ''
    }
  }, [open, closeAssistant])

  if (!open) return null

  const suggestions = [
    { icon: <FaHandshake />, label: t('chat.sugg.sales'), prompt: t('chat.sugg.salesPrompt') },
    { icon: <FaBoxOpen />, label: t('chat.sugg.stock'), prompt: t('chat.sugg.stockPrompt') },
    { icon: <FaTags />, label: t('chat.sugg.price'), prompt: t('chat.sugg.pricePrompt') },
    { icon: <FaImage />, label: t('chat.sugg.publish'), prompt: t('chat.sugg.publishPrompt') },
  ]
  const empty = messages.length === 0 && !sending

  return (
    <>
      <div className="asst-backdrop" onClick={closeAssistant} />
      <section className="asst-panel" role="dialog" aria-label="Assistant Tindisa">
        <header className="asst-head">
          {view === 'list' ? (
            <button type="button" className="asst-icon" onClick={() => setView('chat')} aria-label="Retour à la conversation"><FaArrowLeft /></button>
          ) : (
            <span className="chat-ava" aria-hidden="true" translate="no">T</span>
          )}
          <div className="asst-title">
            <b>{view === 'list' ? t('chat.conversations') : 'Assistant Tindisa'}</b>
            <small>{view === 'list' ? 'Reprenez une discussion' : 'Chercher, vendre, négocier, livrer'}</small>
          </div>
          {view === 'chat' && (
            <button type="button" className="asst-icon" onClick={() => setView('list')} title={t('chat.conversations')} aria-label={t('chat.conversations')}>
              <FaRegComments />
            </button>
          )}
          <button type="button" className="asst-icon" onClick={() => { newConversation(); setView('chat') }} title="Nouvelle conversation" aria-label="Nouvelle conversation">
            <FaPlus />
          </button>
          <button type="button" className="asst-icon" onClick={closeAssistant} aria-label="Fermer l'assistant"><FaTimes /></button>
        </header>

        {view === 'list' ? (
          <div className="asst-body">
            <ConversationList onPicked={() => setView('chat')} />
          </div>
        ) : (
          <>
            <div className="asst-body" ref={listRef} aria-live="polite">
              {loadingConv ? (
                <div className="asst-center"><Spinner label="Chargement de la conversation…" /></div>
              ) : empty ? (
                <div className="asst-welcome">
                  <h2>{t('chat.greeting')}</h2>
                  <p>{t('chat.greetingSub')}</p>
                  <div className="asst-sugg">
                    {suggestions.map((s) => (
                      <button key={s.label} type="button" onClick={() => sendText(s.prompt)}>
                        <span className="chat-suggestion-icon">{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ChatThread messages={messages} typing={sending} />
              )}
            </div>
            <Composer />
          </>
        )}
      </section>
    </>
  )
}
