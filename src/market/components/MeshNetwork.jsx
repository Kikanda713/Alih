import { FaStore, FaMobileAlt, FaSeedling, FaTruck, FaSatellite, FaWarehouse } from 'react-icons/fa'

/*
 * Schéma du réseau Tindisa Connect :
 *   satellites Starlink (orbite basse) → terminal Starlink installé au centre
 *   → nœuds Wi-Fi maillés (chaque nœud relaie ses voisins : pas de point unique
 *   de panne, couverture étendue) → boutiques, producteurs, clients, livreurs.
 * Les deux zones (urbaine / rurale) sont reliées par une liaison maillée de relais.
 * Pur SVG (léger, net à toute taille), animation coupée si « réduire les animations ».
 */

// Anneau de nœuds autour d'un centre.
function ring(cx, cy, r, n, offset = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = offset + (i / n) * Math.PI * 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
}

// Liens du maillage : chaque nœud ↔ ses deux voisins + ↔ un nœud opposé (redondance).
function meshLinks(nodes) {
  const links = []
  const n = nodes.length
  nodes.forEach((p, i) => {
    links.push([p, nodes[(i + 1) % n]])
    if (n > 4 && i < n / 2) links.push([p, nodes[(i + Math.floor(n / 2)) % n]])
  })
  return links
}

