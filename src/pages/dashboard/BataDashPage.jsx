import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaExchangeAlt, FaImage } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { useToast } from '../../components/useToast'
import { Badge, Button, Card, Spinner, EmptyState, ConfirmModal, Modal } from '../../components/ui.jsx'
import { ESCROW_OPEN, cashModeLabel, payerText, txt, usd, wantsSummary } from '../../market/lib/bata'

const OFFER_STATUS = {
  active: { tone: 'success', label: 'Active' },
  paused: { tone: 'warn', label: 'En pause' },
  closed: { tone: 'neutral', label: 'Arrêtée' },
  removed: { tone: 'danger', label: 'Retirée par Tindisa' },
}
const PROPOSAL_STATUS = {
  proposed: { tone: 'warn', label: 'Proposée' },
  accepted: { tone: 'success', label: 'Acceptée' },
  declined: { tone: 'danger', label: 'Refusée' },
  agreed: { tone: 'success', label: 'Accord conclu' },
  paid: { tone: 'success', label: 'Différence en séquestre' },
  completed: { tone: 'neutral', label: 'Terminée' },
  cancelled: { tone: 'neutral', label: 'Annulée' },
}

const asList = (r, key) => {
  const l = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : Array.isArray(r?.[key]) ? r[key] : []
  return l.filter((x) => x && typeof x === 'object')
}
// Séquestre coupé (paiements réels pas encore branchés) : seul le direct est proposé.
const modesOf = (m) =>
  (m === 'escrow' || m === 'direct' ? [m] : ['escrow', 'direct']).filter((x) => ESCROW_OPEN || x !== 'escrow')
