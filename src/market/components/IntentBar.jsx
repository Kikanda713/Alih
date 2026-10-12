import { Link } from 'react-router-dom'
import { FaWifi } from 'react-icons/fa'
import { UNIVERSES, universeHref } from '../lib/universes'

/**
 * Barre d'intentions du marché multiservice : on entre par ce que l'on veut
 * FAIRE (acheter, réserver, engager, faire livrer…), pas par un rayon générique.
 */
export default function IntentBar({ active }) {
  return (
    <nav className="mk-intents" aria-label="Que voulez-vous faire ?">
      {UNIVERSES.map((u) => (
        <Link key={u.id} to={universeHref(u)} className={`mk-intent mk-u-${u.id}${active?.id === u.id ? ' active' : ''}`}>
          <span className="mk-intent-ic"><u.icon /></span>
          <span className="mk-intent-tx"><b>{u.verb}</b><small>{u.label}</small></span>
        </Link>
      ))}
      <Link to="/centres" className="mk-intent mk-intent-hubs">
        <span className="mk-intent-ic"><FaWifi /></span>
        <span className="mk-intent-tx"><b>Explorer</b><small>Wifi Zone</small></span>
      </Link>
    </nav>
  )
}
