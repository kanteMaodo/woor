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
