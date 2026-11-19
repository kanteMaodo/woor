# Vérification de l’interface Wóor

Audit local effectué dans le dépôt `woor`, sans Docker et sans modification des données métier.

## Vérifications navigateur

- Chromium de test et Playwright sont installés uniquement dans `node_modules/.woor-audit/` ; aucun ajout aux dépendances de production.
- Dix pages vérifiées à **320, 390, 701, 768, 900, 1 024 et 1 440 px** : accueil, fonctionnement, trois solutions, sécurité, aide, à propos, contact et connexion.
- Aucun débordement horizontal de contenu, image manquante ou erreur JavaScript détecté sur ces 70 combinaisons.
- Le tableau comparatif conserve volontairement son défilement horizontal local sur petit écran.
- Menus ordinateur et mobile, fermeture avec Échap, navigation en paysage, filtres et recherche d’aide vérifiés.
- Un seul accès à la connexion dans l’en-tête mobile, à l’intérieur du menu déplié.
- Panneau photo de connexion immobile et formulaire défilant vérifiés à 900 × 600 et 1 440 × 900.
- Démonstration Awa Couture : quatre étapes, progression automatique, pause, navigation manuelle au clavier et arrêt hors écran vérifiés. La préférence de réduction des animations est respectée.

Les captures et le rapport détaillé sont générés dans `node_modules/.woor-audit/results/`. Ces fichiers de contrôle ne sont pas intégrés au produit.

## Validation des formulaires

- Connexion : mobile sénégalais normalisé et PIN composé de six chiffres.
- Commandes : article et adresse en texte brut, longueurs limitées, livreur identifié par UUID, montants entiers dans les limites du pilote.
- Remise : code composé de six chiffres avant tout appel de vérification.
- Contact : nom, e-mail, profil, sujet et message contrôlés ; l’e-mail préparé utilise des paramètres encodés et ne part jamais automatiquement.
- Signalement : motif connu et description bornée, sans activer les fonctions métier encore en préparation.
- Champs inattendus, paramètres scalaires dupliqués, fichiers et contenus HTML refusés sur les formulaires concernés.
- Contrôles exécutés dans l’interface et dans les actions serveur correspondantes ; l’API valide également ses propres requêtes JSON.
- Les corps des formulaires web sont limités à 16 Kio avant décodage. Les envois d’une autre origine sont refusés, y compris en cas de protocole ou port différent.
- Les textes sont rendus par React et les données SQL restent transmises comme paramètres. Le filtrage de saisie ne remplace pas ces protections.

Neuf groupes de tests automatisés couvrent notamment les montants incorrects, le HTML, les caractères de contrôle, les adresses e-mail mal formées, les en-têtes injectés, les doublons, les uploads, les requêtes trop volumineuses et l’encodage à l’affichage. Les contrôles du rendu serveur vérifient aussi que des formulaires invalides ne déclenchent aucun appel d’écriture à l’API.

## Rejouer les contrôles

Depuis la racine du dépôt :

```powershell
node --import ./apps/api/node_modules/tsx/dist/loader.mjs --test scripts/form-validation.test.ts
node scripts/check-public-pages.mjs
$env:WOOR_AUDIT_WIDTHS='320,390,701,768,900,1024,1440'
node scripts/audit-responsive.mjs
```

Le contrôle du rendu serveur utilise le build de production à générer préalablement dans `apps/web`. L’audit navigateur utilise par défaut le serveur local sur le port 5173, ainsi que l’installation de Playwright propre à ce dépôt.

## Limites

Il s’agit de tests sur Chromium avec des tailles d’écran simulées. Les appareils physiques, Safari/iOS, la base PostgreSQL et les paiements Lightning réels n’ont pas été testés pendant cet audit. Une validation syntaxique ne prouve pas qu’un numéro ou une adresse e-mail appartient à la personne qui les saisit.

Références de sécurité : [validation des entrées OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) et [prévention XSS OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
