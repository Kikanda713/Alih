import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { auth0Config, isAuth0Configured } from '../../auth/config'
import { ChatContext } from './useChat'
import { streamMessage } from './chatApi'

/*
 * État du chat de l'agent Tindisa intégré au site : conversation (gardée dans le
 * navigateur), envoi en streaming, ouverture depuis n'importe quelle page
 * (panier, annonce, recherche par photo). Connecté (Auth0) = commande possible
 * directement dans le chat ; sinon recherche, conseils et panier restent libres.
 */

const STORAGE_KEY = 'tindisa_webchat_v1'
const MAX_KEPT = 40
let seq = 0
const newId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`

function loadMessages() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(list) ? list.filter((m) => m && !m.pending) : []
  } catch {
    return []
  }
}

export function ChatProvider({ children }) {
  const auth = useAuth0()
  // Ouvert d'office au retour de connexion (?chat=1) : l'utilisateur reprend sa conversation.
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).has('chat'))
  const [messages, setMessages] = useState(loadMessages)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [photoRequest, setPhotoRequest] = useState(0)
  const messagesRef = useRef(messages)
  const busyRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.pending).slice(-MAX_KEPT)))
    } catch { /* mode privé */ }
  }, [messages])

  const connected = isAuth0Configured && !!auth.isAuthenticated

  const accessToken = useCallback(async () => {
    if (!connected) return null
    try {
      return await auth.getAccessTokenSilently(
        auth0Config.audience ? { authorizationParams: { audience: auth0Config.audience } } : undefined,
      )
    } catch {
      return null
    }
  }, [auth, connected])

  const patch = (id, fn) => setMessages((list) => list.map((m) => (m.id === id ? fn(m) : m)))

  const send = useCallback(async (text, images = []) => {
    const content = String(text || '').trim()
    if ((!content && !images.length) || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    const history = messagesRef.current
      .filter((m) => !m.error && m.content)
      .map(({ role, content: c }) => ({ role, content: c }))
    const botId = newId()
    setMessages((list) => [
      ...list,
      { id: newId(), role: 'user', content: content || '(photo)', images },
      { id: botId, role: 'assistant', content: '', pending: true },
    ])
    try {
      await streamMessage(
        { message: content, images, history, accessToken: await accessToken() },
        (tok) => patch(botId, (m) => ({ ...m, content: m.content + tok })),
      )
    } catch (e) {
      patch(botId, (m) => ({
        ...m,
        error: e?.status === 429 ? e.message : 'Le chat ne répond pas pour le moment. Réessayez, ou continuez sur WhatsApp ou Telegram.',
      }))
    } finally {
      patch(botId, (m) => ({ ...m, pending: false }))
      busyRef.current = false
      setBusy(false)
    }
  }, [accessToken])

  const openChat = useCallback(({ text = '', send: sendNow = false, photo = false } = {}) => {
    setOpen(true)
    if (text && sendNow) send(text)
    else if (text) setDraft(text)
    if (photo) setPhotoRequest((n) => n + 1)
  }, [send])

  const login = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('chat', '1')
    auth.loginWithRedirect({ appState: { returnTo: url.pathname + url.search } })
  }, [auth])

  const reset = useCallback(() => setMessages([]), [])

  const value = useMemo(() => ({
    open, setOpen, messages, busy, draft, setDraft, send, openChat, reset,
    photoRequest, connected, canLogin: isAuth0Configured, login,
  }), [open, messages, busy, draft, send, openChat, reset, photoRequest, connected, login])

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
