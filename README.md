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
