import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FaPaperPlane, FaPaperclip, FaPlus, FaRegComments, FaTrash, FaTimes,
  FaChartBar, FaChevronDown, FaBoxOpen, FaHandshake, FaTags, FaImage, FaFileAlt,
  FaConciergeBell, FaShoppingBag, FaCheckCircle, FaEye,
} from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useT } from '../../i18n/index.jsx'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { Spinner } from '../../components/ui.jsx'

function money(v, c = 'CDF') {
  const n = Number(v)
  return Number.isNaN(n) ? '—' : `${n.toLocaleString('fr-FR')} ${c}`
}

/* ---------------- Bloc statistiques flottant (réductible / fermable) ---------------- */
function StatsFloat({ stats }) {
  const { t } = useT()
  const [closed, setClosed] = useState(false)
  const [min, setMin] = useState(false)
  if (closed) {
    return (
      <button className="stats-reopen" onClick={() => setClosed(false)} title={t('chat.stats.title')}>
        <FaChartBar />
      </button>
    )
  }
  return (
    <div className={`stats-float${min ? ' min' : ''}`}>
      <div className="stats-float-head">
        <span className="stats-float-title"><FaChartBar /> {t('chat.stats.title')}</span>
        <div className="stats-float-actions">
          <button onClick={() => setMin((m) => !m)} aria-label="Réduire"><FaChevronDown className={min ? 'rot' : ''} /></button>
          <button onClick={() => setClosed(true)} aria-label="Fermer"><FaTimes /></button>
        </div>
      </div>
      {!min && (
        <div className="stats-float-body">
          <div className="stats-float-row"><FaBoxOpen /> <span>{stats.products}</span> {t('dash.home.products')}</div>
          <div className="stats-float-row"><FaEye /> <span>{stats.views}</span> vues</div>
          <div className="stats-float-row"><FaHandshake /> <span>{stats.sales}</span> {t('chat.stats.sales')}</div>
          <div className="stats-float-row"><FaTags /> <span>{money(stats.balance)}</span></div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Carrousel de produits dans le chat ----------------
   L'agent émet un bloc ```tindisa-products contenant un tableau JSON
   [{id,name,price,currency,city,image,condition,type}] → rendu en cartes. */
function ProductCarousel({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div className="chat-products">
      {items.map((p, i) => (
        <div className="chat-product-card" key={p.id || i}>
          {p.image ? (
            <img src={p.image} alt={p.name || ''} loading="lazy" />
          ) : (
            <div className="chat-product-noimg">{p.type === 'service' ? <FaConciergeBell /> : <FaShoppingBag />}</div>
          )}
          <div className="chat-product-body">
            <div className="chat-product-name" title={p.name}>{p.name}</div>
            {(p.certified || p.certificate) && (
              <div className="chat-product-cert" title="Authentifié par Wanzo"><FaCheckCircle /> Certifié</div>
            )}
            {p.price != null && p.price !== '' && (
              <div className="chat-product-price">{p.price} {p.currency || '$'}</div>
            )}
            {(p.city || p.condition) && (
              <div className="chat-product-meta">{[p.city, p.condition].filter(Boolean).join(' · ')}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Rendu Markdown (assistant) ----------------
   Tableaux GFM, liens (nouvel onglet), images responsives, et bloc produit. */
const mdComponents = {
  table: ({ node, ...props }) => (
    <div className="md-table-wrap"><table {...props} /></div>
  ),
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  img: ({ node, ...props }) => <img {...props} className="md-img" alt={props.alt || ''} />,
  code: ({ node, inline, className, children, ...props }) => {
    const lang = /language-([\w-]+)/.exec(className || '')?.[1]
    if (!inline && lang === 'tindisa-products') {
      const raw = String(children || '').trim()
      try {
        return <ProductCarousel items={JSON.parse(raw)} />
      } catch {
        // JSON encore incomplet (streaming) → placeholder discret.
        return <div className="chat-products-loading">Chargement des produits…</div>
      }
    }
    return <code className={className} {...props}>{children}</code>
  },
}

function MarkdownContent({ text }) {
  return (
    <div className="chat-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

/* ---------------- Bulle de message ---------------- */
function Bubble({ m }) {
  return (
    <div className={`chat-msg-row ${m.role}`}>
      {m.role === 'assistant' && <span className="chat-ava" translate="no">T</span>}
      <div className={`chat-bubble ${m.role}`}>
        {m.attachments?.length > 0 && (
          <div className="chat-atts">
            {m.attachments.map((a, i) =>
              a.url ? (
                <img key={i} src={a.url} alt={a.name || ''} className="chat-att-img" />
              ) : (
                <span key={i} className="chat-att-file"><FaFileAlt /> {a.name}</span>
              ),
            )}
          </div>
        )}
        {/* Assistant : markdown riche. Utilisateur : texte brut (sauts de ligne préservés). */}
        {m.content &&
          (m.role === 'assistant' ? (
            <MarkdownContent text={m.content} />
          ) : (
            <p className="chat-user-text">{m.content}</p>
          ))}
      </div>
    </div>
  )
}

/* ---------------- Composeur (barre de saisie + pièces jointes) ---------------- */
function Composer({ centered, value, onChange, onSend, attachments, onAttach, onRemoveAtt, uploading, sending }) {
  const { t } = useT()
  const fileRef = useRef(null)
  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }
  return (
    <div className={`composer${centered ? ' centered' : ''}`}>
      {attachments.length > 0 && (
        <div className="composer-atts">
          {attachments.map((a, i) => (
            <span key={i} className="composer-att">
              {a.url ? <img src={a.url} alt="" /> : <FaFileAlt />}
              <span className="composer-att-name">{a.name}</span>
              <button onClick={() => onRemoveAtt(i)} aria-label="Retirer"><FaTimes /></button>
            </span>
          ))}
        </div>
      )}
      <div className="composer-row">
        <input ref={fileRef} type="file" hidden onChange={onAttach} accept="image/*,.pdf,.doc,.docx" />
        <button className="composer-icon" onClick={() => fileRef.current?.click()} disabled={uploading} title={t('chat.attach')}>
          <FaPaperclip />
        </button>
        <textarea
          className="composer-input"
          rows={1}
          placeholder={t('chat.placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
        />
        <button className="composer-send" onClick={onSend} disabled={sending || uploading || (!value.trim() && attachments.length === 0)} aria-label={t('chat.send')}>
          <FaPaperPlane />
        </button>
      </div>
      {uploading && <span className="composer-hint">{t('form.imageUploading')}</span>}
    </div>
  )
}

/* ============================ ChatHome ============================ */
export default function ChatHome() {
  const api = useTindisaApi()
  const { t } = useT()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [convOpen, setConvOpen] = useState(false)
  const [stats, setStats] = useState({ products: 0, views: 0, sales: 0, balance: 0 })
  const [ready, setReady] = useState(false)
  const endRef = useRef(null)

  const loadConversations = useCallback(async () => {
    try {
      const r = await api.get('/v1/agent/conversations')
      setConversations(r?.conversations || [])
    } catch { /* real backend agent pas encore branché */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ;(async () => {
      const [conv, prod, off, wal] = await Promise.allSettled([
        api.get('/v1/agent/conversations'),
        api.get('/v1/merchant/products'),
        api.get('/v1/merchant/offers'),
        api.get('/v1/merchant/wallet'),
      ])
      if (conv.status === 'fulfilled') setConversations(conv.value?.conversations || [])
      const prodList = prod.status === 'fulfilled' ? (prod.value?.products || []) : []
      setStats({
        products: prodList.length,
        views: prodList.reduce((s, p) => s + (Number(p.views) || 0), 0),
        sales: off.status === 'fulfilled' ? (off.value?.offers || []).length : 0,
        balance: wal.status === 'fulfilled' ? wal.value?.balance || 0 : 0,
      })
      setReady(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const openConversation = async (id) => {
    setConvOpen(false)
    setCurrentId(id)
    try {
      const c = await api.get(`/v1/agent/conversations/${id}`)
      setMessages(c?.messages || [])
    } catch { setMessages([]) }
  }

  const newConversation = () => {
    setCurrentId(null)
    setMessages([])
    setInput('')
    setAttachments([])
    setConvOpen(false)
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

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content && attachments.length === 0) return
    const atts = attachments
    const userMsg = { id: `tmp-${messages.length}`, role: 'user', content, attachments: atts }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setAttachments([])
    setSending(true)
    const assistantId = `a-${Date.now()}`
    let acc = ''
    let started = false
    try {
      const { conversationId } = await api.streamChat(
        {
          conversationId: currentId,
          message: content,
          attachments: atts,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        },
        (tok) => {
          acc += tok
          if (!started) {
            started = true
            setSending(false) // 1er token reçu → la bulle prend le relais des "…"
            setMessages((m) => [...m, { id: assistantId, role: 'assistant', content: acc }])
          } else {
            setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: acc } : x)))
          }
        },
      )
      if (conversationId && conversationId !== currentId) {
        setCurrentId(conversationId)
        loadConversations()
      }
      if (!started) {
        setMessages((m) => [...m, { id: assistantId, role: 'assistant', content: t('chat.unavailable') }])
      }
    } catch {
      if (!started) {
        setMessages((m) => [...m, { id: assistantId, role: 'assistant', content: t('chat.unavailable') }])
      }
    } finally {
      setSending(false)
    }
  }

  const suggestions = [
    { icon: <FaHandshake />, label: t('chat.sugg.sales'), prompt: t('chat.sugg.salesPrompt') },
    { icon: <FaBoxOpen />, label: t('chat.sugg.stock'), prompt: t('chat.sugg.stockPrompt') },
    { icon: <FaTags />, label: t('chat.sugg.price'), prompt: t('chat.sugg.pricePrompt') },
    { icon: <FaImage />, label: t('chat.sugg.publish'), prompt: t('chat.sugg.publishPrompt') },
  ]

  const composerProps = {
    value: input, onChange: setInput, onSend: () => send(),
    attachments, onAttach, onRemoveAtt: (i) => setAttachments((a) => a.filter((_, k) => k !== i)),
    uploading, sending,
  }

  if (!ready) return <div className="dash-page"><Spinner label={t('merchant.loading')} /></div>

  const empty = messages.length === 0

  return (
    <div className={`chat-home${empty ? ' is-empty' : ''}`}>
      <StatsFloat stats={stats} />

      {/* Barre d'outils conversation */}
      <div className="chat-bar">
        <button className="chat-bar-btn" onClick={() => setConvOpen((o) => !o)}>
          <FaRegComments /> <span>{t('chat.conversations')}</span>
        </button>
        <button className="chat-bar-btn" onClick={newConversation}>
          <FaPlus /> <span>{t('chat.new')}</span>
        </button>
      </div>

      {/* Panneau des conversations */}
      {convOpen && (
        <>
          <div className="chat-conv-backdrop" onClick={() => setConvOpen(false)} />
          <div className="chat-conv-panel">
            <div className="chat-conv-head">{t('chat.conversations')}</div>
            {conversations.length === 0 && <p className="chat-conv-empty">{t('chat.noConversations')}</p>}
            {conversations.map((c) => (
              <div key={c.id} className={`chat-conv-item${c.id === currentId ? ' active' : ''}`}>
                <button className="chat-conv-open" onClick={() => openConversation(c.id)}>
                  <FaRegComments /> <span>{c.title || t('chat.untitled')}</span>
                </button>
                <button
                  className="chat-conv-del"
                  aria-label={t('cat.delete')}
                  onClick={async () => { await api.del(`/v1/agent/conversations/${c.id}`); if (c.id === currentId) newConversation(); loadConversations() }}
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {empty ? (
        <div className="chat-hero">
          <h1 className="chat-hero-title">{t('chat.greeting')}</h1>
          <p className="chat-hero-sub">{t('chat.greetingSub')}</p>
          <Composer centered {...composerProps} />
          <div className="chat-suggestions">
            {suggestions.map((s, i) => (
              <button key={i} className="chat-suggestion" onClick={() => send(s.prompt)}>
                <span className="chat-suggestion-icon">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="chat-thread">
            {messages.map((m) => <Bubble key={m.id} m={m} />)}
            {sending && (
              <div className="chat-msg-row assistant">
                <span className="chat-ava" translate="no">T</span>
                <div className="chat-bubble assistant typing"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <Composer {...composerProps} />
        </>
      )}
    </div>
  )
}
