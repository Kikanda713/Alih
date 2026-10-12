import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { FaStore, FaMapMarkerAlt, FaPhoneAlt, FaShareAlt, FaCheckCircle, FaImage, FaSpinner, FaWhatsapp, FaChevronDown } from 'react-icons/fa'
import { Button, Field, Input, Select, Spinner, Textarea } from '../../components/ui'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { useTaxonomy } from '../../api/taxonomy'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { isAuth0Configured } from '../../auth/config'
import { whatsappLink } from '../lib/chat'
import SocialLinksForm from '../components/SocialLinksForm'

/*
 * Onboarding commerçant : création du compte puis de la boutique, étape par
 * étape (chaque étape est enregistrée : on peut s'arrêter et reprendre).
 * Les données vont aux routes existantes du commerçant (PUT /v1/merchant/shop,
 * upsert ; PUT /v1/merchant/shop/socials).
 */

const STEPS = [
  { id: 'shop', label: 'Boutique', icon: FaStore },
  { id: 'place', label: 'Adresse', icon: FaMapMarkerAlt },
  { id: 'contact', label: 'Contact', icon: FaPhoneAlt },
  { id: 'socials', label: 'Réseaux', icon: FaShareAlt },
]

function Stepper({ step }) {
  return (
    <ol className="mk-onb-steps" aria-label="Étapes">
      {STEPS.map((s, i) => (
        <li key={s.id} className={i < step ? 'done' : i === step ? 'current' : ''}>
          <span>{i < step ? <FaCheckCircle /> : <s.icon />}</span> {s.label}
        </li>
      ))}
    </ol>
  )
}

