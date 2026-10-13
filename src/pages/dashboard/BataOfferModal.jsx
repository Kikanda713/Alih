import { useState } from 'react'
import { FaTimes, FaCertificate } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useToast } from '../../components/useToast'
import { Modal, Button, Field, Input, Textarea } from '../../components/ui.jsx'
import { BATA_FAMILIES, ESCROW_OPEN, bataFamilyOf, txt } from '../../market/lib/bata'

const CASH_MODES = [
  ESCROW_OPEN
    ? { id: 'escrow', label: 'Séquestre Tindisa', hint: 'Recommandé : la différence est bloquée chez Tindisa jusqu’à la remise des deux biens.' }
    : { id: 'escrow', label: 'Séquestre Tindisa', hint: 'Bientôt disponible.', disabled: true },
  { id: 'direct', label: 'Direct', hint: 'La différence se règle entre vous, à la remise.' },
  { id: 'both', label: 'Au choix', hint: ESCROW_OPEN ? 'L’autre partie choisit.' : 'Direct pour l’instant, séquestre dès son ouverture.' },
]
const DEFAULT_MODE = ESCROW_OPEN ? 'escrow' : 'direct'

const strList = (v) => (Array.isArray(v) ? v.map(txt).filter(Boolean) : [])
const num = (v) => (v === '' || v == null ? undefined : Number(v))

