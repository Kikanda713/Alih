import { Link } from 'react-router-dom'
import { FaRobot } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useLoad } from '../../api/useLoad'
import { Badge, Spinner } from '../../components/ui.jsx'
import { useAdminView } from './adminView'

/*
 * Suggestions personnalisées : ce que l'IA a décidé pour chaque client (écrire ou
 * s'abstenir), le message rédigé et sa remise. Clients masqués. Lecture seule.
 */

const when = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '')
const DECISION = {
  send: { tone: 'warn', label: 'Rédigée' },
  skip: { tone: 'neutral', label: 'Abstention' },
  error: { tone: 'danger', label: 'Erreur' },
}

export default function ProactivePanel() {
  const api = useTindisaApi()
  const { city, withCity } = useAdminView()
  const q = useLoad(() => api.get(withCity('/v1/admin/proactive')).catch(() => null), [city])
  const d = q.data

  return (
    <details className="admin-proactive">
      <summary>
        <FaRobot /> Suggestions automatiques aux clients
        {d && <small> · {d.sent30d} envoyée(s) en 30 j · {d.optedOut} désinscrit(s) · {d.dormant} au repos</small>}
      </summary>
      {q.loading ? <Spinner /> : !d ? <p className="dash-sub">Suivi indisponible.</p> : (
        <>
          <p className="dash-sub">
            Deux passages par jour : l’IA choisit les clients dont une annonce répond à leurs recherches ou intérêts,
            décide d’écrire ou non, puis rédige le message. Envoi par WhatsApp ou Telegram, au rythme de la file
            anti-bannissement, jamais deux fois le même article ; « STOP » désinscrit le client.
          </p>
          {!d.recent?.length ? <p className="dash-sub">Aucune décision pour l’instant.</p> : (
            <ul className="admin-proactive-list">
              {d.recent.map((r) => {
                const dec = r.deliveredAt ? { tone: 'success', label: 'Remise' } : DECISION[r.decision] || DECISION.error
                return (
                  <li key={r.id}>
                    <div className="admin-proactive-head">
                      <Badge tone={dec.tone}>{dec.label}</Badge>
                      <span className="cat-sku">{when(r.deliveredAt || r.at)} · client {r.buyer}</span>
                      {r.productId && <Link to={`/annonce/${r.productId}`} target="_blank">{r.productName || 'annonce'}</Link>}
                    </div>
                    {r.message && <p className="admin-proactive-msg">{r.message}</p>}
                    {r.reason && <small className="dash-sub">{r.decision === 'send' ? 'Pourquoi : ' : ''}{r.reason}{r.model ? ` · ${r.model}` : ''}</small>}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </details>
  )
}
