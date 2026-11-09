# Migrations

Les fichiers SQL de ce dossier sont exécutés dans l'ordre alphabétique par PostgreSQL,
au premier démarrage d'une base vide (voir `infra/docker-compose.yml`).

Convention de nommage : `0001_description.sql`, `0002_description.sql`, etc.

Le schéma initial (`0001_schema.sql`) n'est pas encore versionné. Tant qu'il est absent,
la base démarre vide. Pour le recréer après l'ajout d'une migration :

```bash
pnpm infra:reset
```
