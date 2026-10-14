import { useState } from 'react'
import {
  FaBullhorn, FaUserPlus, FaSearch, FaMoneyBillWave, FaChartLine, FaHandHoldingUsd, FaCheckCircle,
  FaCopy, FaPlus, FaEye, FaPause, FaPlay, FaCog, FaInbox, FaEdit,
} from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { normalizePromo, promoShareLink } from '../../api/promo'
import { useToast } from '../../components/useToast'
import {
  Badge, Button, Card, EmptyState, Field, Input, Select, Spinner, Textarea, Modal, ConfirmModal, ActionMenu,
} from '../../components/ui.jsx'
import { StatGrid, StatCard } from '../../components/StatCard.jsx'
import { usePaged } from '../../components/usePaged'
import { Pagination } from '../../components/Pagination.jsx'
import { EarningsStats, EarningsTable } from '../../components/InfluencerParts.jsx'
import {
  KIND_LABEL, METHODS, arr, codesOf, copyText, fmtDate, methodLabel, num, pctOf, statusOf, txt, usd,
} from '../../components/influencerCommon'
import { useAdminView } from './adminView'

/*
 * Back-office : collaborations avec les influenceurs (codes promo).
 * Gains : 50 % de la commission Tindisa des ventes conclues avec le code (acquis
 * une fois la commission encaissée auprès du vendeur), 30 % des certificats payés.
 * Versements manuels (Mobile Money + référence), éventuellement sur demande
 * faite depuis la messagerie.
 */

const BASE = '/v1/admin/influencers'
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const STATUS_FILTERS = [
  { k: '', label: 'Tous' },
  { k: 'active', label: 'Actifs' },
  { k: 'pending', label: 'Demandes' },
  { k: 'suspended', label: 'Suspendus' },
]
const REQ_STATUS = {
  requested: { tone: 'warn', label: 'À payer' },
  paid: { tone: 'success', label: 'Payée' },
  rejected: { tone: 'danger', label: 'Refusée' },
}
const sum = (list, k) => arr(list).reduce((a, x) => a + num(x?.[k]), 0)

/* ---------------- Réglages (taux, remise, seuil) ---------------- */