/** Saisie de puces (marques, modèles) : Entrée ou virgule pour ajouter. */
function ChipsInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim().replace(/,$/, '')
    if (v && !value.includes(v) && value.length < 10) onChange([...value, v])
    setDraft('')
  }
  return (
    <div className="bata-chips">
      {value.map((v) => (
        <span key={v} className="bata-chip">
          {v}
          <button type="button" aria-label={`Retirer ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}><FaTimes /></button>
        </span>
      ))}
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
        }}
        onBlur={add}
      />
    </div>
  )
}

/**
 * Activer / modifier le BATA d'un article certifié (véhicule, téléphone, ordinateur).
 * Monté avec une `key` par article : l'état initial vient de l'offre existante.
 */
export default function BataOfferModal({ product, offer, onClose, onSaved, onCertify }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const w = offer?.wants && typeof offer.wants === 'object' ? offer.wants : {}
  const ownFamily = bataFamilyOf(product?.category, product?.subcategory)
  const [families, setFamilies] = useState(() => {
    const f = strList(w.families)
    return f.length ? f : ownFamily ? [ownFamily] : []
  })
  const [brands, setBrands] = useState(() => strList(w.brands))
  const [models, setModels] = useState(() => strList(w.models))
  const [minV, setMinV] = useState(() => (w.minValueUsd != null ? String(w.minValueUsd) : ''))
  const [maxV, setMaxV] = useState(() => (w.maxValueUsd != null ? String(w.maxValueUsd) : ''))
  const [notes, setNotes] = useState(() => txt(w.notes))
  const [cashMode, setCashMode] = useState(() =>
    (ESCROW_OPEN ? ['escrow', 'direct', 'both'] : ['direct', 'both']).includes(offer?.cashMode) ? offer.cashMode : DEFAULT_MODE,
  )
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(null) // { reason, needsCertificate }

  const live = offer && offer.status !== 'closed' && offer.status !== 'removed'
  const toggleFamily = (id) => setFamilies((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  const wants = () => ({
    families: families.length ? families : undefined,
    brands: brands.length ? brands : undefined,
    models: models.length ? models : undefined,
    minValueUsd: num(minV),
    maxValueUsd: num(maxV),
    notes: notes.trim() || undefined,
  })

  const handle = (r, okMsg) => {
    if (r && r.ok === false) {
      setBlocked({ reason: txt(r.reason) || 'Cette offre ne peut pas être publiée.', needsCertificate: !!r.needsCertificate })
      return
    }
    notify(okMsg, 'success')
    onSaved?.()
  }

  const save = async () => {
    if (minV && maxV && Number(minV) > Number(maxV)) return notify('La valeur minimale dépasse la maximale', 'error')
    setBusy(true)
    setBlocked(null)
    try {
      const r = live
        ? await api.patch(`/v1/merchant/bata/offers/${encodeURIComponent(offer.id)}`, { status: 'active', wants: wants(), cashMode })
        : await api.post('/v1/merchant/bata/offers', { productId: product.id, wants: wants(), cashMode })
      handle(r, live ? 'Offre BATA mise à jour' : 'BATA activé : votre annonce affiche « BATA possible »')
    } catch (e) {
      notify(e?.message || 'Enregistrement impossible', 'error')
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (status) => {
    setBusy(true)
    try {
      const r = await api.patch(`/v1/merchant/bata/offers/${encodeURIComponent(offer.id)}`, { status })
      handle(r, status === 'paused' ? 'BATA mis en pause' : 'BATA arrêté')
    } catch (e) {
      notify(e?.message || 'Action impossible', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      title={`BATA : ${txt(product?.name)}`}
      onClose={busy ? undefined : onClose}
      footer={(
        <>
          {live && offer.status === 'active' && <Button variant="ghost" onClick={() => setStatus('paused')} disabled={busy}>Mettre en pause</Button>}
          {live && <Button variant="ghost" onClick={() => setStatus('closed')} disabled={busy}>Arrêter</Button>}
          <Button onClick={save} disabled={busy}>{busy ? 'Enregistrement…' : live ? (offer.status === 'active' ? 'Enregistrer' : 'Réactiver') : 'Activer le BATA'}</Button>
        </>
      )}
    >
      <div className="bata-form">
        <p className="dash-sub">Votre annonce affichera « BATA possible ». Indiquez ce que vous accepteriez en échange : la différence de valeur se paie en cash.</p>

        {blocked && (
          <div className="bata-alert" role="alert">
            <p>{blocked.reason}</p>
            {blocked.needsCertificate && onCertify && (
              <Button size="sm" variant="secondary" onClick={() => onCertify(product)}><FaCertificate /> Mettre à jour le certificat</Button>
            )}
          </div>
        )}

        <div className="ui-field">
          <span className="ui-field-label">Ce que vous cherchez</span>
          <div className="bata-chips">
            {BATA_FAMILIES.map((f) => (
              <button key={f.id} type="button" className={`bata-pick${families.includes(f.id) ? ' active' : ''}`} onClick={() => toggleFamily(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="ui-field">
          <span className="ui-field-label">Marques souhaitées</span>
          <ChipsInput value={brands} onChange={setBrands} placeholder="Ex. Toyota, Samsung" />
        </div>
        <div className="ui-field">
          <span className="ui-field-label">Modèles souhaités</span>
          <ChipsInput value={models} onChange={setModels} placeholder="Ex. RAV4, Galaxy S23" />
        </div>
        <div className="bata-range">
          <Field label="Valeur min ($)">
            <Input inputMode="numeric" value={minV} onChange={(e) => setMinV(e.target.value.replace(/[^\d]/g, ''))} />
          </Field>
          <Field label="Valeur max ($)">
            <Input inputMode="numeric" value={maxV} onChange={(e) => setMaxV(e.target.value.replace(/[^\d]/g, ''))} />
          </Field>
        </div>
        <Field label="Note (facultatif)">
          <Textarea rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. boîte automatique, en bon état" />
        </Field>

        <fieldset className="bata-cash">
          <legend className="ui-field-label">Règlement de la différence</legend>
          {CASH_MODES.map((m) => (
            <label key={m.id} className="bata-radio">
              <input type="radio" name="bata-cash" checked={cashMode === m.id} disabled={m.disabled} onChange={() => setCashMode(m.id)} />
              <span><b>{m.label}</b><small>{m.hint}</small></span>
            </label>
          ))}
        </fieldset>
      </div>
    </Modal>
  )
}
