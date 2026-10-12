/*
 * Mini-schéma du Wi-Fi maillé d'une Wifi Zone (Starlink au centre, nœuds qui se
 * relaient). Pur SVG, animation coupée si « réduire les animations ».
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
        {nodes || 0} nœud{nodes > 1 ? 's' : ''} · {shops} établissement{shops > 1 ? 's' : ''}
      </text>
    </svg>
  )
}
