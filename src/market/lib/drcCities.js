// Coordonnées (lat, lng) des villes de la taxonomie (DRC_CITIES, backend) : placent
// un centre sur la carte quand il n'a pas encore de position GPS.
export const DRC_CITY_COORDS = {
  kinshasa: [-4.325, 15.322],
  lubumbashi: [-11.664, 27.479],
  goma: [-1.679, 29.228],
  bukavu: [-2.508, 28.861],
  kisangani: [0.516, 25.191],
  'mbuji-mayi': [-6.136, 23.59],
  kananga: [-5.896, 22.417],
  kolwezi: [-10.716, 25.472],
  likasi: [-10.981, 26.733],
  matadi: [-5.816, 13.45],
  boma: [-5.854, 13.05],
  mbandaka: [0.048, 18.26],
  bunia: [1.566, 30.252],
  uvira: [-3.395, 29.138],
  kindu: [-2.944, 25.923],
  kalemie: [-5.947, 29.195],
  beni: [0.491, 29.473],
  butembo: [0.142, 29.291],
  gemena: [3.257, 19.772],
  tshikapa: [-6.416, 20.799],
  kikwit: [-5.041, 18.816],
  bandundu: [-3.317, 17.381],
  isiro: [2.774, 27.616],
  kabinda: [-6.13, 24.48],
}

export function cityCoords(city) {
  if (!city) return null
  return DRC_CITY_COORDS[String(city).trim().toLowerCase().replace(/\s+/g, '-')] || null
}