function Wizard() {
  const api = useTindisaApi()
  const taxonomy = useTaxonomy()
  const shopQ = useLoad(() => api.get('/v1/merchant/shop').then((r) => r?.shop || null), [])
  const socialsQ = useLoad(() => api.get('/v1/merchant/shop/socials').catch(() => ({})), [])
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showLegal, setShowLegal] = useState(false)
  const fileRef = useRef(null)

  // Formulaire initialisé une fois la boutique chargée (reprise d'un onboarding entamé).
  const shop = shopQ.data
  if (form === null && !shopQ.loading) {
    setForm({
      name: shop?.name && shop.name !== 'Ma boutique' ? shop.name : '', shopType: shop?.shopType || '',
      description: shop?.description || '', logoUrl: shop?.logoUrl || '', city: shop?.city || '',
      commune: shop?.commune || '', quartier: shop?.quartier || '', landmark: shop?.landmark || '',
      address: shop?.address || '', phone: shop?.phone || '', email: shop?.email || '',
      rccm: shop?.rccm || '', nif: shop?.nif || '', idNat: shop?.idNat || '',
    })
  }
  useEffect(() => { window.scrollTo({ top: 0 }) }, [step])

  if (!form) return <Spinner label="Chargement…" />
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const REQUIRED = { 0: ['name', 'shopType'], 1: ['city'], 2: ['phone'] }
  const FIELDS = {
    0: ['name', 'shopType', 'description', 'logoUrl'],
    1: ['city', 'commune', 'quartier', 'landmark', 'address'],
    2: ['phone', 'email', 'rccm', 'nif', 'idNat'],
  }
  const saveStep = async () => {
    const missing = (REQUIRED[step] || []).filter((k) => !String(form[k] || '').trim())
    if (missing.length) return setError('Complétez les champs marqués d’un astérisque.')
    if (step === 2 && !/^\+?[\d\s]{8,16}$/.test(form.phone.trim())) return setError('Numéro de téléphone invalide (ex. +243 99 000 0000).')
    setSaving(true)
    setError('')
    try {
      const payload = Object.fromEntries(FIELDS[step].map((k) => [k, String(form[k] || '').trim()]))
      if (step === 1) payload.province = (taxonomy?.cities || []).find((c) => c.id === form.city)?.province || undefined
      const saved = await api.put('/v1/merchant/shop', payload)
      shopQ.setData(saved?.id ? saved : shop)
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
    try { const url = await uploadImage(file); setForm((f) => ({ ...f, logoUrl: url })) } catch { setError('Envoi du logo impossible') } finally { setUploading(false) }
  }

  if (step >= STEPS.length) {
    return (
      <div className="mk-onb-done">
        <span className="mk-sent-icon"><FaCheckCircle /></span>
        <h2>Votre boutique est prête</h2>
        <p className="mk-muted">Ajoutez vos produits ou services : ils apparaissent sur le marché et l’assistant les propose aux acheteurs.</p>
        <div className="mk-sent-actions">
          <Button as={Link} to="/dashboard/catalogue?new=1">Ajouter ma première offre</Button>
          {shopQ.data?.id && <Button as={Link} to={`/boutique/${shopQ.data.id}`} variant="secondary">Voir ma vitrine</Button>}
          <Button as="a" variant="ghost" href={whatsappLink('Bonjour Tindisa, je veux lier mon compte commerçant à ce numéro.')} target="_blank" rel="noopener noreferrer">
            <FaWhatsapp /> Vendre aussi par WhatsApp
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Stepper step={step} />
      <div className="mk-section-card mk-onb-card">
        {step === 0 && (
          <>
            <h2>Votre boutique</h2>
            <Field label="Nom de la boutique *"><Input value={form.name} onChange={set('name')} maxLength={80} placeholder="Ex. Quincaillerie Himbi" /></Field>
            <Field label="Type d’activité *">
              <Select value={form.shopType} onChange={set('shopType')} options={taxonomy?.shopTypes || []} placeholder="Choisir…" />
            </Field>
            <Field label="Présentation (facultatif)" hint="Ce que vous vendez, vos horaires, votre spécialité">
              <Textarea rows={3} value={form.description} onChange={set('description')} maxLength={600} />
            </Field>
            {isCloudinaryConfigured && (
              <div className="mk-onb-logo">
                <span className="mk-shop-logo mk-shop-logo-lg">{form.logoUrl ? <img src={form.logoUrl} alt="" /> : <FaStore />}</span>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
                <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <><FaSpinner className="spin" /> Envoi…</> : <><FaImage /> {form.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}</>}
                </Button>
              </div>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <h2>Où se trouve la boutique ?</h2>
            <Field label="Ville *">
              <Select value={form.city} onChange={set('city')} options={(taxonomy?.cities || []).map((c) => ({ id: c.id, label: c.name }))} placeholder="Choisir…" />
            </Field>
            <div className="mk-form-row">
              <Field label="Commune"><Input value={form.commune} onChange={set('commune')} maxLength={80} /></Field>
              <Field label="Quartier"><Input value={form.quartier} onChange={set('quartier')} maxLength={80} /></Field>
            </div>
            <Field label="Repère connu" hint="Église, marché, rond-point… aide les livreurs et les clients">
              <Input value={form.landmark} onChange={set('landmark')} maxLength={120} />
            </Field>
            <Field label="Adresse (facultatif)"><Input value={form.address} onChange={set('address')} maxLength={200} /></Field>
            <p className="mk-hint">La position exacte sur la carte se règle ensuite dans « Ma boutique ».</p>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Comment vous joindre ?</h2>
            <Field label="Téléphone de la boutique *" hint="Jamais affiché publiquement : l’assistant met en relation les acheteurs">
              <Input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="+243 99 000 0000" maxLength={20} />
            </Field>
            <Field label="E-mail (facultatif)"><Input type="email" value={form.email} onChange={set('email')} maxLength={120} /></Field>
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
        {step === 3 && (
          <>
            <h2>Vos réseaux sociaux</h2>
            <p className="mk-muted">Facultatif : vos publications TikTok, Facebook ou YouTube s’affichent sur votre vitrine.</p>
            {socialsQ.loading ? <Spinner /> : (
              <SocialLinksForm
                initial={socialsQ.data || {}}
                saveLabel="Terminer"
                secondary={<Button type="button" variant="ghost" onClick={() => setStep(STEPS.length)}>Passer</Button>}
                onSave={async (values) => { await api.put('/v1/merchant/shop/socials', values); setStep(STEPS.length) }}
              />
            )}
          </>
        )}
        {step < 3 && (
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

function SignIn() {
  const { loginWithRedirect } = useAuth0()
  const go = (signup) => loginWithRedirect({
    appState: { returnTo: '/vendre/boutique' },
    authorizationParams: signup ? { screen_hint: 'signup' } : undefined,
  })
  return (
    <div className="mk-section-card mk-onb-card mk-onb-auth">
      <h2>Créez votre compte commerçant</h2>
      <p className="mk-muted">Un compte gratuit pour gérer votre boutique, vos offres, vos ventes et vos paiements. Ensuite, quatre étapes rapides.</p>
      <div className="mk-sent-actions">
        <Button onClick={() => go(true)}>Créer mon compte</Button>
        <Button variant="secondary" onClick={() => go(false)}>J’ai déjà un compte</Button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const { isAuthenticated, isLoading } = useAuth0()
  useEffect(() => { document.title = 'Ouvrir ma boutique · Tindisa' }, [])
  return (
    <div className="mk-container mk-onb">
      <h1>Ouvrir ma boutique</h1>
      {!isAuth0Configured ? (
        <p className="mk-muted">L’inscription en ligne est momentanément indisponible : écrivez à l’assistant sur WhatsApp.</p>
      ) : isLoading ? <Spinner /> : isAuthenticated ? <Wizard /> : <SignIn />}
    </div>
  )
}
