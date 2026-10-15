import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import {
  FaBoxOpen, FaEye, FaHandshake, FaWallet, FaMoneyBillWave, FaMagic, FaCamera, FaTag,
  FaCertificate, FaExchangeAlt, FaBullhorn, FaShoppingCart, FaWhatsapp, FaTelegramPlane,
  FaPaperPlane, FaRegComments, FaArrowRight, FaStore, FaPlus, FaGlobeAfrica, FaWifi,
  FaArrowDown, FaArrowUp, FaUserCog, FaExclamationTriangle, FaCommentDots,
} from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { channels } from '../../auth/config'
import { missingLabels } from '../../market/lib/pro'
import { useCart } from '../../market/useCart'
import { Badge, Button, Card } from '../../components/ui.jsx'
import ShopCompletionNudge from '../../components/ShopCompletionNudge.jsx'
import PaymentModal from '../../components/PaymentModal.jsx'
import { useAssistant } from './assistant/assistantContext'
import { loadHome, buildActivity, certStatus, money, usd, num, txt, relDate } from './home/homeData'

/*
 * Accueil du tableau de bord : vue d'ensemble adaptée au compte (acheteur,
 * commerçant, technicien, influenceur) + activité récente. L'assistant Tindisa
 * est accessible partout via son panneau (bouton flottant / en-tête).
 */

const ACT_ICON = {
  sale: <FaHandshake />, offer: <FaHandshake />, credit: <FaArrowDown />, debit: <FaArrowUp />,
  fee: <FaMoneyBillWave />, cert: <FaCertificate />, bata: <FaExchangeAlt />,
}

function firstName(user) {
  const n = txt(user?.given_name) || txt(user?.name) || txt(user?.nickname)
  if (!n || n.includes('@')) return ''
  return n.split(' ')[0]
}

