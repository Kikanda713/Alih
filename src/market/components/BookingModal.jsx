import { useState } from 'react'
import { Modal, Button, Field, Input, Textarea } from '../../components/ui'
import { formatPrice, unitSuffix, unitName } from '../lib/format'
import { bookingMode } from '../lib/universes'
import { lineTotal } from '../lib/chat'
import { useCart } from '../CartContext'
import { useToast } from '../../components/Toast'

/*
 * Réservation / demande de prestation pour un SERVICE, adaptée à son unité :
 *  stay  (nuit, jour, semaine, mois) : arrivée → départ, personnes ;
 *  slot  (heure) : date, heure, durée, personnes (salles) ;
 *  job   (prestation, forfait, km, m²…) : date souhaitée, quantité, lieu, besoin.
 * Le résultat va au panier ; la disponibilité est confirmée par l'assistant.
 */

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (d, n) => {
  const x = new Date(`${d}T00:00:00`)
  x.setDate(x.getDate() + n)
  return x.toISOString().slice(0, 10)
}
const PER_DAYS = { night: 1, day: 1, week: 7, month: 30 }

function stayUnits(start, end, unit) {
  if (!start || !end) return 0
  const days = Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000)
  if (days <= 0) return 0
  return Math.max(1, Math.ceil(days / (PER_DAYS[unit] || 1)))
}

// Lieu d'intervention utile pour la main d'œuvre, le transport, la livraison.
const NEEDS_PLACE = ['construction-batiment', 'reparation-maintenance', 'transport-logistique', 'sante-soins', 'evenementiel', 'restauration']
const HAS_GUESTS = ['hebergement', 'evenementiel', 'restauration']

export default function BookingModal({ item, onClose, onDone }) {
  const { add } = useCart()
  const { notify } = useToast()
  const mode = bookingMode(item)
  const [start, setStart] = useState(today())
  const [end, setEnd] = useState(addDays(today(), PER_DAYS[item?.billingUnit] || 1))
  const [time, setTime] = useState('09:00')
  const [hours, setHours] = useState(2)
  const [qty, setQty] = useState(1)
  const [guests, setGuests] = useState('')
  const [place, setPlace] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  if (!item || !mode) return null
  const category = String(item.category || '').toLowerCase()
  const units = mode === 'stay' ? stayUnits(start, end, item.billingUnit) : mode === 'slot' ? Number(hours) || 0 : Math.max(1, Number(qty) || 1)
  const booking = {
    mode, start, units,
    end: mode === 'stay' ? end : undefined,
    time: mode === 'slot' ? time : undefined,
    guests: guests ? Number(guests) : undefined,
    place: place.trim() || undefined,
    note: note.trim() || undefined,
  }
  const estimate = lineTotal({ price: item.price, qty: 1, booking })
  const title = mode === 'job' ? 'Demander la prestation' : 'Réserver'

  const submit = () => {
    if (!start || start < today()) return setError('Choisissez une date à venir.')
    if (mode === 'stay' && units < 1) return setError('La date de fin doit être après la date de début.')
    if (mode === 'slot' && units < 1) return setError('Indiquez une durée d’au moins une heure.')
    add(item, { booking })
    notify('Ajouté au panier. Finalisez dans la messagerie.', 'success', 3000)
    onDone?.()
    onClose()
  }

  return (
    <Modal open title={title} onClose={onClose}>
      <div className="mk-book">
        <div className="mk-book-head">
          <strong>{item.name}</strong>
          {item.price != null && <span>{formatPrice(item.price, item.currency)} {unitSuffix(item.billingUnit)}</span>}
        </div>

        {mode === 'stay' && (
          <div className="mk-form-row">
            <Field label={item.billingUnit === 'night' ? 'Arrivée' : 'Début'}>
              <Input type="date" min={today()} value={start} onChange={(e) => { setStart(e.target.value); setError('') }} />
            </Field>
            <Field label={item.billingUnit === 'night' ? 'Départ' : 'Fin'}>
              <Input type="date" min={start} value={end} onChange={(e) => { setEnd(e.target.value); setError('') }} />
            </Field>
          </div>
        )}

        {mode === 'slot' && (
          <div className="mk-form-row mk-form-row-3">
            <Field label="Date"><Input type="date" min={today()} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Heure"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="Durée (h)"><Input type="number" min="1" max="72" value={hours} onChange={(e) => setHours(e.target.value)} /></Field>
          </div>
        )}

        {mode === 'job' && (
          <div className="mk-form-row">
            <Field label="Date souhaitée"><Input type="date" min={today()} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            {!['service', 'forfait', 'projet'].includes(item.billingUnit) && (
              <Field label={`Quantité (${unitName(item.billingUnit, true)})`}>
                <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
              </Field>
            )}
          </div>
        )}

        {HAS_GUESTS.includes(category) && (
          <Field label="Nombre de personnes" hint="Capacité de la salle ou de la chambre, nombre de couverts…">
            <Input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="Ex. 2" />
          </Field>
        )}

        {(mode === 'job' || NEEDS_PLACE.includes(category)) && (
          <Field label="Lieu d'intervention ou de livraison" hint="Commune, quartier, repère connu">
            <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ex. Himbi, près du rond-point" maxLength={120} />
          </Field>
        )}

        <Field label="Précisions (facultatif)">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={240}
            placeholder={mode === 'job' ? 'Décrivez votre besoin : travaux, surface, matériel…' : 'Demande particulière, heure d’arrivée…'} />
        </Field>

        {error && <p className="mk-form-error">{error}</p>}

        <div className="mk-book-total">
          <span>Estimation{units > 1 ? ` (${units} ${unitName(item.billingUnit, true)})` : ''}</span>
          <strong>{estimate != null ? formatPrice(estimate, item.currency) : 'Prix à confirmer'}</strong>
        </div>
        <p className="mk-hint">Rien n’est payé maintenant. L’assistant Tindisa confirme la disponibilité et le prix final dans la messagerie.</p>

        <div className="ui-modal-foot">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit}>Ajouter au panier</Button>
        </div>
      </div>
    </Modal>
  )
}
