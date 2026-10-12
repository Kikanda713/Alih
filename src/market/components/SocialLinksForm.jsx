import { useState } from 'react'
import { Field, Input } from '../../components/ui'
import { SOCIAL_NETWORKS } from '../lib/socials'

/**
 * Saisie des réseaux sociaux d'une boutique (onboarding et page « Ma boutique »).
 * Pseudo (« @maboutique ») ou lien acceptés ; le serveur valide et normalise.
 * `onSave(values)` doit renvoyer une promesse (erreur affichée sous le formulaire).
 */
export default function SocialLinksForm({ initial = {}, onSave, saveLabel = 'Enregistrer', secondary }) {
  const [values, setValues] = useState(() => Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.id, initial[n.id] || ''])))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try { await onSave(values) } catch (err) { setError(err?.message || 'Lien invalide') } finally { setSaving(false) }
  }

  return (
    <form className="mk-social-form" onSubmit={submit}>
      {SOCIAL_NETWORKS.map((n) => (
        <Field key={n.id} label={<span className="mk-social-label"><n.icon /> {n.label}</span>}>
          <Input value={values[n.id]} placeholder={n.placeholder} maxLength={300}
            onChange={(e) => setValues((v) => ({ ...v, [n.id]: e.target.value }))} />
        </Field>
      ))}
      {error && <p className="mk-form-error">{error}</p>}
      <div className="ui-modal-foot">
        {secondary}
        <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : saveLabel}</button>
      </div>
    </form>
  )
}
