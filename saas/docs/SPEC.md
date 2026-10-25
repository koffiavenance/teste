# Spécifications produit & techniques — SaaS de boutiques COD (Afrique de l'Ouest)

Nom de code : **Boutiq** (provisoire). Cible : vendeurs « direct-response » francophones (CI, SN, BJ, TG, CM…) vendant par landing page + paiement à la livraison (COD).

## 1. Principes produit

1. **Mobile-first** : 90 %+ du trafic acheteur et une grande partie des vendeurs sont sur smartphone 3G/4G. Budget : LCP < 2,5 s sur 3G rapide, page produit < 150 Ko JS.
2. **Time-to-first-sale** : un vendeur doit publier un produit en < 5 min (photo → fiche IA → publier).
3. **COD d'abord** : le tunnel ne demande que nom, téléphone, ville. Le suivi logistique (confirmation par appel, injoignables, livreurs) est un citoyen de première classe.
4. **Conversion** : chaque bloc de la page produit est un module activable (toggle) et mesuré.

## 2. Acteurs

| Acteur | Description |
|---|---|
| Vendeur (owner) | Crée la boutique, gère produits/commandes |
| Collaborateur | Rôles : `confirmateur` (appelle les clients), `logisticien`, `admin` |
| Acheteur | Anonyme, commande depuis la page produit |
| Super-admin plateforme | Support, facturation, modération |

## 3. Modules (périmètre MVP → V2)

| # | Module | MVP | V2 |
|---|---|---|---|
| 1 | Auth + onboarding boutique (nom, sous-domaine, pays, devise) | ✅ | domaine perso |
| 2 | Produits (CRUD, statuts, collections, badges, variantes simples) | ✅ | variantes avancées |
| 3 | Création IA (photo → fiche) | ✅ | génération d'images, vidéo |
| 4 | Page produit persuasive (blocs modulaires) | ✅ | A/B testing |
| 5 | Checkout 1 page COD | ✅ | Mobile Money, upsell post-achat |
| 6 | Commandes + workflow logistique | ✅ | intégration transporteurs/livreurs |
| 7 | Paniers abandonnés (lead capturé dès saisie du téléphone) | ✅ | relance WhatsApp auto |
| 8 | Dashboard KPIs temps réel | ✅ | cohortes |
| 9 | Clients & Inbox IA | — | ✅ |
| 10 | Marketing (pixels Meta/TikTok, codes promo) / Analytique | pixels | UTM, ROAS |
| 11 | Affiliation | — | ✅ |
| 12 | Thèmes | 1 thème | multi |
| 13 | Abonnement SaaS (activation payante de la boutique) | ✅ | paliers |
| 14 | Spy Ads (raccourci/outil externe) | lien | intégré |

## 4. Dashboard vendeur

**Bandeaux** : (a) boutique *inactive* → CTA « Activer ma boutique » (paiement abonnement) ; la boutique reste en mode *prévisualisation* (commande désactivée) ; (b) abonnement expirant dans J-7.

