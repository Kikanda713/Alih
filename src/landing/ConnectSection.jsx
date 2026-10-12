import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaCity, FaSeedling, FaWifi, FaArrowRight, FaCheck } from 'react-icons/fa'
import { MeshNetworkIllustration } from '../market/components/MeshNetwork'
import HubCard from '../market/components/HubCard'
import { marketApi } from '../market/lib/api'

const IMPACT = [
  'Le stock des boutiques devient visible dans tout le pays',
  'Les producteurs vendent leurs récoltes sans intermédiaires',
  'Paiements mobiles fiables, même loin des grandes villes',
  'Livraisons coordonnées entre zones rurales et villes',
]

/** Aperçu Tindisa Connect sur l'accueil → /connectivite et /centres. */
export default function ConnectSection() {
  const [hubs, setHubs] = useState({ items: [], summary: {} })
  useEffect(() => {
    let alive = true
    marketApi.hubs({}).then((r) => alive && setHubs({ items: r.items || [], summary: r.summary || {} })).catch(() => {})
    return () => { alive = false }
  }, [])
  const s = hubs.summary

  return (
    <section className="mk-connect" id="connect">
      <div className="mk-container mk-connect-inner">
        <div className="mk-connect-intro">
          <p className="mk-eyebrow mk-eyebrow-light">Tindisa Connect · Internet par Starlink</p>
          <h2>Le marché arrive là où le commerce se fait vraiment</h2>
          <p>
            Tindisa déploie un <b>Wi-Fi maillé raccordé à Starlink</b> dans les centres commerciaux, les marchés et les zones
            rurales de production agricole. Chaque centre regroupe ses boutiques et producteurs, connectés au marché en ligne.
          </p>
          <ul className="mk-connect-impact">
            {IMPACT.map((t) => <li key={t}><FaCheck /> {t}</li>)}
          </ul>
          {s.hubs > 0 && (
            <div className="mk-kpis mk-kpis-inline">
              <div><strong>{s.live ?? 0}</strong><span><FaWifi /> centres en service</span></div>
              <div><strong>{s.in_progress ?? 0}</strong><span>en installation</span></div>
              <div><strong>{s.urban ?? 0}</strong><span><FaCity /> urbains</span></div>
              <div><strong>{s.rural ?? 0}</strong><span><FaSeedling /> ruraux</span></div>
            </div>
          )}
          <div className="mk-connect-cta">
            <Link to="/centres" className="platform-btn mk-btn-light"><FaWifi className="platform-icon" /> <span>Centres connectés</span></Link>
            <Link to="/connectivite" className="mk-connect-link">Comprendre le réseau maillé <FaArrowRight /></Link>
          </div>
        </div>
        <div className="mk-connect-visual">
          <MeshNetworkIllustration />
        </div>
      </div>
      {hubs.items.length > 0 && (
        <div className="mk-container mk-hub-grid mk-hub-grid-dark">
          {hubs.items.slice(0, 3).map((h) => <HubCard key={h.id} hub={h} />)}
        </div>
      )}
    </section>
  )
}
