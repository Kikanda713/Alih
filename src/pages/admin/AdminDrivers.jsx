import { useEffect, useState, useCallback } from 'react'
import { FaMotorcycle, FaPlus, FaEdit, FaTrash, FaImage, FaSpinner, FaIdCard, FaChartLine, FaToggleOn, FaToggleOff, FaCamera, FaTruck, FaUserCircle } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useToast } from '../../components/Toast.jsx'
import { Card, Button, Badge, Spinner, EmptyState, Field, Input, Select, Textarea, Modal, ConfirmModal, ActionMenu } from '../../components/ui.jsx'
import { usePaged, Pagination } from '../../components/Pagination.jsx'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'

const VEHICLES = [
  { id: 'velo', label: 'Vélo' },
  { id: 'moto', label: 'Moto' },
  { id: 'moto_tricycle', label: 'Moto-tricycle' },
  { id: 'camionnette', label: 'Camionnette' },
  { id: 'bus', label: 'Bus' },
  { id: 'voiture', label: 'Voiture' },
  { id: 'pied', label: 'À pied' },
]
const SEX = [{ id: 'M', label: 'Masculin' }, { id: 'F', label: 'Féminin' }]
const vehLabel = (v) => VEHICLES.find((x) => x.id === v)?.label || v || '—'

const EMPTY = {
  name: '', phone: '', sex: '', idNumber: '', vehicleType: '', active: true,
  photoUrl: '', vehiclePhotoUrl: '', matricule: '',
  costPerKmMin: '', costPerKmMax: '', capacityKg: '',
  city: '', commune: '', quartier: '', avenue: '', parcelle: '', landmark: '',
  emergencyName: '', emergencyPhone: '', idCardUrl: '', residenceProofUrl: '', notes: '',
}
// Date lisible (fr) — suivi de fraîcheur des profils.
const fmtDate = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
// Capacité par défaut (kg) selon le moyen — repère affiché dans le form.
const CAP_DEFAULT = { pied: 10, velo: 15, moto: 50, voiture: 200, moto_tricycle: 300, bus: 500, camionnette: 1000 }

function DocUpload({ label, url, onChange }) {
  const { notify } = useToast()
  const [busy, setBusy] = useState(false)
  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setBusy(true)
    try { onChange(await uploadImage(f)) } catch (err) { notify(err?.message || 'Échec upload', 'error') } finally { setBusy(false); e.target.value = '' }
  }
  return (
    <div className="driver-doc">
      <span className="driver-doc-label"><FaIdCard /> {label}</span>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="driver-doc-view">Voir</a>}
      <label className="driver-doc-btn">
        {busy ? <FaSpinner className="spin" /> : <FaImage />} {url ? 'Remplacer' : 'Importer'}
        <input type="file" accept="image/*,.pdf" hidden disabled={busy || !isCloudinaryConfigured} onChange={onFile} />
      </label>
    </div>
  )
}

// Photo avec aperçu (livreur / véhicule).
function PhotoUpload({ label, icon, url, onChange }) {
  const { notify } = useToast()
  const [busy, setBusy] = useState(false)
  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setBusy(true)
    try { onChange(await uploadImage(f)) } catch (err) { notify(err?.message || 'Échec upload', 'error') } finally { setBusy(false); e.target.value = '' }
  }
  return (
    <div className="driver-photo">
      <div className="driver-photo-preview">
        {url ? <img src={url} alt="" /> : <span className="driver-photo-ph">{icon}</span>}
      </div>
      <div className="driver-photo-body">
        <span className="driver-photo-label">{label}</span>
        <label className="driver-doc-btn">
          {busy ? <FaSpinner className="spin" /> : <FaCamera />} {url ? 'Remplacer' : 'Ajouter'}
          <input type="file" accept="image/*" hidden disabled={busy || !isCloudinaryConfigured} onChange={onFile} />
        </label>
        {url && <button type="button" className="driver-photo-clear" onClick={() => onChange('')}>Retirer</button>}
      </div>
    </div>
  )
}

