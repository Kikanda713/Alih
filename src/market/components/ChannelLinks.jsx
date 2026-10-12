import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa'
import { useToast } from '../../components/useToast'
import { whatsappLink, openTelegram } from '../lib/chat'

/**
 * Nos messageries côte à côte (WhatsApp ET Telegram) : jamais WhatsApp seul.
 * Si WhatsApp pose problème, Telegram prend le relais avec le même assistant.
 * Telegram n'accepte pas de texte pré-rempli : le message est copié avant ouverture.
 */
export default function ChannelLinks({ text, label = 'ou sur', className = '' }) {
  const { notify } = useToast()
  return (
    <div className={`mk-alt-channels ${className}`.trim()}>
      {label && <span>{label}</span>}
      <a className="mk-ch-wa" href={whatsappLink(text)} target="_blank" rel="noopener noreferrer"><FaWhatsapp /> WhatsApp</a>
      <button type="button" className="mk-ch-tg" onClick={() => { openTelegram(text); notify('Message copié : collez-le dans Telegram', 'info', 4000) }}>
        <FaTelegramPlane /> Telegram
      </button>
    </div>
  )
}
