import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FaHourglassEnd, FaSearch, FaWhatsapp, FaStar } from 'react-icons/fa'
import { Button, EmptyState } from '../../components/ui'
import { useLoad } from '../../api/useLoad'
import { getStoredPromo, normalizePromo, storePromo } from '../../api/promo'
import { ListingGrid } from '../components/ListingCard'
import BookingModal from '../components/BookingModal'
import { marketApi } from '../lib/api'
import { selectionOrderMessage, whatsappLink } from '../lib/chat'

/*
 * Sélection éphémère d'un influenceur (/selection/:slug) : un petit catalogue
 * choisi en messagerie et partagé par un lien court. Le code promo de
 * l'influenceur est mémorisé pour la session (comme ?promo=CODE) et repris dans
 * le message de commande WhatsApp. Une sélection expirée renvoie 410.
 */

const fmtDay = (d) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  } catch {
    return ''
  }
}

export default function SelectionPage() {
  const { slug = '' } = useParams()
  const [booking, setBooking] = useState(null)
  const { data, loading, error } = useLoad(() => marketApi.collection(slug.toLowerCase()), [slug])

  // Code de l'influenceur gardé pour la session (s'il n'y en a pas déjà un, venu d'un lien).
  const code = normalizePromo(data?.code)
  useEffect(() => {
    if (code && !getStoredPromo()) storePromo(code)
  }, [code])

  useEffect(() => {
    if (data?.title) document.title = `${data.title} · Sélection Tindisa`
  }, [data?.title])

  const track = () => {
    marketApi.collectionClick(slug.toLowerCase()).catch(() => undefined)
  }

  if (error) {
    const expired = error.status === 410
    return (
      <div className="mk-container">
        <EmptyState
          icon={expired ? <FaHourglassEnd /> : <FaSearch />}
          title={expired ? 'Cette sélection a expiré' : 'Sélection introuvable'}
          text={expired
            ? 'Les sélections partagées restent en ligne quelques jours. Les articles sont peut-être encore sur le marché.'
            : 'Le lien est peut-être incomplet. Découvrez le marché Tindisa.'}
          action={<Button as={Link} to="/marche">Voir le marché</Button>}
        />
      </div>
    )
  }

  const sel = data || { title: '', items: [] }
  const orderCode = getStoredPromo() || code

  return (
    <div className="mk-container mk-explore">
      <section className="mk-selection-banner">
        <div>
          <span className="mk-eyebrow"><FaStar /> {sel.influencerFirstName ? `Sélection de ${sel.influencerFirstName}` : 'Sélection Tindisa'}</span>
          <h1>{loading ? 'Chargement…' : sel.title}</h1>
          {!loading && (
            <p>
              {sel.items.length} article{sel.items.length > 1 ? 's' : ''}
              {sel.expiresAt ? ` · en ligne jusqu’au ${fmtDay(sel.expiresAt)}` : ''}
            </p>
          )}
        </div>
        {code && (
          <div className="mk-selection-code">
            <small>Code promo à donner à l’achat</small>
            <strong>{code}</strong>
          </div>
        )}
      </section>

      {!loading && sel.items.length === 0 ? (
        <EmptyState
          icon={<FaSearch />}
          title="Ces articles ne sont plus disponibles"
          text="Ils ont été vendus ou retirés. Le marché Tindisa en propose d’autres."
          action={<Button as={Link} to="/marche">Voir le marché</Button>}
        />
      ) : (
        <div onClickCapture={track}>
          <ListingGrid items={sel.items} loading={loading} onBook={setBooking} skeleton={6} />
        </div>
      )}

      {!loading && sel.items.length > 0 && (
        <div className="mk-selection-actions">
          <a
            className="mk-selection-order"
            href={whatsappLink(selectionOrderMessage(sel, orderCode))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={track}
          >
            <FaWhatsapp /> Commander via WhatsApp
          </a>
        </div>
      )}
      {booking && <BookingModal item={booking} onClose={() => setBooking(null)} />}
    </div>
  )
}