function SettingsForm({ settings, api, notify, onSaved }) {
  const canEdit = settings.canEdit === true
  const [f, setF] = useState({
    sale: String(pctOf(settings.saleShareRate ?? 0.5)),
    cert: String(pctOf(settings.certShareRate ?? 0.3)),
    disc: String(pctOf(settings.certDiscountRate ?? 0.1)),
    min: String(num(settings.minPayoutUsd)),
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const save = async () => {
    const vals = [f.sale, f.cert, f.disc].map((v) => Number(String(v).replace(',', '.')))
    if (vals.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) {
      return notify('Les pourcentages doivent être compris entre 0 et 100.', 'error')
    }
    const min = Number(String(f.min).replace(',', '.'))
    if (!Number.isFinite(min) || min < 0) return notify('Seuil de versement invalide.', 'error')
    setBusy(true)
    try {
      await api.put(`${BASE}/settings`, {
        saleShareRate: vals[0] / 100,
        certShareRate: vals[1] / 100,
        certDiscountRate: vals[2] / 100,
        minPayoutUsd: min,
      })
      notify('Réglages enregistrés.', 'success')
      onSaved()
    } catch (e) {
      notify(e?.message || 'Enregistrement impossible.', 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      {!canEdit && (
        <p className="cert-config-locked">Lecture seule : seul l'administrateur global modifie ces réglages.</p>
      )}
      <div className="infl-settings-grid">
        <Field label="Part sur les ventes (%)" hint="Part de la commission Tindisa">
          <Input type="number" min="0" max="100" step="0.5" value={f.sale} onChange={set('sale')} disabled={!canEdit} />
        </Field>
        <Field label="Part sur les certificats (%)" hint="Part du montant payé">
          <Input type="number" min="0" max="100" step="0.5" value={f.cert} onChange={set('cert')} disabled={!canEdit} />
        </Field>
        <Field label="Remise certificat (%)" hint="Accordée au demandeur">
          <Input type="number" min="0" max="100" step="0.5" value={f.disc} onChange={set('disc')} disabled={!canEdit} />
        </Field>
        <Field label="Versement minimum ($)">
          <Input type="number" min="0" step="1" value={f.min} onChange={set('min')} disabled={!canEdit} />
        </Field>
      </div>
      {canEdit && (
        <div className="ui-modal-foot">
          <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      )}
    </>
  )
}

function SettingsCard({ api, notify }) {
  const { data, loading, reload } = useLoad(() => api.get(`${BASE}/settings`).catch(() => null), [])
  return (
    <Card className="infl-card">
      <h2 className="dash-h3"><FaCog /> Réglages du programme</h2>
      {loading ? <Spinner label="Chargement…" /> : !data || typeof data !== 'object' ? (
        <p className="dash-sub">Réglages indisponibles pour le moment.</p>
      ) : (
        <SettingsForm key={JSON.stringify(data)} settings={data} api={api} notify={notify} onSaved={reload} />
      )}
    </Card>
  )
}

/* ---------------- Versement ---------------- */

function PayoutModal({ target, api, notify, onClose, onDone }) {
  const inf = target?.influencer || {}
  const balance = inf.balanceUsd != null ? num(inf.balanceUsd) : null
  const [amount, setAmount] = useState(() => {
    const v = target?.amountUsd ?? inf.balanceUsd
    return v != null ? String(num(v)) : ''
  })
  const [method, setMethod] = useState(txt(target?.method) || txt(inf.payoutMethod) || 'mpesa')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const a = Number(String(amount).replace(',', '.'))
    if (!Number.isFinite(a) || a <= 0) return notify('Montant invalide.', 'error')
    if (balance != null && a > balance + 0.001) return notify(`Le montant dépasse le solde à verser (${usd(balance)}).`, 'error')
    if (!reference.trim()) return notify('Indiquez la référence de la transaction Mobile Money.', 'error')
    setBusy(true)
    try {
      await api.post(`${BASE}/${encodeURIComponent(inf.id)}/payouts`, {
        amountUsd: Math.round(a * 100) / 100,
        method,
        reference: reference.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(target?.requestId ? { requestId: target.requestId } : {}),
      })
      notify('Versement enregistré.', 'success')
      onDone()
    } catch (e) {
      notify(e?.message || 'Enregistrement impossible.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open title="Enregistrer un versement" onClose={busy ? undefined : onClose}>
      <p className="dash-sub">
        Versement à <b>{txt(inf.name) || txt(target?.name) || 'l\'influenceur'}</b>
        {balance != null ? <> · solde à verser : <b>{usd(balance)}</b></> : null}
        {txt(target?.phoneMasked) || txt(inf.payoutPhoneMasked)
          ? <> · numéro : {txt(target?.phoneMasked) || txt(inf.payoutPhoneMasked)}</>
          : null}
      </p>
      <div className="infl-form">
        <Field label="Montant ($)">
          <Input type="number" min="0" step="0.01" max={balance ?? undefined} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Moyen de versement">
          <Select value={method} onChange={(e) => setMethod(e.target.value)} options={METHODS} />
        </Field>
        <Field label="Référence de la transaction" hint="Identifiant reçu de l'opérateur">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Note (facultatif)">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} />
        </Field>
      </div>
      <div className="ui-modal-foot">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button>
        <Button onClick={submit} disabled={busy}><FaMoneyBillWave /> {busy ? 'Enregistrement…' : 'Enregistrer le versement'}</Button>
      </div>
    </Modal>
  )
}

/* ---------------- Création ---------------- */

function CreateModal({ api, notify, onClose, onCreated }) {
  const { city, lockedCity, global, cities } = useAdminView()
  const [tab, setTab] = useState('new')
  const [picked, setPicked] = useState(null)
  const [f, setF] = useState({ kind: 'external', name: '', phone: '', city: lockedCity || city || '', code: '', note: '' })
  const [cq, setCq] = useState('')
  const [cqApplied, setCqApplied] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const cand = useLoad(() => {
    if (tab !== 'candidates') return Promise.resolve([])
    const qs = new URLSearchParams()
    if (city || lockedCity) qs.set('city', city || lockedCity)
    if (cqApplied) qs.set('q', cqApplied)
    return api.get(`${BASE}/candidates?${qs}`).then((r) => (Array.isArray(r) ? r : arr(r?.items)), () => [])
  }, [tab, city, lockedCity, cqApplied])

  const cityOptions = [{ value: '', label: 'Choisir…' }, ...arr(cities).map((c) => ({ value: c, label: cap(c) }))]

  const create = async () => {
    const name = (picked ? txt(picked.name) : f.name).trim()
    const theCity = picked ? txt(picked.city) || f.city : f.city
    if (!name) return notify('Indiquez le nom de l\'influenceur.', 'error')
    if (!theCity) return notify('Choisissez la ville.', 'error')
    const body = picked
      ? {
          kind: picked.kind === 'shop_owner' ? 'shop_owner' : 'individual',
          name,
          city: theCity,
          ...(picked.ref ? { ref: picked.ref } : {}),
          ...(picked.ownerId ? { ownerId: picked.ownerId } : {}),
          ...(picked.shopId ? { shopId: picked.shopId } : {}),
        }
      : { kind: f.kind, name, city: theCity, ...(f.phone.trim() ? { phone: f.phone.trim() } : {}) }
    const code = normalizePromo(f.code)
    if (code) body.code = code
    if (f.note.trim()) body.note = f.note.trim()
    setBusy(true)
    try {
      const r = await api.post(BASE, body)
      notify('Influenceur ajouté.', 'success')
      onCreated(r && typeof r === 'object' ? txt(r.id) : '')
    } catch (e) {
      notify(e?.message || 'Création impossible.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const candidates = arr(cand.data)

  return (
    <Modal open wide title="Ajouter un influenceur" onClose={busy ? undefined : onClose}>
      <div className="cat-tabs admin-tabs infl-tabs">
        <button type="button" className={`cat-tab${tab === 'new' ? ' active' : ''}`} onClick={() => { setTab('new'); setPicked(null) }}>Nouvelle personne</button>
        <button type="button" className={`cat-tab${tab === 'candidates' ? ' active' : ''}`} onClick={() => setTab('candidates')}>Candidats</button>
      </div>

      {tab === 'candidates' && !picked && (
        <>
          <form className="infl-search" onSubmit={(e) => { e.preventDefault(); setCqApplied(cq.trim()) }}>
            <Input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Nom, boutique, téléphone…" aria-label="Rechercher un candidat" />
            <Button type="submit" variant="secondary" size="sm"><FaSearch /> Rechercher</Button>
          </form>
          <p className="dash-sub">Commerçants et particuliers actifs, avec leurs ventes et annonces.</p>
          {cand.loading ? <Spinner label="Chargement…" /> : candidates.length === 0 ? (
            <p className="dash-sub">Aucun candidat trouvé.</p>
          ) : (
            <ul className="infl-cands">
              {candidates.map((c, i) => (
                <li key={`${txt(c.ownerId)}-${txt(c.shopId)}-${i}`} className="infl-cand">
                  <div className="infl-cand-main">
                    <b>{txt(c.name) || '·'}</b>
                    <span className="cat-sku">
                      {KIND_LABEL[c.kind] || txt(c.kind)}{txt(c.city) ? ` · ${cap(txt(c.city))}` : ''}{txt(c.phoneMasked) ? ` · ${txt(c.phoneMasked)}` : ''}
                    </span>
                    <span className="cat-sku">{num(c.salesCount)} vente(s) · {num(c.productsCount)} annonce(s)</span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setPicked(c)}>Choisir</Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {(tab === 'new' || picked) && (
        <div className="infl-form">
          {picked ? (
            <div className="infl-picked">
              <div>
                <b>{txt(picked.name)}</b>
                <span className="cat-sku">{KIND_LABEL[picked.kind] || txt(picked.kind)}{txt(picked.city) ? ` · ${cap(txt(picked.city))}` : ''}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>Changer</Button>
            </div>
          ) : (
            <>
              <Field label="Profil">
                <Select value={f.kind} onChange={set('kind')} options={[
                  { value: 'external', label: 'Personne externe (créée ici)' },
                  { value: 'individual', label: 'Particulier' },
                ]} />
              </Field>
              <Field label="Nom">
                <Input value={f.name} onChange={set('name')} maxLength={80} />
              </Field>
              <Field label="Téléphone (facultatif)" hint="Sert aussi aux versements Mobile Money">
                <Input value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="2439XXXXXXXX" />
              </Field>
            </>
          )}
          {(!picked || !txt(picked.city)) && (
            global && !lockedCity ? (
              <Field label="Ville">
                <Select value={f.city} onChange={set('city')} options={cityOptions} />
              </Field>
            ) : (
              <p className="dash-sub">Ville : <b>{cap(lockedCity || city || '')}</b></p>
            )
          )}
          <Field label="Code promo (facultatif)" hint="Laissez vide pour un code généré automatiquement">
            <Input value={f.code} onChange={(e) => setF((s) => ({ ...s, code: normalizePromo(e.target.value) }))} placeholder="Ex. MAMA10" />
          </Field>
          <Field label="Note interne (facultatif)">
            <Textarea rows={2} value={f.note} onChange={set('note')} maxLength={300} />
          </Field>
          <div className="ui-modal-foot">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button>
            <Button onClick={create} disabled={busy}><FaUserPlus /> {busy ? 'Création…' : 'Ajouter'}</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ---------------- Fiche détaillée ---------------- */

function EditForm({ inf, api, notify, onDone, onCancel }) {
  const { global, lockedCity, cities } = useAdminView()
  const [f, setF] = useState({ name: txt(inf.name), phone: '', city: txt(inf.city), note: txt(inf.note) })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const save = async () => {
    if (!f.name.trim()) return notify('Le nom est requis.', 'error')
    setBusy(true)
    try {
      await api.patch(`${BASE}/${encodeURIComponent(inf.id)}`, {
        name: f.name.trim(),
        ...(f.phone.trim() ? { phone: f.phone.trim() } : {}),
        ...(f.city && f.city !== txt(inf.city) ? { city: f.city } : {}),
        note: f.note.trim(),
      })
      notify('Fiche mise à jour.', 'success')
      onDone()
    } catch (e) {
      notify(e?.message || 'Mise à jour impossible.', 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="infl-form infl-edit">
      <Field label="Nom"><Input value={f.name} onChange={set('name')} maxLength={80} /></Field>
      <Field label="Nouveau téléphone (facultatif)" hint={txt(inf.phoneMasked) ? `Actuel : ${txt(inf.phoneMasked)}` : undefined}>
        <Input value={f.phone} onChange={set('phone')} inputMode="tel" />
      </Field>
      {global && !lockedCity && (
        <Field label="Ville">
          <Select value={f.city} onChange={set('city')} options={[{ value: '', label: 'Choisir…' }, ...arr(cities).map((c) => ({ value: c, label: cap(c) }))]} />
        </Field>
      )}
      <Field label="Note interne"><Textarea rows={2} value={f.note} onChange={set('note')} maxLength={300} /></Field>
      <div className="ui-modal-foot">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
    </div>
  )
}

function InfluencerDetail({ id, api, notify, onClose, onChanged, onPayout, onStatus }) {
  const { data, loading, error, reload } = useLoad(() => api.get(`${BASE}/${encodeURIComponent(id)}`), [id])
  const [newCode, setNewCode] = useState('')
  const [busy, setBusy] = useState('')
  const [editing, setEditing] = useState(false)

  const changed = () => { reload(); onChanged() }

  const addCode = async () => {
    setBusy('code')
    try {
      const code = normalizePromo(newCode)
      await api.post(`${BASE}/${encodeURIComponent(id)}/codes`, code ? { code } : {})
      setNewCode('')
      notify('Code ajouté.', 'success')
      changed()
    } catch (e) {
      notify(e?.message || 'Ajout impossible (code déjà pris ?).', 'error')
    } finally {
      setBusy('')
    }
  }
  const toggleCode = async (c) => {
    setBusy(c.code)
    try {
      await api.patch(`${BASE}/codes/${encodeURIComponent(c.code)}`, { active: !c.active })
      notify(c.active ? 'Code désactivé.' : 'Code réactivé.', 'success')
      changed()
    } catch (e) {
      notify(e?.message || 'Action impossible.', 'error')
    } finally {
      setBusy('')
    }
  }

  const inf = data && typeof data === 'object' ? { ...data, id } : null
  const st = statusOf(inf?.status)
  const codes = codesOf(Array.isArray(inf?.codeList) && inf.codeList.length ? inf.codeList : inf?.codes)
  const payouts = arr(inf?.payouts)

  return (
    <Modal open wide title={txt(inf?.name) || 'Influenceur'} onClose={onClose}>
      {loading ? <Spinner label="Chargement…" /> : error || !inf ? (
        <p className="dash-sub">Fiche indisponible pour le moment.</p>
      ) : (
        <div className="infl-detail">
          <div className="infl-detail-head">
            <div className="infl-detail-meta">
              <Badge tone={st.tone}>{st.label}</Badge>
              <span>{KIND_LABEL[inf.kind] || txt(inf.kind)}</span>
              {txt(inf.city) && <span>{cap(txt(inf.city))}</span>}
              {txt(inf.phoneMasked) && <span>{txt(inf.phoneMasked)}</span>}
            </div>
            <div className="infl-detail-actions">
              {inf.status === 'pending' && (
                <Button size="sm" onClick={() => onStatus(inf, 'active')}><FaCheckCircle /> Approuver</Button>
              )}
              {inf.status === 'active' && (
                <Button size="sm" variant="danger" onClick={() => onStatus(inf, 'suspended')}><FaPause /> Suspendre</Button>
              )}
              {inf.status === 'suspended' && (
                <Button size="sm" variant="secondary" onClick={() => onStatus(inf, 'active')}><FaPlay /> Réactiver</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}><FaEdit /> Modifier</Button>
              <Button size="sm" variant="secondary" onClick={() => onPayout({ influencer: inf })} disabled={num(inf.balanceUsd) <= 0}>
                <FaMoneyBillWave /> Enregistrer un versement
              </Button>
            </div>
          </div>

          {editing && (
            <EditForm inf={inf} api={api} notify={notify} onCancel={() => setEditing(false)} onDone={() => { setEditing(false); changed() }} />
          )}

          <p className="dash-sub">
            Versements : {txt(inf.payoutMethod)
              ? `${methodLabel(inf.payoutMethod)}${txt(inf.payoutPhoneMasked) ? ` au ${txt(inf.payoutPhoneMasked)}` : ''}`
              : 'aucun numéro de versement indiqué par l\'influenceur'}
            {txt(inf.note) ? <><br />Note : {txt(inf.note)}</> : null}
          </p>

          <EarningsStats stats={{
            uses: Array.isArray(inf.uses) ? (inf.usesCount ?? inf.uses.length) : inf.uses, earnedUsd: inf.earnedUsd, pendingUsd: inf.pendingUsd,
            acquiredUsd: inf.acquiredUsd, paidUsd: inf.paidUsd, balanceUsd: inf.balanceUsd,
          }} />

          <h3 className="dash-h3">Codes promo</h3>
          {codes.length === 0 ? <p className="dash-sub">Aucun code.</p> : (
            <ul className="infl-codes">
              {codes.map((c) => (
                <li key={c.code} className={`infl-code${c.active ? '' : ' is-off'}`}>
                  <span className="infl-code-v">{c.code}</span>
                  <Badge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Actif' : 'Désactivé'}</Badge>
                  <div className="infl-code-actions">
                    <Button variant="ghost" size="sm" onClick={() => copyText(c.code, notify, 'Code copié')}><FaCopy /> Code</Button>
                    <Button variant="ghost" size="sm" onClick={() => copyText(promoShareLink(c.code), notify, 'Lien copié')}><FaCopy /> Lien</Button>
                    <Button variant={c.active ? 'danger' : 'secondary'} size="sm" onClick={() => toggleCode(c)} disabled={busy === c.code}>
                      {c.active ? 'Désactiver' : 'Activer'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form className="infl-search" onSubmit={(e) => { e.preventDefault(); addCode() }}>
            <Input value={newCode} onChange={(e) => setNewCode(normalizePromo(e.target.value))} placeholder="Nouveau code (vide = automatique)" aria-label="Nouveau code" />
            <Button type="submit" size="sm" variant="secondary" disabled={busy === 'code'}><FaPlus /> Ajouter un code</Button>
          </form>

          <h3 className="dash-h3">Gains</h3>
          <EarningsTable earnings={inf.earnings} size={6} />

          <h3 className="dash-h3">Versements</h3>
          {payouts.length === 0 ? <p className="dash-sub">Aucun versement enregistré.</p> : (
            <div className="cat-table-wrap">
              <table className="cat-table infl-table">
                <thead><tr><th>Date</th><th>Montant</th><th>Moyen</th><th>Référence</th><th>Par</th></tr></thead>
                <tbody>
                  {payouts.map((p, i) => (
                    <tr key={txt(p?.id) || i}>
                      <td>{fmtDate(p?.paidAt, true)}</td>
                      <td><b>{usd(p?.amountUsd)}</b></td>
                      <td>{methodLabel(p?.method)}</td>
                      <td className="infl-ref">{txt(p?.reference) || '·'}</td>
                      <td>{txt(p?.paidBy) || '·'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

/* ---------------- Demandes de versement ---------------- */

function RequestsSection({ requests, loading, reqStatus, setReqStatus, onPay }) {
  const list = arr(requests)
  return (
    <>
      <div className="cat-tabs admin-tabs">
        {Object.entries(REQ_STATUS).map(([k, v]) => (
          <button key={k} type="button" className={`cat-tab${reqStatus === k ? ' active' : ''}`} onClick={() => setReqStatus(k)}>{v.label}</button>
        ))}
      </div>
      {loading ? <Spinner label="Chargement…" /> : list.length === 0 ? (
        <EmptyState icon={<FaInbox />} title="Aucune demande" text="Les influenceurs peuvent demander un versement depuis WhatsApp ou Telegram." />
      ) : (
        <div className="cat-table-wrap">
          <table className="cat-table infl-table">
            <thead><tr><th>Date</th><th>Influenceur</th><th>Montant</th><th>Moyen</th><th>Numéro</th><th>Statut</th><th className="cat-col-actions"></th></tr></thead>
            <tbody>
              {list.map((r, i) => {
                const st = REQ_STATUS[r?.status] || { tone: 'neutral', label: txt(r?.status) || '·' }
                return (
                  <tr key={txt(r?.id) || i}>
                    <td>{fmtDate(r?.createdAt, true)}</td>
                    <td>{txt(r?.influencerName) || '·'}</td>
                    <td><b>{usd(r?.amountUsd)}</b></td>
                    <td>{methodLabel(r?.method)}</td>
                    <td>{txt(r?.phoneMasked) || '·'}</td>
                    <td><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="cat-col-actions">
                      {r?.status === 'requested' && (
                        <Button size="sm" onClick={() => onPay(r)}><FaMoneyBillWave /> Payer</Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ---------------- Page ---------------- */

export default function AdminInfluencers() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const { city, withCity } = useAdminView()
  const [view, setView] = useState('list')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [qApplied, setQApplied] = useState('')
  const [reqStatus, setReqStatus] = useState('requested')
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState('')
  const [payout, setPayout] = useState(null)
  const [confirm, setConfirm] = useState(null) // { inf, status }
  const [busy, setBusy] = useState(false)

  const list = useLoad(() => {
    const qs = new URLSearchParams()
    if (qApplied) qs.set('q', qApplied)
    if (status) qs.set('status', status)
    const s = qs.toString()
    return api.get(withCity(`${BASE}${s ? `?${s}` : ''}`)).catch(() => null)
  }, [city, qApplied, status])

  const reqs = useLoad(
    () => api.get(withCity(`${BASE}/payout-requests?status=${reqStatus}`)).then((r) => (Array.isArray(r) ? r : arr(r?.items)), () => []),
    [city, reqStatus],
  )
  // Badge « À payer » : compte des demandes en attente, quel que soit l'onglet affiché.
  const pendingReqs = useLoad(
    () => api.get(withCity(`${BASE}/payout-requests?status=requested`)).then((r) => (Array.isArray(r) ? r : arr(r?.items)).length, () => 0),
    [city],
  )

  const items = arr(list.data?.items)
  const totals = list.data?.totals && typeof list.data.totals === 'object' ? list.data.totals : {}
  const { pageItems, page, setPage, totalPages, count } = usePaged(items, 12)

  const kActive = totals.active ?? totals.activeCount ?? items.filter((x) => x?.status === 'active').length
  const kRevenue = totals.revenueUsd ?? sum(items, 'revenueUsd')
  const kBalance = totals.balanceUsd ?? sum(items, 'balanceUsd')
  const kPaid = totals.paidUsd ?? sum(items, 'paidUsd')
  const pendingCount = num(pendingReqs.data)

  const refreshAll = () => { list.reload(); reqs.reload(); pendingReqs.reload() }

  const doStatus = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      await api.patch(`${BASE}/${encodeURIComponent(confirm.inf.id)}`, { status: confirm.status })
      notify(confirm.status === 'active'
        ? (confirm.inf.status === 'pending' ? 'Demande approuvée : le code est actif.' : 'Influenceur réactivé.')
        : 'Influenceur suspendu.', 'success')
      setConfirm(null)
      refreshAll()
      // La fiche ouverte se recharge via sa clé.
      setDetailId((d) => (d ? `${d.split('#')[0]}#${Date.now()}` : d))
    } catch (e) {
      notify(e?.message || 'Action impossible.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const payRequest = (r) => {
    const inf = items.find((x) => txt(x?.id) === txt(r?.influencerId))
    setPayout({
      influencer: inf || { id: r?.influencerId, name: r?.influencerName },
      amountUsd: r?.amountUsd,
      method: r?.method,
      phoneMasked: r?.phoneMasked,
      requestId: r?.id,
    })
  }

  const detailKey = detailId
  const openId = detailId.split('#')[0]

  return (
    <div className="dash-page">
      <header className="dash-page-head cat-head">
        <div>
          <h1 className="dash-h1">Influenceurs</h1>
          <p className="dash-sub">
            Collaborations avec codes promo : 50 % de la commission Tindisa sur les ventes conclues avec le code
            (acquis une fois la commission encaissée), 30 % des certificats payés.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}><FaUserPlus /> Ajouter un influenceur</Button>
      </header>

      <StatGrid>
        <StatCard icon={<FaBullhorn />} value={num(kActive).toLocaleString('fr-FR')} label="Influenceurs actifs" />
        <StatCard icon={<FaChartLine />} value={usd(kRevenue)} label="Revenus générés" />
        <StatCard icon={<FaHandHoldingUsd />} value={usd(kBalance)} label="Gains à verser" />
        <StatCard icon={<FaMoneyBillWave />} value={usd(kPaid)} label="Déjà versés" />
      </StatGrid>

      <div className="cat-tabs admin-tabs infl-views">
        <button type="button" className={`cat-tab${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}><FaBullhorn /> Influenceurs</button>
        <button type="button" className={`cat-tab${view === 'requests' ? ' active' : ''}`} onClick={() => setView('requests')}>
          <FaInbox /> Demandes de versement {pendingCount > 0 && <span className="infl-count">{pendingCount}</span>}
        </button>
        <button type="button" className={`cat-tab${view === 'settings' ? ' active' : ''}`} onClick={() => setView('settings')}><FaCog /> Réglages</button>
      </div>

      {view === 'settings' && <SettingsCard api={api} notify={notify} />}

      {view === 'requests' && (
        <RequestsSection requests={reqs.data} loading={reqs.loading} reqStatus={reqStatus} setReqStatus={setReqStatus} onPay={payRequest} />
      )}

      {view === 'list' && (
        <>
          <div className="admin-toolbar">
            <div className="cat-tabs admin-tabs">
              {STATUS_FILTERS.map((s) => (
                <button key={s.k} type="button" className={`cat-tab${status === s.k ? ' active' : ''}`} onClick={() => { setStatus(s.k); setPage(1) }}>{s.label}</button>
              ))}
            </div>
            <form className="infl-search" onSubmit={(e) => { e.preventDefault(); setQApplied(q.trim()); setPage(1) }}>
              <Input className="admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, code, téléphone…" aria-label="Rechercher" />
              <Button type="submit" variant="secondary" size="sm" aria-label="Rechercher"><FaSearch /></Button>
            </form>
          </div>

          {list.loading && !list.data ? <Spinner label="Chargement…" /> : items.length === 0 ? (
            <EmptyState
              icon={<FaBullhorn />}
              title="Aucun influenceur"
              text={list.data ? 'Aucun influenceur pour ce filtre ou cette ville.' : 'Liste indisponible pour le moment.'}
              action={<Button onClick={() => setCreating(true)}><FaUserPlus /> Ajouter un influenceur</Button>}
            />
          ) : (
            <>
              <div className="cat-table-wrap">
                <table className="cat-table infl-table">
                  <thead>
                    <tr><th>Influenceur</th><th>Codes</th><th>Activité</th><th>Revenus générés</th><th>Gains</th><th>Statut</th><th className="cat-col-actions"></th></tr>
                  </thead>
                  <tbody>
                    {pageItems.map((x, i) => {
                      const st = statusOf(x?.status)
                      const codes = codesOf(x?.codes)
                      return (
                        <tr key={txt(x?.id) || i}>
                          <td>
                            <button type="button" className="infl-name-btn" onClick={() => setDetailId(txt(x?.id))}>{txt(x?.name) || '·'}</button>
                            <span className="cat-sku">{KIND_LABEL[x?.kind] || txt(x?.kind)}{txt(x?.city) ? ` · ${cap(txt(x.city))}` : ''}{txt(x?.phoneMasked) ? ` · ${txt(x.phoneMasked)}` : ''}</span>
                          </td>
                          <td>
                            <div className="infl-chips">
                              {codes.slice(0, 3).map((c) => <span key={c.code} className={`infl-chip${c.active ? '' : ' is-off'}`}>{c.code}</span>)}
                              {codes.length > 3 && <span className="cat-sku">+{codes.length - 3}</span>}
                              {codes.length === 0 && '·'}
                            </div>
                          </td>
                          <td>
                            <span className="cat-pname">{num(x?.uses)} utilisation(s)</span>
                            <span className="cat-sku">{num(x?.salesCount)} vente(s) · {num(x?.certCount)} certificat(s)</span>
                          </td>
                          <td>{usd(x?.revenueUsd)}</td>
                          <td>
                            <span className="cat-pname">{usd(x?.earnedUsd)}</span>
                            <span className="cat-sku">
                              En attente {usd(x?.pendingUsd)} · À verser <b>{usd(x?.balanceUsd)}</b> · Versé {usd(x?.paidUsd)}
                            </span>
                          </td>
                          <td><Badge tone={st.tone}>{st.label}</Badge></td>
                          <td className="cat-col-actions">
                            <ActionMenu items={[
                              { label: 'Voir la fiche', icon: <FaEye />, onClick: () => setDetailId(txt(x?.id)) },
                              x?.status === 'pending' && { label: 'Approuver la demande', icon: <FaCheckCircle />, onClick: () => setConfirm({ inf: x, status: 'active' }) },
                              x?.status === 'active' && { label: 'Suspendre', icon: <FaPause />, danger: true, onClick: () => setConfirm({ inf: x, status: 'suspended' }) },
                              x?.status === 'suspended' && { label: 'Réactiver', icon: <FaPlay />, onClick: () => setConfirm({ inf: x, status: 'active' }) },
                              num(x?.balanceUsd) > 0 && { label: 'Enregistrer un versement', icon: <FaMoneyBillWave />, onClick: () => setPayout({ influencer: x }) },
                            ]} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
            </>
          )}
        </>
      )}

      {creating && (
        <CreateModal
          api={api}
          notify={notify}
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); refreshAll(); if (id) setDetailId(id) }}
        />
      )}

      {openId && (
        <InfluencerDetail
          key={detailKey}
          id={openId}
          api={api}
          notify={notify}
          onClose={() => setDetailId('')}
          onChanged={refreshAll}
          onPayout={setPayout}
          onStatus={(inf, s) => setConfirm({ inf, status: s })}
        />
      )}

      {payout && (
        <PayoutModal
          target={payout}
          api={api}
          notify={notify}
          onClose={() => setPayout(null)}
          onDone={() => {
            setPayout(null)
            refreshAll()
            setDetailId((d) => (d ? `${d.split('#')[0]}#${Date.now()}` : d))
          }}
        />
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm?.status === 'suspended' ? 'Suspendre l\'influenceur' : confirm?.inf?.status === 'pending' ? 'Approuver la demande' : 'Réactiver l\'influenceur'}
        message={confirm?.status === 'suspended'
          ? `Les codes de ${txt(confirm?.inf?.name) || 'cet influenceur'} ne généreront plus de gains tant que le compte est suspendu.`
          : `Les codes de ${txt(confirm?.inf?.name) || 'cet influenceur'} seront actifs et généreront des gains.`}
        confirmLabel={confirm?.status === 'suspended' ? 'Suspendre' : confirm?.inf?.status === 'pending' ? 'Approuver' : 'Réactiver'}
        danger={confirm?.status === 'suspended'}
        busy={busy}
        onConfirm={doStatus}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
