# Rectification urgente — plafonds des boutiques

Date : 20 novembre 2026.

## Décision et périmètre de cette modification

À la demande du responsable du projet, **seuls les textes du site public ont été actualisés**. Les règles métier, les validations des formulaires, l’API, les réglages et les contraintes SQL n’ont pas été modifiés. L’équipe traitera leur alignement lors de la vérification complète de la plateforme.

Les plafonds désormais présentés sur l’accueil, la page de fonctionnement et le centre d’aide sont :

| Plafond                                |    Au démarrage | Après un historique fiable |
| -------------------------------------- | --------------: | -------------------------: |
| Prix maximum d’un article              |   250 000 F CFA |              500 000 F CFA |
| Volume de ventes par boutique sur 24 h | 1 000 000 F CFA |            3 000 000 F CFA |

**État : présentation mise à jour ; application effective de ces plafonds en attente.** Le tableau décrit la cible décidée, pas un changement déjà opérationnel des limites de paiement.

## Écarts connus dans le dépôt

| Élément                       | État actuel à vérifier par l’équipe                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limite par article du domaine | `packages/core/src/order/order-limits.ts` fixe toujours le maximum à `50_000` F CFA.                                                                                                                                                              |
| Validations web et API        | Elles utilisent encore cette limite de domaine de 50 000 F CFA. Les attributs du formulaire et ses messages restent cohérents avec cette validation effective.                                                                                    |
| Contrainte SQL d’une commande | Le schéma initial impose `item_price_xof BETWEEN 500 AND 50000`.                                                                                                                                                                                  |
| Réglage `max_order_xof`       | La valeur initiale et la borne supérieure du réglage sont de 50 000 F CFA.                                                                                                                                                                        |
| Volume par boutique sur 24 h  | Aucun plafond monétaire de 1 000 000 / 3 000 000 F CFA n’est appliqué par cette modification. Le dépôt prévoit actuellement une limite distincte de 30 commandes créées par vendeuse en 24 h.                                                     |
| Montant global engagé         | Le réglage initial `max_total_locked_xof` est de 300 000 F CFA, toutes boutiques confondues. Ce plafond concerne les montants engagés simultanément et ne constitue pas un volume journalier de ventes.                                           |
| Palier « historique fiable »  | Les critères d’accès, la décision de promotion et le retour au palier initial restent à définir et à implémenter. Le seuil existant des premières commandes avec versement différé ne doit pas être assimilé automatiquement à ce nouveau palier. |

Les valeurs SQL indiquées proviennent du schéma initial versionné. Les réglages d’une base déjà déployée devront être contrôlés séparément ; aucune base n’a été consultée ni modifiée pour cette rectification éditoriale.

## Travaux à réaliser lors de la vérification complète

1. Définir les critères d’un historique fiable, les personnes habilitées à changer un palier et les conditions de suspension ou de retour au palier initial.
2. Préciser le calcul du volume sur 24 h : fenêtre glissante ou journée, états de commande retenus, annulations et remboursements, inclusion éventuelle de la livraison, fuseau et contrôle concurrent de plusieurs commandes.
3. Aligner le domaine, les contrôles côté navigateur, les actions serveur et les schémas de validation de l’API sur les deux paliers. Le serveur devra déterminer le palier ; un champ envoyé par le client ne doit pas pouvoir l’imposer.
4. Préparer une migration SQL versionnée pour les contraintes, les réglages et l’application atomique des plafonds par boutique. Ne pas compter sur une modification du seul schéma initial pour une base existante.
5. Dimensionner ensemble le plafond global des montants engagés, les capacités de paiement Lightning et le nombre de paiements simultanés. Ne pas relever les garde-fous financiers sans cette vérification.
6. Tester les montants aux bornes et au-delà, le cumul des ventes sur 24 h, les requêtes concurrentes, les changements de palier et la cohérence de toutes les pages et de tous les messages du produit.

Cette rectification ne modifie pas les frais de livraison, les délais de paiement ou de blocage, les conditions d’accès aux comptes, ni les autres garde-fous existants.
