import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { FaStore, FaMotorcycle, FaMapMarkerAlt, FaPlus, FaCrosshairs } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useToast } from '../../components/Toast.jsx'
import { Spinner, Button, Modal, Field, Input, Select, Textarea, ConfirmModal } from '../../components/ui.jsx'

const MapCanvas = lazy(() => import('./MapCanvas.jsx'))

// Kinshasa par défaut ; la carte reste centrée RDC.
const CENTER = [-4.325, 15.322]
const ZOOM = 11
const KINDS = [
  { id: 'marche', label: 'Marché' }, { id: 'eglise', label: 'Église' },
  { id: 'rond_point', label: 'Rond-point' }, { id: 'arret', label: 'Arrêt / station' },
  { id: 'ecole', label: 'École' }, { id: 'hopital', label: 'Hôpital' },
  { id: 'station', label: 'Station-service' }, { id: 'autre', label: 'Autre' },
]
const EMPTY_LM = { name: '', kind: '', city: '', commune: '', quartier: '', notes: '', gpsLat: '', gpsLng: '' }

export default function AdminMap() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ shops: [], drivers: [], landmarks: [] })
  const [layers, setLayers] = useState({ shops: true, drivers: true, landmarks: true })
  const [addMode, setAddMode] = useState(false)
  const [form, setForm] = useState(null) // null = fermé ; objet = édition/ajout
  const [confirm, setConfirm] = useState({ open: false, lm: null, busy: false })

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/v1/admin/map'); setData({ shops: r?.shops || [], drivers: r?.drivers || [], landmarks: r?.landmarks || [] }) }
    catch { /* garde l'état */ } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])

  const onMapClick = ({ lat, lng }) => {
    if (!addMode) return
    setForm({ ...EMPTY_LM, gpsLat: lat.toFixed(6), gpsLng: lng.toFixed(6) })
    setAddMode(false)
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }))

  const save = async () => {
    if (!form.name.trim() || form.gpsLat === '' || form.gpsLng === '') return
    const payload = { ...form, gpsLat: Number(form.gpsLat), gpsLng: Number(form.gpsLng) }
    try {
      if (form.id) await api.put(`/v1/admin/landmarks/${form.id}`, payload)
      else await api.post('/v1/admin/landmarks', payload)
      notify('Repère enregistré', 'success'); setForm(null); await load()
    } catch (e) { notify(e?.message || 'Erreur', 'error') }
  }
  const doDelete = async () => {
    setConfirm((c) => ({ ...c, busy: true }))
    try { await api.del(`/v1/admin/landmarks/${confirm.lm.id}`); notify('Repère supprimé', 'success'); setConfirm({ open: false, lm: null, busy: false }); await load() }
    catch (e) { notify(e?.message || 'Erreur', 'error'); setConfirm((c) => ({ ...c, busy: false })) }
  }

  const geolocated = { shops: data.shops.filter((s) => s.gpsLat != null).length, drivers: data.drivers.filter((d) => d.gpsLat != null).length }

  return (
    <div className="dash-page admin-map-page">
      <header className="dash-page-head cat-head">
        <div><h1 className="dash-h1">Carte</h1><p className="dash-sub">Boutiques, livreurs et repères locaux. Le repérage GPS + adresse locale guide les livraisons.</p></div>
        <Button variant={addMode ? 'primary' : 'ghost'} onClick={() => setAddMode((v) => !v)}>
          {addMode ? <><FaCrosshairs /> Cliquez sur la carte…</> : <><FaPlus /> Ajouter un repère</>}
        </Button>
      </header>

      {loading ? <Spinner label="Chargement de la carte…" /> : (
        <div className="admin-map-wrap">
          <Suspense fallback={<Spinner label="Chargement de la carte…" />}>
            <MapCanvas
              center={CENTER} zoom={ZOOM} layers={layers}
              shops={data.shops} drivers={data.drivers} landmarks={data.landmarks}
              onMapClick={onMapClick}
              onEditLandmark={(l) => setForm({ ...EMPTY_LM, ...l, gpsLat: String(l.gpsLat), gpsLng: String(l.gpsLng) })}
              onDeleteLandmark={(l) => setConfirm({ open: true, lm: l, busy: false })}
            />
          </Suspense>

          {/* Widget discret : couches + légende */}
          <div className="map-widget">
            <label className="map-layer"><input type="checkbox" checked={layers.shops} onChange={(e) => setLayers((l) => ({ ...l, shops: e.target.checked }))} /><span className="map-dot" style={{ background: '#2563eb' }} /><FaStore /> Boutiques <em>{geolocated.shops}</em></label>
            <label className="map-layer"><input type="checkbox" checked={layers.drivers} onChange={(e) => setLayers((l) => ({ ...l, drivers: e.target.checked }))} /><span className="map-dot" style={{ background: '#16a34a' }} /><FaMotorcycle /> Livreurs <em>{geolocated.drivers}</em></label>
            <label className="map-layer"><input type="checkbox" checked={layers.landmarks} onChange={(e) => setLayers((l) => ({ ...l, landmarks: e.target.checked }))} /><span className="map-dot" style={{ background: '#ea580c' }} /><FaMapMarkerAlt /> Repères <em>{data.landmarks.length}</em></label>
          </div>
        </div>
      )}

      <Modal open={!!form} title={form?.id ? 'Modifier le repère' : 'Nouveau repère local'} onClose={() => setForm(null)}>
        {form && (
          <div className="product-form">
            <Field label="Nom du repère"><Input value={form.name} onChange={set('name')} placeholder="ex : Marché de la Liberté" autoFocus /></Field>
            <div className="form-row">
              <Field label="Type"><Select value={form.kind} onChange={set('kind')} options={KINDS} placeholder="Choisir…" /></Field>
              <Field label="Ville"><Input value={form.city} onChange={set('city')} /></Field>
            </div>
            <div className="form-row">
              <Field label="Commune"><Input value={form.commune} onChange={set('commune')} /></Field>
              <Field label="Quartier"><Input value={form.quartier} onChange={set('quartier')} /></Field>
            </div>
            <div className="form-row">
              <Field label="Latitude"><Input value={form.gpsLat} onChange={set('gpsLat')} /></Field>
              <Field label="Longitude"><Input value={form.gpsLng} onChange={set('gpsLng')} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={set('notes')} /></Field>
            <div className="ui-modal-foot">
              <Button variant="ghost" onClick={() => setForm(null)}>Annuler</Button>
              <Button variant="primary" onClick={save} disabled={!form.name.trim() || form.gpsLat === '' || form.gpsLng === ''}>Enregistrer</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={confirm.open} danger busy={confirm.busy} title="Supprimer le repère"
        message={confirm.lm ? `Supprimer « ${confirm.lm.name} » ?` : ''} confirmLabel="Supprimer" cancelLabel="Annuler"
        onConfirm={doDelete} onClose={() => setConfirm({ open: false, lm: null, busy: false })} />
    </div>
  )
}
