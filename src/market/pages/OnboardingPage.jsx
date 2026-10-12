import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import {
  FaStore, FaMapMarkerAlt, FaPhoneAlt, FaShareAlt, FaCheckCircle, FaImage, FaSpinner,
  FaChevronDown, FaUserCog, FaImages, FaUserCircle,
} from 'react-icons/fa'
import { Button, Field, Input, Select, Spinner, Textarea } from '../../components/ui'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { useTaxonomy, businessNoun, isIndividualType, isPlaceholderShopName, proLimits } from '../../api/taxonomy'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { isAuth0Configured } from '../../auth/config'
import ChannelLinks from '../components/ChannelLinks'
import { EMPTY_PRO, normalizePro, validatePro } from '../lib/pro'
import SocialLinksForm from '../components/SocialLinksForm'
import { ShopTypeSelect, TradesPicker, ZonesInput, PhotosEditor, VideosEditor } from '../components/ProFields'

/*
 * Onboarding commerçant : création du compte puis de l'établissement, étape par
 * étape (chaque étape est enregistrée : on peut s'arrêter et reprendre).
 *  - mode établissement (/vendre/boutique) : activité, adresse, contact, réseaux ;
 *  - mode technicien/artisan (/vendre/pro) : profil, zone, réalisations, contact, réseaux.
 * Champs de l'établissement : PUT /v1/merchant/shop (upsert) ; profil pro :
 * PUT /v1/merchant/shop/pro ; réseaux : PUT /v1/merchant/shop/socials.
 */

const BUSINESS_STEPS = [
  { id: 'shop', label: 'Activité', icon: FaStore },
  { id: 'place', label: 'Adresse', icon: FaMapMarkerAlt },
  { id: 'contact', label: 'Contact', icon: FaPhoneAlt },
  { id: 'socials', label: 'Réseaux', icon: FaShareAlt },
]
const PRO_STEPS = [
  { id: 'profile', label: 'Profil', icon: FaUserCog },
  { id: 'zone', label: 'Zone', icon: FaMapMarkerAlt },
  { id: 'works', label: 'Réalisations', icon: FaImages },
  { id: 'contact', label: 'Contact', icon: FaPhoneAlt },
  { id: 'socials', label: 'Réseaux', icon: FaShareAlt },
]

function Stepper({ steps, step }) {
  return (
    <ol className="mk-onb-steps" aria-label="Étapes" style={{ '--n': steps.length }}>
      {steps.map((s, i) => (
        <li key={s.id} className={i < step ? 'done' : i === step ? 'current' : ''}>
          <span>{i < step ? <FaCheckCircle /> : <s.icon />}</span> {s.label}
        </li>
      ))}
    </ol>
  )
}

const REQUIRED = {
  shop: ['shopType', 'name'],
  place: ['city'],
  contact: ['phone'],
  profile: ['name'],
  zone: ['city'],
}
const SHOP_FIELDS = {
  shop: ['name', 'shopType', 'description', 'logoUrl'],
  place: ['city', 'commune', 'quartier', 'landmark', 'address'],
  contact: ['phone', 'email', 'rccm', 'nif', 'idNat'],
  profile: ['name', 'shopType', 'description', 'logoUrl'],
  zone: ['city', 'address'],
}
const PRO_PARTS = { profile: ['trades', 'experience'], zone: ['zones'], works: ['photos', 'videos'] }
const PRO_FIELDS = { profile: ['trades', 'experienceYears'], zone: ['zones'], works: ['photos', 'videos'] }

