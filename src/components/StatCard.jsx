import { Card } from './ui.jsx'

/**
 * Cartes d'indicateurs réutilisables du back-office (icône + valeur + libellé).
 * Remplace le markup `dash-stat` qui était dupliqué dans chaque page admin.
 */
export function StatGrid({ children }) {
  return <div className="dash-stats admin-stats">{children}</div>
}

export function StatCard({ icon, value, label }) {
  return (
    <Card className="dash-stat">
      <div className="dash-stat-icon">{icon}</div>
      <div>
        <span className="dash-stat-value">{value}</span>
        <span className="dash-stat-label">{label}</span>
      </div>
    </Card>
  )
}
