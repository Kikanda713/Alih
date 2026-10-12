import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaAward, FaMapMarkerAlt, FaBriefcase, FaCircle, FaPlay, FaTiktok, FaYoutube, FaExternalLinkAlt } from 'react-icons/fa'
import { imageUrl } from '../lib/format'
import { demoVideoEmbed } from '../lib/socials'

/*
 * Profil pro (technicien / artisan) sur sa page publique : métiers, zones,
 * expérience, disponibilité, certificat d'aptitude, puis réalisations
 * (photos + vidéos TikTok/YouTube chargées SEULEMENT à la demande : 3G).
 */

/** Badge du certificat d'aptitude professionnelle (ou mention de son absence). */
export function ProCertBadge({ serial, validUntil }) {
  if (!serial) return <span className="mk-pro-nocert">Sans certificat d’aptitude</span>
  const until = validUntil ? new Date(validUntil) : null
  return (
    <Link to={`/verify?c=${encodeURIComponent(serial)}`} className="mk-cert-btn mk-cert-btn-lg"
      title={until && !Number.isNaN(until.getTime()) ? `Valable jusqu’au ${until.toLocaleDateString('fr-FR')}` : undefined}>
      <FaAward /> Aptitude professionnelle certifiée
    </Link>
  )
}

/** Métiers, zones, expérience, disponibilité (dans l'en-tête de la page). */
export function ProFacts({ pro }) {
  const trades = (pro.trades || []).map((t) => (typeof t === 'string' ? { id: t, label: t } : t))
  const zones = pro.zones || []
  const years = Number(pro.experienceYears)
  return (
    <div className="mk-pro-facts">
      {trades.length > 0 && (
        <div className="mk-chips">{trades.map((t) => <span key={t.id} className="mk-pro-trade">{t.label}</span>)}</div>
      )}
      {zones.length > 0 && <p className="mk-muted"><FaMapMarkerAlt /> Intervient à {zones.join(', ')}</p>}
      <p className="mk-pro-line">
        {Number.isFinite(years) && pro.experienceYears != null && years > 0 && (
          <span><FaBriefcase /> {years} an{years > 1 ? 's' : ''} d’expérience</span>
        )}
        <span className={pro.available === false ? 'mk-pro-off' : 'mk-pro-on'}>
          <FaCircle /> {pro.available === false ? 'Indisponible pour le moment' : 'Disponible'}
        </span>
      </p>
      <ProCertBadge serial={pro.certificateSerial} validUntil={pro.certificateValidUntil} />
    </div>
  )
}

const NET = { tiktok: { label: 'TikTok', icon: FaTiktok }, youtube: { label: 'YouTube', icon: FaYoutube } }

/** Réalisations : grille de photos + vidéos de démonstration à la demande. */
export function ProWorks({ pro, name }) {
  const photos = pro.photos || []
  const videos = (pro.videos || []).filter((v) => v?.url)
  const [active, setActive] = useState(null)
  if (!photos.length && !videos.length) return null
  const current = active != null ? videos[active] : null
  const src = current ? demoVideoEmbed(current) : null
  return (
    <section className="mk-pro-works">
      <div className="mk-rail-head"><h2>Réalisations</h2></div>
      {photos.length > 0 && (
        <div className="mk-pro-gallery">
          {photos.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Réalisation ${i + 1} de ${name || 'ce professionnel'} (agrandir)`}>
              <img src={imageUrl(url, 420)} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {videos.length > 0 && (
        <div className="mk-socials-feed">
          <div className="mk-seg">
            {videos.map((v, i) => {
              const n = NET[v.network] || NET.youtube
              return demoVideoEmbed(v) ? (
                <button key={v.url} type="button" className={active === i ? 'active' : ''} onClick={() => setActive(i)}>
                  <FaPlay /> Vidéo {i + 1} <n.icon />
                </button>
              ) : (
                <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="mk-pro-video-link">
                  <n.icon /> Vidéo {i + 1} sur {n.label} <FaExternalLinkAlt />
                </a>
              )
            })}
          </div>
          {src && (
            <div className={`mk-pro-video mk-pro-video-${current.network}`}>
              <iframe title={`Vidéo de démonstration ${active + 1}`} src={src} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
