import { FaSearch, FaShoppingCart, FaWhatsapp, FaShieldAlt, FaTruck } from 'react-icons/fa'

const STEPS = [
  { ic: <FaSearch />, t: 'Cherchez et comparez', s: 'Sur le site ou en écrivant à l’assistant, même avec une photo.' },
  { ic: <FaShoppingCart />, t: 'Composez votre panier', s: 'Produits, nuits d’hôtel, salle, artisan : avec dates et quantités.' },
  { ic: <FaWhatsapp />, t: 'Envoyez-le par message', s: 'L’assistant vérifie la disponibilité et négocie pour vous.' },
  { ic: <FaShieldAlt />, t: 'Payez en sécurité', s: 'Cash ou Mobile Money, argent bloqué en séquestre jusqu’à réception.' },
  { ic: <FaTruck />, t: 'Recevez ou retirez', s: 'Nos livreurs vous apportent la commande, ou vous passez en boutique.' },
]

/** Parcours client complet : du site à la messagerie. */
export default function ChatFlow() {
  return (
    <section className="mk-flow" id="parcours">
      <div className="mk-container">
        <h2 className="section-title">Du site à votre messagerie</h2>
        <p className="section-subtitle">Le site vous aide à choisir. La conversation conclut : simple, protégé, partout au Congo.</p>
        <ol className="mk-flow-steps">
          {STEPS.map((st, i) => (
            <li key={st.t}>
              <span className="mk-flow-num">{i + 1}</span>
              <span className="mk-flow-ic">{st.ic}</span>
              <b>{st.t}</b>
              <small>{st.s}</small>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