**KPIs** (sélecteur : Aujourd'hui / 7 j / 30 j / Perso) : visiteurs en ligne (fenêtre 5 min), CA (commandes *livrées* + *en cours* — définition configurable), nb commandes, nb visites, taux de conversion = commandes / sessions uniques, courbe d'évolution.

**File « À traiter »** (compteurs cliquables) : à confirmer · à expédier · injoignables · programmées · en livraison.

**Navigation** : Vendre (Produits, Commandes, Paniers abandonnés) · Clients & IA (Clients, Inbox) · Développeur & Marketing (Paramètres, Marketing, Analytique, Affiliation, Thème, Support). Mobile : barre d'onglets en bas (Accueil, Commandes, Produits, Plus) ; desktop : sidebar.

## 5. Machine à états d'une commande

```
nouvelle ──appel──▶ confirmée ──▶ à_expédier ──▶ en_livraison ──▶ livrée
   │                    │                              │
   ├─▶ injoignable ◀────┘ (≤ N relances)               ├─▶ retournée
   ├─▶ programmée (date choisie par le client)          └─▶ échec_livraison
   └─▶ annulée
```

Chaque transition est journalisée (`order_events`) avec acteur, horodatage, note. Implémentation : `saas/src/lib/order-status.ts`.

## 6. Fiche produit (côté acheteur)

Ordre des blocs (chacun a un toggle `blocks.<key>.enabled` dans `products.page_config` JSONB) :

1. `gallery` carrousel + badge -X % (calculé : `round((compare_at - price)/compare_at*100)`)
2. `rating` note globale + nb avis
3. `highlights` puces d'arguments clés
4. `urgency` : `countdown` (fin d'offre), `live_viewers`, `low_stock` (seuil configurable)
5. `bundles` : 1 / 2 (-10 %) / 3 (-15 %), badges « Plus populaire » / « Meilleure offre »
6. `delivery_steps` (3 étapes) · `guarantee` (N jours) · `reviews` · `usage_timeline` · `video` · `comparison` · `faq` (accordéon)
7. Barre collante « Commander maintenant » + bouton WhatsApp (`wa.me/<num>?text=<produit+url>`)

Éthique/légal : les compteurs « visiteurs » doivent refléter des données réelles (ou être clairement paramétrés par le vendeur) ; le stock bas ne s'affiche que si le stock réel ≤ seuil. À valider avec le juridique par pays (pratiques commerciales).

## 7. Checkout 1 page

Champs : `full_name`, `phone` (indicatif + numéro, normalisé E.164), `city` (liste de villes par pays + saisie libre), `address_hint` optionnel. Résumé : sous-total, livraison (règle par ville/pays ou gratuite au-delà d'un seuil), total. Mention « Paiement à la livraison — 100 % sécurisé ». Si boutique inactive : bandeau « Mode prévisualisation » et bouton désactivé. Anti-abus : rate-limit IP, honeypot, Turnstile en cas de score suspect, détection doublons (même téléphone + produit < 10 min). **Lead capture** : dès que le téléphone est valide (blur), on enregistre un panier abandonné.

## 8. Création produit par IA

Pipeline asynchrone : upload photo (URL signée, stockage objet) → job `ai_product_jobs` → modèle vision (Claude) avec sortie JSON structurée (titre, accroche, 5 arguments, description, FAQ, suggestion de prix/prix barré, catégorie) → brouillon créé en statut `draft` → vendeur révise → publie. Cible : < 60 s. Garde-fous : validation Zod du JSON, pas d'allégations médicales/garanties non fournies par le vendeur, langue = locale boutique.

## 9. Architecture technique

- **Front** : Next.js (App Router) + TypeScript + Tailwind ; pages produit en ISR/SSG pour la vitesse ; dashboard en client components avec TanStack Query.
- **Back** : Route handlers Next / ou service Node séparé ; **PostgreSQL** (Supabase ou Neon) avec RLS par `shop_id` ; Redis (Upstash) pour compteurs temps réel (visiteurs en ligne = ZSET avec TTL) et rate-limit.
- **Temps réel** : SSE/WebSocket pour dashboard ; heartbeat visiteur toutes les 20 s.
- **Jobs** : queue (BullMQ/Inngest) pour IA, notifications WhatsApp, relances.
- **Stockage/CDN** : S3-compatible + CDN, images WebP/AVIF redimensionnées.
- **Paiement abonnement** : agrégateur Mobile Money/cartes (CinetPay, PayDunya, Paystack/Flutterwave) via webhooks signés.
- **Multi-tenant** : sous-domaine `boutique.<domaine>` résolu par middleware → `shop_id`.
- **Observabilité** : Sentry, logs structurés, métriques de conversion par bloc.
- **Sécurité/RGPD-like** : chiffrement au repos, journal d'audit, export/suppression des données client, politique de confidentialité (déjà présente dans le dépôt actuel comme modèle).

## 10. Événements analytiques (schéma minimal)

`page_view`, `product_view`, `bundle_select`, `checkout_start`, `phone_captured`, `order_submitted`, `whatsapp_click`, `faq_open`. Propriétés : `shop_id`, `product_id`, `session_id`, `utm_*`, `device`.

## 11. Roadmap

- **Sprint 0** (1 sem.) : design system, schéma DB, auth, multi-tenant.
- **Sprint 1–2** : produits + page produit + checkout + commandes (workflow).
- **Sprint 3** : dashboard KPIs, paniers abandonnés, abonnement.
- **Sprint 4** : IA produit, pixels, WhatsApp.
- **Bêta fermée** avec 20 vendeurs ; métriques de succès : TTFS < 24 h, conversion page > 3 %, taux de confirmation > 60 %.

## 12. Risques

Fraude/faux ordres COD · qualité des fiches IA · dépendance WhatsApp (API officielle payante, sinon lien `wa.me`) · réglementation locale sur les compteurs d'urgence · latence réseau.
