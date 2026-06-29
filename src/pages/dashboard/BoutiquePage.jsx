import { useEffect, useRef, useState } from 'react'
import { FaImage, FaSpinner, FaTrash, FaChevronDown } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { useTaxonomy } from '../../api/taxonomy'
import { Card, Field, Input, Textarea, Select, Button, Spinner } from '../../components/ui.jsx'

// Profil de la boutique : identité, localisation (ville RDC → isolation/contexte
// géo) et identifiants officiels OPTIONNELS (informel accepté). Simple et progressif.
export default function BoutiquePage() {
  const api = useTindisaApi()
  const taxonomy = useTaxonomy()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showIds, setShowIds] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    let alive = true
    api.get('/v1/merchant/shop')
      .then((r) => {
        const s = r?.shop || {}
        if (alive) setForm({
          name: s.name || '', shopType: s.shopType || '', logoUrl: s.logoUrl || '',
          ownerName: s.ownerName || '', phone: s.phone || '', email: s.email || '', description: s.description || '',
          city: s.city || '', province: s.province || '', address: s.address || '',
          rccm: s.rccm || '', nif: s.nif || '', idNat: s.idNat || '', patente: s.patente || '',
        })
      })
      .catch(() => alive && setForm({}))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  // Ville → province auto-déduite (depuis la taxonomie).
  const setCity = (e) => {
    const id = e.target.value
    const c = (taxonomy?.cities || []).find((x) => x.id === id)
    setForm((f) => ({ ...f, city: id, province: c?.province || f.province }))
  }

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setMsg('')
    try {
      const url = await uploadImage(file)
      setForm((f) => ({ ...f, logoUrl: url }))
    } catch (e2) { setMsg(e2?.message || 'Échec du téléversement.') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      await api.put('/v1/merchant/shop', form)
      setMsg('✅ Boutique enregistrée.')
    } catch (e2) { setMsg(e2?.message || 'Erreur. Réessayez.') }
    finally { setSaving(false) }
  }

  if (loading || !form) return <div className="dash-loading"><Spinner label="Chargement…" /></div>

  const cityOptions = (taxonomy?.cities || []).map((c) => ({ id: c.id, label: c.name }))

  return (
    <div className="dash-page">
      <h1 className="dash-title">Ma boutique</h1>
      <p className="dash-subtitle">Ces informations rassurent les acheteurs et aident à vous trouver près de chez eux.</p>

      <Card>
        <form className="product-form" onSubmit={save}>
          {/* Logo */}
          <div className="product-image-field">
            <div className="product-image-preview">
              {form.logoUrl ? <img src={form.logoUrl} alt="" /> : <span className="product-image-placeholder"><FaImage /></span>}
            </div>
            <div className="product-image-actions">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || !isCloudinaryConfigured}>
                {uploading ? <><FaSpinner className="spin" /> Téléversement…</> : <><FaImage /> Logo</>}
              </Button>
              {form.logoUrl && <button type="button" className="cat-icon-btn danger" onClick={() => setForm((f) => ({ ...f, logoUrl: '' }))}><FaTrash /></button>}
            </div>
          </div>

          <Field label="Nom de la boutique">
            <Input value={form.name} onChange={set('name')} placeholder="Ex : Maison Kivu Cosmétiques" />
          </Field>

          <div className="form-row">
            <Field label="Type d'établissement">
              <Select value={form.shopType} onChange={set('shopType')} options={taxonomy?.shopTypes || []} placeholder="— choisir —" />
            </Field>
            <Field label="Ville">
              <Select value={form.city} onChange={setCity} options={cityOptions} placeholder="— choisir —" />
            </Field>
          </div>

          <Field label="Nom du propriétaire">
            <Input value={form.ownerName} onChange={set('ownerName')} placeholder="Prénom Nom" />
          </Field>

          <div className="form-row">
            <Field label="Téléphone (contact)">
              <Input value={form.phone} onChange={set('phone')} placeholder="+243…" />
            </Field>
            <Field label="Email (contact)">
              <Input type="email" value={form.email} onChange={set('email')} placeholder="boutique@exemple.cd" />
            </Field>
          </div>

          <Field label="Adresse (style local)" hint="Ex : Av. du Commerce n°12, Réf. marche Virunga">
            <Input value={form.address} onChange={set('address')} />
          </Field>

          <Field label="Description (facultatif)">
            <Textarea value={form.description} onChange={set('description')} rows={2} />
          </Field>

          {/* Identifiants officiels — OPTIONNELS (informel accepté) */}
          <button type="button" className="collapse-toggle" onClick={() => setShowIds((s) => !s)}>
            <FaChevronDown className={showIds ? 'rot' : ''} /> Identifiants officiels (facultatif)
          </button>
          {showIds && (
            <div className="form-row form-row-wrap">
              <Field label="RCCM"><Input value={form.rccm} onChange={set('rccm')} /></Field>
              <Field label="NIF (impôt)"><Input value={form.nif} onChange={set('nif')} /></Field>
              <Field label="IdNAT"><Input value={form.idNat} onChange={set('idNat')} /></Field>
              <Field label="Patente"><Input value={form.patente} onChange={set('patente')} /></Field>
            </div>
          )}

          {msg && <p className={msg.startsWith('✅') ? 'form-success' : 'form-error'}>{msg}</p>}

          <div className="ui-modal-foot">
            <Button type="submit" variant="primary" disabled={saving || uploading}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
