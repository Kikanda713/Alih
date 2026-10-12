import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { wifiInfo } from '../lib/hubs'

// Couleur du point = état du Wi-Fi (charte : terracotta en service, or en cours).
const COLORS = { live: '#1e8449', installing: '#D39B5A', survey: '#D39B5A', planned: '#9a9490', maintenance: '#c0392b' }
const DRC_CENTER = [-2.9, 23.6]

/** Carte des centres connectés / en déploiement. */
export default function HubsMap({ hubs }) {
  const pts = hubs.filter((h) => Number.isFinite(h.gpsLat) && Number.isFinite(h.gpsLng))
  if (!pts.length) return null
  const center = pts.length === 1 ? [pts[0].gpsLat, pts[0].gpsLng] : DRC_CENTER
  return (
    <MapContainer center={center} zoom={pts.length === 1 ? 12 : 5} className="mk-hubs-map" scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pts.map((h) => (
        <CircleMarker key={h.id} center={[h.gpsLat, h.gpsLng]} radius={h.wifiStatus === 'live' ? 11 : 8}
          pathOptions={{ color: COLORS[h.wifiStatus] || COLORS.planned, fillOpacity: 0.55, weight: 2 }}>
          <Popup>
            <strong>{h.name}</strong><br />
            {wifiInfo(h.wifiStatus).label} · {h.shopCount ?? 0} boutique(s)<br />
            <Link to={`/centres/${h.id}`}>Voir le centre</Link>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
