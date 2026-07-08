import { useState, useRef } from 'react'
import { FaImage, FaSpinner, FaTrash, FaPlus, FaBoxOpen, FaConciergeBell } from 'react-icons/fa'
import { Modal, Field, Input, Textarea, Select, Button } from '../../components/ui.jsx'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { useTaxonomy, categoriesByType, findCategory, attributesFor, unitsFor } from '../../api/taxonomy'
import { useT } from '../../i18n/index.jsx'

const empty = {
  type: 'product',
  name: '', sku: '', category: '', subcategory: '', condition: '', billingUnit: '',
  description: '', displayPrice: '', minPrice: '', quantity: '', currency: 'CDF',
  images: [], attributes: {},
}

function toForm(product) {
  if (!product) return { ...empty }
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : (product.imageUrl ? [product.imageUrl] : [])
  return {
    type: product.type || 'product',
    name: product.name || '',
    sku: product.sku || '',
    category: product.category || '',
    subcategory: product.subcategory || '',
    condition: product.condition || '',
    billingUnit: product.billingUnit || '',
    description: product.description || '',
    displayPrice: product.pricing?.displayPrice ?? '',
    minPrice: product.pricing?.minPrice ?? '',
    quantity: product.quantity ?? '',
    currency: product.pricing?.currency || product.currency || 'CDF',
    images,
    attributes: product.attributes || {},
  }
}

