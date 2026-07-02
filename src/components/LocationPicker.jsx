import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Pins colorés — mêmes codes que la carte back-office (boutique bleu, repère orange).
const pin = (color) =>
  L.divIcon({ className: 'map-pin', html: `<span class="map-pin-dot" style="background:${color}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] })
const SHOP = pin('#2563eb')
const LM = pin('#ea580c')

const ok = (n) => Number.isFinite(n)

function Clicker({ onSet }) {
  useMapEvents({ click: (e) => onSet({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

export default function LocationPicker({ lat, lng, center, landmarks = [], onChange, onUseLandmark }) {
  const hasPos = ok(lat) && ok(lng)
  const c = hasPos ? [lat, lng] : (center || [-4.325, 15.322]) // défaut Kinshasa
  return (
    <MapContainer center={c} zoom={hasPos ? 15 : 12} className="shop-map-canvas" scrollWheelZoom>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Clicker onSet={onChange} />
      {hasPos && (
        <Marker
          position={[lat, lng]}
          icon={SHOP}
          draggable
          eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onChange({ lat: p.lat, lng: p.lng }) } }}
        >
          <Popup>Votre boutique (glissez pour ajuster)</Popup>
        </Marker>
      )}
      {landmarks.filter((l) => ok(l.gpsLat) && ok(l.gpsLng)).map((l) => (
        <Marker key={l.id} position={[l.gpsLat, l.gpsLng]} icon={LM}>
          <Popup>
            <strong>{l.name}</strong>{l.commune ? <><br />{l.commune}</> : null}
            <div className="map-popup-actions"><button onClick={() => onUseLandmark?.(l)}>Situer ma boutique ici</button></div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
