# Wóor

**Votre argent est bloqué, pas encaissé, jusqu'à la remise du colis.**

Wóor protège les ventes sur WhatsApp, Instagram et TikTok à Dakar. L'acheteur paie en
bitcoin sur Lightning, mais son paiement reste bloqué. Le livreur remet le colis contre un
code à 6 chiffres que l'acheteur lui donne : ce code débloque l'argent. Si rien n'arrive à
temps, le paiement bloqué est annulé et l'acheteur récupère tout, sans démarche.

Projet du **Dakar Bitcoin Hack 2026**.

## Le problème

- **L'acheteur** hésite à payer d'avance quelqu'un qu'il n'a jamais vu.
- **La vendeuse** qui accepte le paiement à la livraison se fait refuser le colis à la porte.
- **Le livreur** rentre avec le colis, sans sa course, ou avec des billets en poche.

## Comment ça marche

1. **La vendeuse crée un lien** : article, prix, livraison, quartier, livreur. Elle l'envoie
   sur WhatsApp.
2. **L'acheteur ouvre le lien et paie**, sans compte : deux hold invoices Lightning, une pour
   la course, une pour l'article. L'argent est bloqué, pas encaissé.
3. **Le livreur voit la course dès que l'argent est bloqué**, ramasse le colis, livre.
4. **L'acheteur donne son code** à la remise. Le livreur le saisit : code juste, les deux
   paiements sont encaissés.
5. **Sinon** : sans remise à temps, tout est annulé. Refus à la porte : la course est payée,
   l'article reste à l'acheteur. Cinq codes faux : la commande se verrouille et un arbitre
   tranche.

## Sécurité par construction

| Garantie                           | Comment                                                                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bloqué, jamais encaissé avant      | Hold invoices LND : le secret de déblocage reste chez Wóor, chiffré, et n'est utilisé qu'après le bon code                                                                       |
| Remboursement automatique          | Les échéances (paiement, ramassage, arrêt final à 18 h) annulent les paiements bloqués                                                                                           |
| La base décide, le service exécute | Machine à états dans PostgreSQL (`woor.apply_order_event`), effets écrits dans une boîte d'envoi traitée une seule fois                                                          |
| Chacun voit sa part                | Row Level Security : vendeuse, livreur et acheteur ne voient que leurs commandes, même en cas de bug de l'API                                                                    |
| Données chiffrées                  | Secrets Lightning et adresses en AES-256-GCM ; numéros réduits à un HMAC ; PIN en Argon2id avec poivre ; jetons de lien, de téléphone et de session stockés en SHA-256 seulement |
| Code de remise                     | 6 chiffres tirés uniformément, stocké en HMAC, 5 essais puis verrouillage et litige                                                                                              |

## Tester le projet

Prérequis : Node.js 22.12 ou plus, pnpm 10, Docker, et [Polar](https://lightningpolar.com)
pour le réseau Lightning local.

### Voir tous les écrans en 1 minute, sans base ni Lightning

```bash
pnpm install
cp .env.example .env
pnpm --filter @woor/web dev
```

Ouvrir http://localhost:5173/apercu : tous les écrans de l'acheteur, de la vendeuse, du
livreur, de l'arbitre et de l'administrateur, avec des données fictives.

### Faire une vraie vente

1. **Clés** : dans `.env`, remplir `CODE_HMAC_KEY`, `PHONE_HMAC_KEY`, `PIN_PEPPER`,
   `PII_KEY` et `PREIMAGE_KEYS` avec des clés au hasard (la commande est indiquée dans le
   fichier).
2. **Lightning** : dans Polar, créer deux nœuds LND (`woor` et `acheteur`), les approvisionner,
   ouvrir un canal de `acheteur` vers `woor`. Copier l'adresse gRPC, le certificat TLS et le
   macaron admin du nœud `woor` dans `LND_SOCKET`, `LND_CERT_BASE64` et `LND_MACAROON`.
3. **Base et comptes de démonstration** :
   ```bash
   pnpm infra:up
   pnpm --filter @woor/api seed:demo
   ```
4. **Lancer** web, API et service de paiements : `pnpm dev`.
5. **Vendre** : http://localhost:5173/connexion, bouton « Vendeuse » des comptes de
   démonstration, puis « Nouvelle commande ». Ouvrir le lien obtenu dans une autre fenêtre,
   payer les deux factures depuis le nœud `acheteur` de Polar, afficher le code.
6. **Livrer** : se connecter en « Livreur », « J'ai récupéré le colis », saisir le code.

| Compte   | Numéro       | PIN    |
| -------- | ------------ | ------ |
| Vendeuse | 77 000 00 01 | 111111 |
| Livreur  | 77 000 00 02 | 222222 |

| Service  | Adresse                         |
| -------- | ------------------------------- |
| Web      | http://localhost:5173           |
| API      | http://localhost:3000/v1/health |
| Postgres | localhost:5433                  |
| Valkey   | localhost:6379                  |

## Architecture

Monorepo TypeScript, architecture en couches : le métier ne connaît ni PostgreSQL, ni LND,
ni HTTP. Détails dans [docs/architecture.md](docs/architecture.md).

```
apps/web        React Router v7, rendu serveur, formulaires utilisables sans JavaScript
apps/api        Fastify et Zod : cas d'usage, ports, adaptateurs PostgreSQL et crypto
apps/worker     service de paiements : factures, encaissement, annulation, échéances
packages/core   domaine : rôles, machine à états, montants, cours FCFA/sats
packages/ln     interface LightningProvider et adaptateur LND
packages/db     accès PostgreSQL et schéma SQL (fonctions, droits, RLS)
infra/          Docker Compose : PostgreSQL 16 et Valkey
```

## État du pilote

**Fait** : création de commande et lien, paiement en deux hold invoices, blocage, code de
remise, ramassage et saisie du code, encaissement, annulations et échéances automatiques,
connexion par numéro et PIN, tableaux de bord de la vendeuse et du livreur, tous les écrans
de la maquette.

**Prochaines étapes** : versement Lightning automatique vers le wallet de la vendeuse et du
livreur, litiges et arbitrage côté API, inscription sur invitation et passkeys, QR de
ramassage signé, preuve de position à l'arrivée, mise en ligne.

## Commandes

| Commande           | Effet                                  |
| ------------------ | -------------------------------------- |
| `pnpm dev`         | Lance web, API et worker en parallèle  |
| `pnpm typecheck`   | Vérifie les types de tout le dépôt     |
| `pnpm lint`        | ESLint sur tout le dépôt               |
| `pnpm format`      | Formate avec Prettier                  |
| `pnpm infra:up`    | Démarre PostgreSQL et Valkey           |
| `pnpm infra:reset` | Recrée les services avec une base vide |

## Licence

MIT