function Wizard({ proRoute }) {
  const api = useTindisaApi()
  const taxonomy = useTaxonomy()
  const limits = proLimits(taxonomy)
  const shopQ = useLoad(() => api.get('/v1/merchant/shop').then((r) => r?.shop || null), [])
  // Profil pro : route pas encore déployée partout → absence tolérée.
  const proQ = useLoad(() => api.get('/v1/merchant/shop/pro').catch(() => null), [])
  const socialsQ = useLoad(() => api.get('/v1/merchant/shop/socials').catch(() => ({})), [])
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(null)
  const [pro, setPro] = useState(EMPTY_PRO)
  const [proMode, setProMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showLegal, setShowLegal] = useState(false)
  const fileRef = useRef(null)

  // Formulaire initialisé une fois les données chargées (reprise d'un onboarding entamé).
  const shop = shopQ.data
  if (form === null && !shopQ.loading && !proQ.loading) {
    const individual = isIndividualType(taxonomy, shop?.shopType)
    // Un établissement déjà installé (nom réel + type non individuel) reste en mode établissement.
    const established = !!shop && !isPlaceholderShopName(shop.name) && !!shop.shopType && !individual
    const asPro = individual || (proRoute && !established)
    setProMode(asPro)
    setPro(normalizePro(proQ.data))
    setForm({
      name: isPlaceholderShopName(shop?.name) ? '' : shop.name,
      shopType: asPro ? (individual ? shop.shopType : 'technicien') : (shop?.shopType || ''),
      description: shop?.description || '', logoUrl: shop?.logoUrl || '', city: shop?.city || '',
      commune: shop?.commune || '', quartier: shop?.quartier || '', landmark: shop?.landmark || '',
      address: shop?.address || '', phone: shop?.phone || '', email: shop?.email || '',
      rccm: shop?.rccm || '', nif: shop?.nif || '', idNat: shop?.idNat || '',
      experienceYears: proQ.data?.experienceYears ?? '',
    })
  }
  useEffect(() => { window.scrollTo({ top: 0 }) }, [step])

  if (!form) return <Spinner label="Chargement…" />
  const STEPS = proMode ? PRO_STEPS : BUSINESS_STEPS
  const current = STEPS[step]?.id
  const noun = businessNoun(taxonomy, form.shopType)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setP = (k) => (v) => setPro((p) => ({ ...p, [k]: v }))
  const done = () => setStep(STEPS.length)

  const saveStep = async () => {
    const missing = (REQUIRED[current] || []).filter((k) => !String(form[k] || '').trim())
    if (missing.length) return setError('Complétez les champs marqués d’un astérisque.')
    if (current === 'contact' && !/^\+?[\d\s]{8,16}$/.test(form.phone.trim())) return setError('Numéro de téléphone invalide (ex. +243 99 000 0000).')
    const exp = String(form.experienceYears ?? '').trim()
    const proNow = { ...pro, experienceYears: exp === '' ? null : Number(exp) }
    if (proMode && PRO_PARTS[current]) {
      const err = validatePro(proNow, limits, PRO_PARTS[current])
      if (err) return setError(err)
    }
    setSaving(true)
    setError('')
    try {
      if (SHOP_FIELDS[current]) {
        const payload = Object.fromEntries(SHOP_FIELDS[current].map((k) => [k, String(form[k] || '').trim()]))
        if (current === 'place' || current === 'zone') payload.province = (taxonomy?.cities || []).find((c) => c.id === form.city)?.province || undefined
        const saved = await api.put('/v1/merchant/shop', payload)
        shopQ.setData(saved?.id ? saved : shop)
      }
      if (proMode && PRO_FIELDS[current]) {
        await api.put('/v1/merchant/shop/pro', Object.fromEntries(PRO_FIELDS[current].map((k) => [k, proNow[k]])))
        setPro(proNow)
      }
      setStep((s) => s + 1)
    } catch (e) {
      setError(e?.message || 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try { const url = await uploadImage(file); setForm((f) => ({ ...f, logoUrl: url })) } catch { setError('Envoi de l’image impossible') } finally { setUploading(false) }
  }

  const shopId = shopQ.data?.id

  if (step >= STEPS.length) {
    if (proMode) {
      return (
        <div className="mk-onb-done">
          <span className="mk-sent-icon"><FaCheckCircle /></span>
          <h2>Votre profil pro est en ligne</h2>
          <p className="mk-muted">Ajoutez vos prestations avec un prix indicatif : l’assistant vous propose aux clients qui cherchent votre métier près de chez eux.</p>
          <div className="mk-sent-actions">
            {shopId && <Button as={Link} to={`/boutique/${shopId}`} variant="secondary">Voir mon profil</Button>}
            <Button as={Link} to="/dashboard/catalogue?new=1">Ajouter une prestation</Button>
            <Button as={Link} to="/dashboard/certificat-pro" variant="ghost">Demander mon certificat d’aptitude</Button>
          </div>
        </div>
      )
    }
    return (
      <div className="mk-onb-done">
        <span className="mk-sent-icon"><FaCheckCircle /></span>
        <h2>{noun.Your} est en ligne</h2>
        <p className="mk-muted">Ajoutez vos produits ou services : ils apparaissent sur le marché et l’assistant les propose aux acheteurs.</p>
        <div className="mk-sent-actions">
          <Button as={Link} to="/dashboard/catalogue?new=1">Ajouter ma première offre</Button>
          {shopId && <Button as={Link} to={`/boutique/${shopId}`} variant="secondary">Voir ma vitrine</Button>}
          <ChannelLinks text="Bonjour Tindisa, je veux lier mon compte vendeur à cette messagerie." label="Vendre aussi par messagerie :" />
        </div>
      </div>
    )
  }

  const cityOptions = (taxonomy?.cities || []).map((c) => ({ id: c.id, label: c.name }))
  const logoPicker = isCloudinaryConfigured && (
    <div className="mk-onb-logo">
      <span className="mk-shop-logo mk-shop-logo-lg">{form.logoUrl ? <img src={form.logoUrl} alt="" /> : proMode ? <FaUserCircle /> : <FaStore />}</span>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
      <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <><FaSpinner className="spin" /> Envoi…</> : <><FaImage /> {proMode ? (form.logoUrl ? 'Changer la photo' : 'Photo de profil') : (form.logoUrl ? 'Changer le logo' : 'Ajouter un logo')}</>}
      </Button>
    </div>
  )

  return (
    <>
      <Stepper steps={STEPS} step={step} />
      <div className="mk-section-card mk-onb-card">
        {current === 'shop' && (
          <>
            <h2>Votre activité</h2>
            <Field label="Type d’activité *">
              <ShopTypeSelect taxonomy={taxonomy} value={form.shopType} onChange={set('shopType')} exclude={(t) => t.individual} />
            </Field>
            <p className="mk-hint">Vous travaillez seul (plombier, électricien, mécanicien…) ? <Link to="/vendre/pro">Créez plutôt un profil pro</Link>.</p>
            <Field label={`Nom de ${noun.your} *`}><Input value={form.name} onChange={set('name')} maxLength={80} placeholder="Ex. Quincaillerie Himbi" /></Field>
            <Field label="Présentation (facultatif)" hint="Ce que vous proposez, vos horaires, votre spécialité">
              <Textarea rows={3} value={form.description} onChange={set('description')} maxLength={600} />
            </Field>
            {logoPicker}
          </>
        )}
        {current === 'profile' && (
          <>
            <h2>Votre profil pro</h2>
            <Field label="Nom affiché ou nom de marque *" hint="Votre nom, ou le nom sous lequel les clients vous connaissent">
              <Input value={form.name} onChange={set('name')} maxLength={80} placeholder="Ex. Jean Plomberie" />
            </Field>
            <Field label={`Vos métiers * (${limits.maxTrades} maximum)`}>
              <TradesPicker taxonomy={taxonomy} value={pro.trades} onChange={setP('trades')} max={limits.maxTrades} />
            </Field>
            <Field label="Années d’expérience (facultatif)">
              <Input type="number" inputMode="numeric" min={0} max={70} value={form.experienceYears} onChange={set('experienceYears')} style={{ maxWidth: 140 }} />
            </Field>
            <Field label="Présentation courte (facultatif)" hint="Vos spécialités, vos horaires, ce qui vous distingue">
              <Textarea rows={3} value={form.description} onChange={set('description')} maxLength={600} />
            </Field>
            {logoPicker}
          </>
        )}
        {current === 'place' && (
          <>
            <h2>Où se trouve {noun.your} ?</h2>
            <Field label="Ville *">
              <Select value={form.city} onChange={set('city')} options={cityOptions} placeholder="Choisir…" />
            </Field>
            <div className="mk-form-row">
              <Field label="Commune"><Input value={form.commune} onChange={set('commune')} maxLength={80} /></Field>
              <Field label="Quartier"><Input value={form.quartier} onChange={set('quartier')} maxLength={80} /></Field>
            </div>
            <Field label="Repère connu" hint="Église, marché, rond-point… aide les livreurs et les clients">
              <Input value={form.landmark} onChange={set('landmark')} maxLength={120} />
            </Field>
            <Field label="Adresse (facultatif)"><Input value={form.address} onChange={set('address')} maxLength={200} /></Field>
            <p className="mk-hint">La position exacte sur la carte se règle ensuite depuis votre espace pro.</p>
          </>
        )}
        {current === 'zone' && (
          <>
            <h2>Où intervenez-vous ?</h2>
            <Field label="Ville *">
              <Select value={form.city} onChange={set('city')} options={cityOptions} placeholder="Choisir…" />
            </Field>
            <Field label="Communes et quartiers couverts *" hint="Ajoutez chaque commune ou quartier où vous vous déplacez">
              <ZonesInput value={pro.zones} onChange={setP('zones')} max={limits.maxZones} />
            </Field>
            <Field label="Adresse de l’atelier (facultatif)"><Input value={form.address} onChange={set('address')} maxLength={200} /></Field>
            <p className="mk-hint">Pas besoin de carte : les clients vous trouvent par commune et par quartier.</p>
          </>
        )}
        {current === 'works' && (
          <>
            <h2>Vos réalisations</h2>
            <p className="mk-muted">Montrez votre travail : {limits.minPhotos} à {limits.maxPhotos} photos de chantiers, de réparations ou d’ouvrages terminés.</p>
            <PhotosEditor value={pro.photos} onChange={setP('photos')} min={limits.minPhotos} max={limits.maxPhotos} />
            <Field label={`Vidéos de démonstration (facultatif, ${limits.maxVideos} maximum)`} hint="Liens de vidéos TikTok ou YouTube où l’on vous voit travailler">
              <VideosEditor value={pro.videos} onChange={setP('videos')} max={limits.maxVideos} />
            </Field>
          </>
        )}
        {current === 'contact' && (
          <>
            <h2>Comment vous joindre ?</h2>
            <Field label="Téléphone de contact *" hint="Jamais affiché publiquement : l’assistant met en relation les clients">
              <Input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="+243 99 000 0000" maxLength={20} />
            </Field>
            <Field label="E-mail (facultatif)"><Input type="email" value={form.email} onChange={set('email')} maxLength={120} /></Field>
            {!proMode && (
              <>
                <button type="button" className="mk-link-btn" onClick={() => setShowLegal((v) => !v)} aria-expanded={showLegal}>
                  Documents de l’entreprise (facultatif) <FaChevronDown className={showLegal ? 'mk-rot' : ''} />
                </button>
                {showLegal && (
                  <div className="mk-form-row mk-form-row-3">
                    <Field label="RCCM"><Input value={form.rccm} onChange={set('rccm')} maxLength={60} /></Field>
                    <Field label="NIF"><Input value={form.nif} onChange={set('nif')} maxLength={60} /></Field>
                    <Field label="Id. nationale"><Input value={form.idNat} onChange={set('idNat')} maxLength={60} /></Field>
                  </div>
                )}
              </>
            )}
          </>
        )}
        {current === 'socials' && (
          <>
            <h2>Vos réseaux sociaux</h2>
            <p className="mk-muted">Facultatif : vos publications TikTok, Facebook ou YouTube s’affichent sur {proMode ? 'votre profil' : 'votre vitrine'}.</p>
            {socialsQ.loading ? <Spinner /> : (
              <SocialLinksForm
                initial={socialsQ.data || {}}
                saveLabel="Terminer"
                secondary={<Button type="button" variant="ghost" onClick={done}>Passer</Button>}
                onSave={async (values) => { await api.put('/v1/merchant/shop/socials', values); done() }}
              />
            )}
          </>
        )}
        {current !== 'socials' && (
          <>
            {error && <p className="mk-form-error">{error}</p>}
            <div className="ui-modal-foot">
              {step > 0 && <Button variant="ghost" onClick={() => { setError(''); setStep((s) => s - 1) }}>Retour</Button>}
              <Button onClick={saveStep} disabled={saving || uploading}>{saving ? 'Enregistrement…' : 'Continuer'}</Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function SignIn({ pro }) {
  const { loginWithRedirect } = useAuth0()
  const go = (signup) => loginWithRedirect({
    appState: { returnTo: pro ? '/vendre/pro' : '/vendre/boutique' },
    authorizationParams: signup ? { screen_hint: 'signup' } : undefined,
  })
  return (
    <div className="mk-section-card mk-onb-card mk-onb-auth">
      <h2>{pro ? 'Créez votre compte pro' : 'Créez votre compte commerçant'}</h2>
      <p className="mk-muted">
        {pro
          ? 'Un compte gratuit pour présenter votre savoir-faire, recevoir des demandes de clients et être payé. Ensuite, cinq étapes rapides.'
          : 'Un compte gratuit pour gérer votre établissement, vos offres, vos ventes et vos paiements. Ensuite, quatre étapes rapides.'}
      </p>
      <div className="mk-sent-actions">
        <Button onClick={() => go(true)}>Créer mon compte</Button>
        <Button variant="secondary" onClick={() => go(false)}>J’ai déjà un compte</Button>
      </div>
    </div>
  )
}

export default function OnboardingPage({ pro = false }) {
  const { isAuthenticated, isLoading } = useAuth0()
  const title = pro ? 'Créer mon profil pro' : 'Ouvrir mon établissement'
  useEffect(() => { document.title = `${title} · Tindisa` }, [title])
  return (
    <div className="mk-container mk-onb">
      <h1>{title}</h1>
      {!isAuth0Configured ? (
        <p className="mk-muted">L’inscription en ligne est momentanément indisponible : écrivez à l’assistant sur WhatsApp ou Telegram.</p>
      ) : isLoading ? <Spinner /> : isAuthenticated ? <Wizard proRoute={pro} /> : <SignIn pro={pro} />}
    </div>
  )
}
