import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { FaImage, FaSpinner, FaTrash, FaChevronDown, FaMapMarkerAlt, FaLocationArrow, FaPlus } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { useTaxonomy } from '../../api/taxonomy'
import { Card, Field, Input, Textarea, Select, Button, Spinner } from '../../components/ui.jsx'

const LocationPicker = lazy(() => import('../../components/LocationPicker.jsx'))

// Profil de la boutique : identité, localisation (formel GPS + informel repère/adresse
// locale → même gazetteer que le back-office) et identifiants officiels OPTIONNELS.
export default function BoutiquePage() {
  const api = useTindisaApi()
  const taxonomy = useTaxonomy()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(false)
  const [showIds, setShowIds] = useState(false)
  const [landmarks, setLandmarks] = useState([])
  const [newLm, setNewLm] = useState('') // nom du repère à créer
  const [lmBusy, setLmBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    let alive = true
    api.get('/v1/merchant/shop')
      .then((r) => {
        const s = r?.shop || {}
        if (alive) setForm({
          name: s.name || '', shopType: s.shopType || '', logoUrl: s.logoUrl || '',
          ownerName: s.ownerName || '', phone: s.phone || '', email: s.email || '', description: s.description || '',
          city: s.city || '', province: s.province || '', commune: s.commune || '', quartier: s.quartier || '',
          address: s.address || '', landmark: s.landmark || '', landmarkId: s.landmarkId || '',
          gpsLat: s.gpsLat ?? null, gpsLng: s.gpsLng ?? null,
          rccm: s.rccm || '', nif: s.nif || '', idNat: s.idNat || '', patente: s.patente || '',
        })
      })
      .catch(() => alive && setForm({}))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Repères de la ville (gazetteer partagé) : rechargés quand la ville change.
  useEffect(() => {
    if (!form?.city) { setLandmarks([]); return }
    let alive = true
    api.get(`/v1/merchant/landmarks?city=${encodeURIComponent(form.city)}`)
      .then((r) => alive && setLandmarks(r?.landmarks || []))
      .catch(() => alive && setLandmarks([]))
    return () => { alive = false }
  }, [form?.city]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setCity = (e) => {
    const id = e.target.value
    const c = (taxonomy?.cities || []).find((x) => x.id === id)
    setForm((f) => ({ ...f, city: id, province: c?.province || f.province }))
  }
  const setPos = ({ lat, lng }) =>
    setForm((f) => ({ ...f, gpsLat: Math.round(lat * 1e6) / 1e6, gpsLng: Math.round(lng * 1e6) / 1e6 }))

  // Choisir un repère existant : renseigne landmarkId + nom, et cale la position dessus.
  const pickLandmark = (e) => {
    const id = e.target.value
    const l = landmarks.find((x) => x.id === id)
    setForm((f) => ({
      ...f, landmarkId: id, landmark: l?.name || '',
      gpsLat: l?.gpsLat ?? f.gpsLat, gpsLng: l?.gpsLng ?? f.gpsLng,
    }))
  }
  const useLandmarkPin = (l) =>
    setForm((f) => ({ ...f, landmarkId: l.id, landmark: l.name, gpsLat: l.gpsLat, gpsLng: l.gpsLng }))

  const geolocate = () => {
    if (!navigator.geolocation) { setMsg('Géolocalisation indisponible.'); setMsgOk(false); return }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { setMsg('Position refusée ou indisponible.'); setMsgOk(false) },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  // Ajouter un nouveau repère (enrichit le gazetteer commun) à partir du point actuel.
  const addLandmark = async () => {
    if (!newLm.trim() || form.gpsLat == null || form.gpsLng == null) return
    setLmBusy(true); setMsg('')
    try {
      const l = await api.post('/v1/merchant/landmarks', {
        name: newLm.trim(), city: form.city, commune: form.commune, quartier: form.quartier,
        gpsLat: form.gpsLat, gpsLng: form.gpsLng,
      })
      setLandmarks((arr) => [...arr, l])
      setForm((f) => ({ ...f, landmarkId: l.id, landmark: l.name }))
      setNewLm(''); setMsg('Repère ajouté.'); setMsgOk(true)
    } catch (e) { setMsg(e?.message || 'Échec de l\'ajout du repère.'); setMsgOk(false) }
    finally { setLmBusy(false) }
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
      setMsg('Boutique enregistrée.'); setMsgOk(true)
    } catch (e2) { setMsg(e2?.message || 'Erreur. Réessayez.'); setMsgOk(false) }
    finally { setSaving(false) }
  }

  if (loading || !form) return <div className="dash-loading"><Spinner label="Chargement…" /></div>

  const cityOptions = (taxonomy?.cities || []).map((c) => ({ id: c.id, label: c.name }))
  const lmOptions = landmarks.map((l) => ({ id: l.id, label: l.commune ? `${l.name} — ${l.commune}` : l.name }))
  const hasPos = Number.isFinite(form.gpsLat) && Number.isFinite(form.gpsLng)
  // Centre la carte sur un repère de la ville si pas encore de position.
  const mapCenter = landmarks.length ? [landmarks[0].gpsLat, landmarks[0].gpsLng] : undefined

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

          {/* ===== Localisation : formel (GPS) + informel (commune/quartier/repère) ===== */}
          <div className="driver-section">Localisation</div>
          <div className="form-row">
            <Field label="Commune"><Input value={form.commune} onChange={set('commune')} /></Field>
            <Field label="Quartier"><Input value={form.quartier} onChange={set('quartier')} /></Field>
          </div>

          <Field label="Adresse (style local)" hint="Ex : Av. du Commerce n°12">
            <Input value={form.address} onChange={set('address')} />
          </Field>

          <Field label="Repère local" hint="Choisissez un lieu connu proche de votre boutique">
            <Select value={form.landmarkId} onChange={pickLandmark} options={lmOptions}
              placeholder={form.city ? (lmOptions.length ? '— choisir un repère —' : 'Aucun repère dans cette ville') : 'Choisissez d\'abord la ville'}
              disabled={!lmOptions.length} />
          </Field>

          {/* Carte : pointer la boutique (précision) */}
          <div className="shop-map-field">
            <div className="shop-map-head">
              <span><FaMapMarkerAlt /> Pointez votre boutique sur la carte</span>
              <div className="shop-map-actions">
                <Button type="button" variant="ghost" size="sm" onClick={geolocate}><FaLocationArrow /> Ma position</Button>
                {hasPos && <button type="button" className="cat-icon-btn danger" title="Effacer la position" onClick={() => setForm((f) => ({ ...f, gpsLat: null, gpsLng: null }))}><FaTrash /></button>}
              </div>
            </div>
            <Suspense fallback={<div className="shop-map-loading"><Spinner label="Carte…" /></div>}>
              <LocationPicker lat={form.gpsLat} lng={form.gpsLng} center={mapCenter} landmarks={landmarks} onChange={setPos} onUseLandmark={useLandmarkPin} />
            </Suspense>
            <p className="ui-field-hint">
              {hasPos ? `Position : ${form.gpsLat}, ${form.gpsLng}` : 'Cliquez sur la carte ou utilisez « Ma position ».'}
            </p>
            {/* Ajouter un repère si le mien n'existe pas encore */}
            {hasPos && (
              <div className="shop-lm-add">
                <Input value={newLm} onChange={(e) => setNewLm(e.target.value)} placeholder="Nom d'un nouveau repère (ex : Marché Kivu)" />
                <Button type="button" variant="secondary" size="sm" onClick={addLandmark} disabled={lmBusy || !newLm.trim()}>
                  {lmBusy ? <FaSpinner className="spin" /> : <FaPlus />} Ajouter ce lieu
                </Button>
              </div>
            )}
          </div>

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

          {msg && <p className={msgOk ? 'form-success' : 'form-error'}>{msg}</p>}

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
