import { Link } from 'react-router-dom'
import { FaStore, FaArrowRight } from 'react-icons/fa'
import { useTindisaApi } from '../api/client'
import { useLoad } from '../api/useLoad'
import { loadTaxonomy, useTaxonomy, businessNoun, isIndividualType, isPlaceholderShopName } from '../api/taxonomy'
import { missingLabels } from '../market/lib/pro'

/**
 * Rappel discret quand l'établissement est incomplet. Typiquement un établissement
 * créé automatiquement par l'assistant (« Ma boutique », sans ville ni contact) lors
 * du premier produit ajouté sur WhatsApp. Renvoie vers l'onboarding, qui le reprend.
 * Technicien : signale aussi ce qui manque au profil pro (métiers, zones, photos…).
 */
export default function ShopCompletionNudge() {
  const api = useTindisaApi()
  const taxonomy = useTaxonomy()
  const { data, loading } = useLoad(async () => {
    const shop = await api.get('/v1/merchant/shop').then((r) => r?.shop || null).catch(() => undefined)
    if (shop === undefined) return undefined
    const pro = isIndividualType(await loadTaxonomy(), shop?.shopType)
      ? await api.get('/v1/merchant/shop/pro').catch(() => null)
      : null
    return { shop, pro }
  }, [])
  if (loading || !data) return null
  const { shop, pro } = data
  const individual = isIndividualType(taxonomy, shop?.shopType)
  const missing = [
    isPlaceholderShopName(shop?.name) && 'le nom',
    !shop?.city && 'la ville',
    !shop?.phone && 'le contact',
    ...(individual && pro && !pro.complete ? missingLabels(pro.missing || []) : []),
  ].filter(Boolean)
  const unique = [...new Set(missing)]
  if (!unique.length) return null
  const noun = businessNoun(taxonomy, shop?.shopType)
  return (
    <Link to={individual ? '/vendre/pro' : '/vendre/boutique'} className="shop-nudge">
      <FaStore />
      <span>
        <b>{shop ? `Complétez ${noun.your}` : 'Créez votre espace pro'}</b>
        <small>Il manque {unique.join(', ')} : {individual ? 'les clients vous trouveront plus facilement.' : 'vos offres seront mieux trouvées sur le marché.'}</small>
      </span>
      <FaArrowRight />
    </Link>
  )
}