function DriverForm({ open, driver, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) setForm(driver ? { ...EMPTY, ...driver } : EMPTY) }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }))
  const num = (v) => (v === '' || v == null ? undefined : Number(v))
  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    // Coercition des champs numériques (le DTO backend attend des nombres).
    const payload = { ...form, costPerKmMin: num(form.costPerKmMin), costPerKmMax: num(form.costPerKmMax), capacityKg: num(form.capacityKg) }
    try { await onSave(payload) } finally { setSaving(false) }
  }
  return (
    <Modal open={open} title={driver ? 'Modifier le livreur' : 'Ajouter un livreur'} onClose={saving ? undefined : onClose}>
      <div className="product-form">
        {/* Matricule Tindisa + suivi de fraîcheur (édition) */}
        {driver && (
          <div className="driver-meta">
            <span className="driver-mat">{driver.matricule || 'Matricule à l\'enregistrement'}</span>
            <span className="driver-upd">Mis à jour : {fmtDate(driver.updatedAt)}</span>
          </div>
        )}

        <div className="driver-section">Identité</div>
        <PhotoUpload label="Photo du livreur" icon={<FaUserCircle />} url={form.photoUrl} onChange={(u) => setForm((f) => ({ ...f, photoUrl: u }))} />
        <div className="form-row">
          <Field label="Nom complet"><Input value={form.name} onChange={set('name')} autoFocus /></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={set('phone')} placeholder="+243…" /></Field>
        </div>
        <div className="form-row">
          <Field label="Sexe"><Select value={form.sex} onChange={set('sex')} options={SEX} placeholder="Choisir…" /></Field>
          <Field label="N° pièce d'identité"><Input value={form.idNumber} onChange={set('idNumber')} /></Field>
        </div>
        <Field label="Moyen de livraison"><Select value={form.vehicleType} onChange={set('vehicleType')} options={VEHICLES} placeholder="Choisir…" /></Field>
        <PhotoUpload label="Photo du véhicule" icon={<FaTruck />} url={form.vehiclePhotoUrl} onChange={(u) => setForm((f) => ({ ...f, vehiclePhotoUrl: u }))} />

        <div className="driver-section">Tarification & capacité</div>
        <div className="form-row">
          <Field label="Prix/km min (CDF)"><Input type="number" min="0" value={form.costPerKmMin} onChange={set('costPerKmMin')} placeholder="0" /></Field>
          <Field label="Prix/km max (CDF)"><Input type="number" min="0" value={form.costPerKmMax} onChange={set('costPerKmMax')} placeholder="0" /></Field>
        </div>
        <Field label="Capacité de charge (kg)" hint={form.vehicleType && CAP_DEFAULT[form.vehicleType] ? `Défaut ${form.vehicleType} : ${CAP_DEFAULT[form.vehicleType]} kg si laissé vide` : 'Laisser vide = défaut selon le véhicule'}>
          <Input type="number" min="0" value={form.capacityKg} onChange={set('capacityKg')} placeholder={form.vehicleType && CAP_DEFAULT[form.vehicleType] ? String(CAP_DEFAULT[form.vehicleType]) : '0'} />
        </Field>

        <div className="driver-section">Adresse physique</div>
        <div className="form-row">
          <Field label="Ville"><Input value={form.city} onChange={set('city')} /></Field>
          <Field label="Commune"><Input value={form.commune} onChange={set('commune')} /></Field>
        </div>
        <div className="form-row">
          <Field label="Quartier"><Input value={form.quartier} onChange={set('quartier')} /></Field>
          <Field label="Avenue"><Input value={form.avenue} onChange={set('avenue')} /></Field>
        </div>
        <div className="form-row">
          <Field label="N° parcelle"><Input value={form.parcelle} onChange={set('parcelle')} /></Field>
          <Field label="Repère local"><Input value={form.landmark} onChange={set('landmark')} placeholder="ex : près du marché" /></Field>
        </div>

        <div className="driver-section">Personne à contacter</div>
        <div className="form-row">
          <Field label="Nom"><Input value={form.emergencyName} onChange={set('emergencyName')} /></Field>
          <Field label="Téléphone"><Input value={form.emergencyPhone} onChange={set('emergencyPhone')} /></Field>
        </div>

        <div className="driver-section">Documents</div>
        <DocUpload label="Carte d'identité" url={form.idCardUrl} onChange={(u) => setForm((f) => ({ ...f, idCardUrl: u }))} />
        <DocUpload label="Attestation résidence / bail" url={form.residenceProofUrl} onChange={(u) => setForm((f) => ({ ...f, residenceProofUrl: u }))} />

        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={set('notes')} /></Field>

        <div className="ui-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button variant="primary" onClick={save} disabled={saving || !form.name.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminDrivers() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [loading, setLoading] = useState(true)
  const [drivers, setDrivers] = useState([])
  const [modal, setModal] = useState({ open: false, driver: null })
  const [confirm, setConfirm] = useState({ open: false, driver: null, busy: false })
  const [perf, setPerf] = useState({ open: false, driver: null, loading: false, data: null })
  const { pageItems, page, setPage, totalPages, count } = usePaged(drivers, 10)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/v1/admin/drivers'); setDrivers(r?.drivers || []) }
    catch { setDrivers([]) } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])

  const save = async (form) => {
    try {
      if (modal.driver) await api.put(`/v1/admin/drivers/${modal.driver.id}`, form)
      else await api.post('/v1/admin/drivers', form)
      notify('Livreur enregistré', 'success'); setModal({ open: false, driver: null }); await load()
    } catch (e) { notify(e?.message || 'Erreur', 'error') }
  }
  const doDelete = async () => {
    setConfirm((c) => ({ ...c, busy: true }))
    try { await api.del(`/v1/admin/drivers/${confirm.driver.id}`); notify('Livreur supprimé', 'success'); setConfirm({ open: false, driver: null, busy: false }); await load() }
    catch (e) { notify(e?.message || 'Erreur', 'error'); setConfirm((c) => ({ ...c, busy: false })) }
  }
  const toggleActive = async (d) => {
    try { await api.put(`/v1/admin/drivers/${d.id}`, { active: !d.active }); notify(d.active ? 'Livreur désactivé' : 'Livreur activé', 'success'); await load() }
    catch (e) { notify(e?.message || 'Erreur', 'error') }
  }
  const openPerf = async (d) => {
    setPerf({ open: true, driver: d, loading: true, data: null })
    try { const data = await api.get(`/v1/admin/drivers/${d.id}/performance`); setPerf((p) => ({ ...p, loading: false, data })) }
    catch { setPerf((p) => ({ ...p, loading: false, data: null })) }
  }

  return (
    <div className="dash-page">
      <header className="dash-page-head cat-head">
        <div><h1 className="dash-h1">Livreurs</h1><p className="dash-sub">Fiches confidentielles (back-office) : identité, adresse, documents.</p></div>
        <Button variant="primary" onClick={() => setModal({ open: true, driver: null })}><FaPlus /> Ajouter un livreur</Button>
      </header>

      {loading ? <Spinner label="Chargement…" /> : drivers.length === 0 ? (
        <EmptyState icon={<FaMotorcycle />} title="Aucun livreur" text="Ajoutez vos livreurs pour leur confier des missions." />
      ) : (
        <>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead><tr><th>Livreur</th><th>Moyen</th><th>Contact</th><th>Localisation</th><th>Mis à jour</th><th>Statut</th><th className="cat-col-actions">Actions</th></tr></thead>
              <tbody>
                {pageItems.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="driver-cell">
                        <span className="driver-avatar">{d.photoUrl ? <img src={d.photoUrl} alt="" /> : <FaUserCircle />}</span>
                        <span className="driver-cell-txt">
                          <span className="cat-pname">{d.name}</span>
                          <span className="cat-sku">{d.matricule || '—'}</span>
                        </span>
                      </div>
                    </td>
                    <td><span className="driver-veh"><FaMotorcycle /> {vehLabel(d.vehicleType)}</span></td>
                    <td><span className="cat-sku">{d.phone || '—'}</span></td>
                    <td><span className="cat-sku">{[d.commune, d.city].filter(Boolean).join(', ') || '—'}</span></td>
                    <td><span className="cat-sku">{fmtDate(d.updatedAt)}</span></td>
                    <td><Badge tone={d.active ? 'success' : 'neutral'}>{d.active ? 'Actif' : 'Inactif'}</Badge></td>
                    <td className="cat-col-actions">
                      <ActionMenu items={[
                        { label: 'Modifier', icon: <FaEdit />, onClick: () => setModal({ open: true, driver: d }) },
                        { label: 'Performances', icon: <FaChartLine />, onClick: () => openPerf(d) },
                        { label: d.active ? 'Désactiver' : 'Activer', icon: d.active ? <FaToggleOff /> : <FaToggleOn />, onClick: () => toggleActive(d) },
                        { label: 'Supprimer', icon: <FaTrash />, danger: true, onClick: () => setConfirm({ open: true, driver: d, busy: false }) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
        </>
      )}

      <DriverForm open={modal.open} driver={modal.driver} onClose={() => setModal({ open: false, driver: null })} onSave={save} />
      <ConfirmModal open={confirm.open} danger busy={confirm.busy} title="Supprimer le livreur"
        message={confirm.driver ? `Supprimer ${confirm.driver.name} ?` : ''} confirmLabel="Supprimer" cancelLabel="Annuler"
        onConfirm={doDelete} onClose={() => setConfirm({ open: false, driver: null, busy: false })} />

      <Modal open={perf.open} title={perf.driver ? `Performances — ${perf.driver.name}` : 'Performances'} onClose={() => setPerf({ open: false, driver: null, loading: false, data: null })}>
        {perf.loading ? <Spinner label="Chargement…" /> : !perf.data ? (
          <p className="dash-sub">Aucune donnée de livraison pour ce livreur.</p>
        ) : (
          <div className="perf-body">
            <div className="perf-grid">
              <div className="perf-card"><span className="perf-val">{perf.data.total}</span><span className="perf-lbl">Missions</span></div>
              <div className="perf-card"><span className="perf-val">{perf.data.completed}</span><span className="perf-lbl">Livrées</span></div>
              <div className="perf-card"><span className="perf-val">{perf.data.inTransit}</span><span className="perf-lbl">En cours</span></div>
              <div className="perf-card"><span className="perf-val">{perf.data.cancelled}</span><span className="perf-lbl">Annulées</span></div>
              <div className="perf-card"><span className="perf-val">{perf.data.completionRate}%</span><span className="perf-lbl">Taux réussite</span></div>
              <div className="perf-card"><span className="perf-val">{(perf.data.revenue || 0).toLocaleString('fr-FR')}</span><span className="perf-lbl">CA {perf.data.currency}</span></div>
            </div>
            {perf.data.recent?.length > 0 && (
              <div className="perf-recent">
                <p className="perf-recent-title">Missions récentes</p>
                {perf.data.recent.map((r) => (
                  <div className="perf-recent-row" key={r.id}>
                    <span className="perf-recent-dest">{r.destination || '—'}</span>
                    <Badge tone={r.status === 'CONFIRMED' || r.status === 'DELIVERED' ? 'success' : r.status === 'CANCELLED' ? 'danger' : 'neutral'}>{r.status}</Badge>
                    <span className="perf-recent-cost">{(r.cost || 0).toLocaleString('fr-FR')} {perf.data.currency}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
