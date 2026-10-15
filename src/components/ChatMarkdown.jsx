import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { FaConciergeBell, FaShoppingBag, FaCheckCircle } from 'react-icons/fa'
import { formatPrice } from '../market/lib/format.js'
import ChatLightbox from './ChatLightbox.jsx'

/*
 * Rendu des réponses de l'agent Tindisa (assistant du dashboard et chat du site) :
 * Markdown GFM (tableaux, listes, liens, code, images) + bloc ```tindisa-products```
 * (tableau JSON [{id,name,price,currency,city,image,condition,type,certified}])
 * affiché en cartes cliquables vers la fiche de l'annonce.
 * Les lignes « MEDIA:<url> » de l'agent (visuels partagés, images générées) et les
 * URL d'image seules sur une ligne deviennent des images ; toute image s'ouvre en
 * grand au clic.
 */

const IMG_URL = /^https?:\/\/\S+\.(?:jpe?g|png|webp|gif)(?:\?\S*)?$/i

// Hors blocs de code uniquement : MEDIA:<url> → image Markdown (chemin local non
// publiable → ligne retirée) ; URL d'image nue seule sur sa ligne → image.
function prepare(text) {
  return String(text || '')
    .split(/(```[\s\S]*?(?:```|$))/)
    .map((part, i) => {
      if (i % 2 === 1) return part
      return part
        .replace(/^[ \t]*MEDIA:[ \t]*(\S+)[ \t]*$/gim, (_m, url) => (/^https?:\/\//i.test(url) ? `![](${url})` : ''))
        .replace(/^[ \t]*(https?:\/\/\S+)[ \t]*$/gim, (m, url) => (IMG_URL.test(url) ? `![](${url})` : m))
    })
    .join('')
}

// Prix d'une carte : libellé prêt (priceLabel) sinon montant + devise de l'outil
// (« 65 000 $ », « 15 000 FC »). Sans devise connue : le montant seul, jamais une devise devinée.
function cardPrice(p) {
  if (p.priceLabel) return p.priceLabel
  const cur = String(p.currency || '').trim().toUpperCase()
  const known = cur === 'USD' || cur === '$' ? 'USD' : cur === 'CDF' || cur === 'FC' ? 'CDF' : null
  const n = Number(p.price)
  if (!Number.isFinite(n)) return String(p.price)
  if (!known) return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)
  return formatPrice(n, known)
}

function ProductCarousel({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div className="chat-products">
      {items.map((p, i) => {
        if (!p || typeof p !== 'object') return null
        const body = (
          <>
            {p.image ? (
              <img src={p.image} alt={String(p.name || '')} loading="lazy" />
            ) : (
              <div className="chat-product-noimg">{p.type === 'service' ? <FaConciergeBell /> : <FaShoppingBag />}</div>
            )}
            <div className="chat-product-body">
              <div className="chat-product-name" title={String(p.name || '')}>{String(p.name || '')}</div>
              {(p.certified || p.certificate) && (
                <div className="chat-product-cert" title="Certifié par Tindisa (vérifiable sur la blockchain)"><FaCheckCircle /> Certifié</div>
              )}
              {p.price != null && p.price !== '' && (
                <div className="chat-product-price">{cardPrice(p)}</div>
              )}
              {(p.city || p.condition) && (
                <div className="chat-product-meta">{[p.city, p.condition].filter((x) => typeof x === 'string' && x).join(' · ')}</div>
              )}
            </div>
          </>
        )
        return p.id
          ? <Link className="chat-product-card" key={String(p.id)} to={`/annonce/${p.id}`}>{body}</Link>
          : <div className="chat-product-card" key={i}>{body}</div>
      })}
    </div>
  )
}

// react-markdown passe `node` (AST) : à retirer avant de propager au DOM.
function withoutNode(props) {
  const rest = { ...props }
  delete rest.node
  return rest
}

// Composants de rendu ; `zoom(src, alt)` ouvre la visionneuse.
function makeComponents(zoom) {
  return {
    table: (props) => (
      <div className="md-table-wrap"><table {...withoutNode(props)} /></div>
    ),
    a: (allProps) => {
      const { href = '', children, ...props } = withoutNode(allProps)
      // Lien interne (/annonce/…, /dashboard/…) : navigation sans recharger la page.
      if (href.startsWith('/') && !href.startsWith('//')) {
        return <Link to={href} {...props}>{children}</Link>
      }
      return <a href={href} {...props} target="_blank" rel="noopener noreferrer">{children}</a>
    },
    img: (allProps) => {
      const { src, alt, ...props } = withoutNode(allProps)
      if (!src) return null
      return (
        <button type="button" className="md-img-btn" onClick={() => zoom(src, alt || '')} aria-label="Agrandir l'image">
          <img {...props} src={src} className="md-img" alt={alt || ''} loading="lazy" />
        </button>
      )
    },
    code: (allProps) => {
      const { inline, className, children, ...props } = withoutNode(allProps)
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
}

export default function ChatMarkdown({ text }) {
  const [zoomed, setZoomed] = useState(null)
  const components = useMemo(() => makeComponents((src, alt) => setZoomed({ src, alt })), [])
  const source = useMemo(() => prepare(text), [text])
  return (
    <div className="chat-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
      <ChatLightbox src={zoomed?.src} alt={zoomed?.alt} onClose={() => setZoomed(null)} />
    </div>
  )
}
