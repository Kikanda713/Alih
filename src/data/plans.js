// Plans d'abonnement vendeur — SOURCE DE VÉRITÉ des prix (le backend s'aligne) :
// gratuit 0, basic 9, pro 29, business 59 USD. Limites cohérentes avec le backend
// (libs/shared/billing/plans.ts). PHILOSOPHIE : le CATALOGUE est généreux à tous
// les paliers (charger librement pour enrichir le marché) ; la ressource limitée
// et monétisée est la RECOMMANDATION (nombre de fois où l'agent expose la boutique
// aux acheteurs). Au-delà du quota, la boutique n'est plus recommandée jusqu'au
// mois suivant ou à la montée en gamme (elle reste visible sur sa propre page).
export const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    trial: false,
    features: ['100 articles', '300 recommandations / mois', 'Vente de base', 'WhatsApp & Telegram'],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9,
    trial: false,
    features: ['1 000 articles', '3 000 recommandations / mois', 'Produits ET services', 'Publication Facebook'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    trial: true,
    featured: true,
    features: ['10 000 articles', '15 000 recommandations / mois', 'Certificats Wanzo', 'Statistiques avancées'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 59,
    trial: false,
    features: ['Catalogue illimité', 'Recommandations illimitées', 'Tout du plan Pro', 'Support prioritaire'],
  },
]

export const planById = (id) => PLANS.find((p) => p.id === id)
