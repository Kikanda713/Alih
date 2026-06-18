# Cahier des Spécifications Logicielles — ALIH (Vente 4.0)

**ALIH — Autonomous Intelligent Liquidity Hub**
Plateforme de commerce conversationnel via messagerie (WhatsApp / Telegram)

---

## 1. Architecture Globale du Système

### 1.1 Principe fondamental

ALIH est une plateforme **API-first + event-driven + agent-centric**.

Aucune logique métier critique ne vit dans le frontend. Le système est composé de **5 couches indépendantes** :

```
[ FRONTEND (Landing Page / Chat UI) ]
                │
                ▼
[ API GATEWAY / BFF ]
                │
                ▼
[ ALIH CORE BACKEND ]
                │
     ┌──────────┼───────────┐
     ▼          ▼           ▼
[ AGENT ENGINE ] [ PAYMENT ] [ DATA SYNC ]
     │
     ▼
[ LLM RUNTIME (VM isolée) ]
```

### 1.2 Principes directeurs

- **Conversation-first** : l'UI e-commerce classique est remplacée par des agents négociateurs autonomes
- **Messagerie comme canal** : le commerce s'exécute via WhatsApp, Telegram, et futurs canaux
- **Séparation stricte** : frontend / backend / agent runtime sont isolés
- **Escrow obligatoire** : aucun transfert de fonds sans validation
- **Source externe = vérité sur stock** : ALIH = couche intelligente uniquement

---

## 2. Frontend

### 2.1 Philosophie

ALIH n'est pas une marketplace UI classique. Le frontend est uniquement :

- Une **interface conversationnelle**
- Un **point d'entrée unique** vers les agents
- Un **router** vers WhatsApp / Telegram / Webchat

Le frontend ne stocke aucune logique métier. Il fait uniquement :

- Routing vers le backend
- Affichage de conversations
- Streaming des réponses agents

### 2.2 Stack technique

| Couche | Technologie | Justification |
|--------|------------|---------------|
| Framework | **React + Vite** (actuel) → migration **Next.js App Router** | SSR, SEO, routing avancé |
| Styling | **TailwindCSS** | Productivité, design system cohérent |
| État | **XState** ou Zustand | Machine à états pour conversations |
| Temps réel | **WebSocket** client | Streaming réponses agents |
| Mobile (Phase 2) | **React Native** | Deep links WhatsApp / Telegram |

### 2.3 Structure de la Landing Page

L'objectif est de **convertir l'utilisateur vers une conversation IA**.

```
┌─────────────────────────────────────────────────┐
│  NAVBAR                                          │
│  Accueil | Produits | Comment ça marche |        │
│  Catégories | Avis | Contact  [Connexion][Inscription] │
├─────────────────────────────────────────────────┤
│  HERO                                            │
│  "Acheter depuis votre messagerie"               │
│  [WhatsApp] [Telegram]                           │
│  Stats : clients / produits / support            │
│  Mockup téléphone avec chat simulé               │
├─────────────────────────────────────────────────┤
│  COMMENT ÇA MARCHE                               │
│  1. Envoyez un message  2. L'IA cherche          │
│  3. Validez  4. Paiement Mobile Money            │
├─────────────────────────────────────────────────┤
│  DÉMO DYNAMIQUE                                  │
│  Simulateur conversationnel embedded             │
├─────────────────────────────────────────────────┤
│  TRUST / CONFIANCE                               │
│  KYC | Sécurité | Paiements sécurisés            │
├─────────────────────────────────────────────────┤
│  CTA FINAL                                       │
│  "Commencer à discuter"                          │
└─────────────────────────────────────────────────┘
```

### 2.4 Évolutions prévues (depuis l'existant)

| Actuel (Vente 4.0) | Cible (ALIH complet) |
|---------------------|----------------------|
| Landing page React statique | Next.js SSR avec App Router |
| Liens WhatsApp/Telegram simples | Deep links avec contexte conversationnel |
| Mockup statique | Simulateur conversationnel interactif |
| Pas d'auth | Auth OTP + JWT |
| Pas de backend | API Gateway + services |

---

## 3. Backend ALIH Core

### 3.1 Architecture

Backend **modulaire event-driven** :

```
API Gateway (BFF)
   ↓
Auth Service
   ↓
Conversation Service
   ↓
Agent Orchestrator
   ↓
Event Bus (Kafka / NATS)
   ↓
Services spécialisés
```

### 3.2 Services backend

#### 3.2.1 Auth Service

- OTP WhatsApp (via Business API)
- OTP SMS (fallback)
- JWT session tokens
- Device binding (empreinte appareil)

#### 3.2.2 Conversation Service

