import { Suspense, lazy, useState } from 'react'
import { useLoad } from '../../api/useLoad'
import { Link } from 'react-router-dom'
import {
  FaWifi, FaPlus, FaEdit, FaTrash, FaStore, FaCity, FaSeedling, FaBroadcastTower, FaExternalLinkAlt,
  FaImage, FaSpinner, FaSearch, FaTimes,
} from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { uploadImage, isCloudinaryConfigured } from '../../api/cloudinary'
import { useToast } from '../../components/useToast'
import { Badge, Button, ConfirmModal, EmptyState, Field, Input, Modal, Select, Spinner, Textarea } from '../../components/ui.jsx'
import { StatGrid, StatCard } from '../../components/StatCard.jsx'
const LocationPicker = lazy(() => import('../../components/LocationPicker.jsx'))
import { useAdminView } from './adminView'
import { useTaxonomy } from '../../api/taxonomy'
import { HUB_KINDS, HUB_TYPES, WIFI_STATUSES, wifiInfo, hubTypeLabel } from '../../market/lib/hubs'

/*
 * Back-office des CENTRES (commerciaux / agricoles, urbains / ruraux) :
 *  - création et fiche du centre (localisation, photo, description) ;
 *  - SUIVI DU DÉPLOIEMENT Wi-Fi Starlink : statut, nœuds maillés, couverture,
 *    débit, date de mise en service (affichés publiquement sur /centres) ;
 *  - rattachement des boutiques au centre.
 * Admin de ville : tout est borné à sa ville côté serveur.
 */

