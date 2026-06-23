import { useState } from 'react'
import { Modal, Field, Input, Textarea, Button } from '../../components/ui.jsx'
import { useT } from '../../i18n/index.jsx'

const empty = {
  name: '',
  sku: '',
  category: '',
  description: '',
  displayPrice: '',
  minPrice: '',
  quantity: '',
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
  }
}

export default function ProductFormModal({ open, product, onClose, onSave }) {
  const { t } = useT()
  const [form, setForm] = useState(toForm(product))
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  // Réinitialise le formulaire quand on (ré)ouvre avec un produit différent.
  const [lastId, setLastId] = useState(product?.id)
  if (open && product?.id !== lastId) {
    setLastId(product?.id)
    setForm(toForm(product))
    setErr('')
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const num = (v) => (v === '' || v == null ? undefined : Number(v))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setErr(t('form.nameRequired'))
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSave({
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
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
    <Modal
      open={open}
      title={product ? t('form.edit.title') : t('form.create.title')}
      onClose={saving ? undefined : onClose}
    >
      <form className="product-form" onSubmit={submit}>
        <Field label={t('form.name')} error={err && !form.name.trim() ? err : ''}>
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

        {err && form.name.trim() && <p className="form-error">{err}</p>}

        <div className="ui-modal-foot">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t('form.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t('form.saving') : t('form.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
