import { useState, useRef } from 'react'
import { FaImage, FaSpinner, FaTrash } from 'react-icons/fa'
import { Modal, Field, Input, Textarea, Button } from '../../components/ui.jsx'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { useT } from '../../i18n/index.jsx'

const empty = {
  name: '', sku: '', category: '', description: '',
  displayPrice: '', minPrice: '', quantity: '', imageUrl: '',
}

function toForm(product) {
  if (!product) return { ...empty }
  return {
    name: product.name || '',
    sku: product.sku || '',
    category: product.category || '',
    description: product.description || '',
    displayPrice: product.pricing?.displayPrice ?? '',
    minPrice: product.pricing?.minPrice ?? '',
    quantity: product.quantity ?? '',
    imageUrl: product.imageUrl || '',
  }
}

export default function ProductFormModal({ open, product, onClose, onSave }) {
  const { t } = useT()
  const [form, setForm] = useState(toForm(product))
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const [lastId, setLastId] = useState(product?.id)
  if (open && product?.id !== lastId) {
    setLastId(product?.id)
    setForm(toForm(product))
    setErr('')
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const num = (v) => (v === '' || v == null ? undefined : Number(v))

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErr('')
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm((f) => ({ ...f, imageUrl: url }))
    } catch (e2) {
      setErr(e2?.message || t('merchant.error'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const validate = () => {
    if (!form.name.trim()) return t('form.nameRequired')
    const d = num(form.displayPrice)
    const m = num(form.minPrice)
    const q = num(form.quantity)
    if ([d, m, q].some((v) => v != null && (Number.isNaN(v) || v < 0))) return t('form.invalidNumber')
    if (d != null && m != null && m > d) return t('form.floorTooHigh')
    return ''
  }

  const submit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) return setErr(v)
    setSaving(true)
    setErr('')
    try {
      await onSave({
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl || undefined,
        displayPrice: num(form.displayPrice),
        minPrice: num(form.minPrice),
        quantity: num(form.quantity),
      })
    } catch (e2) {
      setErr(e2?.message || t('merchant.error'))
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={product ? t('form.edit.title') : t('form.create.title')} onClose={saving ? undefined : onClose}>
      <form className="product-form" onSubmit={submit}>
        {/* Image */}
        <div className="product-image-field">
          <div className="product-image-preview">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" />
            ) : (
              <span className="product-image-placeholder"><FaImage /></span>
            )}
          </div>
          <div className="product-image-actions">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !isCloudinaryConfigured}
              title={!isCloudinaryConfigured ? t('form.imageNoConfig') : ''}
            >
              {uploading ? <><FaSpinner className="spin" /> {t('form.imageUploading')}</> : <><FaImage /> {t('form.imageUpload')}</>}
            </Button>
            {form.imageUrl && (
              <button type="button" className="cat-icon-btn danger" onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))} aria-label={t('form.imageRemove')}>
                <FaTrash />
              </button>
            )}
          </div>
        </div>

        <Field label={t('form.name')}>
          <Input value={form.name} onChange={set('name')} placeholder="Ex : Samsung Galaxy A14" autoFocus />
        </Field>

        <div className="form-row">
          <Field label={t('form.category')}>
            <Input value={form.category} onChange={set('category')} placeholder="Ex : téléphone" />
          </Field>
          <Field label={t('form.sku')} hint={t('form.skuHint')}>
            <Input value={form.sku} onChange={set('sku')} placeholder="SKU-001" />
          </Field>
        </div>

        <Field label={t('form.description')}>
          <Textarea value={form.description} onChange={set('description')} rows={2} />
        </Field>

        <div className="form-row">
          <Field label={t('form.displayPrice')}>
            <Input type="number" min="0" value={form.displayPrice} onChange={set('displayPrice')} placeholder="0" />
          </Field>
          <Field label={t('form.minPrice')} hint={t('form.minPriceHint')}>
            <Input type="number" min="0" value={form.minPrice} onChange={set('minPrice')} placeholder="0" />
          </Field>
        </div>

        <Field label={t('form.quantity')}>
          <Input type="number" min="0" value={form.quantity} onChange={set('quantity')} placeholder="0" />
        </Field>

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
