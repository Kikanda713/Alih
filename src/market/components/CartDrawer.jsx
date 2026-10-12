import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaTimes, FaTrashAlt, FaMinus, FaPlus, FaShoppingCart, FaStore } from 'react-icons/fa'
import { Button, EmptyState } from '../../components/ui'
import { useCart } from '../CartContext'
import { formatPrice, unitSuffix, imageUrl } from '../lib/format'
import { bookingSummary, lineTotal, totalsByCurrency } from '../lib/chat'

/** Ligne de panier (réutilisée par le tiroir et la page panier). */
export function CartLine({ item, compact = false }) {
  const { setQty, remove } = useCart()
  const total = lineTotal(item)
  const img = imageUrl(item.image, 160)
  return (
    <div className={`mk-line${compact ? ' mk-line-compact' : ''}`}>
      <Link to={`/annonce/${item.id}`} className="mk-line-img">
        {img ? <img src={img} alt="" /> : <FaStore />}
      </Link>
      <div className="mk-line-info">
        <Link to={`/annonce/${item.id}`} className="mk-line-name">{item.name}</Link>
        <span className="mk-line-sub">
          {item.price != null ? `${formatPrice(item.price, item.currency)} ${unitSuffix(item.billingUnit)}` : 'Prix à confirmer'}
          {item.shop?.name && !item.shop.isP2P ? ` · ${item.shop.name}` : ''}
        </span>
        {item.booking && <span className="mk-line-booking">{bookingSummary(item)}</span>}
        <div className="mk-line-actions">
          {!item.booking && (
            <div className="mk-stepper" role="group" aria-label="Quantité">
              <button type="button" onClick={() => setQty(item.key, item.qty - 1)} disabled={item.qty <= 1} aria-label="Moins"><FaMinus /></button>
              <span>{item.qty}</span>
              <button type="button" onClick={() => setQty(item.key, item.qty + 1)} aria-label="Plus"><FaPlus /></button>
            </div>
          )}
          <button type="button" className="mk-line-remove" onClick={() => remove(item.key)} aria-label={`Retirer ${item.name}`}>
            <FaTrashAlt /> <span>Retirer</span>
          </button>
        </div>
      </div>
      <strong className="mk-line-total">{total != null ? formatPrice(total, item.currency) : '·'}</strong>
    </div>
  )
}

export default function CartDrawer() {
  const { items, open, setOpen, count } = useCart()
  const navigate = useNavigate()
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, setOpen])

  if (!open) return null
  const totals = totalsByCurrency(items)

  return (
    <div className="mk-drawer-overlay" onMouseDown={close}>
      <aside className="mk-drawer mk-drawer-right" role="dialog" aria-modal="true" aria-label="Panier" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mk-drawer-head">
          <h2><FaShoppingCart /> Panier <span className="mk-muted">({count})</span></h2>
          <button type="button" className="mk-icon-btn" onClick={close} aria-label="Fermer"><FaTimes /></button>
        </div>
        <div className="mk-drawer-body">
          {items.length === 0 ? (
            <EmptyState
              icon={<FaShoppingCart />}
              title="Votre panier est vide"
              text="Ajoutez des produits ou réservez un service, puis envoyez votre commande dans la messagerie."
              action={<Button onClick={() => { close(); navigate('/marche') }}>Explorer le marché</Button>}
            />
          ) : (
            items.map((it) => <CartLine key={it.key} item={it} compact />)
          )}
        </div>
        {items.length > 0 && (
          <div className="mk-drawer-foot">
            <div className="mk-drawer-total">
              <span>Total estimé</span>
              <strong>{totals.length ? totals.join(' + ') : 'À confirmer'}</strong>
            </div>
            <Button onClick={() => { close(); navigate('/panier') }} className="mk-btn-block">Finaliser la commande</Button>
            <Button variant="ghost" onClick={close} className="mk-btn-block">Continuer mes achats</Button>
          </div>
        )}
      </aside>
    </div>
  )
}
