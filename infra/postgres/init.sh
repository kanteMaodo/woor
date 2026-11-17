#!/bin/sh
# Premier démarrage d'une base vide : applique les migrations dans l'ordre,
# puis les comptes de connexion du développement local. Arrêt à la première erreur.
set -eu

for file in /woor/migrations/*.sql /woor/dev/*.sql; do
  echo "woor: application de $file"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --file "$file"
done
