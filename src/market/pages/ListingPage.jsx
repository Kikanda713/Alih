import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  FaMapMarkerAlt, FaCertificate, FaWhatsapp, FaTelegramPlane, FaShareAlt, FaStore, FaShieldAlt,
  FaTruck, FaHandshake, FaCartPlus, FaCalendarAlt, FaComments, FaMinus, FaPlus, FaCheckCircle,
  FaUserFriends, FaChevronRight, FaMoneyBillWave, FaWifi,
} from 'react-icons/fa'
import { WifiBadge } from '../components/WifiStatus'
import { Button, Spinner, EmptyState, Badge } from '../../components/ui'
import { useToast } from '../../components/useToast'
import { useTaxonomy, attributesFor } from '../../api/taxonomy'
import { marketApi } from '../lib/api'
import {
  formatPrice, unitSuffix, imageUrl, conditionLabel, categoryLabel, subcategoryLabel, cityLabel, shopTypeLabel,
} from '../lib/format'
import { bookingMode } from '../lib/universes'
import { buildItemMessage, whatsappLink, openTelegram } from '../lib/chat'
import { useCart } from '../useCart'
import BookingModal from '../components/BookingModal'
import { ListingGrid } from '../components/ListingCard'

// La 1re photo peut être la version AMÉLIORÉE (netteté) ; les originales suivent.
function Gallery({ images, videos, name, enhancedFirst }) {
  const media = [...images.map((src) => ({ kind: 'img', src })), ...videos.map((src) => ({ kind: 'video', src }))]
  const [idx, setIdx] = useState(0)
  if (!media.length) return <div className="mk-gallery-main mk-gallery-empty"><FaStore /></div>
  const cur = media[Math.min(idx, media.length - 1)]
  return (
    <div className="mk-gallery">
      <div className="mk-gallery-main">
        {enhancedFirst && idx === 0 && <span className="mk-gallery-note">Photo retouchée (netteté), originales ci-dessous</span>}
        {cur.kind === 'img'
          ? <img src={imageUrl(cur.src, 1000)} alt={name} />
          : <video src={cur.src} controls playsInline preload="metadata" />}
      </div>
      {media.length > 1 && (
        <div className="mk-gallery-thumbs">
          {media.map((m, i) => (
            <button key={m.src} type="button" className={i === idx ? 'active' : ''} onClick={() => setIdx(i)} aria-label={`Média ${i + 1}`}>
              {m.kind === 'img' ? <img src={imageUrl(m.src, 160)} alt="" /> : <span className="mk-thumb-video">▶</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ListingPage({ id }) {
  const navigate = useNavigate()
  const taxonomy = useTaxonomy()
  const { notify } = useToast()
  const { add, setOpen } = useCart()
  const [state, setState] = useState({ loading: true, item: null, error: null })
  const [qty, setQty] = useState(1)
  const [bookItem, setBookItem] = useState(null)

  useEffect(() => {
    let alive = true
    marketApi.listing(id)
      .then((item) => alive && setState({ loading: false, item, error: null }))
      .catch((error) => alive && setState({ loading: false, item: null, error }))
    window.scrollTo(0, 0)
    return () => { alive = false }
  }, [id])

  const item = state.item
  useEffect(() => {
    if (item) document.title = `${item.name} · Marché Tindisa`
  }, [item])

  if (state.loading) return <div className="mk-container mk-page-pad"><Spinner label="Chargement de l’annonce…" /></div>
  if (!item) {
    return (
      <div className="mk-container mk-page-pad">
        <EmptyState icon={<FaStore />} title="Annonce introuvable"
          text={state.error?.status === 404 ? 'Elle a peut-être été vendue ou retirée.' : 'Le marché ne répond pas, réessayez dans un instant.'}
          action={<Button onClick={() => navigate('/marche')}>Retour au marché</Button>} />
      </div>
    )
  }

  const mode = bookingMode(item)
  const price = formatPrice(item.price, item.currency)
  const attrs = attributesFor(taxonomy, item.category, item.subcategory)
  const attrRows = Object.entries(item.attributes || {})
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => [attrs.find((a) => a.id === k)?.label || k, `${v}${attrs.find((a) => a.id === k)?.unit ? ` ${attrs.find((a) => a.id === k).unit}` : ''}`])
  const cond = conditionLabel(taxonomy, item.condition)
  const sub = subcategoryLabel(taxonomy, item.category, item.subcategory)
  const shop = item.shop || {}

  const addToCart = () => {
    add(item, { qty })
    notify(`${item.name} ajouté au panier`, 'success', 2500)
    setOpen(true)
  }
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: item.name, url })
      else { await navigator.clipboard.writeText(url); notify('Lien copié', 'success', 2000) }
    } catch { /* partage annulé */ }
  }

  return (
    <div className="mk-container mk-listing">
      <nav className="mk-crumbs" aria-label="Fil d’Ariane">
        <Link to="/marche">Marché</Link><FaChevronRight />
        <Link to={`/marche?category=${encodeURIComponent(item.category || '')}`}>{categoryLabel(taxonomy, item.category) || 'Annonces'}</Link>
        {sub && <><FaChevronRight /><Link to={`/marche?category=${encodeURIComponent(item.category)}&subcategory=${encodeURIComponent(item.subcategory)}`}>{sub}</Link></>}
      </nav>

      <div className="mk-listing-grid">
        <Gallery
          images={item.coverEnhanced ? [item.images[0], ...(item.originalImages || [])] : item.images || []}
          enhancedFirst={item.coverEnhanced}
          videos={item.videos || []}
          name={item.name}
        />

        <div className="mk-listing-info">
          <div className="mk-listing-badges">
            <Badge tone={item.type === 'service' ? 'warn' : 'neutral'}>{item.type === 'service' ? 'Service' : 'Produit'}</Badge>
            {cond && <Badge>{cond}</Badge>}
            {item.certified && <Badge tone="success"><FaCertificate /> Certifié Tindisa</Badge>}
            {shop.isP2P && <Badge><FaUserFriends /> Particulier</Badge>}
          </div>
          <h1>{item.name}</h1>
          <p className="mk-listing-ref">Réf. {item.ref}{item.city ? <> · <FaMapMarkerAlt /> {cityLabel(taxonomy, item.city)}</> : null}</p>

          <div className="mk-price-box">
            {price ? <><strong>{price}</strong> <span>{unitSuffix(item.billingUnit)}</span></> : <strong>Prix sur demande</strong>}
            {item.negotiable && <span className="mk-nego"><FaHandshake /> Prix négociable avec l’assistant</span>}
          </div>

          {!mode ? (
            <div className="mk-buy">
              <div className="mk-stepper mk-stepper-lg" role="group" aria-label="Quantité">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Moins"><FaMinus /></button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(999, q + 1))} aria-label="Plus"><FaPlus /></button>
              </div>
              <Button onClick={addToCart}><FaCartPlus /> Ajouter au panier</Button>
            </div>
          ) : (
            <div className="mk-buy">
              <Button onClick={() => setBookItem(item)}>
                {mode === 'job' ? <><FaComments /> Demander la prestation</> : <><FaCalendarAlt /> Réserver</>}
              </Button>
            </div>
          )}

          <div className="mk-chat-actions">
            <a className="platform-btn whatsapp" href={whatsappLink(buildItemMessage(item, 'order'))} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp className="platform-icon" /> <span>Commander sur WhatsApp</span>
            </a>
            <button type="button" className="platform-btn telegram" onClick={() => { openTelegram(buildItemMessage(item, 'order')); notify('Message copié : collez-le dans Telegram', 'info', 4000) }}>
              <FaTelegramPlane className="platform-icon" /> <span>Telegram</span>
            </button>
          </div>
          <div className="mk-mini-actions">
            {item.negotiable && (
              <a href={whatsappLink(buildItemMessage(item, 'negotiate'))} target="_blank" rel="noopener noreferrer"><FaHandshake /> Négocier le prix</a>
            )}
            <a href={whatsappLink(buildItemMessage(item, 'question'))} target="_blank" rel="noopener noreferrer"><FaComments /> Poser une question</a>
            <button type="button" onClick={share}><FaShareAlt /> Partager</button>
          </div>

          <ul className="mk-assurances">
            <li><FaShieldAlt /> <span><b>Paiement protégé</b> : le vendeur n’est payé qu’après votre confirmation.</span></li>
            <li><FaMoneyBillWave /> <span>Cash ou Mobile Money (M-Pesa, Airtel, Orange).</span></li>
            {item.type !== 'service'
              ? <li><FaTruck /> <span>Livraison par nos livreurs ou retrait en boutique, au choix.</span></li>
              : <li><FaCheckCircle /> <span>Disponibilité confirmée par l’assistant avant tout paiement.</span></li>}
            {item.certificateRequired && !item.certified && (
              <li className="mk-warn"><FaCertificate /> <span>Article de valeur sans certificat : demandez la fiche de contrôle à l’assistant.</span></li>
            )}
          </ul>
        </div>
      </div>

      <div className="mk-listing-lower">
        <section className="mk-section-card">
          <h2>Description</h2>
          {item.description ? <p className="mk-desc">{item.description}</p> : <p className="mk-muted">Le vendeur n’a pas encore ajouté de description. Posez vos questions à l’assistant.</p>}
          {attrRows.length > 0 && (
            <>
              <h3>Caractéristiques</h3>
              <dl className="mk-attrs">
                {attrRows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            </>
          )}
        </section>

        <aside className="mk-section-card mk-shop-card">
          <div className="mk-shop-card-head">
            <span className="mk-shop-logo">{shop.logoUrl ? <img src={imageUrl(shop.logoUrl, 120)} alt="" /> : <FaStore />}</span>
            <div>
              <strong>{shop.isP2P ? 'Vente entre particuliers' : shop.name}</strong>
              <span className="mk-muted">{shop.isP2P ? 'Annonce modérée par Tindisa' : shopTypeLabel(taxonomy, shop.shopType) || 'Boutique'}</span>
            </div>
          </div>
          {shop.verified && <p className="mk-ok"><FaCheckCircle /> Vendeur vérifié</p>}
          {item.hub && (
            <p><Link to={`/centres/${item.hub.id}`} className="mk-hub-link"><FaWifi /> {item.hub.name}</Link> <WifiBadge status={item.hub.wifiStatus} compact /></p>
          )}
          <p className="mk-muted">
            <FaMapMarkerAlt /> {[shop.quartier, shop.commune, cityLabel(taxonomy, shop.city)].filter(Boolean).join(', ') || 'Localisation communiquée par l’assistant'}
            {shop.landmark ? <><br />Repère : {shop.landmark}</> : null}
          </p>
          {!shop.isP2P && shop.id && <Link to={`/boutique/${shop.id}`} className="ui-btn ui-btn-secondary mk-btn-block">Voir la boutique</Link>}
          <p className="mk-hint">Les coordonnées du vendeur et l’itinéraire sont transmis par l’assistant, au moment de conclure.</p>
        </aside>
      </div>

      {item.related?.length > 0 && (
        <section className="mk-rail-section">
          <div className="mk-rail-head"><h2>Annonces similaires</h2></div>
          <ListingGrid items={item.related} onBook={setBookItem} className="mk-grid-rail" />
        </section>
      )}

      {bookItem && <BookingModal item={bookItem} onClose={() => setBookItem(null)} onDone={() => setOpen(true)} />}
    </div>
  )
}

// Remonte la page à chaque annonce (état propre, pas de flash de l'annonce précédente).
export default function ListingRoute() {
  const { id } = useParams()
  return <ListingPage key={id} id={id} />
}
