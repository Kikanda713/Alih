import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaShoppingCart, FaWhatsapp, FaTelegramPlane, FaTruck, FaStore, FaShieldAlt, FaCheckCircle,
  FaHandshake, FaMoneyBillWave, FaComments, FaChevronDown,
} from 'react-icons/fa'
import { Button, EmptyState, Field, Input, Textarea } from '../../components/ui'
import { useToast } from '../../components/useToast'
import { useTaxonomy } from '../../api/taxonomy'
import mpesaLogo from '../../assets/MPESA.png'
import airtelLogo from '../../assets/AIRTEL.png'
import orangeLogo from '../../assets/ORANGE.png'
import { useCart } from '../useCart'
import { CartLine } from '../components/CartDrawer'
import { buildOrderMessage, totalsByCurrency, whatsappLink, openTelegram } from '../lib/chat'

/*
 * Panier + finalisation. Le visiteur précise réception et paiement souhaités ;
 * la commande part dans la messagerie où l'assistant confirme disponibilité et
 * prix, négocie si demandé, encaisse en séquestre et organise la livraison.
 */

const PREF_KEY = 'tindisa_checkout_prefs'
const PAYMENTS = [
  { id: 'cash', label: 'Cash à la réception', icon: <FaMoneyBillWave /> },
  { id: 'mpesa', label: 'M-Pesa', logo: mpesaLogo },
  { id: 'airtel', label: 'Airtel Money', logo: airtelLogo },
  { id: 'orange', label: 'Orange Money', logo: orangeLogo },
]

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { return {} }
}

