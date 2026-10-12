import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaImage, FaSpinner, FaTrash, FaChevronDown, FaMapMarkerAlt, FaLocationArrow, FaPlus, FaAward, FaArrowRight } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { useTaxonomy, businessNoun, isIndividualType, proLimits } from '../../api/taxonomy'
import { Card, Field, Input, Textarea, Select, Button, Spinner } from '../../components/ui.jsx'
import { useToast } from '../../components/useToast'
import SocialLinksForm from '../../market/components/SocialLinksForm'
import { ShopTypeSelect, TradesPicker, ZonesInput, PhotosEditor, VideosEditor } from '../../market/components/ProFields'
import { normalizePro, validatePro, missingLabels, otherTradeFor } from '../../market/lib/pro'

const NO_LANDMARKS = []
const LocationPicker = lazy(() => import('../../components/LocationPicker.jsx'))

// Profil de l'établissement (libellés selon le type : « Mon garage », « Mon profil pro »…) :
// identité, localisation (formel GPS + informel repère/adresse locale → même gazetteer
// que le back-office) et identifiants officiels OPTIONNELS. Technicien : carte « Profil pro ».
export default function BoutiquePage() {
  const api = useTindisaApi()
  const taxonomy = useTaxonomy()
  const [form, setForm] = useState(null)
  const [shopId, setShopId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(false)
  const [showIds, setShowIds] = useState(false)
  const [newLm, setNewLm] = useState('') // nom du repère à créer
  const [lmBusy, setLmBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    let alive = true
    api.get('/v1/merchant/shop')
      .then((r) => {
        const s = r?.shop || {}
        if (alive) setShopId(s.id || null)
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

  // Repères de la ville (gazetteer partagé) : rechargés quand la ville change ;
  // aucune ville → liste vide.
  const city = form?.city || ''
  const lm = useLoad(
    () => (city
      ? api.get(`/v1/merchant/landmarks?city=${encodeURIComponent(city)}`).then((r) => r?.landmarks || [], () => [])
      : []),
    [city],
  )
  const landmarks = (city && lm.data) || NO_LANDMARKS
  const setLandmarks = lm.setData

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
      setLandmarks((arr) => [...(arr || []), l])
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
      setMsg('Informations enregistrées.'); setMsgOk(true)
    } catch (e2) { setMsg(e2?.message || 'Erreur. Réessayez.'); setMsgOk(false) }
    finally { setSaving(false) }
  }

  if (loading || !form) return <div className="dash-loading"><Spinner label="Chargement…" /></div>

  const cityOptions = (taxonomy?.cities || []).map((c) => ({ id: c.id, label: c.name }))
  const lmOptions = landmarks.map((l) => ({ id: l.id, label: l.commune ? `${l.name}, ${l.commune}` : l.name }))
  const noun = businessNoun(taxonomy, form.shopType)
  const isPro = isIndividualType(taxonomy, form.shopType)
  const hasPos = Number.isFinite(form.gpsLat) && Number.isFinite(form.gpsLng)
  // Centre la carte sur un repère de la ville si pas encore de position.
  const mapCenter = landmarks.length ? [landmarks[0].gpsLat, landmarks[0].gpsLng] : undefined

  return (
    <div className="dash-page">
      <h1 className="dash-title">{noun.My}</h1>
      <p className="dash-subtitle">Ces informations rassurent les clients et aident à vous trouver près de chez eux.</p>
      {shopId && (
        <p className="dash-subtitle">
          {isPro ? 'Votre profil public' : 'Votre vitrine publique'} sur le marché Tindisa :{' '}
          <a href={`/boutique/${shopId}`} target="_blank" rel="noopener noreferrer">{isPro ? 'voir mon profil' : 'voir ma vitrine'}</a>
          {' '}(votre téléphone et vos pièces légales n’y sont jamais affichés).
        </p>
      )}

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

          <Field label={isPro ? 'Nom affiché ou nom de marque' : `Nom de ${noun.your}`}>
            <Input value={form.name} onChange={set('name')} placeholder={isPro ? 'Ex : Jean Plomberie' : 'Ex : Maison Kivu Cosmétiques'} />
          </Field>

          <div className="form-row">
            <Field label="Type d’activité">
              <ShopTypeSelect taxonomy={taxonomy} value={form.shopType} onChange={set('shopType')} />
            </Field>
            <Field label="Ville">
              <Select value={form.city} onChange={setCity} options={cityOptions} placeholder="Choisir…" />
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
              <Input type="email" value={form.email} onChange={set('email')} placeholder="contact@exemple.cd" />
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

          <Field label="Repère local" hint={isPro ? 'Choisissez un lieu connu proche de chez vous' : `Choisissez un lieu connu proche de ${noun.your}`}>
            <Select value={form.landmarkId} onChange={pickLandmark} options={lmOptions}
              placeholder={form.city ? (lmOptions.length ? 'Choisir un repère' : 'Aucun repère dans cette ville') : 'Choisissez d\'abord la ville'}
              disabled={!lmOptions.length} />
          </Field>

          {/* Carte : pointer l'établissement (précision) */}
          <div className="shop-map-field">
            <div className="shop-map-head">
              <span><FaMapMarkerAlt /> {isPro ? 'Pointez votre atelier sur la carte (facultatif)' : `Pointez ${noun.your} sur la carte`}</span>
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
      {shopId && isPro && <ProProfileCard />}
      {shopId && <SocialsCard />}
    </div>
  )
}

// Profil pro (technicien / artisan) : métiers, zones, expérience, disponibilité,
// réalisations. GET/PUT /v1/merchant/shop/pro (mêmes contrôles qu'à l'onboarding).
function ProProfileCard() {
  const api = useTindisaApi()
  const taxonomy = useTaxonomy()
  const limits = proLimits(taxonomy)
  const { notify } = useToast()
  const q = useLoad(() => api.get('/v1/merchant/shop/pro').catch(() => null), [])
  const [pro, setPro] = useState(null)
  const [exp, setExp] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  if (pro === null && !q.loading) {
    const p = normalizePro(q.data)
    setPro(p)
    setExp(p.experienceYears ?? '')
  }
  if (!pro) return <Card><Spinner /></Card>
  const setP = (k) => (v) => setPro((p) => ({ ...p, [k]: v }))
  const missing = missingLabels(q.data?.missing || [])

  const save = async () => {
    const s = String(exp).trim()
    const next = { ...pro, experienceYears: s === '' ? null : Number(s) }
    const err = validatePro(next, limits)
    if (err) return setError(err)
    setSaving(true); setError('')
    try {
      const saved = await api.put('/v1/merchant/shop/pro', { ...next, otherTrade: otherTradeFor(next) })
      if (saved) q.setData(saved)
      notify('Profil pro enregistré', 'success')
    } catch (e) { setError(e?.message || 'Enregistrement impossible') }
    finally { setSaving(false) }
  }

  return (
    <Card className="shop-socials-card">
      <h2 className="dash-title" style={{ fontSize: '1.1rem' }}>Profil pro</h2>
      <p className="dash-subtitle">Vos métiers, vos zones et vos réalisations : c’est ce que les clients regardent avant de vous appeler.</p>
      {q.data && !q.data.complete && missing.length > 0 && (
        <p className="pro-missing">Profil incomplet : il manque {missing.join(', ')}.</p>
      )}
      <div className="product-form">
        <label className="pro-switch">
          <input type="checkbox" checked={pro.available} onChange={(e) => setP('available')(e.target.checked)} />
          {pro.available ? 'Disponible pour de nouveaux travaux' : 'Indisponible pour le moment'}
        </label>
        <Field label={`Métiers (${limits.maxTrades} maximum)`}>
          <TradesPicker taxonomy={taxonomy} value={pro.trades} onChange={setP('trades')} max={limits.maxTrades}
            otherTrade={pro.otherTrade} onOtherTradeChange={setP('otherTrade')} />
        </Field>
        <Field label="Communes et quartiers couverts">
          <ZonesInput value={pro.zones} onChange={setP('zones')} max={limits.maxZones} />
        </Field>
        <Field label="Années d’expérience (facultatif)">
          <Input type="number" inputMode="numeric" min={0} max={70} value={exp} onChange={(e) => setExp(e.target.value)} style={{ maxWidth: 140 }} />
        </Field>
        <Field label={`Photos de réalisations (${limits.minPhotos} à ${limits.maxPhotos})`}>
          <PhotosEditor value={pro.photos} onChange={setP('photos')} min={limits.minPhotos} max={limits.maxPhotos} />
        </Field>
        <Field label={`Vidéos de démonstration (facultatif, ${limits.maxVideos} maximum)`} hint="Liens de vidéos TikTok ou YouTube">
          <VideosEditor value={pro.videos} onChange={setP('videos')} max={limits.maxVideos} />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="ui-modal-foot">
          <Button type="button" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le profil pro'}</Button>
        </div>
      </div>
      <Link to="/dashboard/certificat-pro" className="pro-cert-link">
        <FaAward />
        <span>
          <b>Certificat d’aptitude professionnelle</b>
          <small>Faites reconnaître votre savoir-faire : un badge certifié s’affiche sur votre profil.</small>
        </span>
        <FaArrowRight />
      </Link>
    </Card>
  )
}

// Réseaux sociaux de l'établissement : liens et fil de publications sur la vitrine publique.
function SocialsCard() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const { data, loading } = useLoad(() => api.get('/v1/merchant/shop/socials').catch(() => ({})), [])
  return (
    <Card className="shop-socials-card">
      <h2 className="dash-title" style={{ fontSize: '1.1rem' }}>Réseaux sociaux</h2>
      <p className="dash-subtitle">TikTok, Facebook, Instagram, YouTube ou votre site : affichés sur votre vitrine, avec vos publications.</p>
      {loading ? <Spinner /> : (
        <SocialLinksForm
          initial={data || {}}
          onSave={async (values) => { await api.put('/v1/merchant/shop/socials', values); notify('Réseaux sociaux enregistrés', 'success') }}
        />
      )}
    </Card>
  )
}
