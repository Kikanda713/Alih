// Plans d'abonnement vendeur (alignés sur le backend payment: PLANS).
export const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9,
    trial: false,
    features: ['50 conversations / mois', 'Négociation incluse', 'Paiement sécurisé', 'Support WhatsApp & Telegram'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    trial: true,
    featured: true,
    features: ['Conversations illimitées', 'Mise en avant des produits', 'Négociation avancée', 'Support prioritaire 24/7'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 59,
    trial: false,
    features: ['Tout du plan Pro', 'Catalogue illimité', 'Marketing automatique', 'Dashboard & analytics', 'Gestionnaire dédié'],
  },
]

export const planById = (id) => PLANS.find((p) => p.id === id)