- Stockage de tous les messages (multi-canal)
- Contexte utilisateur persistant
- Routing agentique (sélection du bon agent selon l'intention)

#### 3.2.3 Commerce Service

- Recherche produits (full-text + vectorielle)
- Matching offre / demande
- Scoring des offres (pertinence, prix, état)

#### 3.2.4 Negotiation Engine

- Calcul de contre-offres basé sur :
  - Prix vendeur + `min_price`
  - Historique client (trust score, achats passés)
  - Demande marché (tendances, disponibilité)
- Validation stricte : aucun agent ne peut bypasser `min_price`

#### 3.2.5 Asset Service

- Gestion des objets / produits
- Scoring de valeur (condition, marché)
- Stockage des diagnostics (images, descriptions)

#### 3.2.6 Payment Service

- Initiation de paiement
- Système d'escrow (séquestration des fonds)
- Confirmation et release de transaction

#### 3.2.7 Marketing Service

- Génération automatique de contenu
- Publication sur réseaux sociaux (Facebook, WhatsApp Status, TikTok)
- Tracking d'engagement

### 3.3 Stack backend recommandée

| Composant | Technologie |
|-----------|------------|
| Runtime | **Node.js** (TypeScript) ou **Python** (FastAPI) |
| Base de données principale | **PostgreSQL** |
| Cache | **Redis** |
| Event Bus | **Kafka** ou **NATS** |
| Vector DB (agents) | **Pinecone** ou **pgvector** |
| Queue | **BullMQ** (Redis) |
| Orchestration | **Docker + Kubernetes** |

---

## 4. API Gateway (BFF)

### 4.1 Responsabilités

- Exposer une API unique vers le frontend
- Rate limiting
- Vérification d'authentification
- Routing vers les services internes

### 4.2 Endpoints principaux

```
# Conversation
POST   /v1/chat/message          Envoyer un message
GET    /v1/chat/history           Historique de conversation
WS     /v1/chat/stream            Streaming réponses agents

# Recherche
POST   /v1/search                 Rechercher des produits
GET    /v1/products/:id           Détail d'un produit

# Commerce
POST   /v1/offer                  Soumettre une offre
POST   /v1/negotiate              Lancer une négociation
GET    /v1/offers/:id             Statut d'une offre

# Paiement
POST   /v1/payment/initiate      Initier un paiement
POST   /v1/payment/confirm       Confirmer réception
GET    /v1/payment/:id/status     Statut du paiement

# Auth
POST   /v1/auth/otp/request      Demander un OTP
POST   /v1/auth/otp/verify       Vérifier OTP
POST   /v1/auth/refresh          Rafraîchir le token JWT
```

### 4.3 Format de réponse standard

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-06-18T12:00:00Z",
    "request_id": "uuid"
  }
}
```

---

## 5. Couche Agentique (LLM Runtime)

### 5.1 Architecture Agent Runtime

Les agents fonctionnent dans un **environnement isolé** :

```
┌─────────────────────────────┐
│       AGENT RUNTIME          │
│                              │
│  ┌───────────────────────┐  │
│  │    LLM Router         │  │
│  │  (sélection de modèle)│  │
│  └──────────┬────────────┘  │
│             │               │
│  ┌──────────▼────────────┐  │
│  │    Tools Registry     │  │
│  │  (outils disponibles) │  │
│  └──────────┬────────────┘  │
│             │               │
│  ┌──────────▼────────────┐  │
│  │    Memory Store       │  │
│  │  (contexte + vector)  │  │
│  └──────────┬────────────┘  │
│             │               │
│  ┌──────────▼────────────┐  │
│  │   Workflow Engine     │  │
│  │  (orchestration)      │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### 5.2 Agents ALIH

#### 5.2.1 Commerce Agent

- Comprend l'intention utilisateur (NLU)
- Lance une recherche dans le catalogue
- Propose des produits pertinents
- Gère les filtres conversationnels

#### 5.2.2 Negotiation Agent (CRITIQUE)

**Inputs :**
- Prix vendeur + `min_price`
- Historique client
- Demande du marché

**Outputs :**
- `counter_offer` (contre-proposition)
- `accept` (acceptation)
- `reject` (refus avec raison)

**Règles strictes :**
- Ne jamais proposer en dessous de `min_price`
- Maximum 3 tours de négociation par offre
- Timeout : 30s sans réponse = offre expirée

#### 5.2.3 Pricing Agent

- Calcule la valeur marché dynamique
- Analyse les prix comparables
- Ajuste selon l'offre et la demande

#### 5.2.4 Marketing Agent

- Crée du contenu pour Facebook / WhatsApp Status / TikTok
- Génère descriptions et visuels produits
- Programme les publications

#### 5.2.5 Diagnostic Agent

- Analyse les images d'appareils
- Retourne un score qualité (0-100)
- Identifie les défauts visibles

### 5.3 Orchestration des agents

Workflow type d'une interaction :