function todayLabel() {
  const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* ---------- Squelette de chargement ---------- */
function HomeSkeleton() {
  return (
    <div className="home-skel" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="skel skel-hero" />
      <div className="home-kpis">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skel skel-kpi" />)}
      </div>
      <div className="home-grid">
        {[0, 1, 2].map((i) => <div key={i} className="skel skel-card" />)}
      </div>
    </div>
  )
}

/* ---------- Bandeau d'accueil + question rapide à l'assistant ---------- */
function Hero({ name, roles, subtitle }) {
  const { openAssistant } = useAssistant()
  const [q, setQ] = useState('')
  const ask = (e) => {
    e.preventDefault()
    const text = q.trim()
    openAssistant(text ? { text, send: true } : {})
    setQ('')
  }
  return (
    <Card className="home-hero">
      <div className="home-hero-top">
        <div>
          <p className="home-hero-date">{todayLabel()}</p>
          <h1 className="dash-h1">Bonjour{name ? ` ${name}` : ''} 👋</h1>
          <p className="dash-sub">{subtitle}</p>
        </div>
        <div className="home-roles">
          {roles.map((r) => <Badge key={r.label} tone={r.tone}>{r.label}</Badge>)}
        </div>
      </div>
      <form className="home-ask" onSubmit={ask}>
        <FaCommentDots className="home-ask-ic" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Demandez à l’assistant : un prix, une vente, une livraison…"
          aria-label="Question pour l’assistant Tindisa"
          maxLength={2000}
        />
        <button type="submit" className="home-ask-send" aria-label="Envoyer à l’assistant"><FaPaperPlane /></button>
      </form>
    </Card>
  )
}

function Kpi({ icon, value, label, to, hint }) {
  const body = (
    <>
      <span className="home-kpi-icon">{icon}</span>
      <span className="home-kpi-text">
        <span className="home-kpi-value">{value}</span>
        <span className="home-kpi-label">{label}</span>
        {hint && <span className="home-kpi-hint">{hint}</span>}
      </span>
    </>
  )
  return to ? <Link to={to} className="home-kpi">{body}</Link> : <div className="home-kpi">{body}</div>
}

function CardHead({ icon, title, to, linkLabel = 'Voir' }) {
  return (
    <div className="home-card-head">
      <h2 className="home-card-title">{icon} {title}</h2>
      {to && <Link to={to} className="home-card-link">{linkLabel} <FaArrowRight /></Link>}
    </div>
  )
}

function Row({ icon, label, value, tone, to }) {
  const inner = (
    <>
      <span className="home-row-label">{icon} {label}</span>
      {tone ? <Badge tone={tone}>{value}</Badge> : <b>{value}</b>}
    </>
  )
  return to ? <Link to={to} className="home-row home-row-link">{inner}</Link> : <div className="home-row">{inner}</div>
}

/* ---------- Frais de commission ---------- */
function FeesNotice({ fees, onPay }) {
  const owed = num(fees?.owedUsd)
  const status = txt(fees?.status) || 'ok'
  const th = fees?.thresholds || {}
  if (owed <= 0 || status === 'ok') return null
  const msg = status === 'blocked'
    ? `Vente suspendue : vos frais (${usd(owed)}) dépassent ${usd(th.block ?? 50)}. Réglez-les pour vendre à nouveau.`
    : status === 'reminder'
      ? `Rappel : ${usd(owed)} de frais de commission à régler (blocage à ${usd(th.block ?? 50)}).`
      : `Vous pouvez régler vos frais de commission (${usd(owed)}).`
  return (
    <div className={`home-alert home-alert-${status === 'blocked' ? 'danger' : 'warn'}`} role="status">
      <FaExclamationTriangle />
      <span>{msg}</span>
      <Button size="sm" onClick={onPay}>Régler</Button>
    </div>
  )
}

/* ---------- Carte : santé du catalogue ---------- */
function CatalogueCard({ d }) {
  const noPhoto = d.products.filter((p) => !p.imageUrl && !(Array.isArray(p.images) && p.images.length)).length
  const noPrice = d.products.filter((p) => p.price == null || p.price === '' || num(p.price) <= 0).length
  return (
    <Card className="home-card">
      <CardHead icon={<FaBoxOpen />} title="Santé du catalogue" to="/dashboard/catalogue" />
      {d.products.length === 0 ? (
        <div className="home-empty">
          <p>Aucun produit publié pour l’instant. Ajoutez votre premier article : il sera visible sur le marché et trouvé par l’assistant.</p>
          <Button as={Link} to="/dashboard/catalogue?new=1" size="sm"><FaPlus /> Ajouter un produit</Button>
        </div>
      ) : (
        <div className="home-rows">
          {d.photosToValidate != null && (
            <Row icon={<FaMagic />} label="Photos améliorées à valider" value={d.photosToValidate}
              tone={d.photosToValidate > 0 ? 'warn' : 'success'} to="/dashboard/catalogue" />
          )}
          <Row icon={<FaCamera />} label="Articles sans photo" value={noPhoto} tone={noPhoto > 0 ? 'warn' : 'success'} to="/dashboard/catalogue" />
          <Row icon={<FaTag />} label="Articles sans prix" value={noPrice} tone={noPrice > 0 ? 'warn' : 'success'} to="/dashboard/catalogue" />
          <div className="home-card-actions">
            <Button as={Link} to="/dashboard/catalogue?new=1" size="sm" variant="secondary"><FaPlus /> Ajouter un produit</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ---------- Carte : certificats ---------- */
function CertificatesCard({ d }) {
  const s = d.certSummary
  const inReview = s ? num(s.paid) + num(s.infoRequested) : 0
  const own = d.isPro ? d.proCert : d.shopCert
  const ownSt = certStatus(own)
  const ownTo = d.isPro ? '/dashboard/certificat-pro' : '/dashboard/certificat-etablissement'
  const ownLabel = d.isPro ? 'Certificat d’aptitude pro (CAP)' : 'Établissement vérifié'
  if (!s && own === undefined) return null
  return (
    <Card className="home-card">
      <CardHead icon={<FaCertificate />} title="Certificats" to={ownTo} />
      <div className="home-rows">
        {own !== undefined && d.shop && <Row label={ownLabel} value={ownSt.label} tone={ownSt.tone} to={ownTo} />}
        {s && (
          <>
            <Row label="Actifs certifiés" value={num(s.certified)} to="/dashboard/catalogue" />
            <Row label="Demandes en attente de paiement" value={num(s.requested)} tone={num(s.requested) > 0 ? 'warn' : undefined} to="/dashboard/catalogue" />
            <Row label="En vérification" value={inReview} to="/dashboard/catalogue" />
            {num(s.owedUsd) > 0 && <Row label="Frais de certificat dus" value={usd(s.owedUsd)} tone="warn" to="/dashboard/catalogue" />}
          </>
        )}
      </div>
    </Card>
  )
}

/* ---------- Carte : BATA ---------- */
function BataCard({ d }) {
  if (!d.bataOffers) return null
  const active = d.bataOffers.filter((o) => o.status === 'active').length
  const toAnswer = d.bataProps.filter((p) => p.direction === 'received' && p.status === 'proposed').length
  return (
    <Card className="home-card">
      <CardHead icon={<FaExchangeAlt />} title="BATA (échanges)" to="/dashboard/bata" />
      {d.bataOffers.length === 0 && d.bataProps.length === 0 ? (
        <div className="home-empty">
          <p>Échangez un article contre un autre, avec ou sans complément d’argent.</p>
          <Button as={Link} to="/dashboard/bata" size="sm" variant="secondary">Proposer un échange</Button>
        </div>
      ) : (
        <div className="home-rows">
          <Row label="Offres d’échange actives" value={active} to="/dashboard/bata" />
          <Row label="Propositions à répondre" value={toAnswer} tone={toAnswer > 0 ? 'warn' : 'success'} to="/dashboard/bata" />
        </div>
      )}
    </Card>
  )
}

/* ---------- Carte : programme influenceur ---------- */
function InfluencerCard({ d }) {
  const inf = d.influencer
  if (!inf) return null
  const status = txt(inf.status)
  const code = Array.isArray(inf.codes)
    ? inf.codes.map((c) => (typeof c === 'string' ? c : txt(c?.code))).find(Boolean)
    : ''
  const stats = inf.stats && typeof inf.stats === 'object' ? inf.stats : {}
  return (
    <Card className="home-card">
      <CardHead icon={<FaBullhorn />} title="Programme influenceur" to="/dashboard/influenceur" />
      {!inf.enrolled ? (
        <div className="home-empty">
          <p>Recommandez Tindisa avec votre code promo et touchez une part sur les ventes et les certificats.</p>
          <Button as={Link} to="/dashboard/influenceur" size="sm" variant="secondary">Devenir influenceur</Button>
        </div>
      ) : status === 'pending' ? (
        <div className="home-rows"><Row label="Votre demande" value="En cours d’examen" tone="warn" to="/dashboard/influenceur" /></div>
      ) : (
        <div className="home-rows">
          {code && <Row label="Votre code" value={code} />}
          <Row label="Solde à verser" value={usd(stats.balanceUsd)} />
          <Row label="En attente" value={usd(stats.pendingUsd)} />
          {d.selections != null && <Row label="Sélections publiées" value={d.selections} to="/dashboard/influenceur" />}
          {status === 'suspended' && <Row label="Statut" value="Suspendu" tone="danger" />}
        </div>
      )}
    </Card>
  )
}

/* ---------- Carte : profil technicien ---------- */
function ProCard({ d }) {
  if (!d.isPro || !d.pro) return null
  const missing = missingLabels(Array.isArray(d.pro.missing) ? d.pro.missing : [])
  const complete = !!d.pro.complete || missing.length === 0
  const cap = certStatus(d.proCert)
  return (
    <Card className="home-card">
      <CardHead icon={<FaUserCog />} title="Profil technicien" to="/vendre/pro" linkLabel="Modifier" />
      <div className="home-rows">
        <Row label="Profil" value={complete ? 'Complet' : 'À compléter'} tone={complete ? 'success' : 'warn'} to="/vendre/pro" />
        {!complete && <p className="home-note">Il manque : {missing.join(', ')}.</p>}
        <Row label="Certificat d’aptitude (CAP)" value={cap.label} tone={cap.tone} to="/dashboard/certificat-pro" />
      </div>
    </Card>
  )
}

/* ---------- Carte : panier ---------- */
function CartCard() {
  const { count } = useCart()
  return (
    <Card className="home-card">
      <CardHead icon={<FaShoppingCart />} title="Mon panier" to={count ? '/panier' : '/marche'} linkLabel={count ? 'Ouvrir' : 'Marché'} />
      {count ? (
        <div className="home-rows">
          <Row label="Articles dans le panier" value={count} to="/panier" />
          <p className="home-note">Finalisez la commande avec l’assistant : disponibilité, négociation, paiement et livraison.</p>
        </div>
      ) : (
        <div className="home-empty">
          <p>Votre panier est vide. Parcourez le marché ou demandez à l’assistant de trouver ce qu’il vous faut.</p>
          <Button as={Link} to="/marche" size="sm" variant="secondary"><FaGlobeAfrica /> Explorer le marché</Button>
        </div>
      )}
    </Card>
  )
}

/* ---------- Carte : canaux ---------- */
function ChannelsMini() {
  return (
    <Card className="home-card">
      <CardHead icon={<FaRegComments />} title="Tindisa sur votre messagerie" />
      <p className="home-note">Le même assistant répond sur WhatsApp et Telegram : vendez, cherchez et suivez vos affaires où que vous soyez.</p>
      <div className="home-channels">
        <a className="home-channel ch-whatsapp" href={channels.whatsapp} target="_blank" rel="noopener noreferrer"><FaWhatsapp /> WhatsApp</a>
        <a className="home-channel ch-telegram" href={channels.telegram} target="_blank" rel="noopener noreferrer"><FaTelegramPlane /> Telegram</a>
      </div>
    </Card>
  )
}

/* ---------- Activité récente ---------- */
function Activity({ items, merchant }) {
  return (
    <Card className="home-card home-activity">
      <CardHead icon={<FaHandshake />} title="Activité récente" />
      {items.length === 0 ? (
        <div className="home-empty">
          <p>
            {merchant
              ? 'Pas encore d’activité. Vos ventes, négociations, paiements et certificats apparaîtront ici.'
              : 'Pas encore d’activité. Vos commandes, échanges et paiements apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <ol className="home-timeline">
          {items.map((it) => (
            <li key={it.key}>
              <Link to={it.to} className="home-tl-item">
                <span className={`home-tl-icon tone-${it.tone}`}>{ACT_ICON[it.kind] || <FaHandshake />}</span>
                <span className="home-tl-text">
                  <b>{it.title}</b>
                  {it.sub && <small>{it.sub}</small>}
                </span>
                <span className="home-tl-meta">
                  <Badge tone={it.tone}>{it.label}</Badge>
                  {relDate(it.date) && <time>{relDate(it.date)}</time>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

/* ---------- Conversations récentes avec l'assistant ---------- */
function RecentConversations() {
  const { conversations, openAssistant } = useAssistant()
  const recent = conversations.slice(0, 4)
  return (
    <Card className="home-card">
      <CardHead icon={<FaCommentDots />} title="Avec l’assistant" />
      {recent.length === 0 ? (
        <div className="home-empty">
          <p>Posez une question, publiez un produit en photo ou demandez un prix : l’assistant s’occupe du reste.</p>
          <Button size="sm" variant="secondary" onClick={() => openAssistant()}><FaCommentDots /> Ouvrir l’assistant</Button>
        </div>
      ) : (
        <ul className="home-convs">
          {recent.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => openAssistant({ conversationId: c.id })}>
                <FaRegComments /> <span>{txt(c.title) || 'Sans titre'}</span> <FaArrowRight className="home-convs-go" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ---------- Raccourcis ---------- */
function Shortcuts({ merchant }) {
  const items = merchant
    ? [
      { to: '/dashboard/catalogue?new=1', icon: <FaPlus />, label: 'Ajouter un produit' },
      { to: '/dashboard/boutique', icon: <FaStore />, label: 'Mon établissement' },
      { to: '/dashboard/ventes', icon: <FaHandshake />, label: 'Mes ventes' },
      { to: '/marche', icon: <FaGlobeAfrica />, label: 'Le marché' },
    ]
    : [
      { to: '/marche', icon: <FaGlobeAfrica />, label: 'Le marché' },
      { to: '/panier', icon: <FaShoppingCart />, label: 'Mon panier' },
      { to: '/centres', icon: <FaWifi />, label: 'Centres Wi-Fi' },
      { to: '/vendre', icon: <FaStore />, label: 'Vendre sur Tindisa' },
    ]
  return (
    <nav className="home-shortcuts" aria-label="Raccourcis">
      {items.map((s) => (
        <Link key={s.to} to={s.to} className="home-shortcut">{s.icon}<span>{s.label}</span></Link>
      ))}
    </nav>
  )
}

export default function DashboardHome() {
  const api = useTindisaApi()
  const { user } = useAuth0()
  const [payFees, setPayFees] = useState(false)
  const { data: d, loading, reload } = useLoad(() => loadHome(api), [])

  if (loading && !d) return <div className="dash-page home"><HomeSkeleton /></div>
  if (!d) return null

  const roles = [
    ...(d.merchant ? [{ label: d.isPro ? 'Technicien' : 'Commerçant', tone: 'success' }] : [{ label: 'Acheteur', tone: 'neutral' }]),
    ...(d.influencer?.enrolled && txt(d.influencer.status) === 'active' ? [{ label: 'Influenceur', tone: 'info' }] : []),
    ...(d.blocked ? [{ label: 'Vente suspendue', tone: 'danger' }] : []),
  ]
  const shopName = txt(d.shop?.name)
  const subtitle = d.merchant
    ? `Voici l’essentiel${shopName ? ` de ${shopName}` : ''} aujourd’hui.`
    : 'Suivez vos achats, vos échanges et vos gains au même endroit.'

  const sales = d.offers.filter((o) => o.status === 'ACCEPTED').length
  const talks = d.offers.filter((o) => o.status === 'PENDING' || o.status === 'NEGOTIATING').length
  const views = d.products.reduce((s, p) => s + num(p.views), 0)
  const owed = num(d.fees?.owedUsd)
  const payFrom = num(d.fees?.thresholds?.pay ?? 10)
  const balance = d.balances.length
    ? d.balances.map((b) => money(b.balance, b.currency)).join(' · ')
    : money(0, 'CDF')
  const activity = buildActivity(d)

  return (
    <div className="dash-page home">
      <Hero name={firstName(user)} roles={roles} subtitle={subtitle} />
      <ShopCompletionNudge />

      {d.merchant && (
        <>
          <FeesNotice fees={d.fees} onPay={() => setPayFees(true)} />
          <div className="home-kpis">
            <Kpi icon={<FaBoxOpen />} value={d.products.length} label="Produits" to="/dashboard/catalogue" />
            <Kpi icon={<FaEye />} value={views.toLocaleString('fr-FR')} label="Vues" to="/dashboard/catalogue" />
            <Kpi icon={<FaHandshake />} value={sales} label="Ventes conclues" to="/dashboard/ventes" hint={talks ? `${talks} négociation${talks > 1 ? 's' : ''} en cours` : ''} />
            <Kpi icon={<FaWallet />} value={balance} label="Solde" to="/dashboard/wallet" />
            {d.fees && (
              <div className="home-kpi">
                <span className="home-kpi-icon"><FaMoneyBillWave /></span>
                <span className="home-kpi-text">
                  <span className="home-kpi-value">{usd(owed)}</span>
                  <span className="home-kpi-label">Commission due</span>
                  {owed >= payFrom
                    ? <button type="button" className="home-kpi-action" onClick={() => setPayFees(true)}>Régler</button>
                    : <span className="home-kpi-hint">Rien à verser sous {usd(payFrom)}</span>}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      <Shortcuts merchant={d.merchant} />

      <div className="home-columns">
        <Activity items={activity} merchant={d.merchant} />
        <div className="home-side">
          <RecentConversations />
          {!d.merchant && (
            <Card className="home-card home-sell">
              <CardHead icon={<FaStore />} title="Vendre sur Tindisa" />
              <p className="home-note">Créez votre espace (boutique, service ou métier) ou vendez un article ponctuel. L’assistant publie pour vous, même depuis WhatsApp.</p>
              <Button as={Link} to="/vendre" size="sm">Commencer à vendre</Button>
            </Card>
          )}
        </div>
      </div>

      <div className="home-grid">
        {d.merchant && <CatalogueCard d={d} />}
        {d.merchant && <CertificatesCard d={d} />}
        <ProCard d={d} />
        {d.merchant && <BataCard d={d} />}
        <InfluencerCard d={d} />
        <CartCard />
        <ChannelsMini />
      </div>

      <PaymentModal
        open={payFees}
        variant="fees"
        amount={owed}
        onClose={() => setPayFees(false)}
        onDone={reload}
      />
    </div>
  )
}
