import { Fragment, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { wifiInfo, hubTypeLabel } from '../lib/hubs'
import { cityCoords } from '../lib/drcCities'

/*
 * Carte OpenStreetMap des centres Tindisa (même moteur que le pointage du
 * back-office) : exploration libre (zoom, déplacement), cadrage automatique sur
 * les centres, cercle de couverture et couleur selon l'état du Wi-Fi Starlink.
 * Un centre sans GPS est placé sur sa ville.
 */

const STATUS_COLOR = { live: '#1e8449', installing: '#D39B5A', survey: '#D39B5A', planned: '#9a9490', maintenance: '#c0392b' }
const LEGEND = ['live', 'installing', 'planned', 'maintenance']
const DRC_BOUNDS = [[-13.5, 12.2], [5.4, 31.3]]

function position(h) {
  if (Number.isFinite(h.gpsLat) && Number.isFinite(h.gpsLng)) return [h.gpsLat, h.gpsLng]
  return cityCoords(h.city)
}

// Cadre la vue sur les centres (sinon sur toute la RDC).
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 12)
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 12 })
    else map.fitBounds(DRC_BOUNDS)
  }, [map, points])
  return null
}

export default function HubsCoverageMap({ hubs = [] }) {
  const placed = useMemo(() => hubs.map((h) => ({ h, pos: position(h) })).filter((p) => p.pos), [hubs])
  const points = useMemo(() => placed.map((p) => p.pos), [placed])

  return (
    <figure className="mk-hubs-map">
      <MapContainer bounds={DRC_BOUNDS} className="mk-hubs-map-canvas" scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} />
        {placed.map(({ h, pos }) => {
          const color = STATUS_COLOR[h.wifiStatus] || STATUS_COLOR.planned
          return (
            <Fragment key={h.id}>
              {/* Couverture réelle si déclarée (mètres), sinon zone indicative. */}
              <Circle center={pos} radius={h.coverageM || 600} pathOptions={{ color, weight: 1, fillOpacity: 0.12 }} />
              <CircleMarker center={pos} radius={h.wifiStatus === 'live' ? 10 : 8}
                pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 }}>
                <Popup>
                  <strong>{h.name}</strong><br />
                  {hubTypeLabel(h.hubType)} · {h.kind === 'rural' ? 'zone rurale' : 'zone urbaine'}<br />
                  <span style={{ color }}>{wifiInfo(h.wifiStatus).label}</span>
                  {' · '}{h.shopCount ?? 0} boutique(s){h.meshNodes ? ` · ${h.meshNodes} nœuds` : ''}<br />
                  <Link to={`/centres/${h.id}`}>Voir le centre</Link>
                </Popup>
              </CircleMarker>
            </Fragment>
          )
        })}
      </MapContainer>
      <figcaption className="mk-hubs-legend">
        {LEGEND.map((s) => <span key={s}><i style={{ background: STATUS_COLOR[s] }} /> {wifiInfo(s).short}</span>)}
        {!placed.length && <span className="mk-hubs-legend-empty">Les premiers centres apparaîtront ici dès leur création.</span>}
      </figcaption>
    </figure>
  )
}
