# Tindisa : frontend (Alih)

Site public de la marketplace Tindisa, espace commerçant et back-office.
React 19 + Vite, CSS pur (charte ALIH : terracotta, ébène, ivoire), aucune
librairie UI. L'API est la gateway `Backend_furxaa` (`VITE_API_URL`).

## Démarrer

```bash
cp .env.example .env.local   # puis renseigner les VITE_*
npm ci
npm run dev                  # http://localhost:5173
npm run lint                 # doit rester à 0 problème
npm run build
```

Déploiement : un push sur `main` déclenche le CI/CD (image Docker nginx,
`Dockerfile` + `nginx.conf`). Le backend doit être déployé AVANT un front qui
dépend de nouvelles routes.

## Organisation

| Dossier | Rôle |
|---|---|
| `src/market/` | Site public multi-pages : `MarketLayout`, pages (`/marche`, `/annonce/:id`, `/boutique/:id`, `/panier`, `/centres`, `/centres/:id`, `/connectivite`, `/vendre`), composants réutilisables, `lib/` (API publique, formats, univers, passerelle messagerie) |
| `src/landing/` | Sections de l'accueil (`/`, composé dans `App.jsx`) |
| `src/pages/dashboard/` | Espace commerçant (Auth0) |
| `src/pages/admin/` | Back-office (rôles Auth0 `Admin-tindisa`, `crm-tindisa`, `admin-<ville>`) |
| `src/components/` | Kit UI partagé (`ui.jsx` : Button, Modal, Field…), Toast, Pagination |
| `src/api/` | `client.js` (appels authentifiés), `useLoad.js` (chargement lié à des dépendances), `taxonomy.js` (catégories, villes) |
| `src/i18n/` | Traductions FR / Lingala / Swahili |

## Principes

- **La transaction se conclut dans la messagerie.** Le site sert à découvrir,
  comparer et composer un panier ; `market/lib/chat.js` produit le message envoyé
  à l'assistant (WhatsApp / Telegram). Les références `TND-XXXXXXXX` (8 premiers
  caractères de l'id) sont résolues côté serveur par l'outil `get_product` :
  ne pas changer ce format sans adapter le backend.
- **Multiservice** : une offre est un produit (panier) ou un service dont l'unité
  (`billingUnit`) détermine la réservation : séjour (nuit, jour, semaine, mois),
  créneau (heure) ou prestation (forfait, km, m²…). Voir `market/lib/universes.js`.
- **Aucune donnée sensible côté public** : l'API `/v1/market/*` ne renvoie ni prix
  plancher, ni contact vendeur, ni pièces légales.
- **Chargement de données** : utiliser `useLoad(fetcher, deps)` plutôt qu'un
  `useEffect` qui fait `setLoading(true)` (règle `react-hooks/set-state-in-effect`).
- **Performance 3G** : back-office, espace commerçant, cartes Leaflet et jsPDF sont
  chargés à la demande (`React.lazy`) ; images Cloudinary redimensionnées
  (`market/lib/format.js > imageUrl`).
- **Rédaction** : pas de tiret long (—) dans les textes visibles.

## Variables d'environnement

Voir `.env.example` : Auth0 (`VITE_AUTH0_*`), API (`VITE_API_URL`), Cloudinary
(upload direct non signé), canaux (`VITE_WHATSAPP_URL`, `VITE_TELEGRAM_URL`).
