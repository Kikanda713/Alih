import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { FaConciergeBell, FaShoppingBag, FaCheckCircle } from 'react-icons/fa'
import { formatPrice } from '../market/lib/format.js'

/*
 * Rendu des réponses de l'agent Tindisa (chat du dashboard et chat du site) :
 * Markdown GFM (tableaux, liens, images) + bloc ```tindisa-products``` (tableau
 * JSON [{id,name,price,currency,city,image,condition,type,certified}]) affiché
 * en cartes cliquables vers la fiche de l'annonce.
 */

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
        const body = (
          <>
            {p.image ? (
              <img src={p.image} alt={p.name || ''} loading="lazy" />
            ) : (
              <div className="chat-product-noimg">{p.type === 'service' ? <FaConciergeBell /> : <FaShoppingBag />}</div>
            )}
            <div className="chat-product-body">
              <div className="chat-product-name" title={p.name}>{p.name}</div>
              {(p.certified || p.certificate) && (
                <div className="chat-product-cert" title="Certifié par Tindisa (vérifiable sur la blockchain)"><FaCheckCircle /> Certifié</div>
              )}
              {p.price != null && p.price !== '' && (
                <div className="chat-product-price">{cardPrice(p)}</div>
              )}
              {(p.city || p.condition) && (
                <div className="chat-product-meta">{[p.city, p.condition].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          </>
        )
        return p.id
          ? <Link className="chat-product-card" key={p.id} to={`/annonce/${p.id}`}>{body}</Link>
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

const mdComponents = {
  table: (props) => (
    <div className="md-table-wrap"><table {...withoutNode(props)} /></div>
  ),
  a: (props) => (
    <a {...withoutNode(props)} target="_blank" rel="noopener noreferrer" />
  ),
  img: (props) => <img {...withoutNode(props)} className="md-img" alt={props.alt || ''} />,
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

export default function ChatMarkdown({ text }) {
  return (
    <div className="chat-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
