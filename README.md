# Wóor

L'acompte bloqué sur Lightning pour le commerce en ligne à Dakar. L'acheteur bloque son
paiement, le livreur récupère le colis, et un code à 6 chiffres donné à la remise débloque
l'argent. Si rien n'arrive, l'acheteur est remboursé automatiquement.

## Démarrer

Prérequis : Node.js 22.12 ou plus, pnpm 10, Docker.

```bash
pnpm install
cp .env.example .env
pnpm infra:up
pnpm dev
```

Dans `.env`, remplir avant `pnpm dev` :

- `CODE_HMAC_KEY`, `PHONE_HMAC_KEY`, `PIN_PEPPER`, `PII_KEY` et `PREIMAGE_KEYS` : clés au hasard,
  la commande est indiquée dans le fichier.
- `LND_*` : le nœud Lightning de Wóor. En local, créer un réseau regtest avec
  [Polar](https://lightningpolar.com) (deux nœuds LND : Wóor et l'acheteur, reliés par un
  canal), puis copier l'adresse gRPC, le certificat TLS et le macaron admin (base64 ou hexa).

Au premier `pnpm infra:up`, PostgreSQL charge le schéma et crée les comptes locaux de l'API
et du service de paiements. Créez ensuite les comptes de démonstration :

```bash
pnpm --filter @woor/api seed:demo
```

| Compte   | Numéro       | PIN    | Espace                         |
| -------- | ------------ | ------ | ------------------------------ |
| Vendeuse | 77 000 00 01 | 111111 | http://localhost:5173/vendeuse |
| Livreur  | 77 000 00 02 | 222222 | http://localhost:5173/livreur  |

En développement, http://localhost:5173/apercu montre tous les écrans avec des données
fictives, sans base ni Lightning.

| Service  | Adresse                         |
| -------- | ------------------------------- |
| Web      | http://localhost:5173           |
| API      | http://localhost:3000/v1/health |
| Postgres | localhost:5432                  |
| Valkey   | localhost:6379                  |

## Organisation

```
apps/web        application React (React Router v7, rendu serveur)
apps/api        API HTTP (Fastify, Zod)
apps/worker     service de paiements et planificateur
packages/core   rôles, états, machine à états des commandes
packages/ln     interface LightningProvider et adaptateurs
packages/db     accès PostgreSQL et migrations SQL
infra/          Docker Compose
```

Les packages exposent directement leur source TypeScript : aucune étape de build
n'est nécessaire pour les utiliser depuis les applications.

## Commandes

| Commande           | Effet                                  |
| ------------------ | -------------------------------------- |
| `pnpm dev`         | Lance web, API et worker en parallèle  |
| `pnpm typecheck`   | Vérifie les types de tout le dépôt     |
| `pnpm lint`        | ESLint sur tout le dépôt               |
| `pnpm format`      | Formate avec Prettier                  |
| `pnpm infra:up`    | Démarre Postgres et Valkey             |
| `pnpm infra:reset` | Recrée les services avec une base vide |

## Licence

MIT
