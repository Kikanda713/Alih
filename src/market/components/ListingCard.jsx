import { Link, useNavigate } from 'react-router-dom'
import { FaMapMarkerAlt, FaCertificate, FaCartPlus, FaCalendarAlt, FaComments, FaStore, FaUserFriends, FaWifi, FaExclamationTriangle, FaAward, FaCheckCircle } from 'react-icons/fa'
import { formatPrice, unitSuffix, imageUrl, cityLabel } from '../lib/format'
import { bookingMode } from '../lib/universes'
import { useTaxonomy } from '../../api/taxonomy'
import { useCart } from '../useCart'
import { useToast } from '../../components/useToast'

/*
 * Carte d'annonce (produit OU service). Action rapide adaptée au type :
 *  produit → ajout au panier ; séjour/créneau → réserver ; prestation → demander.
 * `onBook` ouvre la modale de réservation (gérée par la page parente).
 */
// Étiquette du mode de service (le marché est multiservice, pas qu'un catalogue).
const MODE_TAG = { stay: 'Sur réservation', slot: 'À l’heure', job: 'Prestation' }

/**
 * Actifs de valeur : accès direct au certificat d'authentification s'il existe,
 * sinon mention explicite de son absence. Rien pour les articles courants.
 * (La carte est un lien : le bouton navigue sans déclencher l'ouverture de l'annonce.)
 */
export function CertificateLine({ item, large = false }) {
  const navigate = useNavigate()
  if (item.certificateSerial) {
    return (
      <button
        type="button"
        className={`mk-cert-btn${large ? ' mk-cert-btn-lg' : ''}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/verify?c=${encodeURIComponent(item.certificateSerial)}`) }}
      >
        <FaCertificate /> Voir le certificat
      </button>
    )
  }
  if (!item.certificateRequired) return null
  return (
    <span className="mk-cert-missing" title="Article de valeur sans certificat d’authentification Tindisa">
      <FaExclamationTriangle /> Sans certificat
    </span>
  )
}

export function ListingCard({ item, onBook }) {
  const taxonomy = useTaxonomy()
  const { add } = useCart()
  const { notify } = useToast()
  const mode = bookingMode(item)
  const price = formatPrice(item.price, item.currency)
  const img = imageUrl(item.images?.[0], 420)

  const quick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (mode) return onBook?.(item)
    add(item)
    notify(`${item.name} ajouté au panier`, 'success', 2500)
  }

  const QuickIcon = mode === 'stay' || mode === 'slot' ? FaCalendarAlt : mode === 'job' ? FaComments : FaCartPlus
  const quickLabel = mode === 'stay' || mode === 'slot' ? 'Réserver' : mode === 'job' ? 'Demander' : 'Ajouter'

  return (
    <Link to={`/annonce/${item.id}`} className="mk-card">
      <div className="mk-card-media">
        {img ? <img src={img} alt="" loading="lazy" /> : <span className="mk-card-noimg"><FaStore /></span>}
        <div className="mk-card-tags">
          {mode && <span className="mk-tag mk-tag-service">{MODE_TAG[mode]}</span>}
          {item.certified && <span className="mk-tag mk-tag-cert"><FaCertificate /> Certifié</span>}
          {item.shop?.isP2P && <span className="mk-tag"><FaUserFriends /> Particulier</span>}
          {item.proCertified && <span className="mk-tag mk-tag-pro" title="Aptitude professionnelle certifiée par Tindisa"><FaAward /> Pro certifié</span>}
        </div>
      </div>
      <div className="mk-card-body">
        <h3 className="mk-card-title">{item.name}</h3>
        <div className="mk-card-price">
          {price ? <><strong>{price}</strong> <span>{unitSuffix(item.billingUnit)}</span></> : <strong className="mk-muted">Prix sur demande</strong>}
          {item.negotiable && <span className="mk-nego">Négociable</span>}
        </div>
        <div className="mk-card-meta">
          {item.city && <span><FaMapMarkerAlt /> {cityLabel(taxonomy, item.city)}</span>}
          {item.shop?.name && !item.shop.isP2P && (
            <span className="mk-card-shop">
              {item.shop.name}
              {item.shop.verified === true && (
                <FaCheckCircle className="mk-card-verified" title="Établissement vérifié par Tindisa" aria-label="Établissement vérifié par Tindisa" />
              )}
            </span>
          )}
        </div>
        {item.hub && (
          <div className={`mk-card-hub${item.hub.wifiStatus === 'live' ? ' is-live' : ''}`} title={item.hub.wifiStatus === 'live' ? 'Centre connecté au Wi-Fi Tindisa' : 'Centre en cours de connexion'}>
            <FaWifi /> {item.hub.name}
          </div>
        )}
        <CertificateLine item={item} />
      </div>
      <button type="button" className="mk-card-quick" onClick={quick} aria-label={`${quickLabel} : ${item.name}`}>
        <QuickIcon /> <span>{quickLabel}</span>
      </button>
    </Link>
  )
}

export function ListingGrid({ items, loading, onBook, skeleton = 8, className = '' }) {
  if (loading && !items?.length) {
    return (
      <div className={`mk-grid ${className}`.trim()} aria-busy="true">
        {Array.from({ length: skeleton }).map((_, i) => <div key={i} className="mk-card mk-skel" />)}
      </div>
    )
  }
  return (
    <div className={`mk-grid ${className}`.trim()}>
      {items.map((it) => <ListingCard key={it.id} item={it} onBook={onBook} />)}
    </div>
  )
}