const fmtDate = (d) => {
  if (!d) return ''
  const t = new Date(d)
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Ce qui se passe maintenant, en clair (qui paie, état du séquestre). */
function proposalText(p) {
  const escrow = p.cashMode === 'escrow'
  const diff = p.payer === 'you' || p.payer === 'them'
  switch (p.status) {
    case 'proposed':
      return p.direction === 'received' ? 'On vous propose cet échange : acceptez ou refusez.' : 'En attente de la réponse de l’autre partie.'
    case 'accepted':
    case 'agreed': {
      const head = p.status === 'agreed' ? 'Accord conclu. ' : 'Acceptée. '
      if (!diff) return `${head}Organisez la remise des deux biens.`
      if (!escrow) return `${head}Organisez la remise : la différence se règle entre vous à ce moment.`
      return p.payer === 'you'
        ? `${head}Versez la différence au séquestre Tindisa avec l’assistant, puis organisez la remise.`
        : `${head}En attente du versement de la différence au séquestre Tindisa par l’autre partie.`
    }
    case 'paid':
      return 'Différence reçue au séquestre Tindisa. Elle est libérée quand les deux parties confirment la remise.'
    case 'completed':
      return 'Échange terminé.'
    case 'declined':
      return 'Proposition refusée.'
    case 'cancelled':
      return 'Échange annulé.'
    default:
      return ''
  }
}

function Thumb({ url }) {
  const u = txt(url)
  return <span className="cat-thumb">{u ? <img src={u} alt="" /> : <FaImage />}</span>
}

function ProposeModal({ offer, match, onClose, onDone }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const common = modesOf(offer.cashMode).filter((m) => modesOf(match.cashMode).includes(m))
  const choices = common.length ? common : [ESCROW_OPEN ? 'escrow' : 'direct']
  const [mode, setMode] = useState(choices[0])
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try {
      const r = await api.post('/v1/merchant/bata/proposals', { fromOfferId: offer.id, toOfferId: match.offerId, cashMode: mode })
      if (r && r.ok === false) notify(txt(r.reason) || 'Proposition impossible', 'error')
      else { notify('Proposition envoyée', 'success'); onDone() }
    } catch (e) {
      notify(e?.message || 'Proposition impossible', 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open title="Proposer un échange" onClose={busy ? undefined : onClose}
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button><Button onClick={send} disabled={busy}>{busy ? 'Envoi…' : 'Envoyer la proposition'}</Button></>}>
      <p className="ui-confirm-text">
        Votre <b>{txt(offer.name) || 'article'}</b> contre <b>{txt(match.name) || 'son article'}</b>. {payerText(match.payer, match.difference)}.
      </p>
      {choices.length > 1 ? (
        <fieldset className="bata-cash">
          <legend className="ui-field-label">Règlement de la différence</legend>
          {choices.map((m) => (
            <label key={m} className="bata-radio">
              <input type="radio" name="bata-prop-cash" checked={mode === m} onChange={() => setMode(m)} />
              <span><b>{m === 'escrow' ? 'Séquestre Tindisa (recommandé)' : 'Direct, entre vous'}</b></span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="dash-sub">{cashModeLabel(choices[0])}.</p>
      )}
    </Modal>
  )
}

const TIER_TONE = { 'très proche': 'success', proche: 'info', 'plus éloigné': 'warn', éloigné: 'neutral' }
const num = (v) => {
  const n = Number(String(v ?? '').replace(/s/g, '').replace(',', '.'))
  return v !== '' && v != null && Number.isFinite(n) && n >= 0 ? n : null
}

/** Ce que l'échange coûte ou rapporte, en clair. */
function cashLine(m) {
  const d = Number(m.cashDifferenceUsd ?? m.difference)
  if (!Number.isFinite(d)) return ''
  if (d > 0) return `Vous ajoutez ${usd(d)}`
  if (d < 0) return `Vous recevez ${usd(-d)}`
  return 'Même valeur, rien à ajouter'
}

function Matches({ offer, onProposed }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [proposing, setProposing] = useState(null)
  const [budget, setBudget] = useState({ min: '', max: '' })
  const [applied, setApplied] = useState({ min: null, max: null })
  const [invited, setInvited] = useState({})
  const { data = [], loading } = useLoad(
    () => {
      const q = new URLSearchParams({ limit: '8' })
      if (applied.min != null) q.set('minTopUpUsd', String(applied.min))
      if (applied.max != null) q.set('maxTopUpUsd', String(applied.max))
      return api.get(`/v1/merchant/bata/offers/${encodeURIComponent(offer.id)}/matches?${q}`).then((r) => asList(r, 'matches'), () => [])
    },
    [offer.id, applied.min, applied.max],
  )
  const invite = async (m) => {
    try {
      const r = await api.post('/v1/merchant/bata/interests', { offerId: offer.id, productId: m.productId })
      if (r && r.ok === false) notify(txt(r.reason) || 'Invitation impossible', 'error')
      else {
        setInvited((x) => ({ ...x, [m.productId]: true }))
        notify(r?.alreadyInvited ? 'Ce propriétaire a déjà été invité' : 'Invitation envoyée au propriétaire', 'success')
      }
    } catch (e) {
      notify(e?.message || 'Invitation impossible', 'error')
    }
  }
  const apply = (e) => {
    e.preventDefault()
    setApplied({ min: num(budget.min), max: num(budget.max) })
  }
  return (
    <>
    <form className="bata-budget" onSubmit={apply}>
      <span className="dash-sub">Je peux ajouter</span>
      <input className="ui-input" inputMode="numeric" placeholder="de … $" aria-label="Complément minimum en dollars" value={budget.min} onChange={(e) => setBudget((b) => ({ ...b, min: e.target.value }))} />
      <input className="ui-input" inputMode="numeric" placeholder="à … $" aria-label="Complément maximum en dollars" value={budget.max} onChange={(e) => setBudget((b) => ({ ...b, max: e.target.value }))} />
      <Button size="sm" variant="secondary" type="submit">Filtrer</Button>
    </form>
    {loading ? <Spinner label="Recherche d’échanges…" /> : !data.length ? (
      <p className="dash-sub bata-none">Aucun bien comparable pour l’instant. Nous vous prévenons dès qu’un bien compatible est inscrit.</p>
    ) : (
    <ul className="bata-matches">
      {data.slice(0, 8).map((m, i) => {
        const tier = txt(m.tier)
        const reasons = Array.isArray(m.reasons) ? m.reasons.map(txt).filter(Boolean).slice(1, 4) : []
        return (
          <li key={txt(m.productId) || i}>
            <Thumb url={m.image} />
            <div className="bata-grow">
              <strong>
                {txt(m.url) ? <a href={txt(m.url)} target="_blank" rel="noreferrer">{txt(m.name) || 'Bien'}</a> : (txt(m.name) || 'Bien')}
              </strong>
              <span className="cat-sku">{[usd(m.valueUsd), txt(m.city), txt(m.summary)].filter(Boolean).join(' · ')}</span>
              <span className="bata-tags">
                {tier && <Badge tone={TIER_TONE[tier] || 'neutral'}>{tier}</Badge>}
                <Badge tone={m.kind === 'bata_offer' ? 'success' : 'neutral'}>{m.kind === 'bata_offer' ? 'Ouvert au BATA' : 'Annonce du marché'}</Badge>
                {m.certified && <Badge tone="info">Certifié</Badge>}
                {m.overBudget && <Badge tone="warn">Au-delà du budget</Badge>}
              </span>
              <span className="bata-payer">{cashLine(m)}</span>
              {reasons.length > 0 && <span className="bata-wants">{reasons.join(' · ')}</span>}
            </div>
            {m.canProposeNow && m.offerId ? (
              <Button size="sm" onClick={() => setProposing(m)}>Proposer</Button>
            ) : m.canInvite ? (
              <Button size="sm" variant="secondary" onClick={() => invite(m)} disabled={!!invited[m.productId]}>
                {invited[m.productId] ? 'Invité' : 'Inviter le propriétaire'}
              </Button>
            ) : null}
          </li>
        )
      })}
    </ul>
    )}
    {proposing && (
      <ProposeModal offer={offer} match={proposing} onClose={() => setProposing(null)} onDone={() => { setProposing(null); onProposed() }} />
    )}
    </>
  )
}

function OfferCard({ offer, onStatus, onProposed }) {
  const [open, setOpen] = useState(false)
  const st = OFFER_STATUS[offer.status] || OFFER_STATUS.active
  const wants = wantsSummary(offer.wants)
  return (
    <Card className="bata-card">
      <div className="bata-row">
        <Thumb url={offer.image} />
        <div className="bata-grow">
          <strong>{txt(offer.name) || 'Article'}</strong>
          <span className="cat-sku">{[usd(offer.valueUsd), cashModeLabel(offer.cashMode)].filter(Boolean).join(' · ')}</span>
          <span className="bata-wants">Cherche : {wants || 'ouvert aux propositions'}</span>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      {(offer.status === 'active' || offer.status === 'paused') && (
        <div className="bata-actions">
          {offer.status === 'active' && <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>{open ? 'Masquer les échanges' : 'Voir les échanges possibles'}</Button>}
          <Button size="sm" variant="ghost" onClick={() => onStatus(offer, offer.status === 'active' ? 'paused' : 'active')}>{offer.status === 'active' ? 'Mettre en pause' : 'Réactiver'}</Button>
          <Button size="sm" variant="ghost" onClick={() => onStatus(offer, 'closed')}>Arrêter</Button>
        </div>
      )}
      {open && offer.status === 'active' && <Matches offer={offer} onProposed={onProposed} />}
    </Card>
  )
}

function ProposalCard({ p, onAction }) {
  const st = PROPOSAL_STATUS[p.status] || { tone: 'neutral', label: txt(p.status) || '·' }
  const mine = p.yourItem && typeof p.yourItem === 'object' ? p.yourItem : {}
  const theirs = p.theirItem && typeof p.theirItem === 'object' ? p.theirItem : {}
  const received = p.direction === 'received' || p.role === 'to'
  const active = ['accepted', 'agreed', 'paid'].includes(p.status)
  return (
    <Card className="bata-card">
      <div className="bata-row">
        <div className="bata-grow">
          <span className="cat-sku">{received ? 'Reçue' : 'Envoyée'}{fmtDate(p.createdAt) ? ` · ${fmtDate(p.createdAt)}` : ''}</span>
          <strong>
            {txt(mine.name) || 'Votre article'} {usd(mine.valueUsd) ? `(${usd(mine.valueUsd)})` : ''}
            <FaExchangeAlt className="bata-swap" aria-label="contre" />
            {txt(theirs.name) || 'Son article'} {usd(theirs.valueUsd) ? `(${usd(theirs.valueUsd)})` : ''}
          </strong>
          <span className="bata-payer">{payerText(p.payer, p.difference)} · {p.cashMode === 'direct' ? 'réglée entre vous' : 'séquestre Tindisa'}</span>
          <span className="bata-wants">{proposalText(p)}</span>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <div className="bata-actions">
        {p.status === 'proposed' && received && (
          <>
            <Button size="sm" onClick={() => onAction(p, 'accept')}>Accepter</Button>
            <Button size="sm" variant="ghost" onClick={() => onAction(p, 'decline')}>Refuser</Button>
          </>
        )}
        {p.status === 'proposed' && !received && <Button size="sm" variant="ghost" onClick={() => onAction(p, 'cancel')}>Annuler</Button>}
        {active && <Button size="sm" onClick={() => onAction(p, 'handover')}>Confirmer la remise</Button>}
        {(p.status === 'accepted' || p.status === 'agreed') && <Button size="sm" variant="ghost" onClick={() => onAction(p, 'cancel')}>Annuler</Button>}
      </div>
    </Card>
  )
}

const CONFIRM = {
  decline: { title: 'Refuser la proposition', msg: 'Refuser cet échange ?', label: 'Refuser', danger: true },
  cancel: { title: 'Annuler l’échange', msg: 'Annuler cet échange ? L’autre partie sera prévenue.', label: 'Annuler l’échange', danger: true },
  handover: { title: 'Confirmer la remise', msg: 'Confirmez seulement si vous avez reçu le bien de l’autre partie (et la différence si elle vous revient en direct).', label: 'Je confirme' },
  closed: { title: 'Arrêter le BATA', msg: 'Votre annonce n’affichera plus « BATA possible ».', label: 'Arrêter', danger: true },
}

export default function BataDashPage() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [tab, setTab] = useState('offers')
  const [confirm, setConfirm] = useState(null) // { kind, run }
  const [busy, setBusy] = useState(false)

  const offers = useLoad(() => api.get('/v1/merchant/bata/offers').then((r) => asList(r, 'offers'), () => []), [])
  const proposals = useLoad(() => api.get('/v1/merchant/bata/proposals').then((r) => asList(r, 'proposals'), () => []), [])
  const offerList = offers.data || []
  const propList = proposals.data || []
  const toAnswer = propList.filter((p) => (p.direction === 'received' || p.role === 'to') && p.status === 'proposed').length

  const run = async (fn, okMsg) => {
    setBusy(true)
    try {
      const r = await fn()
      if (r && r.ok === false) notify(txt(r.reason) || 'Action impossible', 'error')
      else notify(txt(r?.message) || okMsg, 'success')
      offers.reload()
      proposals.reload()
      setConfirm(null)
    } catch (e) {
      notify(e?.message || 'Action impossible', 'error')
    } finally {
      setBusy(false)
    }
  }

  const setStatus = (o, status) => {
    const go = () => run(() => api.patch(`/v1/merchant/bata/offers/${encodeURIComponent(o.id)}`, { status }),
      status === 'paused' ? 'Offre en pause' : status === 'active' ? 'Offre réactivée' : 'BATA arrêté')
    if (status === 'closed') setConfirm({ kind: 'closed', run: go })
    else go()
  }

  const act = (p, kind) => {
    const id = encodeURIComponent(p.id)
    const base = `/v1/merchant/bata/proposals/${id}`
    if (kind === 'accept') return run(() => api.post(`${base}/respond`, { accept: true }), 'Échange accepté')
    const go = {
      decline: () => run(() => api.post(`${base}/respond`, { accept: false }), 'Proposition refusée'),
      cancel: () => run(() => api.post(`${base}/cancel`), 'Échange annulé'),
      handover: () => run(() => api.post(`${base}/confirm-handover`), 'Remise confirmée'),
    }[kind]
    setConfirm({ kind, run: go })
  }

  const c = confirm ? CONFIRM[confirm.kind] : null

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1"><FaExchangeAlt style={{ marginRight: 8 }} />BATA</h1>
        <p className="dash-sub">Échangez vos biens certifiés (véhicules, téléphones, ordinateurs) contre d’autres. La différence se paie en cash, en séquestre Tindisa ou directement.</p>
      </header>

      <div className="cat-tabs">
        <button className={`cat-tab${tab === 'offers' ? ' active' : ''}`} onClick={() => setTab('offers')}>Mes offres</button>
        <button className={`cat-tab${tab === 'proposals' ? ' active' : ''}`} onClick={() => setTab('proposals')}>
          Propositions{toAnswer ? ` (${toAnswer})` : ''}
        </button>
      </div>

      {tab === 'offers' ? (
        offers.loading && !offers.data ? <Spinner label="Chargement…" /> : offerList.length === 0 ? (
          <EmptyState icon={<FaExchangeAlt />} title="Aucune offre BATA"
            text="Activez le BATA sur un article certifié (véhicule, téléphone ou ordinateur) depuis votre catalogue."
            action={<Link to="/dashboard/catalogue" className="ui-btn ui-btn-primary">Aller au catalogue</Link>} />
        ) : (
          <div className="bata-list">
            {offerList.map((o, i) => <OfferCard key={txt(o.id || o.offerId) || i} offer={{ ...o, id: o.id || o.offerId }} onStatus={setStatus} onProposed={() => { proposals.reload(); setTab('proposals') }} />)}
          </div>
        )
      ) : proposals.loading && !proposals.data ? <Spinner label="Chargement…" /> : propList.length === 0 ? (
        <EmptyState icon={<FaExchangeAlt />} title="Aucune proposition" text="Les échanges que vous proposez ou recevez apparaîtront ici." />
      ) : (
        <div className="bata-list">
          {propList.map((p, i) => <ProposalCard key={txt(p.id) || i} p={p} onAction={act} />)}
        </div>
      )}

      <ConfirmModal
        open={!!c}
        danger={c?.danger}
        busy={busy}
        title={c?.title}
        message={c?.msg}
        confirmLabel={c?.label}
        cancelLabel="Retour"
        onConfirm={() => confirm?.run()}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
