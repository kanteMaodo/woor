-- Comptes de connexion du développement local, un par service.
-- Monté uniquement par infra/docker-compose.yml, après les migrations.
-- Mots de passe connus de tous : ce fichier ne sert jamais hors de la machine du développeur.

CREATE ROLE woor_api_app LOGIN PASSWORD 'woor_api_dev' IN ROLE woor_api;
CREATE ROLE woor_worker_app LOGIN PASSWORD 'woor_worker_dev' IN ROLE woor_worker;