function Zone({ cx, cy, title, subtitle, endpoints, tone }) {
  const nodes = ring(cx, cy, 92, endpoints.length, -Math.PI / 2)
  return (
    <g>
      <circle cx={cx} cy={cy} r="150" className={`mesh-cover mesh-cover-${tone}`} />
      {meshLinks(nodes).map(([a, b], i) => (
        <line key={`m${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="mesh-link" />
      ))}
      {nodes.map(([x, y], i) => (
        <line key={`h${i}`} x1={cx} y1={cy} x2={x} y2={y} className="mesh-spoke" />
      ))}
      {nodes.map(([x, y], i) => {
        const { Icon, label } = endpoints[i]
        // Terminal client (boutique, téléphone…) posé à l'extérieur du nœud.
        const ox = cx + (x - cx) * 1.42
        const oy = cy + (y - cy) * 1.42
        return (
          <g key={`n${i}`}>
            <line x1={x} y1={y} x2={ox} y2={oy} className="mesh-last" />
            <circle cx={x} cy={y} r="9" className="mesh-node" />
            <circle cx={x} cy={y} r="3.5" className="mesh-node-core" />
            <circle cx={ox} cy={oy} r="17" className="mesh-endpoint" />
            <Icon x={ox - 9} y={oy - 9} size={18} className="mesh-endpoint-ic" />
            <text x={ox} y={oy + 32} className="mesh-ep-label" textAnchor="middle">{label}</text>
          </g>
        )
      })}
      {/* Terminal Starlink du centre */}
      <rect x={cx - 26} y={cy - 26} width="52" height="52" rx="14" className="mesh-hub" />
      <path d={`M${cx - 13} ${cy + 6} a 16 9 -25 0 1 26 -14`} className="mesh-dish" />
      <line x1={cx} y1={cy - 2} x2={cx + 2} y2={cy + 14} className="mesh-dish" />
      <text x={cx} y={cy + 178} className="mesh-zone-title" textAnchor="middle">{title}</text>
      <text x={cx} y={cy + 198} className="mesh-zone-sub" textAnchor="middle">{subtitle}</text>
    </g>
  )
}

export function MeshNetworkIllustration() {
  const urban = { cx: 250, cy: 300 }
  const rural = { cx: 710, cy: 300 }
  const sat = { x: 480, y: 58 }
  return (
    <figure className="mesh-figure">
      <svg viewBox="0 0 960 560" className="mesh-svg" role="img"
        aria-label="Schéma : les satellites Starlink alimentent un terminal dans chaque centre, qui diffuse un Wi-Fi maillé vers les boutiques, producteurs, clients et livreurs ; les zones urbaine et rurale sont reliées par des relais.">
        {/* Liens satellite → terminaux */}
        <path d={`M${sat.x} ${sat.y + 20} L${urban.cx} ${urban.cy - 30}`} className="mesh-beam" />
        <path d={`M${sat.x} ${sat.y + 20} L${rural.cx} ${rural.cy - 30}`} className="mesh-beam" />
        <g className="mesh-sat">
          <rect x={sat.x - 70} y={sat.y - 10} width="44" height="20" rx="3" />
          <rect x={sat.x + 26} y={sat.y - 10} width="44" height="20" rx="3" />
          <line x1={sat.x - 26} y1={sat.y} x2={sat.x + 26} y2={sat.y} />
        </g>
        <circle cx={sat.x} cy={sat.y} r="20" className="mesh-sat-core" />
        <FaSatellite x={sat.x - 10} y={sat.y - 10} size={20} className="mesh-sat-ic" />
        <text x={sat.x} y={sat.y - 26} className="mesh-zone-sub" textAnchor="middle">Satellites Starlink · orbite basse</text>

        {/* Liaison maillée inter-zones (relais) */}
        <path d={`M${urban.cx + 120} ${urban.cy + 10} C 420 380, 540 380, ${rural.cx - 120} ${rural.cy + 10}`} className="mesh-backhaul" />
        <circle cx="480" cy="352" r="7" className="mesh-node" />
        <text x="480" y="402" className="mesh-zone-sub" textAnchor="middle">Relais maillé entre zones</text>

        <Zone {...urban} tone="urban" title="Centre commercial urbain" subtitle="Terminal Starlink + Wi-Fi maillé"
          endpoints={[
            { Icon: FaStore, label: 'Boutiques' },
            { Icon: FaMobileAlt, label: 'Clients' },
            { Icon: FaTruck, label: 'Livreurs' },
            { Icon: FaStore, label: 'Restaurants' },
            { Icon: FaMobileAlt, label: 'Paiement mobile' },
          ]} />
        <Zone {...rural} tone="rural" title="Zone rurale de production" subtitle="Coopératives et foyers agricoles"
          endpoints={[
            { Icon: FaSeedling, label: 'Producteurs' },
            { Icon: FaWarehouse, label: 'Coopérative' },
            { Icon: FaTruck, label: 'Collecte' },
            { Icon: FaMobileAlt, label: 'Acheteurs' },
            { Icon: FaSeedling, label: 'Champs' },
          ]} />
      </svg>
      <figcaption className="mesh-legend">
        <span><i className="lg-beam" /> Lien satellite</span>
        <span><i className="lg-mesh" /> Maillage Wi-Fi (chaque nœud relaie ses voisins)</span>
        <span><i className="lg-node" /> Nœud Wi-Fi</span>
        <span><i className="lg-hub" /> Terminal Starlink du centre</span>
      </figcaption>
    </figure>
  )
}

/**
 * Version compacte pour la fiche d'un centre : le terminal et ses nœuds
 * réels (nombre déclaré au back-office). Grisé tant que le Wi-Fi n'est pas en service.
 */
export function MeshMini({ nodes = 0, live = false, shops = 0 }) {
  const n = Math.min(Math.max(nodes || 0, 4), 14)
  const pts = ring(160, 120, 78, n, -Math.PI / 2)
  return (
    <svg viewBox="0 0 320 240" className={`mesh-mini${live ? ' is-live' : ''}`} role="img"
      aria-label={`${nodes || 0} nœuds Wi-Fi maillés autour du terminal Starlink${live ? ', en service' : ', déploiement en cours'}`}>
      <circle cx="160" cy="120" r="110" className="mesh-cover mesh-cover-urban" />
      {meshLinks(pts).map(([a, b], i) => <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="mesh-link" />)}
      {pts.map(([x, y], i) => <line key={`s${i}`} x1="160" y1="120" x2={x} y2={y} className="mesh-spoke" />)}
      {pts.map(([x, y], i) => <circle key={`n${i}`} cx={x} cy={y} r="7" className={`mesh-node${i < (nodes || 0) ? '' : ' mesh-node-planned'}`} />)}
      <rect x="138" y="98" width="44" height="44" rx="12" className="mesh-hub" />
      <path d="M149 125 a 14 8 -25 0 1 22 -12" className="mesh-dish" />
      <text x="160" y="232" className="mesh-zone-sub" textAnchor="middle">
        {nodes || 0} nœud{nodes > 1 ? 's' : ''} · {shops} boutique{shops > 1 ? 's' : ''}
      </text>
    </svg>
  )
}
