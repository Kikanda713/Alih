import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { FaStore, FaMapMarkerAlt, FaCheckCircle, FaWhatsapp, FaSearch, FaWifi } from 'react-icons/fa'
import { WifiBadge } from '../components/WifiStatus'
import { Button, Spinner, EmptyState } from '../../components/ui'
import { useTaxonomy, businessNoun } from '../../api/taxonomy'
import { marketApi } from '../lib/api'
import { useListings } from '../lib/useListings'
import { imageUrl, cityLabel, shopTypeLabel } from '../lib/format'
import { whatsappLink } from '../lib/chat'
import { ListingGrid } from '../components/ListingCard'
import BookingModal from '../components/BookingModal'
import ShopSocials from '../components/ShopSocials'
import { ProFacts, ProWorks } from '../components/ProShowcase'

// Certificat d'établissement vérifié (visite Tindisa) : lien vers sa vérification publique.
function VerifiedBadge({ serial, validUntil }) {
  const d = validUntil ? new Date(validUntil) : null
  const until = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR', { dateStyle: 'long' }) : ''
  const body = (
    <>
      <FaCheckCircle /> <span>Établissement vérifié par Tindisa{until && <small> · valable jusqu'au {until}</small>}</span>
    </>
  )
  return typeof serial === 'string' && serial ? (
    <p><Link to={`/verify?c=${encodeURIComponent(serial)}`} className="mk-ok mk-shop-verified" title="Vérifier le certificat">{body}</Link></p>
  ) : (
    <p className="mk-ok mk-shop-verified">{body}</p>
  )
}

function ShopPage({ id }) {
  const navigate = useNavigate()
  const taxonomy = useTaxonomy()
  const [shop, setShop] = useState({ loading: true, data: null })
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [booking, setBooking] = useState(null)
  const listings = useListings({ q: query || undefined, type: type || undefined, facets: '0' }, { shopId: id })

  useEffect(() => {
    let alive = true
    marketApi.shop(id)
      .then((data) => alive && setShop({ loading: false, data }))
      .catch(() => alive && setShop({ loading: false, data: null }))
    return () => { alive = false }
  }, [id])

  const s = shop.data
  useEffect(() => { if (s) document.title = `${s.name} · Marché Tindisa` }, [s])

  if (shop.loading) return <div className="mk-container mk-page-pad"><Spinner label="Chargement…" /></div>
  if (!s) {
    return (
      <div className="mk-container mk-page-pad">
        <EmptyState icon={<FaStore />} title="Établissement introuvable" text="Il n’est plus actif sur Tindisa."
          action={<Button onClick={() => navigate('/marche')}>Retour au marché</Button>} />
      </div>
    )
  }

  const place = [s.quartier, s.commune, cityLabel(taxonomy, s.city)].filter(Boolean).join(', ')
  const noun = businessNoun(taxonomy, s.shopType, s.noun)
  const pro = s.pro || null
  const ask = pro
    ? `Bonjour Tindisa, je souhaite faire appel à « ${s.name} »${s.city ? ` (${cityLabel(taxonomy, s.city)})` : ''}. Est-il disponible ?`
    : `Bonjour Tindisa, je souhaite commander auprès de « ${s.name} »${s.city ? ` (${cityLabel(taxonomy, s.city)})` : ''}. Que proposent-ils ?`

  return (
    <div className="mk-container mk-shop">
      <header className="mk-shop-hero">
        <span className="mk-shop-logo mk-shop-logo-lg">{s.logoUrl ? <img src={imageUrl(s.logoUrl, 200)} alt="" /> : <FaStore />}</span>
        <div className="mk-shop-hero-info">
          <h1>{s.name}</h1>
          <p className="mk-muted">
            {shopTypeLabel(taxonomy, s.shopType) || noun.noun.charAt(0).toUpperCase() + noun.noun.slice(1)}
            {place && <> · <FaMapMarkerAlt /> {place}</>}
          </p>
          {s.landmark && <p className="mk-muted">Repère : {s.landmark}</p>}
          {s.verified && <VerifiedBadge serial={s.shopCertificateSerial} validUntil={s.shopCertificateValidUntil} />}
          {s.hub && (
            <p><Link to={`/centres/${s.hub.id}`} className="mk-hub-link"><FaWifi /> {s.hub.name}</Link> <WifiBadge status={s.hub.wifiStatus} compact /></p>
          )}
          {s.description && <p className="mk-shop-desc">{s.description}</p>}
          {pro && <ProFacts pro={pro} />}
        </div>
        <a className="platform-btn whatsapp" href={whatsappLink(ask)} target="_blank" rel="noopener noreferrer">
          <FaWhatsapp className="platform-icon" /> <span>{pro ? 'Contacter via l’assistant' : 'Commander via l’assistant'}</span>
        </a>
      </header>

      {pro && <ProWorks pro={pro} name={s.name} />}
      <ShopSocials socials={s.socials} shopName={s.name} />

      <div className="mk-shop-tools">
        <div className="mk-seg">
          {[['', 'Tout'], ['product', 'Produits'], ['service', 'Services']].map(([k, label]) => (
            <button key={k || 'all'} type="button" className={type === k ? 'active' : ''} onClick={() => setType(k)}>{label}</button>
          ))}
        </div>
        <form className="mk-shop-search" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()) }}>
          <input className="ui-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Chercher chez ${s.name}`} />
          <button type="submit" className="ui-btn ui-btn-primary ui-btn-sm" aria-label="Rechercher"><FaSearch /></button>
        </form>
      </div>

      {!listings.loading && listings.items.length === 0 ? (
        <EmptyState icon={<FaStore />} title="Aucune annonce" text={query ? 'Rien ne correspond à cette recherche.' : pro ? 'Pas encore de prestation en ligne : demandez un devis via l’assistant.' : `${noun.This} n’a pas encore d’annonce en ligne.`} />
      ) : (
        <>
          <ListingGrid items={listings.items} loading={listings.loading} onBook={setBooking} />
          {listings.hasMore && (
            <div className="mk-more">
              <Button variant="secondary" onClick={listings.loadMore} disabled={listings.loading}>Voir plus</Button>
            </div>
          )}
        </>
      )}
      {booking && <BookingModal item={booking} onClose={() => setBooking(null)} />}
    </div>
  )
}

export default function ShopRoute() {
  const { id } = useParams()
  return <ShopPage key={id} id={id} />
}