export default function ProductFormModal({ open, product, onClose, onSave }) {
  const { t } = useT()
  const taxonomy = useTaxonomy()
  const [form, setForm] = useState(toForm(product))
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  // Réinitialise le form à CHAQUE ouverture (transition fermé→ouvert). Sinon, en
  // "nouveau produit" (product = null, donc id toujours undefined), l'état restait
  // figé sur la saisie précédente. On resète aussi si le produit édité change.
  const [wasOpen, setWasOpen] = useState(false)
  const [lastId, setLastId] = useState(product?.id)
  if (open && (!wasOpen || product?.id !== lastId)) {
    setWasOpen(true)
    setLastId(product?.id)
    setForm(toForm(product))
    setErr('')
    setSaving(false)
    setUploading(false)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const isService = form.type === 'service'
  const maxImages = taxonomy?.maxImages || 4
  // Unité de vente (produits) ou de facturation (services) — le prix est PAR unité.
  // Les unités pertinentes à la catégorie choisie sont proposées en tête.
  const unitOptions = unitsFor(taxonomy, form.category, isService)
  const unitLabel = unitOptions.find((u) => u.id === form.billingUnit)?.label
  const priceHint = unitLabel ? `Prix ${unitLabel}` : 'Prix par unité'
  const cats = categoriesByType(taxonomy, form.type)
  const cat = findCategory(taxonomy, form.category)
  const subcats = cat?.subcategories || []
  const attrDefs = attributesFor(taxonomy, form.category, form.subcategory)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setAttr = (id) => (e) =>
    setForm((f) => ({ ...f, attributes: { ...f.attributes, [id]: e.target.value } }))
  // Accepte la VIRGULE comme séparateur décimal (usage FR/RDC : « 1500,50 ») et les
  // espaces de milliers. Un input type=number rejette la virgule → on saisit en texte.
  const num = (v) =>
    v === '' || v == null
      ? undefined
      : Number(String(v).replace(/\s/g, '').replace(',', '.'))

  // Changer de type réinitialise catégorie/sous-catégorie/état (cohérence).
  const setType = (type) => () =>
    setForm((f) => ({ ...f, type, category: '', subcategory: '', condition: '', billingUnit: '' }))
  const setCategory = (e) =>
    setForm((f) => ({ ...f, category: e.target.value, subcategory: '', attributes: {} }))

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm((f) => ({ ...f, images: [...f.images, url].slice(0, maxImages) }))
    } catch (e2) {
      setErr(e2?.message || t('merchant.error'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const removeImage = (i) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))

  const validate = () => {
    if (!form.name.trim()) return t('form.nameRequired')
    const d = num(form.displayPrice), m = num(form.minPrice), q = num(form.quantity)
    if ([d, m, q].some((v) => v != null && (Number.isNaN(v) || v < 0))) return t('form.invalidNumber')
    if (d != null && m != null && m > d) return t('form.floorTooHigh')
    return ''
  }

  const submit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) return setErr(v)
    setSaving(true); setErr('')
    // Nettoyer les attributs vides.
    const attributes = Object.fromEntries(
      Object.entries(form.attributes || {}).filter(([, val]) => val !== '' && val != null),
    )
    try {
      await onSave({
        type: form.type,
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        category: form.category || undefined,
        subcategory: form.subcategory || undefined,
        condition: !isService ? form.condition || undefined : undefined,
        // Unité (vente pour produit, facturation pour service) — prix par unité.
        billingUnit: form.billingUnit || undefined,
        description: form.description.trim() || undefined,
        images: form.images.length ? form.images : undefined,
        imageUrl: form.images[0] || undefined,
        displayPrice: num(form.displayPrice),
        minPrice: num(form.minPrice),
        currency: form.currency || undefined,
        quantity: num(form.quantity),
        attributes: Object.keys(attributes).length ? attributes : undefined,
      })
    } catch (e2) {
      setErr(e2?.message || t('merchant.error'))
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={product ? t('form.edit.title') : t('form.create.title')} onClose={saving ? undefined : onClose}>
      <form className="product-form" onSubmit={submit}>
        {/* Type : Produit / Service (segmenté, simple) */}
        <div className="seg-toggle">
          <button type="button" className={`seg-btn ${!isService ? 'active' : ''}`} onClick={setType('product')}><FaBoxOpen /> Produit</button>
          <button type="button" className={`seg-btn ${isService ? 'active' : ''}`} onClick={setType('service')}><FaConciergeBell /> Service</button>
        </div>

        {/* Photos (jusqu'à maxImages) */}
        <div className="product-images-grid">
          {form.images.map((url, i) => (
            <div className="product-image-thumb" key={url + i}>
              <img src={url} alt="" />
              <button type="button" className="thumb-remove" onClick={() => removeImage(i)} aria-label={t('form.imageRemove')}><FaTrash /></button>
            </div>
          ))}
          {form.images.length < maxImages && (
            <>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
              <button type="button" className="product-image-add" onClick={() => fileRef.current?.click()} disabled={uploading || !isCloudinaryConfigured} title={!isCloudinaryConfigured ? t('form.imageNoConfig') : ''}>
                {uploading ? <FaSpinner className="spin" /> : <><FaPlus /><FaImage /></>}
              </button>
            </>
          )}
        </div>
        <p className="ui-field-hint">{form.images.length}/{maxImages} photo(s)</p>

        <Field label={t('form.name')}>
          <Input value={form.name} onChange={set('name')} placeholder={isService ? 'Ex : Chambre Standard, Réparation écran…' : 'Ex : Samsung Galaxy A14'} autoFocus />
        </Field>

        <div className="form-row">
          <Field label="Catégorie">
            <Select value={form.category} onChange={setCategory} options={cats} placeholder="Choisir…" />
          </Field>
          <Field label="Sous-catégorie">
            <Select value={form.subcategory} onChange={set('subcategory')} options={subcats} placeholder={subcats.length ? 'Choisir…' : 'Choisir une catégorie d’abord'} disabled={!subcats.length} />
          </Field>
        </div>

        {!isService ? (
          <div className="form-row">
            <Field label="État">
              <Select value={form.condition} onChange={set('condition')} options={taxonomy?.conditions || []} placeholder="Choisir…" />
            </Field>
            <Field label="Unité de vente" hint="Le prix est PAR unité">
              <Select value={form.billingUnit} onChange={set('billingUnit')} options={unitOptions} placeholder="à la pièce…" />
            </Field>
          </div>
        ) : (
          <Field label="Facturation">
            <Select value={form.billingUnit} onChange={set('billingUnit')} options={unitOptions} placeholder="Choisir…" />
          </Field>
        )}

        <Field label={t('form.description')}>
          <Textarea value={form.description} onChange={set('description')} rows={2} />
        </Field>

        <Field label="Devise" hint="Franc congolais (FC) ou Dollar US ($)">
          <Select value={form.currency} onChange={set('currency')} options={taxonomy?.currencies || [{ id: 'CDF', label: 'Franc congolais (FC)' }, { id: 'USD', label: 'Dollar US ($)' }]} />
        </Field>

        <div className="form-row">
          <Field label={t('form.displayPrice')} hint={priceHint}>
            <Input type="text" inputMode="decimal" value={form.displayPrice} onChange={set('displayPrice')} placeholder="0" />
          </Field>
          <Field label={t('form.minPrice')} hint={t('form.minPriceHint')}>
            <Input type="text" inputMode="decimal" value={form.minPrice} onChange={set('minPrice')} placeholder="0" />
          </Field>
        </div>

        {!isService && (
          <Field label={t('form.quantity')} hint={unitLabel ? `Nombre d'unités en stock (${unitLabel.replace(/^(à la|au|à l')\s*/, '')})` : "Nombre d'unités en stock"}>
            <Input type="text" inputMode="decimal" value={form.quantity} onChange={set('quantity')} placeholder="0" />
          </Field>
        )}

        {/* Caractéristiques dynamiques (selon catégorie) — optionnelles */}
        {attrDefs.length > 0 && (
          <div className="product-attrs">
            <p className="product-attrs-title">Caractéristiques (facultatif)</p>
            <div className="form-row form-row-wrap">
              {attrDefs.map((a) => (
                <Field key={a.id} label={a.unit ? `${a.label} (${a.unit})` : a.label}>
                  {a.type === 'select' ? (
                    <Select value={form.attributes[a.id] || ''} onChange={setAttr(a.id)} options={a.options || []} placeholder="—" />
                  ) : (
                    <Input type={a.type === 'number' ? 'number' : 'text'} value={form.attributes[a.id] || ''} onChange={setAttr(a.id)} />
                  )}
                </Field>
              ))}
            </div>
          </div>
        )}

        {err && <p className="form-error">{err}</p>}

        <div className="ui-modal-foot">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>{t('form.cancel')}</Button>
          <Button type="submit" variant="primary" disabled={saving || uploading}>
            {saving ? t('form.saving') : t('form.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
