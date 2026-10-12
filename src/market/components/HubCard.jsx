import { Link } from 'react-router-dom'
import { FaMapMarkerAlt, FaStore, FaCity, FaSeedling, FaBroadcastTower } from 'react-icons/fa'
import { WifiBadge } from './WifiStatus'
import { hubTypeLabel } from '../lib/hubs'
import { imageUrl, cityLabel } from '../lib/format'
import { useTaxonomy } from '../../api/taxonomy'

/** Carte d'un centre (commercial / agricole) avec l'état de son Wi-Fi. */
export default function HubCard({ hub }) {
  const taxonomy = useTaxonomy()
  const KindIcon = hub.kind === 'rural' ? FaSeedling : FaCity
  return (
    <Link to={`/centres/${hub.id}`} className={`mk-hub-card mk-hub-${hub.kind}`}>
      <div className="mk-hub-media">
        {hub.photoUrl ? <img src={imageUrl(hub.photoUrl, 520)} alt="" loading="lazy" /> : <span className="mk-hub-noimg"><KindIcon /></span>}
        <span className="mk-hub-kind"><KindIcon /> {hub.kind === 'rural' ? 'Zone rurale' : 'Zone urbaine'}</span>
      </div>
      <div className="mk-hub-body">
        <WifiBadge status={hub.wifiStatus} compact />
        <h3>{hub.name}</h3>
        <p className="mk-muted">{hubTypeLabel(hub.hubType)}</p>
        <p className="mk-hub-meta">
          <span><FaMapMarkerAlt /> {[hub.commune, cityLabel(taxonomy, hub.city)].filter(Boolean).join(', ') || 'RDC'}</span>
          <span><FaStore /> {hub.shopCount ?? 0} boutique{hub.shopCount > 1 ? 's' : ''}</span>
          {hub.meshNodes > 0 && <span><FaBroadcastTower /> {hub.meshNodes} nœud{hub.meshNodes > 1 ? 's' : ''}</span>}
        </p>
      </div>
    </Link>
  )
}