export default function CartPage() {
  const { items, clear } = useCart()
  const { notify } = useToast()
  const taxonomy = useTaxonomy()
  const [prefs] = useState(loadPrefs)
  const [reception, setReception] = useState(prefs.reception || 'delivery')
  const [city, setCity] = useState(prefs.city || '')
  const [address, setAddress] = useState(prefs.address || '')
  const [payment, setPayment] = useState(prefs.payment || 'cash')
  const [name, setName] = useState(prefs.name || '')
  const [negotiate, setNegotiate] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => { document.title = 'Mon panier · Tindisa' }, [])

  const hasProducts = items.some((it) => it.type !== 'service')
  const cityName = (taxonomy?.cities || []).find((c) => c.id === city)?.name || city
  const message = useMemo(() => buildOrderMessage(items, {
    reception: hasProducts ? reception : null,
    city: cityName, address: reception === 'delivery' ? address.trim() : '',
    payment, negotiate, name: name.trim(), note: note.trim(),
  }), [items, hasProducts, reception, cityName, address, payment, negotiate, name, note])

  // Regroupement par vendeur (une commande peut viser plusieurs boutiques).
  const groups = useMemo(() => {
    const map = new Map()
    for (const it of items) {
      const k = it.shop?.isP2P ? 'p2p' : it.shop?.id || 'other'
      if (!map.has(k)) map.set(k, { label: it.shop?.isP2P ? 'Vente entre particuliers' : it.shop?.name || 'Vendeur', items: [] })
      map.get(k).items.push(it)
    }
    return [...map.values()]
  }, [items])

  const validate = () => {
    if (hasProducts && reception === 'delivery' && (!city || !address.trim())) {
      notify('Indiquez la ville et l’adresse ou un repère pour la livraison.', 'error')
      return false
    }
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ reception, city, address, payment, name })) } catch { /* mode privé */ }
    return true
  }
  const sendWhatsApp = () => {
    if (!validate()) return
    window.open(whatsappLink(message), '_blank', 'noopener')
    setSent('whatsapp')
  }
  const sendTelegram = async () => {
    if (!validate()) return
    await openTelegram(message)
    notify('Commande copiée : collez-la dans la conversation Telegram.', 'info', 5000)
    setSent('telegram')
  }

  if (sent) {
    return (
      <div className="mk-container mk-page-pad mk-sent">
        <span className="mk-sent-icon"><FaCheckCircle /></span>
        <h1>Votre commande est dans la conversation</h1>
        <p className="mk-muted">
          {sent === 'telegram' ? 'Collez le message copié dans Telegram et envoyez-le.' : 'Envoyez le message pré-rempli dans WhatsApp.'}
          {' '}L’assistant Tindisa prend le relais :
        </p>
        <ol className="mk-steps">
          <li><FaCheckCircle /> <span><b>Vérification</b> de la disponibilité et du prix de chaque article.</span></li>
          {negotiate && <li><FaHandshake /> <span><b>Négociation</b> avec les vendeurs, sans jamais descendre sous leur prix.</span></li>}
          <li><FaShieldAlt /> <span><b>Paiement protégé</b> en séquestre (cash ou Mobile Money).</span></li>
          <li><FaTruck /> <span><b>Livraison ou retrait</b>, suivi dans la messagerie.</span></li>
        </ol>
        <div className="mk-sent-actions">
          <Button variant="ghost" onClick={() => setSent(null)}>Revenir au panier</Button>
          <Button variant="secondary" onClick={() => { clear(); setSent(null) }}>Vider le panier</Button>
          <Button as={Link} to="/marche">Continuer mes achats</Button>
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="mk-container mk-page-pad">
        <EmptyState icon={<FaShoppingCart />} title="Votre panier est vide"
          text="Ajoutez des produits, réservez une chambre ou une salle, demandez un artisan : tout se finalise ensuite dans votre messagerie."
          action={<Button as={Link} to="/marche">Explorer le marché</Button>} />
      </div>
    )
  }

  const totals = totalsByCurrency(items)

  return (
    <div className="mk-container mk-cart">
      <h1>Mon panier</h1>
      <div className="mk-cart-grid">
        <div className="mk-cart-items">
          {groups.map((g) => (
            <section key={g.label} className="mk-section-card">
              <h2 className="mk-cart-group"><FaStore /> {g.label}</h2>
              {g.items.map((it) => <CartLine key={it.key} item={it} />)}
            </section>
          ))}
        </div>

        <aside className="mk-section-card mk-checkout">
          <h2>Finaliser</h2>

          {hasProducts && (
            <Field label="Réception des produits">
              <div className="mk-seg mk-seg-wide">
                <button type="button" className={reception === 'delivery' ? 'active' : ''} onClick={() => setReception('delivery')}><FaTruck /> Livraison</button>
                <button type="button" className={reception === 'pickup' ? 'active' : ''} onClick={() => setReception('pickup')}><FaStore /> Retrait</button>
              </div>
            </Field>
          )}

          <Field label="Ville">
            <select className="ui-input ui-select" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Choisir…</option>
              {(taxonomy?.cities || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {hasProducts && reception === 'delivery' && (
            <Field label="Adresse ou repère" hint="Commune, quartier, avenue, repère connu (église, rond-point…)">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={140} placeholder="Ex. Gombe, av. du Commerce, près de la poste" />
            </Field>
          )}

          <Field label="Paiement souhaité">
            <div className="mk-pay">
              {PAYMENTS.map((p) => (
                <button key={p.id} type="button" className={payment === p.id ? 'active' : ''} onClick={() => setPayment(p.id)}>
                  {p.logo ? <img src={p.logo} alt="" /> : p.icon} <span>{p.label}</span>
                </button>
              ))}
            </div>
          </Field>

          <label className="mk-check">
            <input type="checkbox" checked={negotiate} onChange={(e) => setNegotiate(e.target.checked)} />
            <span>Je souhaite que l’assistant négocie les prix</span>
          </label>

          <div className="mk-form-row">
            <Field label="Votre nom (facultatif)"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>
          </div>
          <Field label="Note (facultatif)">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} placeholder="Horaire de livraison, précision…" />
          </Field>

          <div className="mk-drawer-total">
            <span>Total estimé</span>
            <strong>{totals.length ? totals.join(' + ') : 'À confirmer'}</strong>
          </div>
          <p className="mk-hint">Prix indicatifs : l’assistant confirme le prix final et la disponibilité. Rien n’est débité avant votre accord.</p>

          <button type="button" className="platform-btn whatsapp mk-btn-block" onClick={sendWhatsApp}>
            <FaWhatsapp className="platform-icon" /> <span>Envoyer ma commande sur WhatsApp</span>
          </button>
          <button type="button" className="platform-btn telegram mk-btn-block" onClick={sendTelegram}>
            <FaTelegramPlane className="platform-icon" /> <span>Envoyer sur Telegram</span>
          </button>

          <button type="button" className="mk-link-btn" onClick={() => setPreview((v) => !v)} aria-expanded={preview}>
            <FaComments /> Aperçu du message <FaChevronDown className={preview ? 'mk-rot' : ''} />
          </button>
          {preview && <pre className="mk-preview">{message}</pre>}

          <ul className="mk-assurances">
            <li><FaShieldAlt /> <span>Paiement en séquestre : le vendeur est payé après votre confirmation de réception.</span></li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
