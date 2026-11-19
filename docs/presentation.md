# Wóor · Présentation

> Votre argent est bloqué, pas encaissé, jusqu'à la remise du colis.

## Le problème

À Dakar, une grande partie du commerce en ligne passe par WhatsApp, Instagram et TikTok.
La vente se joue sur la confiance, et la confiance coûte cher des deux côtés :

- **L'acheteur** qui paie d'avance par mobile money n'a aucun recours si le vendeur
  disparaît ou envoie autre chose. Beaucoup préfèrent ne pas commander.
- **La vendeuse** qui accepte le paiement à la livraison subit les refus à la porte et les
  clients injoignables. La course est perdue, le colis revient.
- **Le livreur** transporte des billets, rend la monnaie, et n'est pas payé quand l'acheteur
  refuse.

## La solution

Wóor est un paiement sous séquestre, construit sur les **hold invoices** du réseau
Lightning.

1. La vendeuse crée un lien de paiement protégé et l'envoie sur WhatsApp.
2. L'acheteur l'ouvre, sans compte, et paie deux factures Lightning : la course et
   l'article. L'argent est **bloqué dans le réseau, pas encaissé**.
3. Le livreur voit la course dès que l'argent est bloqué : il sait que le client a payé.
4. À la remise, l'acheteur donne un **code à 6 chiffres**. Le livreur le saisit : le
   paiement est débloqué.
5. Si rien n'arrive à temps, le paiement bloqué est **annulé automatiquement** : rien n'a
   été encaissé, l'acheteur récupère tout. Refus à la porte : la course est payée, l'article
   reste à l'acheteur. Cinq codes faux : la commande se verrouille et un arbitre tranche.

Personne n'a à faire confiance à personne, pas même à Wóor : sans le code, l'argent ne peut
pas être encaissé.

## Pour qui

| Public    | Ce que Wóor change                                                         |
| --------- | -------------------------------------------------------------------------- |
| Acheteurs | Payer en ligne sans risque, sans compte, remboursement automatique         |
| Vendeuses | Livrer à des clients qui ont déjà payé, fin des refus à la porte à perte   |
| Livreurs  | Course bloquée avant le départ, payée même en cas de refus, pas de billets |

## Sécurité par construction

- **Hold invoices LND** : le secret qui encaisse le paiement est tiré au hasard, chiffré
  en AES-256-GCM avec l'empreinte du paiement comme donnée associée, et n'est utilisé
  qu'après le bon code.
- **La base de données décide** : une machine à états dans PostgreSQL est le seul chemin
  pour changer l'état d'une commande. Chaque effet (encaisser, annuler) est écrit dans la
  même transaction, puis exécuté une seule fois par le service de paiements, qui écrit son
  intention avant d'appeler le nœud.
- **Row Level Security** : la base elle-même limite la vendeuse, le livreur et l'acheteur à
  leurs propres commandes. Un bug de l'API ne suffit pas pour voir celles des autres.
- **Données personnelles chiffrées** : adresses en AES-256-GCM, numéros réduits à un HMAC,
  PIN en Argon2id avec un poivre, jetons de lien, de téléphone et de session stockés en
  SHA-256.
- **Pas de suivi** : aucune position n'est suivie en continu.

## Technique

- **Front** : React Router v7 en rendu serveur, pensé pour des Android d'entrée de gamme en
  3G. Les formulaires marchent même sans JavaScript, le QR code est fabriqué par le serveur.
- **API** : Fastify et Zod, architecture en couches (cas d'usage, ports, adaptateurs).
- **Service de paiements** : Node.js et la bibliothèque `lightning` sur un nœud LND,
  boîte d'envoi PostgreSQL traitée avec `FOR UPDATE SKIP LOCKED`.
- **Cours FCFA/sats** : médiane de trois sources (Kraken, Coinbase, Bitstamp), écart
  maximal de 2 %, calculs en entiers.
- **Données** : PostgreSQL 16, fonctions `SECURITY DEFINER`, journal d'audit chaîné.

## Les règles du pilote

- 15 minutes pour payer, sinon rien n'est prélevé.
- 6 chiffres pour débloquer, 5 essais au plus.
- 18 heures au plus après le blocage avant le remboursement automatique.
- 50 000 F au plus par article, 300 000 F bloqués au total.

## État et suite

**Prêt** : création de commande, paiement bloqué, code de remise, ramassage, saisie du code,
encaissement, annulations automatiques, connexion des vendeuses et des livreurs, tableaux de
bord, et tous les écrans du parcours (acheteur, vendeuse, livreur, arbitre, administrateur).

**Prochaines étapes** :

1. Versement Lightning automatique vers le wallet de la vendeuse et du livreur.
2. Litiges et arbitrage de bout en bout.
3. Inscription sur invitation et connexion par passkey.
4. QR code de ramassage signé et preuve de position à l'arrivée.
5. Pilote avec une dizaine de vendeuses à Dakar.

## Liens

- Code source : https://github.com/kanteMaodo/woor
- Vidéo de démonstration : _à ajouter_
