import { useRef, useState } from 'react'
import { FaTimes, FaPlus, FaImage, FaSpinner, FaTiktok, FaYoutube, FaTrash } from 'react-icons/fa'
import { Button, Input } from '../../components/ui'
import { shopTypeGroups } from '../../api/taxonomy'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { imageUrl } from '../lib/format'
import { parseDemoVideo } from '../lib/socials'

/*
 * Champs partagés onboarding / espace pro : type d'activité (groupé par famille),
 * métiers, zones d'intervention, photos et vidéos de réalisations.
 */

/** Type d'activité : <select> natif groupé par famille (optgroup). */
export function ShopTypeSelect({ taxonomy, value, onChange, exclude, placeholder = 'Choisir…', ...props }) {
  const groups = shopTypeGroups(taxonomy, { exclude })
  return (
    <select className="ui-input ui-select" value={value} onChange={onChange} {...props}>
      <option value="">{placeholder}</option>
      {groups.map((g) => (g.label ? (
        <optgroup key={g.id} label={g.label}>
          {g.options.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </optgroup>
      ) : g.options.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)))}
    </select>
  )
}

/** Métiers : puces à cocher (maximum `max`). */
export function TradesPicker({ taxonomy, value = [], onChange, max = 3 }) {
  const trades = taxonomy?.trades || []
  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else if (value.length < max) onChange([...value, id])
  }
  if (!trades.length) return <p className="mk-hint">Liste des métiers indisponible pour le moment.</p>
  return (
    <div className="mk-chips" role="group" aria-label="Métiers">
      {trades.map((t) => {
        const on = value.includes(t.id)
        return (
          <button key={t.id} type="button" className={`mk-chip${on ? ' active' : ''}`} aria-pressed={on}
            disabled={!on && value.length >= max} onClick={() => toggle(t.id)}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/** Zones (communes, quartiers) : saisie libre, une puce par zone. */
export function ZonesInput({ value = [], onChange, max = 10, placeholder = 'Ex. Goma, Himbi, Katindo' }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    for (const p of parts) {
      if (next.length >= max) break
      if (!next.some((z) => z.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 60))
    }
    onChange(next)
    setDraft('')
  }
  return (
    <div className="pro-zones">
      <div className="pro-inline-add">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} maxLength={200}
          disabled={value.length >= max}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <Button type="button" variant="secondary" size="sm" onClick={add} disabled={!draft.trim() || value.length >= max}>
          <FaPlus /> Ajouter
        </Button>
      </div>
      {value.length > 0 && (
        <div className="mk-chips mk-chips-tight">
          {value.map((z) => (
            <button key={z} type="button" className="mk-chip active" onClick={() => onChange(value.filter((x) => x !== z))} aria-label={`Retirer ${z}`}>
              {z} <FaTimes />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Photos de réalisations : téléversement Cloudinary, miniatures, retrait. */
export function PhotosEditor({ value = [], onChange, min = 2, max = 6 }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState('')
  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, max - value.length))
    e.target.value = ''
    if (!files.length) return
    setError('')
    setBusy(files.length)
    const urls = []
    for (const f of files) {
      try { urls.push(await uploadImage(f)) } catch { setError('Une photo n’a pas pu être envoyée. Réessayez.') }
      setBusy((n) => n - 1)
    }
    if (urls.length) onChange([...value, ...urls].slice(0, max))
  }
  const remaining = max - value.length
  return (
    <div className="pro-photos">
      <div className="pro-photo-grid">
        {value.map((url, i) => (
          <div key={url} className="pro-photo">
            <img src={imageUrl(url, 240)} alt={`Réalisation ${i + 1}`} loading="lazy" />
            <button type="button" className="pro-photo-del" onClick={() => onChange(value.filter((x) => x !== url))} aria-label="Retirer la photo"><FaTrash /></button>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => <div key={`up-${i}`} className="pro-photo pro-photo-busy"><FaSpinner className="spin" /></div>)}
        {remaining > 0 && !busy && isCloudinaryConfigured && (
          <button type="button" className="pro-photo pro-photo-add" onClick={() => fileRef.current?.click()}>
            <FaImage /> <span>Ajouter</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      <p className="mk-hint">
        {value.length} / {max} photo{max > 1 ? 's' : ''}{value.length < min ? ` · minimum ${min}` : ''}
        {!isCloudinaryConfigured && ' · envoi de photos indisponible pour le moment'}
      </p>
      {error && <p className="mk-form-error">{error}</p>}
    </div>
  )
}

const VIDEO_ICON = { tiktok: FaTiktok, youtube: FaYoutube }

/** Vidéos de démonstration : liens TikTok ou YouTube vers une vidéo précise. */
export function VideosEditor({ value = [], onChange, max = 3 }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const add = () => {
    const v = parseDemoVideo(draft)
    if (!v) return setError('Collez le lien d’une vidéo TikTok ou YouTube (pas celui d’un profil).')
    if (value.some((x) => x.url === v.url)) return setError('Cette vidéo est déjà ajoutée.')
    setError('')
    onChange([...value, v].slice(0, max))
    setDraft('')
  }
  return (
    <div className="pro-videos">
      {value.length > 0 && (
        <ul className="pro-video-list">
          {value.map((v) => {
            const Icon = VIDEO_ICON[v.network] || FaYoutube
            return (
              <li key={v.url}>
                <Icon className={`pro-video-ic pro-video-${v.network}`} />
                <a href={v.url} target="_blank" rel="noopener noreferrer">{v.url}</a>
                <button type="button" className="cat-icon-btn danger" onClick={() => onChange(value.filter((x) => x.url !== v.url))} aria-label="Retirer la vidéo"><FaTrash /></button>
              </li>
            )
          })}
        </ul>
      )}
      {value.length < max && (
        <div className="pro-inline-add">
          <Input value={draft} onChange={(e) => { setDraft(e.target.value); setError('') }} maxLength={300} inputMode="url"
            placeholder="Lien TikTok ou YouTube"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
          <Button type="button" variant="secondary" size="sm" onClick={add} disabled={!draft.trim()}><FaPlus /> Ajouter</Button>
        </div>
      )}
      <p className="mk-hint">{value.length} / {max} vidéo{max > 1 ? 's' : ''} (facultatif)</p>
      {error && <p className="mk-form-error">{error}</p>}
    </div>
  )
}