const EMPTY = {
  name: '', kind: 'urban', hubType: 'centre_commercial', city: '', commune: '', address: '', description: '',
  photoUrl: '', gpsLat: null, gpsLng: null, wifiStatus: 'planned', wifiLiveAt: '', meshNodes: '', coverageM: '',
  bandwidthMbps: '', notes: '', active: true,
}
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function HubForm({ initial, lockedCity, onClose, onSaved }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const taxonomy = useTaxonomy()
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(initial || {}), city: initial?.city || lockedCity || '' }))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setForm((f) => ({ ...f, photoUrl: '' })); const url = await uploadImage(file); setForm((f) => ({ ...f, photoUrl: url })) }
    catch { notify('Échec du téléversement de la photo', 'error') }
    finally { setUploading(false) }
  }

  const save = async () => {
    if (!form.name.trim()) return notify('Le nom du centre est requis', 'error')
    setSaving(true)
    const body = {
      ...form,
      wifiLiveAt: form.wifiLiveAt || undefined,
      meshNodes: form.meshNodes === '' ? 0 : Number(form.meshNodes),
      coverageM: form.coverageM === '' ? null : Number(form.coverageM),
      bandwidthMbps: form.bandwidthMbps === '' ? null : Number(form.bandwidthMbps),
    }
    try {
      const saved = initial?.id ? await api.put(`/v1/admin/hubs/${initial.id}`, body) : await api.post('/v1/admin/hubs', body)
      notify(initial?.id ? 'Centre mis à jour' : 'Centre créé', 'success')
      onSaved(saved)
    } catch (e) {
      notify(e?.message || 'Erreur', 'error')
    } finally { setSaving(false) }
  }

  const cityOptions = (taxonomy?.cities || []).map((c) => ({ id: c.id, label: c.name }))
  return (
    <Modal open title={initial?.id ? `Modifier « ${initial.name} »` : 'Nouveau centre'} onClose={saving ? undefined : onClose}>
      <div className="admin-hub-form">
        <Field label="Nom du centre"><Input value={form.name} onChange={set('name')} placeholder="Ex. Galerie du Peuple, Coopérative de Rutshuru" /></Field>
        <div className="mk-form-row mk-form-row-3">
          <Field label="Zone"><Select value={form.kind} onChange={set('kind')} options={HUB_KINDS} /></Field>
          <Field label="Type"><Select value={form.hubType} onChange={set('hubType')} options={HUB_TYPES} /></Field>
          <Field label="Ville">
            <Select value={form.city} onChange={set('city')} options={cityOptions} placeholder="Choisir…" disabled={!!lockedCity} />
          </Field>
        </div>
        <div className="mk-form-row">
          <Field label="Commune / territoire"><Input value={form.commune || ''} onChange={set('commune')} /></Field>
          <Field label="Adresse / repère"><Input value={form.address || ''} onChange={set('address')} /></Field>
        </div>
        <Field label="Description publique"><Textarea rows={2} value={form.description || ''} onChange={set('description')} /></Field>

        <h4 className="admin-hub-h">Déploiement Wi-Fi Starlink</h4>
        <div className="mk-form-row mk-form-row-3">
          <Field label="Statut"><Select value={form.wifiStatus} onChange={set('wifiStatus')} options={WIFI_STATUSES} /></Field>
          <Field label="Mise en service"><Input type="date" value={form.wifiLiveAt ? String(form.wifiLiveAt).slice(0, 10) : ''} onChange={set('wifiLiveAt')} /></Field>
          <Field label="Nœuds maillés"><Input type="number" min="0" value={form.meshNodes ?? ''} onChange={set('meshNodes')} /></Field>
        </div>
        <div className="mk-form-row">
          <Field label="Couverture (m)"><Input type="number" min="0" value={form.coverageM ?? ''} onChange={set('coverageM')} /></Field>
          <Field label="Débit (Mb/s)"><Input type="number" min="0" value={form.bandwidthMbps ?? ''} onChange={set('bandwidthMbps')} /></Field>
        </div>
        <Field label="Notes internes (non publiques)"><Textarea rows={2} value={form.notes || ''} onChange={set('notes')} placeholder="Contact du site, matériel posé, incidents…" /></Field>

        <h4 className="admin-hub-h">Photo et position</h4>
        <div className="admin-hub-photo">
          {form.photoUrl ? <img src={form.photoUrl} alt="" /> : <span><FaImage /></span>}
          <label className={`ui-btn ui-btn-secondary ui-btn-sm${!isCloudinaryConfigured ? ' disabled' : ''}`}>
            {uploading ? <><FaSpinner className="spin" /> Téléversement…</> : <><FaImage /> Photo</>}
            <input type="file" accept="image/*" hidden onChange={onPhoto} disabled={uploading || !isCloudinaryConfigured} />
          </label>
        </div>
        <Suspense fallback={<Spinner label="Carte…" />}>
        <LocationPicker lat={form.gpsLat} lng={form.gpsLng}
          onChange={({ lat, lng }) => setForm((f) => ({ ...f, gpsLat: lat, gpsLng: lng }))} />
        </Suspense>
        <label className="mk-check"><input type="checkbox" checked={!!form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /> <span>Visible publiquement</span></label>

        <div className="ui-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={save} disabled={saving || uploading}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function HubShops({ hubId, onClose, onChanged }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const hubQ = useLoad(
    () => api.get(`/v1/admin/hubs/${hubId}`).catch((e) => { notify(e?.message || 'Erreur', 'error'); return null }),
    [hubId],
  )
  const hub = hubQ.data
  const [q, setQ] = useState('')
  const [candidates, setCandidates] = useState([])
  const [busy, setBusy] = useState(false)

  const search = async (e) => {
    e?.preventDefault()
    try {
      const city = hub?.city ? `&city=${encodeURIComponent(hub.city)}` : ''
      setCandidates(await api.get(`/v1/admin/hubs/shops?q=${encodeURIComponent(q)}${city}`) || [])
    } catch { setCandidates([]) }
  }
  const act = async (fn, msg) => {
    setBusy(true)
    try { hubQ.setData(await fn()); notify(msg, 'success'); onChanged() } catch (e) { notify(e?.message || 'Erreur', 'error') } finally { setBusy(false) }
  }

  return (
    <Modal open title={hub ? `Boutiques · ${hub.name}` : 'Boutiques'} onClose={onClose}>
      {!hub ? <Spinner /> : (
        <div className="admin-hub-shops">
          {hub.shops?.length ? (
            <ul className="admin-hub-shoplist">
              {hub.shops.map((s) => (
                <li key={s.id}>
                  <span><b>{s.name}</b><small>{[s.commune, cap(s.city)].filter(Boolean).join(', ')}</small></span>
                  <button className="cat-icon-btn danger" title="Détacher" disabled={busy}
                    onClick={() => act(() => api.del(`/v1/admin/hubs/${hubId}/shops/${s.id}`), 'Boutique détachée')}><FaTimes /></button>
                </li>
              ))}
            </ul>
          ) : <p className="dash-sub">Aucune boutique rattachée pour l’instant.</p>}

          <h4 className="admin-hub-h">Rattacher une boutique</h4>
          <form className="admin-mk-search" onSubmit={search}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Nom de la boutique${hub.city ? ` (${cap(hub.city)})` : ''}`} />
            <button type="submit" className="cat-icon-btn" aria-label="Rechercher"><FaSearch /></button>
          </form>
          <ul className="admin-hub-shoplist">
            {candidates.map((s) => (
              <li key={s.id}>
                <span><b>{s.name}</b><small>{[s.commune, cap(s.city)].filter(Boolean).join(', ')}{s.hubName ? ` · actuellement : ${s.hubName}` : ''}</small></span>
                {s.hubId === hubId ? <Badge tone="success">Rattachée</Badge> : (
                  <Button size="sm" variant="secondary" disabled={busy}
                    onClick={() => act(() => api.post(`/v1/admin/hubs/${hubId}/shops`, { shopId: s.id }), 'Boutique rattachée')}>
                    <FaPlus /> Rattacher
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}

export default function AdminHubs() {
  const api = useTindisaApi()
  const { notify } = useToast()
  const { city, withCity, lockedCity } = useAdminView()
  const [editing, setEditing] = useState(null) // null | {} (nouveau) | hub
  const [shopsOf, setShopsOf] = useState(null)
  const [del, setDel] = useState({ open: false, hub: null, busy: false })

  const hubsQ = useLoad(
    () => api.get(withCity('/v1/admin/hubs')).then(
      (r) => ({ items: r?.items || [], summary: r?.summary || {} }),
      () => ({ items: [], summary: {} }),
    ),
    [city],
  )
  const data = hubsQ.data || { items: [], summary: {} }
  const loading = hubsQ.loading
  const load = hubsQ.reload

  // Avancement rapide du statut Wi-Fi depuis le tableau.
  const setStatus = async (hub, wifiStatus) => {
    try { await api.put(`/v1/admin/hubs/${hub.id}`, { wifiStatus }); notify(`${hub.name} : ${wifiInfo(wifiStatus).label}`, 'success'); load() }
    catch (e) { notify(e?.message || 'Erreur', 'error') }
  }
  const doDelete = async () => {
    setDel((d) => ({ ...d, busy: true }))
    try { await api.del(`/v1/admin/hubs/${del.hub.id}`); notify('Centre supprimé', 'success'); setDel({ open: false, hub: null, busy: false }); load() }
    catch (e) { notify(e?.message || 'Erreur', 'error'); setDel((d) => ({ ...d, busy: false })) }
  }
  const s = data.summary || {}

  return (
    <div className="dash-page">
      <header className="dash-page-head admin-head-row">
        <div>
          <h1 className="dash-h1"><FaWifi style={{ marginRight: 8 }} />Centres & Wi-Fi</h1>
          <p className="dash-sub">Centres commerciaux et zones agricoles (urbains / ruraux) qui regroupent les boutiques, et suivi du déploiement du Wi-Fi maillé Starlink. Visible sur <Link to="/centres" target="_blank">tindisa.com/centres</Link>.</p>
        </div>
        <Button onClick={() => setEditing({})}><FaPlus /> Nouveau centre</Button>
      </header>

      <StatGrid>
        <StatCard icon={<FaWifi />} value={s.live ?? 0} label="Wi-Fi en service" />
        <StatCard icon={<FaBroadcastTower />} value={s.in_progress ?? 0} label="Étude / installation" />
        <StatCard icon={<FaCity />} value={`${s.urban ?? 0} / ${s.rural ?? 0}`} label="Urbains / ruraux" />
        <StatCard icon={<FaBroadcastTower />} value={s.live_nodes ?? 0} label="Nœuds actifs" />
        <StatCard icon={<FaStore />} value={s.connected_shops ?? 0} label="Boutiques connectées" />
      </StatGrid>

      {loading ? <Spinner label="Chargement…" /> : data.items.length === 0 ? (
        <EmptyState icon={<FaWifi />} title="Aucun centre" text="Créez le premier centre commercial ou la première zone agricole à connecter."
          action={<Button onClick={() => setEditing({})}><FaPlus /> Nouveau centre</Button>} />
      ) : (
        <div className="cat-table-wrap">
          <table className="cat-table">
            <thead><tr><th>Centre</th><th>Zone</th><th>Ville</th><th>Wi-Fi Starlink</th><th>Nœuds</th><th>Boutiques</th><th className="cat-col-actions">Actions</th></tr></thead>
            <tbody>
              {data.items.map((h) => (
                <tr key={h.id}>
                  <td>
                    <span className="cat-pname">{h.name}</span>
                    <span className="cat-sku">{hubTypeLabel(h.hubType)}{h.active ? '' : ' · masqué'}</span>
                  </td>
                  <td>{h.kind === 'rural' ? <Badge tone="warn"><FaSeedling /> Rural</Badge> : <Badge><FaCity /> Urbain</Badge>}</td>
                  <td>{cap(h.city) || '·'}{h.commune ? <span className="cat-sku">{h.commune}</span> : null}</td>
                  <td>
                    <select className={`ui-input ui-select admin-wifi-select admin-wifi-${h.wifiStatus}`} value={h.wifiStatus}
                      onChange={(e) => setStatus(h, e.target.value)} aria-label="Statut Wi-Fi">
                      {WIFI_STATUSES.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </select>
                  </td>
                  <td>{h.meshNodes}</td>
                  <td><button className="admin-link-btn" onClick={() => setShopsOf(h.id)}>{h.shopCount ?? 0} <FaStore /></button></td>
                  <td className="cat-col-actions">
                    <Link className="cat-icon-btn" title="Voir la page publique" to={`/centres/${h.id}`} target="_blank"><FaExternalLinkAlt /></Link>
                    <button className="cat-icon-btn" title="Boutiques" onClick={() => setShopsOf(h.id)}><FaStore /></button>
                    <button className="cat-icon-btn" title="Modifier" onClick={() => setEditing(h)}><FaEdit /></button>
                    <button className="cat-icon-btn danger" title="Supprimer" onClick={() => setDel({ open: true, hub: h, busy: false })}><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <HubForm initial={editing.id ? editing : null} lockedCity={lockedCity}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
      {shopsOf && <HubShops hubId={shopsOf} onClose={() => setShopsOf(null)} onChanged={load} />}
      <ConfirmModal open={del.open} danger busy={del.busy} title="Supprimer le centre"
        message={del.hub ? `Supprimer « ${del.hub.name} » ? Les boutiques sont détachées (elles restent en ligne).` : ''}
        confirmLabel="Supprimer" cancelLabel="Annuler" onConfirm={doDelete} onClose={() => setDel({ open: false, hub: null, busy: false })} />
    </div>
  )
}
