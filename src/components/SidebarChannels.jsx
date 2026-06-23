import { useState, useRef, useEffect } from 'react'
import { FaComments, FaWhatsapp, FaTelegramPlane, FaFacebookF, FaChevronDown, FaExternalLinkAlt } from 'react-icons/fa'
import { channels } from '../auth/config'
import { useT } from '../i18n/index.jsx'

/**
 * Groupe « Canaux » de la sidebar : clic -> sous-menu des canaux.
 * - Sidebar développée / drawer mobile : accordéon inline.
 * - Sidebar repliée (icônes) : flyout à droite de l'icône.
 * Chaque canal ouvre dans un nouvel onglet.
 */
export default function SidebarChannels() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const items = [
    { key: 'whatsapp', icon: <FaWhatsapp />, label: 'WhatsApp', url: channels.whatsapp },
    { key: 'telegram', icon: <FaTelegramPlane />, label: 'Telegram', url: channels.telegram },
    { key: 'facebook', icon: <FaFacebookF />, label: 'Facebook', url: channels.facebook },
  ]

  return (
    <div className={`sidebar-group${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className="dash-nav-item sidebar-group-trigger"
        title={t('dash.nav.channels')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <FaComments /> <span>{t('dash.nav.channels')}</span>
        <FaChevronDown className="sidebar-group-caret" />
      </button>

      <div className="sidebar-submenu">
        {items.map((c) => (
          <a
            key={c.key}
            className={`sidebar-subitem ch-${c.key}`}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <span className="sidebar-subicon">{c.icon}</span>
            <span>{c.label}</span>
            <FaExternalLinkAlt className="sidebar-subext" />
          </a>
        ))}
      </div>
    </div>
  )
}
