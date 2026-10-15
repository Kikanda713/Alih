import { Link } from 'react-router-dom'
import { FaExchangeAlt, FaCommentDots } from 'react-icons/fa'
import { useChat } from '../chat/useChat'
import ChannelLinks from './ChannelLinks'
import { bataFamilyOf, cashModeLabel, txt, usd, wantsSummary } from '../lib/bata'
import BataComparables from './BataComparables'

/**
 * Bloc « BATA possible » d'une annonce : le propriétaire accepte d'échanger ce
 * bien certifié contre un autre, la différence étant réglée en cash.
 * Le message est pré-rempli (pas envoyé) : l'utilisateur précise ce qu'il propose.
 */
export default function BataBlock({ item }) {
  const { openChat } = useChat()
  const bata = item?.bata
  if (!bata || typeof bata !== 'object') return null
  const value = usd(bata.valueUsd)
  const wants = wantsSummary(bata.wants)
  const ref = txt(item.ref)
  const text = `Je veux proposer un BATA pour ${txt(item.name)}${ref ? ` (réf. ${ref})` : ''} : j’ai … à échanger`

  return (
    <section className="mk-bata-block" aria-label="BATA possible">
      <h2><FaExchangeAlt /> BATA possible</h2>
      <dl className="mk-bata-facts">
        {value && <div><dt>Valeur certifiée</dt><dd>{value}</dd></div>}
        <div><dt>Le propriétaire cherche</dt><dd>{wants || 'Ouvert aux propositions'}</dd></div>
        <div><dt>Différence</dt><dd>{cashModeLabel(bata.cashMode)}</dd></div>
      </dl>
      <button type="button" className="ui-btn ui-btn-secondary mk-btn-block" onClick={() => openChat({ text, send: false })}>
        <FaCommentDots /> Proposer un échange
      </button>
      <ChannelLinks text={text} />
      <BataComparables
        compact
        family={bataFamilyOf(item.category, item.subcategory) || 'vehicule'}
        value={bata.valueUsd}
        exclude={item.id || item.productId}
        limit={3}
        title="Biens de valeur proche sur le marché"
      />
      <p className="mk-hint">
        Le BATA, c’est échanger un bien certifié contre un autre et régler la différence en cash. <Link to="/bata">En savoir plus</Link>
      </p>
    </section>
  )
}