```
Intent Detection (quelle est la demande ?)
    → Agent Selection (quel agent est compétent ?)
        → Tool Execution (recherche, calcul, API...)
            → Response Synthesis (formulation naturelle)
                → Validation Rules (respect des contraintes)
                    → Response to User
```

---

## 6. Passerelle API Externe (Data Sync)

### 6.1 Objectif

Connecter ALIH à des systèmes externes (ERP, catalogue source, inventaire).

### 6.2 Modes de fonctionnement

| Mode | Description | Usage |
|------|-------------|-------|
| Webhook | Ingestion temps réel sur événement externe | Mise à jour stock, prix |
| Polling | Requête périodique (fallback) | Synchronisation horaire |
| Event-driven | Publication sur event bus interne | Propagation aux agents |

### 6.3 Données synchronisées

- `products` — catalogue complet
- `stock` — disponibilité temps réel
- `prices` — tarifs à jour
- `images` — médias produits
- `availability` — statut (disponible, réservé, vendu)

### 6.4 Règle critique

> **Source externe = vérité sur stock.**
> ALIH est une couche intelligente uniquement, pas une source de vérité d'inventaire.

---

## 7. Système de Paiement

### 7.1 Flux complet

```
User → Payment Intent → Escrow (blocage) → Provider → Confirmation → Release
```

### 7.2 Providers supportés

| Provider | Marché | Type |
|----------|--------|------|
| **M-Pesa** | RDC, Afrique de l'Est | Mobile Money |
| **Orange Money** | Afrique de l'Ouest/Centrale | Mobile Money |
| **Airtel Money** | RDC, Afrique | Mobile Money |
| **Bank Transfer API** | Universel | Virement bancaire |

### 7.3 Système d'Escrow (séquestre)

Étapes obligatoires :

1. **Création** de la transaction
2. **Blocage** des fonds (côté acheteur)
3. **Livraison** du produit
4. **Confirmation** par l'utilisateur (ou timeout 48h)
5. **Release** des fonds vers le vendeur

### 7.4 Anti-fraude

