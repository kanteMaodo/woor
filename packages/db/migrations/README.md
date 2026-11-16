# Migrations

Les fichiers SQL de ce dossier sont exécutés dans l'ordre alphabétique par PostgreSQL,
au premier démarrage d'une base vide (voir `infra/docker-compose.yml`).

Convention de nommage : `0001_description.sql`, `0002_description.sql`, etc.

- `0001_schema.sql` : tout le schéma du pilote (tables, machine à états, fonctions,
  droits, RLS). Il ne crée aucun compte de connexion.
- En local, `infra/postgres/dev-logins.sql` crée ensuite `woor_api_app` et
  `woor_worker_app`, les comptes utilisés par l'API et le service de paiements.

Pour recréer la base après une modification :

```bash
pnpm infra:reset
```
