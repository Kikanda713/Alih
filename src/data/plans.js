// Plans d'abonnement vendeur — SOURCE DE VÉRITÉ des prix (le backend s'aligne) :
// gratuit 0, basic 9, pro 29, business 59 USD. Limites cohérentes avec le backend
// (libs/shared/billing/plans.ts) : articles + recommandations/mois + fonctionnalités.
export const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    trial: false,
    features: ['5 articles', '150 recommandations / mois', 'Vente de base', 'WhatsApp & Telegram'],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9,
    trial: false,
    features: ['80 articles', '1 500 recommandations / mois', 'Produits ET services', 'Publication Facebook'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    trial: true,
    featured: true,
    features: ['500 articles', '8 000 recommandations / mois', 'Certificats Wanzo', 'Statistiques avancées'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 59,
    trial: false,
    features: ['Catalogue illimité', '50 000 recommandations / mois', 'Tout du plan Pro', 'Support prioritaire'],
  },
]

export const planById = (id) => PLANS.find((p) => p.id === id)
