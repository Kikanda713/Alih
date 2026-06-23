import { FaWhatsapp, FaTelegramPlane, FaFacebookF, FaExternalLinkAlt } from 'react-icons/fa'
import { channels } from '../auth/config'
import { Card } from './ui.jsx'
import { useT } from '../i18n/index.jsx'

/**
 * Accès direct du marchand à ses canaux : ouvrir sa session WhatsApp / Telegram,
 * ou visualiser la page Facebook gérée par Tindisa. Ouvre dans un nouvel onglet.
 */
export default function ChannelsCard() {
  const { t } = useT()
  const items = [
    { key: 'whatsapp', icon: <FaWhatsapp />, label: 'WhatsApp', desc: t('channels.whatsapp'), url: channels.whatsapp },
    { key: 'telegram', icon: <FaTelegramPlane />, label: 'Telegram', desc: t('channels.telegram'), url: channels.telegram },
    { key: 'facebook', icon: <FaFacebookF />, label: 'Facebook', desc: t('channels.facebook'), url: channels.facebook },
  ]
  return (
    <Card className="channels-card">
      <div className="channels-head">
        <h2 className="dash-h2">{t('channels.title')}</h2>
        <p className="dash-sub">{t('channels.subtitle')}</p>
      </div>
      <div className="channels-grid">
        {items.map((c) => (
          <a key={c.key} className={`channel-btn ch-${c.key}`} href={c.url} target="_blank" rel="noopener noreferrer">
            <span className="channel-icon">{c.icon}</span>
            <span className="channel-text">
              <span className="channel-label">{c.label}</span>
              <span className="channel-desc">{c.desc}</span>
            </span>
            <FaExternalLinkAlt className="channel-ext" />
          </a>
        ))}
      </div>
    </Card>
  )
}
