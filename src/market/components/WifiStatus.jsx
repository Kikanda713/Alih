import { FaWifi } from 'react-icons/fa'
import { WIFI_STEPS, wifiInfo, wifiStepIndex } from '../lib/hubs'

/** Pastille d'état du Wi-Fi Tindisa d'un centre. */
export function WifiBadge({ status, compact = false }) {
  const info = wifiInfo(status)
  return (
    <span className={`mk-wifi mk-wifi-${info.id}`} title={info.label}>
      <FaWifi /> {compact ? info.short : info.label}
    </span>
  )
}

/** Suivi du déploiement : Planifié → Étude → Installation → En service. */
export function WifiTracker({ status, liveAt }) {
  const idx = wifiStepIndex(status)
  const maintenance = status === 'maintenance'
  return (
    <div className="mk-tracker" aria-label={`Déploiement Wi-Fi : ${wifiInfo(status).label}`}>
      <ol>
        {WIFI_STEPS.map((s, i) => (
          <li key={s.id} className={i < idx ? 'done' : i === idx ? 'current' : ''}>
            <span className="mk-tracker-dot" />
            <span className="mk-tracker-label">{s.short}</span>
          </li>
        ))}
      </ol>
      {maintenance && <p className="mk-tracker-note mk-warn">Maintenance en cours, le service revient rapidement.</p>}
      {status === 'live' && liveAt && (
        <p className="mk-tracker-note">En service depuis le {new Date(liveAt).toLocaleDateString('fr-FR')}</p>
      )}
    </div>
  )
}
