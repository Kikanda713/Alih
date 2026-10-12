import { Link } from 'react-router-dom'
import { FaStore, FaArrowRight } from 'react-icons/fa'
import { useTindisaApi } from '../api/client'
import { useLoad } from '../api/useLoad'

/**
 * Rappel discret quand la boutique est incomplète. Typiquement une boutique créée
 * automatiquement par l'assistant (« Ma boutique », sans ville ni contact) lors du
 * premier produit ajouté sur WhatsApp. Renvoie vers l'onboarding, qui la reprend.
 */
export default function ShopCompletionNudge() {
  const api = useTindisaApi()
  const { data: shop, loading } = useLoad(() => api.get('/v1/merchant/shop').then((r) => r?.shop || null).catch(() => undefined), [])
  if (loading || shop === undefined) return null
  const missing = [
    (!shop || !shop.name || shop.name === 'Ma boutique') && 'le nom',
    !shop?.city && 'la ville',
    !shop?.phone && 'le contact',
  ].filter(Boolean)
  if (!missing.length) return null
  return (
    <Link to="/vendre/boutique" className="shop-nudge">
      <FaStore />
      <span>
        <b>{shop ? 'Complétez votre boutique' : 'Créez votre boutique'}</b>
        <small>Il manque {missing.join(', ')} : vos offres seront mieux trouvées sur le marché.</small>
      </span>
      <FaArrowRight />
    </Link>
  )
}
