import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Pin coloré (divIcon) — évite les icônes cassées des bundlers et code-couleur par type.
const pin = (color) =>
  L.divIcon({
    className: 'map-pin',
    html: `<span class="map-pin-dot" style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
const ICONS = { shop: pin('#2563eb'), driver: pin('#16a34a'), landmark: pin('#ea580c') }

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

const hasCoords = (o) => Number.isFinite(o?.gpsLat) && Number.isFinite(o?.gpsLng)

export default function MapCanvas({ center, zoom, layers, shops = [], drivers = [], landmarks = [], onMapClick, onDeleteLandmark, onEditLandmark }) {
  return (
    <MapContainer center={center} zoom={zoom} className="admin-map-canvas" scrollWheelZoom>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onMapClick={onMapClick} />

      {layers.shops && shops.filter(hasCoords).map((s) => (
        <Marker key={`s${s.id}`} position={[s.gpsLat, s.gpsLng]} icon={ICONS.shop}>
          <Popup><strong>{s.name}</strong><br />Boutique{s.city ? ` · ${s.city}` : ''}</Popup>
        </Marker>
      ))}

      {layers.drivers && drivers.filter(hasCoords).map((d) => (
        <Marker key={`d${d.id}`} position={[d.gpsLat, d.gpsLng]} icon={ICONS.driver}>
          <Popup><strong>{d.name}</strong><br />Livreur{d.vehicleType ? ` · ${d.vehicleType}` : ''}{d.phone ? <><br />{d.phone}</> : null}{d.landmark ? <><br />Repère : {d.landmark}</> : null}</Popup>
        </Marker>
      ))}

      {layers.landmarks && landmarks.filter(hasCoords).map((l) => (
        <Marker key={`l${l.id}`} position={[l.gpsLat, l.gpsLng]} icon={ICONS.landmark}>
          <Popup>
            <strong>{l.name}</strong>{l.kind ? <><br />{l.kind}</> : null}
            {(l.commune || l.city) ? <><br />{[l.commune, l.city].filter(Boolean).join(', ')}</> : null}
            <div className="map-popup-actions">
              <button onClick={() => onEditLandmark?.(l)}>Modifier</button>
              <button className="danger" onClick={() => onDeleteLandmark?.(l)}>Supprimer</button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