- Device fingerprinting
- KYC scoring (vérification d'identité)
- Détection d'anomalies transactionnelles
- Plafond de transaction selon le niveau KYC
- Aucun transfert sans confirmation utilisateur

---

## 8. Architecture des Données

### 8.1 Stack stockage

| Rôle | Technologie | Justification |
|------|------------|---------------|
| Base principale | **PostgreSQL** | ACID, relations, JSON support |
| Cache | **Redis** | Sessions, rate-limit, hot data |
| Event Bus | **Kafka / NATS** | Découplage, replay, scalabilité |
| Vector DB | **pgvector** (PostgreSQL) | Embeddings produits, conversations |

### 8.2 Modèle de données principal

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │    assets    │     │conversations │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ phone        │     │ title        │     │ user_id (FK) │
│ name         │     │ description  │     │ channel      │
│ kyc_status   │     │ price        │     │ context      │
│ trust_score  │     │ min_price    │     │ status       │
│ device_id    │     │ condition    │     │ created_at   │
│ created_at   │     │ seller_id(FK)│     └──────┬───────┘
└──────────────┘     │ category     │            │
                     │ images[]     │     ┌──────▼───────┐
                     │ status       │     │   messages   │
                     └──────┬───────┘     ├──────────────┤
                            │             │ id (PK)      │
                     ┌──────▼───────┐     │ conv_id (FK) │
                     │    offers    │     │ role         │
                     ├──────────────┤     │ content      │
                     │ id (PK)      │     │ metadata     │
                     │ asset_id(FK) │     │ created_at   │
                     │ buyer_id(FK) │     └──────────────┘
                     │ buyer_offer  │
                     │ counter_offer│
                     │ status       │
                     │ expires_at   │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │ transactions │
                     ├──────────────┤
                     │ id (PK)      │
                     │ offer_id(FK) │
                     │ amount       │
                     │ currency     │
                     │ escrow_status│
                     │ payment_method│
                     │ provider_ref │
                     │ created_at   │
                     │ released_at  │
                     └──────────────┘
```

### 8.3 États des entités clés

**Offer status :** `pending` → `negotiating` → `accepted` | `rejected` | `expired`

**Transaction escrow_status :** `created` → `funds_locked` → `delivered` → `confirmed` → `released` | `disputed` | `refunded`

**Asset status :** `available` → `reserved` → `sold` | `archived`

---

## 9. Requirements Non-Fonctionnels

### 9.1 Performance

| Métrique | Cible |
|----------|-------|
| Réponse chat (agent) | **< 2 secondes** |
| Calcul négociation | **< 5 secondes** |
| Recherche produits | **< 500 ms** |
| Initiation paiement | **< 3 secondes** |

### 9.2 Scalabilité

- **1 million** d'utilisateurs concurrents (objectif)
- Auto-scaling horizontal sur tous les services
- Séparation lecture/écriture (CQRS) sur les endpoints critiques

### 9.3 Disponibilité

- **99.9%** uptime SLA
- Déploiement multi-AZ (availability zones)
- Failover automatique sur les providers de paiement

### 9.4 Sécurité

- TLS 1.3 sur toutes les communications
- AES-256 pour le chiffrement au repos
- Messages chiffrés end-to-end dans la conversation
- Audit logs complets (qui, quoi, quand)
- OWASP Top 10 compliance
- Rate limiting par IP et par utilisateur

---

## 10. Observabilité

### 10.1 Métriques business

| Métrique | Description |
|----------|-------------|
| Taux de conversion | Messages → transactions complétées |
| Taux de succès négociation | Offres acceptées / offres totales |
| Remise moyenne | Écart prix initial vs prix final |
| GMV (Gross Merchandise Value) | Volume total des transactions |
| Latence agents | Temps de réponse par agent |

### 10.2 Logging

- **Conversation logs** — chaque message horodaté avec contexte
- **Agent decisions** — raisonnement et outils utilisés
- **Payment logs** — chaque étape du cycle de paiement
- **Error tracking** — Sentry ou équivalent

### 10.3 Dashboards

- Grafana / Datadog pour les métriques techniques
- Dashboard custom pour les KPIs business

---

## 11. Flux Complet Utilisateur

```
1. Utilisateur envoie un message (WhatsApp / Telegram / Webchat)
        ↓
2. Gateway API reçoit et authentifie (OTP ou session active)
        ↓
3. Conversation Service stocke le message et charge le contexte
        ↓
4. Agent Orchestrator détecte l'intention
        ↓
5. Commerce Agent recherche les produits pertinents
        ↓
6. Si demande de prix → Negotiation Engine calcule
        ↓
7. Réponse synthétisée et envoyée à l'utilisateur
        ↓
8. Si accord → Payment Intent créé
        ↓
9. Escrow → fonds bloqués → livraison
        ↓
10. Confirmation → release des fonds au vendeur
```

---

## 12. Contraintes et Règles Critiques

| Règle | Description |
|-------|-------------|
| **R1** | Aucun agent ne peut bypasser `min_price` du vendeur |
| **R2** | Aucune transaction sans confirmation explicite de l'utilisateur |
| **R3** | Aucune donnée critique sans validation escrow |
| **R4** | Séparation stricte frontend / backend / agent runtime |
| **R5** | Source externe = vérité absolue sur le stock |
| **R6** | Maximum 3 tours de négociation par offre |
| **R7** | Timeout de confirmation : 48h (auto-refund si dépassé) |

---

## 13. Extensibilité

Le système doit permettre sans refonte majeure :

- **Nouveaux canaux** : Voice (appels), SMS, TikTok DM, Instagram DM
- **Nouveaux agents** : plug-in d'agents spécialisés (assurance, crédit, livraison)
- **Nouveaux marchés** : motos, immobilier, services, freelance
- **Nouveaux algorithmes de pricing** : ML models, heuristiques marché
- **Nouvelles géographies** : multi-devise, multi-langue, multi-provider paiement

---

## 14. Phases de Développement

### Phase 1 — MVP (actuel)

- Landing page React avec CTA WhatsApp / Telegram
- Liens directs vers numéro commercial
- Design professionnel responsive

### Phase 2 — Core Backend

- API Gateway + Auth Service (OTP)
- Conversation Service (stockage messages)
- Commerce Agent basique (catalogue statique)
- Intégration WhatsApp Business API

### Phase 3 — Négociation & Paiement

- Negotiation Engine fonctionnel
- Payment Service avec escrow
- Intégration M-Pesa / Orange Money / Airtel Money
- Telegram Bot

### Phase 4 — Agents avancés

- Pricing Agent (dynamic pricing)
- Diagnostic Agent (analyse d'images)
- Marketing Agent (auto-publication)
- Vector search pour recommandations

### Phase 5 — Scale

- Migration Next.js (SSR + SEO)
- Multi-canal (SMS, voice, réseaux sociaux)
- Observabilité complète
- Multi-géographie

---

## 15. Glossaire

| Terme | Définition |
|-------|-----------|
| **ALIH** | Autonomous Intelligent Liquidity Hub |
| **BFF** | Backend For Frontend — API intermédiaire |
| **Escrow** | Système de séquestre — blocage des fonds jusqu'à confirmation |
| **Event-driven** | Architecture basée sur la publication/consommation d'événements |
| **min_price** | Prix plancher défini par le vendeur, non franchissable |
| **OTP** | One-Time Password — code à usage unique |
| **Trust score** | Score de confiance calculé par utilisateur |
| **Agent** | Programme IA autonome avec outils et mémoire |
| **NLU** | Natural Language Understanding — compréhension du langage |
