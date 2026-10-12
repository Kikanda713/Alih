import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DRC_VIEWBOX, DRC_PROVINCES_SVG, projectDrc } from '../lib/drcMap'
import { DRC_CITY_COORDS, cityCoords } from '../lib/drcCities'
import { wifiInfo, hubTypeLabel } from '../lib/hubs'

/*
 * Carte SVG interactive de la RDC : les 26 provinces et les centres Tindisa
 * pointés (position GPS, sinon celle de leur ville), colorés selon l'état du
 * Wi-Fi Starlink. Survol : infobulle ; clic / Entrée : fiche du centre.
 * Vectorielle, légère, nette sur mobile (aucune tuile à charger).
 */

const STATUS_COLOR = { live: '#1e8449', installing: '#D39B5A', survey: '#D39B5A', planned: '#9a9490', maintenance: '#c0392b' }
const LEGEND = ['live', 'installing', 'planned', 'maintenance']

// Plusieurs centres dans la même ville : disposés en petite couronne pour rester cliquables.
function placeHubs(hubs) {
  const byKey = new Map()
  const placed = []
  for (const h of hubs) {
    const gps = Number.isFinite(h.gpsLat) && Number.isFinite(h.gpsLng) ? [h.gpsLat, h.gpsLng] : null
    const ll = gps || cityCoords(h.city)
    if (!ll) continue
    const [x, y] = projectDrc(ll[0], ll[1])
    const key = `${Math.round(x / 6)}:${Math.round(y / 6)}`
    const n = byKey.get(key) || 0
    byKey.set(key, n + 1)
    const a = n * 2.399 // angle d'or : répartition régulière
    const r = n ? 9 + 3 * Math.sqrt(n) : 0
    placed.push({ hub: h, x: x + r * Math.cos(a), y: y + r * Math.sin(a) })
  }
  return placed
}

export default function DrcCoverageMap({ hubs = [], compact = false }) {
  const navigate = useNavigate()
  const wrap = useRef(null)
  const [tip, setTip] = useState(null)
  const points = useMemo(() => placeHubs(hubs), [hubs])
  const cities = useMemo(
    () => Object.entries(DRC_CITY_COORDS).map(([id, [lat, lng]]) => ({ id, xy: projectDrc(lat, lng) })),
    [],
  )
  const hubCities = useMemo(() => new Set(hubs.map((h) => String(h.city || '').toLowerCase())), [hubs])

  const showTip = (e, content) => {
    const box = wrap.current?.getBoundingClientRect()
    if (!box) return
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content })
  }
  const open = (h) => navigate(`/centres/${h.id}`)

  return (
    <figure className={`drc-map${compact ? ' drc-map-compact' : ''}`} ref={wrap} onMouseLeave={() => setTip(null)}>
      <svg viewBox={DRC_VIEWBOX} role="img" aria-label={`Carte de la RDC : ${points.length} centre(s) Tindisa`}>
        <g className="drc-provinces">
          {DRC_PROVINCES_SVG.map((p) => (
            <path key={p.id} d={p.d}
              onMouseMove={(e) => showTip(e, <><b>{p.name}</b><span>Province</span></>)} />
          ))}
        </g>
        <g className="drc-cities" aria-hidden="true">
          {cities.map((c) => (
            <circle key={c.id} cx={c.xy[0]} cy={c.xy[1]} r={hubCities.has(c.id) ? 0 : 3} />
          ))}
        </g>
        <g className="drc-hubs">
          {points.map(({ hub: h, x, y }) => {
            const color = STATUS_COLOR[h.wifiStatus] || STATUS_COLOR.planned
            const label = `${h.name} : ${wifiInfo(h.wifiStatus).label}`
            return (
              <g key={h.id} className={`drc-hub${h.wifiStatus === 'live' ? ' is-live' : ''}`} tabIndex={0} role="link" aria-label={label}
                onClick={() => open(h)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open(h))}
                onMouseMove={(e) => showTip(e, (
                  <>
                    <b>{h.name}</b>
                    <span>{hubTypeLabel(h.hubType)} · {h.kind === 'rural' ? 'zone rurale' : 'zone urbaine'}</span>
                    <span style={{ color }}>{wifiInfo(h.wifiStatus).label}</span>
                    <span>{h.shopCount ?? 0} boutique{h.shopCount > 1 ? 's' : ''}{h.meshNodes ? ` · ${h.meshNodes} nœuds Wi-Fi` : ''}</span>
                  </>
                ))}>
                {h.wifiStatus === 'live' && <circle className="drc-pulse" cx={x} cy={y} r="13" style={{ stroke: color }} />}
                <circle className="drc-cover" cx={x} cy={y} r={16 + Math.min(20, (h.meshNodes || 0) * 1.5)} style={{ fill: color }} />
                <circle className="drc-dot" cx={x} cy={y} r="11" style={{ fill: color }} />
              </g>
            )
          })}
        </g>
      </svg>
      {tip && (
        <div className="drc-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">{tip.content}</div>
      )}
      <figcaption className="drc-legend">
        {LEGEND.map((s) => (
          <span key={s}><i style={{ background: STATUS_COLOR[s] }} /> {wifiInfo(s).short}</span>
        ))}
        {!points.length && <span className="drc-empty">Les premiers centres apparaîtront ici dès leur création.</span>}
      </figcaption>
    </figure>
  )
}
