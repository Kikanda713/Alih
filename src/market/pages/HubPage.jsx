import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { FaMapMarkerAlt, FaStore, FaCheckCircle, FaWhatsapp, FaCity, FaSeedling, FaTachometerAlt, FaBroadcastTower, FaChevronRight } from 'react-icons/fa'
import { Button, EmptyState, Spinner } from '../../components/ui'
import { useTaxonomy } from '../../api/taxonomy'
import { marketApi } from '../lib/api'
import { useListings } from '../lib/useListings'
import { cityLabel, imageUrl, shopTypeLabel } from '../lib/format'
import { hubTypeLabel } from '../lib/hubs'
import { whatsappLink } from '../lib/chat'
import { WifiBadge, WifiTracker } from '../components/WifiStatus'
import { MeshMini } from '../components/MeshNetwork'
import { ListingGrid } from '../components/ListingCard'
import BookingModal from '../components/BookingModal'

function HubPage({ id }) {
  const navigate = useNavigate()
  const taxonomy = useTaxonomy()
  const [state, setState] = useState({ loading: true, hub: null })
  const [type, setType] = useState('')
  const [booking, setBooking] = useState(null)
  const listings = useListings({ hubId: id, type: type || undefined, facets: '0' }, { limit: 24 })

  useEffect(() => {
    let alive = true
    marketApi.hub(id)
      .then((hub) => alive && setState({ loading: false, hub }))
      .catch(() => alive && setState({ loading: false, hub: null }))
    return () => { alive = false }
  }, [id])
  const hub = state.hub
  useEffect(() => { if (hub) document.title = `${hub.name} · Centres Tindisa` }, [hub])

  if (state.loading) return <div className="mk-container mk-page-pad"><Spinner label="Chargement du centre…" /></div>
  if (!hub) {
    return (
      <div className="mk-container mk-page-pad">
        <EmptyState icon={<FaCity />} title="Centre introuvable" action={<Button onClick={() => navigate('/centres')}>Tous les centres</Button>} />
      </div>
    )
  }

  const live = hub.wifiStatus === 'live'
  const join = `Bonjour Tindisa, je souhaite ouvrir ma boutique au centre « ${hub.name} » (${cityLabel(taxonomy, hub.city) || ''}).`

  return (
    <div className="mk-hub-page">
      <section className={`mk-page-hero mk-page-hero-dark mk-hub-hero${hub.photoUrl ? ' has-photo' : ''}`}
        style={hub.photoUrl ? { '--hub-photo': `url(${imageUrl(hub.photoUrl, 1400)})` } : undefined}>
        <div className="mk-container mk-hub-hero-grid">
          <div>
            <nav className="mk-crumbs mk-crumbs-light"><Link to="/centres">Wifi Zone</Link><FaChevronRight /><span>{hub.name}</span></nav>
            <p className="mk-eyebrow mk-eyebrow-light">
              {hub.kind === 'rural' ? <><FaSeedling /> Zone rurale</> : <><FaCity /> Zone urbaine</>} · {hubTypeLabel(hub.hubType)}
            </p>
            <h1>{hub.name}</h1>
            <p><FaMapMarkerAlt /> {[hub.address, hub.commune, cityLabel(taxonomy, hub.city)].filter(Boolean).join(', ')}</p>
            {hub.description && <p className="mk-hub-desc">{hub.description}</p>}
            <div className="mk-hub-facts">
              <WifiBadge status={hub.wifiStatus} />
              <span><FaStore /> {hub.shopCount ?? 0} boutique{hub.shopCount > 1 ? 's' : ''}</span>
              {hub.meshNodes > 0 && <span><FaBroadcastTower /> {hub.meshNodes} nœuds Wi-Fi</span>}
              {hub.bandwidthMbps > 0 && <span><FaTachometerAlt /> {hub.bandwidthMbps} Mb/s</span>}
              {hub.coverageM > 0 && <span>Couverture ≈ {hub.coverageM} m</span>}
            </div>
          </div>
          <div className="mk-hub-hero-side">
            <MeshMini nodes={hub.meshNodes} live={live} shops={hub.shopCount || 0} />
            <WifiTracker status={hub.wifiStatus} liveAt={hub.wifiLiveAt} />
          </div>
        </div>
      </section>

      <div className="mk-container">
        {hub.shops?.length > 0 && (
          <section className="mk-rail-section">
            <div className="mk-rail-head"><h2>Boutiques du centre</h2></div>
            <div className="mk-shop-chips">
              {hub.shops.map((s) => (
                <Link key={s.id} to={`/boutique/${s.id}`} className="mk-shop-chip">
                  <span className="mk-shop-logo">{s.logoUrl ? <img src={imageUrl(s.logoUrl, 80)} alt="" /> : <FaStore />}</span>
                  <span>
                    <b>{s.name}</b>
                    <small>{shopTypeLabel(taxonomy, s.shopType) || 'Boutique'}{s.verified ? ' · vérifiée' : ''}</small>
                  </span>
                  {s.verified && <FaCheckCircle className="mk-ok" />}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mk-rail-section">
          <div className="mk-rail-head">
            <h2>Offres du centre</h2>
            <div className="mk-seg">
              {[['', 'Tout'], ['product', 'Produits'], ['service', 'Services']].map(([k, label]) => (
                <button key={k || 'all'} type="button" className={type === k ? 'active' : ''} onClick={() => setType(k)}>{label}</button>
              ))}
            </div>
          </div>
          {!listings.loading && listings.items.length === 0 ? (
            <EmptyState icon={<FaStore />} title="Pas encore d’offre en ligne" text="Les boutiques de ce centre publient bientôt leurs produits et services." />
          ) : (
            <>
              <ListingGrid items={listings.items} loading={listings.loading} onBook={setBooking} />
              {listings.hasMore && <div className="mk-more"><Button variant="secondary" onClick={listings.loadMore}>Voir plus</Button></div>}
            </>
          )}
        </section>

        <section className="mk-join">
          <div>
            <h2>Vous êtes commerçant ou producteur ici ?</h2>
            <p>Rejoignez le centre : votre boutique apparaît sur le marché, vous profitez du Wi-Fi Tindisa et des livraisons groupées.</p>
          </div>
          <a className="platform-btn whatsapp" href={whatsappLink(join)} target="_blank" rel="noopener noreferrer">
            <FaWhatsapp className="platform-icon" /> <span>Rejoindre ce centre</span>
          </a>
        </section>
      </div>
      {booking && <BookingModal item={booking} onClose={() => setBooking(null)} />}
    </div>
  )
}

export default function HubRoute() {
  const { id } = useParams()
  return <HubPage key={id} id={id} />
}
