import { Suspense, lazy, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaSatellite, FaBroadcastTower, FaStore, FaCheck, FaWhatsapp, FaArrowRight, FaCity, FaSeedling, FaWifi, FaMoneyBillWave, FaTruck } from 'react-icons/fa'
import { marketApi } from '../lib/api'
import { whatsappLink } from '../lib/chat'
import { MeshNetworkIllustration } from '../components/MeshNetwork'
import HubCard from '../components/HubCard'
import { WIFI_STEPS } from '../lib/hubs'

// Carte SVG de la RDC (chargée à la demande).
const DrcCoverageMap = lazy(() => import('../components/DrcCoverageMap'))

const LAYERS = [
  { ic: <FaSatellite />, t: '1. Starlink', s: 'Un terminal satellite installé dans chaque centre apporte l’internet haut débit, même loin de la fibre et des antennes mobiles.' },
  { ic: <FaBroadcastTower />, t: '2. Wi-Fi maillé', s: 'Des nœuds Wi-Fi se relaient les uns les autres : la couverture s’étend allée par allée, champ par champ, sans point unique de panne.' },
  { ic: <FaStore />, t: '3. Le marché Tindisa', s: 'Commerçants, producteurs et clients se connectent : catalogue en ligne, commandes par message, paiements mobiles et livraisons suivies.' },
]

const BENEFITS = [
  { ic: <FaCity />, t: 'Centres commerciaux et marchés urbains', items: ['Chaque boutique visible en ligne', 'Paiements mobiles sans coupure', 'Clients connectés dans les allées'] },
  { ic: <FaSeedling />, t: 'Zones rurales de production agricole', items: ['Récoltes vendues avant l’enlèvement', 'Prix justes, moins d’intermédiaires', 'Coopératives reliées aux acheteurs des villes'] },
  { ic: <FaTruck />, t: 'Logistique et points relais', items: ['Collecte groupée depuis les zones rurales', 'Suivi des livreurs en temps réel', 'Paiement libéré à la réception'] },
]

/** Programme Tindisa Connect : réseau Wi-Fi maillé raccordé à Starlink. */
export default function ConnectivityPage() {
  const [hubs, setHubs] = useState({ items: [], summary: {} })
  useEffect(() => { document.title = 'Tindisa Connect · Wi-Fi Starlink' }, [])
  useEffect(() => {
    let alive = true
    marketApi.hubs({}).then((r) => alive && setHubs({ items: r.items || [], summary: r.summary || {} })).catch(() => {})
    return () => { alive = false }
  }, [])
  const s = hubs.summary
  const ask = 'Bonjour Tindisa, je souhaite proposer un site à connecter (centre commercial, marché ou zone agricole) : '

  return (
    <div className="mk-connectivity">
      <section className="mk-page-hero mk-page-hero-dark">
        <div className="mk-container mk-cx-hero">
          <div>
            <p className="mk-eyebrow mk-eyebrow-light">Tindisa Connect · Internet par Starlink</p>
            <h1>Nous connectons les lieux où le Congo fait son commerce</h1>
            <p>
              Tindisa déploie un Wi-Fi maillé raccordé à Starlink dans les centres commerciaux, les marchés et les zones rurales
              de production agricole. Résultat : commerçants et producteurs vendent en ligne, encaissent par Mobile Money et
              livrent partout, même hors des grandes villes.
            </p>
            <div className="mk-connect-cta">
              <Link to="/centres" className="platform-btn mk-btn-light"><FaWifi className="platform-icon" /> <span>Voir les centres connectés</span></Link>
              <a className="platform-btn whatsapp" href={whatsappLink(ask)} target="_blank" rel="noopener noreferrer">
                <FaWhatsapp className="platform-icon" /> <span>Proposer un site</span>
              </a>
            </div>
          </div>
          <div className="mk-kpis mk-kpis-col">
            <div><strong>{s.live ?? 0}</strong><span>centres en service</span></div>
            <div><strong>{s.in_progress ?? 0}</strong><span>en installation</span></div>
            <div><strong>{s.live_nodes ?? 0}</strong><span>nœuds Wi-Fi actifs</span></div>
            <div><strong>{s.connected_shops ?? 0}</strong><span>boutiques connectées</span></div>
          </div>
        </div>
      </section>

      <section className="mk-container mk-cx-section">
        <h2 className="section-title">Comment fonctionne le réseau maillé</h2>
        <p className="section-subtitle">Du satellite jusqu’au téléphone du commerçant, en trois couches.</p>
        <MeshNetworkIllustration />
        <div className="mk-layers">
          {LAYERS.map((l) => (
            <article key={l.t} className="mk-layer"><span className="mk-layer-ic">{l.ic}</span><h3>{l.t}</h3><p>{l.s}</p></article>
          ))}
        </div>
      </section>

      <section className="mk-cx-band">
        <div className="mk-container">
          <h2 className="section-title">Ce que ça change sur le terrain</h2>
          <div className="mk-benefits">
            {BENEFITS.map((b) => (
              <article key={b.t} className="mk-benefit">
                <span className="mk-layer-ic">{b.ic}</span>
                <h3>{b.t}</h3>
                <ul>{b.items.map((i) => <li key={i}><FaCheck /> {i}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-container mk-cx-section">
        <h2 className="section-title">Le déploiement, étape par étape</h2>
        <p className="section-subtitle">Chaque centre suit le même parcours, visible publiquement sur sa fiche.</p>
        <ol className="mk-deploy-steps">
          {WIFI_STEPS.map((w, i) => (
            <li key={w.id}>
              <span className="mk-flow-num">{i + 1}</span>
              <b>{w.label}</b>
              <small>{[
                'Le site est retenu avec les commerçants ou la coopérative.',
                'Relevé du site : emplacement du terminal, nombre de nœuds, couverture.',
                'Pose du terminal Starlink et des nœuds Wi-Fi maillés.',
                'Les boutiques du centre sont en ligne et connectées.',
              ][i]}</small>
            </li>
          ))}
        </ol>
        <h2 className="section-title">Couverture du réseau</h2>
        <p className="section-subtitle">Centres en service, en installation et planifiés, partout en RDC.</p>
        <Suspense fallback={null}><DrcCoverageMap hubs={hubs.items} compact /></Suspense>
        {hubs.items.length > 0 && (
          <>
            <div className="mk-rail-head"><h2>Centres du réseau</h2><Link to="/centres">Tous les centres <FaArrowRight /></Link></div>
            <div className="mk-hub-grid">{hubs.items.slice(0, 6).map((h) => <HubCard key={h.id} hub={h} />)}</div>
          </>
        )}
        <div className="mk-join">
          <div>
            <h2>Un centre, un marché, une coopérative à connecter ?</h2>
            <p><FaMoneyBillWave /> Propriétaires, associations de commerçants, coopératives : parlons de votre site.</p>
          </div>
          <a className="platform-btn whatsapp" href={whatsappLink(ask)} target="_blank" rel="noopener noreferrer">
            <FaWhatsapp className="platform-icon" /> <span>Proposer un site</span>
          </a>
        </div>
      </section>
    </div>
  )
}
