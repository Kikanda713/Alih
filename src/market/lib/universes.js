import {
  FaShoppingBasket, FaSeedling, FaHotel, FaHardHat, FaTruck, FaHome, FaBriefcaseMedical,
} from 'react-icons/fa'

/*
 * « Univers » = grandes portes d'entrée du marché, regroupant les catégories de la
 * taxonomie backend (source unique). Ce ne sont que des préréglages de filtres :
 * tout reste filtrable finement ensuite (catégorie, sous-catégorie, ville…).
 */
export const UNIVERSES = [
  {
    id: 'produits', verb: 'Acheter', label: 'Produits', title: 'Produits du marché',
    desc: 'Électronique, mode, maison, beauté, pièces auto',
    icon: FaShoppingBasket, params: { type: 'product' },
  },
  {
    id: 'agriculture', verb: 'Acheter aux producteurs', label: 'Agriculture', title: 'Agriculture & vivres',
    desc: 'Récoltes, produits frais, intrants, élevage',
    icon: FaSeedling, params: { category: 'agriculture-elevage,alimentaire' },
  },
  {
    id: 'hotels', verb: 'Réserver', label: 'Hôtels & salles', title: 'Hôtels, salles & événements',
    desc: 'Chambres, meublés, salles de conférence et de fête',
    icon: FaHotel, params: { category: 'hebergement,evenementiel' },
  },
  {
    id: 'main-oeuvre', verb: 'Engager', label: "Main d'œuvre", title: "Main d'œuvre & artisans",
    desc: 'Maçons, électriciens, plombiers, réparateurs',
    icon: FaHardHat, params: { category: 'construction-batiment,reparation-maintenance,beaute-bienetre' },
  },
  {
    id: 'transport', verb: 'Faire livrer', label: 'Livraison & transport', title: 'Livraison & transport',
    desc: 'Coursiers, fret, déménagement, location de véhicules',
    icon: FaTruck, params: { category: 'transport-logistique,location-vehicules' },
  },
  {
    id: 'immobilier', verb: 'Louer ou acheter', label: 'Immobilier', title: 'Immobilier',
    desc: 'Maisons, appartements, bureaux, parcelles',
    icon: FaHome, params: { category: 'immobilier' },
  },
  {
    id: 'services', verb: 'Consulter', label: 'Services & santé', title: 'Services, santé & formation',
    desc: 'Restauration, soins, cours, conseil, digital',
    icon: FaBriefcaseMedical, params: { category: 'restauration,sante-soins,education-formation,services-pro,autre-service' },
  },
]

export function universeHref(u) {
  return `/marche?${new URLSearchParams(u.params).toString()}`
}

// Univers correspondant aux filtres courants (pour surligner la puce active).
export function activeUniverse(params) {
  return UNIVERSES.find((u) =>
    Object.entries(u.params).every(([k, v]) => (params.get(k) || '') === v)
    && !['type', 'category'].some((k) => params.get(k) && !(k in u.params)),
  ) || null
}

// Mode de réservation d'un service selon son unité de facturation.
//  stay = séjour/location (dates début → fin) ; slot = à l'heure ; job = prestation.
export function bookingMode(item) {
  if (!item || item.type !== 'service') return null
  const u = item.billingUnit
  if (['night', 'day', 'week', 'month'].includes(u)) return 'stay'
  if (u === 'hour') return 'slot'
  return 'job'
}
