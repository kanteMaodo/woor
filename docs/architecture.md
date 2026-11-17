# Architecture

Wóor suit une architecture en couches. Une règle tient tout : **les dépendances pointent
vers l'intérieur**. Le métier ne connaît ni PostgreSQL, ni LND, ni HTTP.

## Les couches

| Couche         | Où                          | Contenu                                                                    | Peut importer                         |
| -------------- | --------------------------- | -------------------------------------------------------------------------- | ------------------------------------- |
| Domaine        | `packages/core`             | Rôles, états, machine à états, montants, cours FCFA/sats. Fonctions pures. | Rien                                  |
| Application    | `apps/*/src/application`    | Cas d'usage et ports (interfaces)                                          | Domaine, types de `@woor/ln`          |
| Infrastructure | `apps/*/src/infrastructure` | Implémentations des ports : PostgreSQL, chiffrement, API de cours          | Application, bibliothèques techniques |
| Exécution      | `apps/*/src/runtime`        | Boucles, file de tâches, abonnements au nœud                               | Application                           |
| Composition    | `apps/*/src/container.ts`   | Seul endroit qui assemble les implémentations concrètes                    | Tout                                  |

ESLint fait respecter la règle : un import technique dans `application/` casse le lint.

## Le service de paiements

```
woor.outbox ──► OutboxRunner ──► cas d'usage ──► ports ──► PostgreSQL / LND
                                       ▲
nœud LND ──► InvoiceWatcher ───────────┘
minuteur ──► RunMaintenance (chaque minute)
```

- **La base décide, le worker exécute.** Un changement d'état de commande écrit ses effets
  dans `woor.outbox`, dans la même transaction. Le worker lit cette file avec
  `FOR UPDATE SKIP LOCKED`, donc plusieurs instances ne prennent jamais la même tâche.
- **Intention avant action.** Pour encaisser ou annuler, le worker écrit d'abord
  `settling` ou `cancelling`, puis appelle le nœud, puis écrit l'état final. Après une
  panne, la tâche reprend et termine une seule fois.
- **Tout est rejouable.** Un événement du nœud reçu deux fois ne change rien : chaque mise
  à jour SQL ne part que de l'état attendu.

| Tâche             | Cas d'usage         | Effet                                       |
| ----------------- | ------------------- | ------------------------------------------- |
| `invoice.create`  | CreateOrderInvoices | Crée les factures A (course) et B (article) |
| `invoice.settle`  | SettleInvoice       | Encaisse avec le secret déchiffré           |
| `invoice.cancel`  | CancelInvoice       | Rend les fonds à l'acheteur                 |
| événement du nœud | RecordInvoiceUpdate | Reporte bloqué, encaissé ou annulé          |
| chaque minute     | RunMaintenance      | Échéances, versements différés, adresses    |

## Secrets

Le secret de déblocage est tiré au hasard sur 32 octets, chiffré en AES-256-GCM avec
l'empreinte du paiement comme donnée associée, et rangé dans `woor_secret`. Au
déchiffrement, le worker vérifie que le secret correspond bien à l'empreinte.

## L'API

Mêmes couches que le worker : `application/` (cas d'usage et ports), `infrastructure/`
(PostgreSQL, cryptographie), `http/` (routes Fastify), `container.ts`.

- **La base vérifie les droits.** Chaque action de l'acheteur s'exécute dans une transaction
  qui pose le contexte « acheteur de cette commande » ; la RLS et les fonctions du schéma
  refusent tout le reste.
- **Les refus métier gardent leur sens.** Une fonction SQL lève « code_stable: message » ;
  l'API le renvoie en 409 avec ce code et ce message. Un refus de droit devient un 404,
  identique à un jeton inconnu.

| Route                        | Cas d'usage                             |
| ---------------------------- | --------------------------------------- |
| `GET /v1/o/:token`           | GetPublicOrder                          |
| `GET /v1/o/:token/me`        | GetBuyerOrder                           |
| `POST /v1/o/:token/claim`    | ClaimOrder, pose le cookie du téléphone |
| `POST /v1/o/:token/invoices` | RequestInvoices                         |
| `POST /v1/o/:token/code`     | RevealDeliveryCode, une seule fois      |
| `POST /v1/o/:token/cancel`   | CancelBuyerOrder                        |

Vendeuses et livreurs se connectent par numéro et PIN. Le numéro n'est connu de la base que
par son HMAC, le PIN est haché en Argon2id avec un poivre, et la session est un cookie
HttpOnly dont la base ne garde que l'empreinte. Chaque requête pose le contexte
« cette personne, cette session » : la RLS ne montre à chacun que ses commandes.
L'adresse de livraison est chiffrée en AES-256-GCM avant d'entrer en base.

| Route                                | Cas d'usage                                  |
| ------------------------------------ | -------------------------------------------- |
| `POST /v1/auth/login`                | LogIn, pose le cookie de session             |
| `POST /v1/auth/logout`               | LogOut, révoque la session en base           |
| `GET /v1/me`                         | GetProfile                                   |
| `GET /v1/seller/couriers`            | ListLinkedCouriers                           |
| `GET /v1/seller/orders`              | ListSellerOrders                             |
| `POST /v1/seller/orders`             | CreateSellerOrder, rend le lien une fois     |
| `GET /v1/seller/orders/:id`          | GetSellerOrder                               |
| `POST /v1/seller/orders/:id/cancel`  | CancelSellerOrder                            |
| `GET /v1/courier/orders`             | ListDeliveries                               |
| `GET /v1/courier/orders/:id`         | GetDelivery                                  |
| `POST /v1/courier/orders/:id/pickup` | ConfirmPickup                                |
| `POST /v1/courier/orders/:id/code`   | SubmitDeliveryCode, 5 essais puis verrouillé |

## L'application web

- **Le navigateur ne parle qu'au serveur web.** Les loaders et actions de React Router
  appellent l'API côté serveur et valident ses réponses avec Zod. Les modules `.server.ts`
  ne partent jamais vers le téléphone.
- **Les formulaires marchent sans JavaScript.** Chaque action est un vrai formulaire ;
  le JavaScript ajoute le rafraîchissement automatique, la copie et la garde du code.
- **Les écrans n'ont pas de règle.** `selectBuyerScreen` choisit l'écran à partir des
  données ; les composants ne font qu'afficher.

```
app/
  routes/          loader, action, aiguillage
  features/buyer/  choix de l'écran, écrans, composants propres à l'acheteur
  features/seller/ espace de la vendeuse
  features/courier/ espace du livreur
  components/ui/   composants du design system
  lib/             appels à l'API, formatage, sécurité
```
