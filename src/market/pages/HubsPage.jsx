import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaWifi, FaCity, FaSeedling, FaStore, FaBroadcastTower, FaWhatsapp, FaArrowRight } from 'react-icons/fa'
import { Button, EmptyState, Spinner } from '../../components/ui'
import { useTaxonomy } from '../../api/taxonomy'
import { marketApi } from '../lib/api'
import { cityLabel } from '../lib/format'
import { HUB_KINDS, HUB_TYPES, WIFI_STATUSES } from '../lib/hubs'
import { whatsappLink } from '../lib/chat'
import HubCard from '../components/HubCard'
// Carte (Leaflet) chargée à la demande.
const HubsMap = lazy(() => import('../components/HubsMap'))

/** Annuaire des centres commerciaux et zones agricoles + suivi du Wi-Fi Starlink. */
export default function HubsPage() {
  const taxonomy = useTaxonomy()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState({ loading: true, items: [], summary: {}, error: null })
  const key = params.toString()

  useEffect(() => { document.title = 'Centres & Wi-Fi Tindisa' }, [])
  useEffect(() => {
    let alive = true
    const p = Object.fromEntries(new URLSearchParams(key))
    marketApi.hubs(p)
      .then((r) => alive && setData({ loading: false, items: r.items || [], summary: r.summary || {}, error: null }))
      .catch((error) => alive && setData({ loading: false, items: [], summary: {}, error }))
    return () => { alive = false }
  }, [key])

  const set = (k, v) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next)
  }
  const s = data.summary || {}

  return (
    <div className="mk-hubs">
      <section className="mk-page-hero mk-page-hero-dark">
        <div className="mk-container">
          <p className="mk-eyebrow mk-eyebrow-light">Tindisa Connect</p>
          <h1>Centres commerciaux et zones agricoles connectés</h1>
          <p>
            Chaque centre regroupe des boutiques, des producteurs et des prestataires autour d’un Wi-Fi maillé Tindisa
            raccordé à Starlink. Suivez où le réseau est déjà en service et où il arrive.
          </p>
          <div className="mk-kpis">
            <div><strong>{s.live ?? 0}</strong><span><FaWifi /> en service</span></div>
            <div><strong>{s.in_progress ?? 0}</strong><span><FaBroadcastTower /> en installation</span></div>
            <div><strong>{s.planned ?? 0}</strong><span>planifiés</span></div>
            <div><strong>{s.urban ?? 0} / {s.rural ?? 0}</strong><span><FaCity /> urbains / <FaSeedling /> ruraux</span></div>
            <div><strong>{s.connected_shops ?? 0}</strong><span><FaStore /> boutiques connectées</span></div>
          </div>
          <Link to="/connectivite" className="mk-connect-link">Comment fonctionne le réseau maillé <FaArrowRight /></Link>
        </div>
      </section>

      <div className="mk-container mk-hubs-body">
        <div className="mk-hubs-filters">
          <div className="mk-seg">
            <button type="button" className={!params.get('kind') ? 'active' : ''} onClick={() => set('kind', '')}>Toutes zones</button>
            {HUB_KINDS.map((k) => (
              <button key={k.id} type="button" className={params.get('kind') === k.id ? 'active' : ''} onClick={() => set('kind', k.id)}>
                {k.id === 'rural' ? <FaSeedling /> : <FaCity />} {k.label}
              </button>
            ))}
          </div>
          <select className="ui-input ui-select" value={params.get('type') || ''} onChange={(e) => set('type', e.target.value)} aria-label="Type de centre">
            <option value="">Tous les types</option>
            {HUB_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select className="ui-input ui-select" value={params.get('wifi') || ''} onChange={(e) => set('wifi', e.target.value)} aria-label="État du Wi-Fi">
            <option value="">Tout état du Wi-Fi</option>
            {WIFI_STATUSES.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
          <select className="ui-input ui-select" value={params.get('city') || ''} onChange={(e) => set('city', e.target.value)} aria-label="Ville">
            <option value="">Toute la RDC</option>
            {(taxonomy?.cities || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {data.loading ? <Spinner label="Chargement des centres…" /> : data.items.length === 0 ? (
          <EmptyState icon={<FaWifi />} title={data.error ? 'Le service ne répond pas' : 'Aucun centre pour ces critères'}
            text="Le réseau s’étend chaque mois. Proposez un centre commercial, un marché ou une zone agricole à connecter."
            action={<Button as="a" href={whatsappLink('Bonjour Tindisa, je souhaite proposer un site à connecter : ')} target="_blank" rel="noopener noreferrer"><FaWhatsapp /> Proposer un site</Button>} />
        ) : (
          <>
            <Suspense fallback={null}><HubsMap hubs={data.items} /></Suspense>
            <div className="mk-hub-grid">
              {data.items.map((h) => <HubCard key={h.id} hub={h} cityName={cityLabel(taxonomy, h.city)} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
