import { useEffect, useRef, useState } from 'react'
import { FaPlay } from 'react-icons/fa'
import { SOCIAL_NETWORKS, tiktokHandle, youtubeEmbed, facebookEmbed } from '../lib/socials'

/*
 * Réseaux sociaux d'un établissement sur sa vitrine : liens, puis fil de publications
 * intégré (Facebook, TikTok, YouTube) chargé SEULEMENT à la demande : les widgets
 * tiers déposent des cookies et consomment des données (connexions 3G).
 */

function TikTokCreator({ handle }) {
  const ref = useRef(null)
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://www.tiktok.com/embed.js'
    script.async = true
    ref.current?.appendChild(script)
  }, [handle])
  return (
    <div ref={ref}>
      <blockquote className="tiktok-embed" cite={`https://www.tiktok.com/@${handle}`} data-unique-id={handle} data-embed-type="creator" style={{ maxWidth: 780, minWidth: 288 }}>
        <section><a target="_blank" rel="noopener noreferrer" href={`https://www.tiktok.com/@${handle}`}>@{handle}</a></section>
      </blockquote>
    </div>
  )
}

export default function ShopSocials({ socials = {}, shopName }) {
  const links = SOCIAL_NETWORKS.filter((n) => socials[n.id])
  const feeds = [
    socials.facebook && { id: 'facebook', label: 'Facebook', src: facebookEmbed(socials.facebook) },
    tiktokHandle(socials.tiktok) && { id: 'tiktok', label: 'TikTok', handle: tiktokHandle(socials.tiktok) },
    youtubeEmbed(socials.youtube) && { id: 'youtube', label: 'YouTube', src: youtubeEmbed(socials.youtube) },
  ].filter(Boolean)
  const [active, setActive] = useState(null)
  if (!links.length) return null
  const current = feeds.find((f) => f.id === active)

  return (
    <section className="mk-socials">
      <div className="mk-socials-links">
        {links.map((n) => (
          <a key={n.id} href={socials[n.id]} target="_blank" rel="noopener noreferrer" className={`mk-social mk-social-${n.id}`} aria-label={`${shopName || 'Établissement'} sur ${n.label}`}>
            <n.icon /> <span>{n.label}</span>
          </a>
        ))}
      </div>
      {feeds.length > 0 && (
        <div className="mk-socials-feed">
          <div className="mk-seg">
            {feeds.map((f) => (
              <button key={f.id} type="button" className={active === f.id ? 'active' : ''} onClick={() => setActive(f.id)}>
                <FaPlay /> Publications {f.label}
              </button>
            ))}
          </div>
          {current && (
            <div className="mk-socials-frame">
              {current.id === 'tiktok'
                ? <TikTokCreator handle={current.handle} />
                : <iframe title={`Publications ${current.label}`} src={current.src} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
