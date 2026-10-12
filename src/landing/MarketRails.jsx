import { useState } from 'react'
import BookingModal from '../market/components/BookingModal'
import UniverseRail from '../market/components/UniverseRail'
import { UNIVERSES } from '../market/lib/universes'

const byId = (id) => UNIVERSES.find((u) => u.id === id)

/** Vitrines de l'accueil : nouveautés + quelques univers phares (données réelles). */
export default function MarketRails() {
  const [booking, setBooking] = useState(null)
  return (
    <div className="mk-container mk-rails">
      <UniverseRail title="Nouveautés sur le marché" params={{ sort: 'recent' }} href="/marche?sort=recent" onBook={setBooking} />
      {['hotels', 'main-oeuvre', 'agriculture', 'transport'].map((id) => (
        <UniverseRail key={id} universe={byId(id)} onBook={setBooking} />
      ))}
      {booking && <BookingModal item={booking} onClose={() => setBooking(null)} />}
    </div>
  )
}
