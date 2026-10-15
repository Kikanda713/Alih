import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaExchangeAlt, FaMapMarkerAlt, FaCertificate, FaStore } from 'react-icons/fa'
import { Button, EmptyState } from '../../components/ui'
import { useLoad } from '../../api/useLoad'
import { useTaxonomy } from '../../api/taxonomy'
import { marketApi } from '../lib/api'
import { imageUrl, cityLabel } from '../lib/format'
import { ESCROW_OPEN, BATA_FAMILIES, cashModeLabel, txt, usd, wantsSummary } from '../lib/bata'
import ChannelLinks from '../components/ChannelLinks'
import BataComparables from '../components/BataComparables'

const PAGE = 12
const REGISTER_TEXT = 'Bonjour Tindisa, je veux inscrire mon véhicule (ou téléphone) pour un BATA'

function BataCard({ item }) {
  const taxonomy = useTaxonomy()
  const img = imageUrl(txt(item.image), 420)
  const value = usd(item.valueUsd)
  const wants = wantsSummary(item.wants)
  const summary = txt(item.summary)
  const city = txt(item.city)
  const id = txt(item.productId)
  return (
    <Link to={id ? `/annonce/${id}` : '/bata'} className="mk-card mk-bata-card">
      <div className="mk-card-media">
        {img ? <img src={img} alt="" loading="lazy" /> : <span className="mk-card-noimg"><FaStore /></span>}
        <div className="mk-card-tags">
          <span className="mk-tag mk-tag-bata"><FaExchangeAlt /> BATA</span>
          {item.certificateSerial && <span className="mk-tag mk-tag-cert"><FaCertificate /> Certifié</span>}
        </div>
      </div>
      <div className="mk-card-body">
        <h3 className="mk-card-title">{txt(item.name) || 'Bien à échanger'}</h3>
        {value && <div className="mk-card-price"><strong>{value}</strong> <span>valeur certifiée</span></div>}
        {summary && <p className="mk-bata-summary">{summary}</p>}
        <p className="mk-bata-wants"><b>Cherche :</b> {wants || 'ouvert aux propositions'}</p>
        <div className="mk-card-meta">
          {city && <span><FaMapMarkerAlt /> {cityLabel(taxonomy, city)}</span>}
          <span>{cashModeLabel(item.cashMode)}</span>
        </div>
      </div>
    </Link>
  )
}

export default function BataPage() {
  const [params, setParams] = useSearchParams()
  const taxonomy = useTaxonomy()
  const family = params.get('family') || ''
  const city = params.get('city') || ''
  const [pages, setPages] = useState(1)
  // Valeur de son bien (facultative) : classe les biens du marché du plus proche au plus éloigné.
  const [myValue, setMyValue] = useState('')

  useEffect(() => { document.title = 'BATA, l’échange de biens · Tindisa' }, [])

  const { data, loading, error, reload } = useLoad(
    () => marketApi.bata({ family, city, limit: PAGE * pages, offset: 0 }),
    [family, city, pages],
  )
  const items = Array.isArray(data?.items) ? data.items.filter((i) => i && typeof i === 'object') : []
  const hasMore = !!data?.hasMore

  const setFamily = (f) => {
    const next = new URLSearchParams(params)
    if (f) next.set('family', f)
    else next.delete('family')
    setPages(1)
    setParams(next, { replace: true })
  }

  return (
    <div className="mk-container mk-bata-page">
      <header className="mk-explore-head">
        <div>
          <h1>BATA, l’échange de biens</h1>
          <p className="mk-muted">
            Échangez votre véhicule, téléphone ou ordinateur contre un autre, plus cher ou moins cher. La différence se paie en cash.
            {city ? <> À {cityLabel(taxonomy, city)}.</> : null}
          </p>
        </div>
      </header>

      <ul className="mk-bata-rules">
        <li><FaCertificate /> <span><b>Certificat de valeur obligatoire</b> pour chaque bien échangé.</span></li>
        <li><FaExchangeAlt /> <span>Véhicules (voitures, motos), téléphones et ordinateurs à partir de 100 $.</span></li>
        <li><FaStore /> <span>{ESCROW_OPEN ? 'Différence réglée en séquestre Tindisa (recommandé) ou directement entre vous.' : 'Différence réglée directement entre vous (séquestre Tindisa bientôt disponible).'}</span></li>
      </ul>

      <div className="mk-chips mk-bata-toggle" role="group" aria-label="Type de bien">
        <button type="button" className={`mk-chip${!family ? ' active' : ''}`} onClick={() => setFamily('')}>Tout</button>
        {BATA_FAMILIES.map((f) => (
          <button key={f.id} type="button" className={`mk-chip${family === f.id ? ' active' : ''}`} onClick={() => setFamily(f.id)}>{f.label}</button>
        ))}
      </div>

      {error && !items.length ? (
        <EmptyState icon={<FaExchangeAlt />} title="Les offres ne se chargent pas" text="Vérifiez votre connexion puis réessayez."
          action={<Button onClick={reload}>Réessayer</Button>} />
      ) : loading && !items.length ? (
        <div className="mk-grid" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mk-card mk-skel" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FaExchangeAlt />}
          title="Pas encore d’offre BATA ici"
          text="Soyez le premier : inscrivez votre bien avec l’assistant Tindisa, il s’occupe du certificat et vous prévient dès qu’un échange correspond."
          action={(
            <div className="mk-bata-cta">
              <strong>Inscrire mon bien</strong>
              <ChannelLinks text={REGISTER_TEXT} label="" />
              <Link to="/dashboard/catalogue" className="mk-bata-shop-link">Vous êtes une boutique ? Activez le BATA depuis votre espace</Link>
            </div>
          )}
        />
      ) : (
        <>
          <div className="mk-grid">
            {items.map((it, i) => <BataCard key={txt(it.productId) || i} item={it} />)}
          </div>
          {hasMore && (
            <div className="mk-more">
              <Button variant="secondary" onClick={() => setPages((p) => p + 1)} disabled={loading}>{loading ? 'Chargement…' : 'Voir plus'}</Button>
            </div>
          )}
          <div className="mk-assist">
            <span>Vous avez un bien à échanger ? Inscrivez-le avec l’assistant.</span>
            <ChannelLinks text={REGISTER_TEXT} label="" />
            <Link to="/dashboard/catalogue" className="mk-bata-shop-link">Boutique : activez le BATA depuis votre espace</Link>
          </div>
        </>
      )}

      <div className="mk-bata-market">
        <label className="mk-bata-value">
          <span>Valeur de votre bien ($)</span>
          <input type="number" inputMode="numeric" min="0" placeholder="ex. 6500" value={myValue} onChange={(e) => setMyValue(e.target.value)} />
        </label>
        <BataComparables family={family || 'vehicule'} value={myValue} city={city || undefined} limit={8} />
      </div>
    </div>
  )
}
