import { useCallback, useRef, useState } from 'react'
import { useTindisaApi } from '../../../api/client'
import { useLoad } from '../../../api/useLoad'
import { uploadImage, isCloudinaryConfigured } from '../../../api/cloudinary'
import { useT } from '../../../i18n'
import { AssistantContext } from './assistantContext'

/*
 * État de l'assistant Tindisa du tableau de bord (ex-accueil « chat plein écran »).
 * Même API et mêmes conversations qu'avant : /v1/agent/conversations (liste,
 * lecture, suppression) et /v1/agent/chat/stream (réponse en streaming, repli
 * /v1/agent/chat). La conversation en cours est mémorisée dans le navigateur :
 * on la retrouve d'une page à l'autre et au retour sur le tableau de bord.
 */

const CURRENT_KEY = 'tindisa_dash_conversation_v1'

function readCurrent() {
  try { return localStorage.getItem(CURRENT_KEY) || null } catch { return null }
}
function writeCurrent(id) {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id)
    else localStorage.removeItem(CURRENT_KEY)
  } catch { /* mode privé */ }
}

let seq = 0
const localId = (p) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`

export function AssistantProvider({ children }) {
  const api = useTindisaApi()
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [currentId, setCurrentIdState] = useState(readCurrent)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingConv, setLoadingConv] = useState(false)
  const loadedRef = useRef(false)
  const sendingRef = useRef(false)
  const closeAssistant = useCallback(() => setOpen(false), [])

  const convs = useLoad(
    () => api.get('/v1/agent/conversations').then((r) => (Array.isArray(r?.conversations) ? r.conversations : []), () => []),
    [],
  )

  const setCurrentId = (id) => {
    setCurrentIdState(id)
    writeCurrent(id)
  }

  // Charge les messages d'une conversation ; renvoie la liste (pour l'historique).
  const loadConversation = async (id) => {
    setLoadingConv(true)
    loadedRef.current = true
    try {
      const c = await api.get(`/v1/agent/conversations/${encodeURIComponent(id)}`)
      const list = Array.isArray(c?.messages) ? c.messages : []
      setMessages(list)
      return list
    } catch {
      // Conversation supprimée ou inaccessible : on repart d'une conversation neuve.
      setCurrentId(null)
      setMessages([])
      return []
    } finally {
      setLoadingConv(false)
    }
  }

  const selectConversation = async (id) => {
    setCurrentId(id)
    setInput('')
    setAttachments([])
    return loadConversation(id)
  }

  const newConversation = () => {
    loadedRef.current = true
    setCurrentId(null)
    setMessages([])
    setInput('')
    setAttachments([])
  }

  const deleteConversation = async (id) => {
    try {
      await api.del(`/v1/agent/conversations/${encodeURIComponent(id)}`)
    } finally {
      if (id === currentId) newConversation()
      convs.reload()
    }
  }

  const onAttach = async (e) => {
    const inputEl = e.target
    const file = inputEl.files?.[0]
    if (!file) return
    inputEl.value = ''
    const isImg = file.type.startsWith('image/')
    if (isImg && isCloudinaryConfigured) {
      setUploading(true)
      try {
        const url = await uploadImage(file)
        setAttachments((a) => [...a, { name: file.name, url, type: file.type }])
      } catch {
        setAttachments((a) => [...a, { name: file.name, type: file.type }])
      } finally { setUploading(false) }
    } else {
      setAttachments((a) => [...a, { name: file.name, type: file.type }])
    }
  }

  const removeAttachment = (i) => setAttachments((a) => a.filter((_, k) => k !== i))

  // Envoi en streaming. `base` = messages connus (historique transmis à l'agent),
  // `convId` = conversation visée (explicite quand elle vient d'être choisie).
  const send = async (text, base = messages, convId = currentId) => {
    const content = String(text ?? input).trim()
    const atts = text == null ? attachments : []
    if ((!content && atts.length === 0) || sendingRef.current) return
    sendingRef.current = true
    setMessages((m) => [...m, { id: localId('u'), role: 'user', content, attachments: atts }])
    if (text == null) {
      setInput('')
      setAttachments([])
    }
    setSending(true)
    const assistantId = localId('a')
    let acc = ''
    let started = false
    try {
      const { conversationId } = await api.streamChat(
        {
          conversationId: convId,
          message: content,
          attachments: atts,
          history: base.map((m) => ({ role: m.role, content: m.content })),
        },
        (tok) => {
          acc += tok
          if (!started) {
            started = true
            setSending(false) // 1er morceau reçu : la bulle prend le relais des « … »
            setMessages((m) => [...m, { id: assistantId, role: 'assistant', content: acc }])
          } else {
            setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: acc } : x)))
          }
        },
      )
      if (conversationId && conversationId !== convId) {
        setCurrentId(conversationId)
        convs.reload()
      }
      if (!started) {
        setMessages((m) => [...m, { id: assistantId, role: 'assistant', content: t('chat.unavailable') }])
      }
    } catch {
      if (!started) {
        setMessages((m) => [...m, { id: assistantId, role: 'assistant', content: t('chat.unavailable') }])
      }
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  // Ouvre le panneau ; reprend la conversation mémorisée au premier affichage.
  const openAssistant = async ({ text = '', send: sendNow = false, conversationId = null } = {}) => {
    setOpen(true)
    let base = messages
    let target = currentId
    if (conversationId && conversationId !== currentId) {
      base = await selectConversation(conversationId)
      target = conversationId
    } else if (!loadedRef.current && currentId) {
      base = await loadConversation(currentId)
    }
    loadedRef.current = true
    // Conversation introuvable (supprimée) : loadConversation l'a oubliée, on repart à neuf.
    if (target && base.length === 0 && readCurrent() !== target) target = null
    if (text && sendNow) send(text, base, target)
    else if (text) setInput(text)
  }

  const value = {
    open,
    openAssistant,
    closeAssistant,
    conversations: convs.data || [],
    conversationsLoading: convs.loading,
    currentId,
    messages,
    loadingConv,
    input,
    setInput,
    attachments,
    onAttach,
    removeAttachment,
    uploading,
    sending,
    send: () => send(),
    sendText: (text) => send(text),
    selectConversation,
    newConversation,
    deleteConversation,
  }

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}
