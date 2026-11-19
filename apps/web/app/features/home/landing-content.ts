import type { IconName } from "../../components/ui/icon";

/**
 * Textes de la page d'accueil. Les chiffres sont les réglages réels du pilote
 * (table woor.settings) : aucun chiffre inventé.
 */

export const FACTS = [
  { value: "15 min", label: "pour payer, sinon rien n'est prélevé" },
  { value: "6 chiffres", label: "pour débloquer, donnés à la remise" },
  { value: "18 h", label: "au plus avant le remboursement automatique" },
  { value: "50 000 F", label: "par article pendant le pilote" },
] as const;

export interface Audience {
  key: string;
  icon: IconName;
  title: string;
  promise: string;
  points: string[];
}

export const AUDIENCES: Audience[] = [
  {
    key: "acheteur",
    icon: "wallet",
    title: "Pour l'acheteur",
    promise: "Payez sans payer dans le vide.",
    points: [
      "Pas de compte : le lien suffit.",
      "L'argent reste bloqué tant que vous n'avez pas le colis en main.",
      "Annulé, refusé ou en retard : remboursé tout seul.",
    ],
  },
  {
    key: "vendeuse",
    icon: "box",
    title: "Pour la vendeuse",
    promise: "Livrez à des clients qui ont déjà payé.",
    points: [
      "Un lien à envoyer sur WhatsApp, Instagram ou TikTok.",
      "Vous voyez quand l'argent est bloqué : le colis peut partir.",
      "Payée dès la remise, sans espèces à récupérer.",
    ],
  },
  {
    key: "livreur",
    icon: "moto",
    title: "Pour le livreur",
    promise: "Votre course est payée, même en cas de refus.",
    points: [
      "Le prix de la course est bloqué avant le départ.",
      "À la porte, un code à 6 chiffres : pas d'argent liquide sur vous.",
      "Refus à la porte : la course vous reste acquise.",
    ],
  },
];

export const COMPARISON = {
  columns: ["Paiement d'avance", "Paiement à la livraison", "Wóor"],
  rows: [
    { label: "L'acheteur est protégé s'il ne reçoit rien", values: [false, true, true] },
    { label: "La vendeuse est protégée contre le refus", values: [true, false, true] },
    { label: "Le livreur est payé même en cas de refus", values: [true, false, true] },
    { label: "Aucun billet à transporter", values: [true, false, true] },
    { label: "Remboursement sans démarche", values: [false, true, true] },
  ],
} as const;

export const GUARANTEES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "lock",
    title: "Bloqué, jamais encaissé",
    text: "Une hold invoice Lightning garde l'argent en attente. Sans le code, personne ne peut l'encaisser, pas même Wóor.",
  },
  {
    icon: "undo",
    title: "Remboursement automatique",
    text: "Commande annulée, colis refusé, rien à temps : le paiement bloqué est annulé et l'argent ne quitte jamais l'acheteur.",
  },
  {
    icon: "key",
    title: "Données chiffrées",
    text: "Numéros réduits à une empreinte, adresses chiffrées en AES-256, PIN hachés en Argon2id.",
  },
  {
    icon: "eye-off",
    title: "Chacun ne voit que sa part",
    text: "La base de données elle-même limite chaque vendeuse, livreur et acheteur à ses propres commandes.",
  },
];

export const FAQ = [
  {
    question: "Faut-il créer un compte pour acheter ?",
    answer:
      "Non. L'acheteur ouvre le lien reçu sur WhatsApp et paie avec son wallet Lightning. Son téléphone est reconnu, sans mot de passe.",
  },
  {
    question: "Et si le colis n'arrive jamais ?",
    answer:
      "Sans code de remise, le paiement bloqué est annulé automatiquement, au plus tard 18 h après le blocage. Rien n'a été encaissé : l'acheteur récupère tout.",
  },
  {
    question: "Wóor peut-il garder mon argent ?",
    answer:
      "Non. Le paiement est une hold invoice : il ne peut être encaissé qu'avec le secret libéré par le bon code. Sinon il expire et revient à l'acheteur.",
  },
  {
    question: "Que se passe-t-il si l'acheteur refuse le colis à la porte ?",
    answer:
      "Le livreur déclare le refus. L'acheteur peut le contester pendant 10 minutes. Sinon, la course est payée au livreur et le prix de l'article reste à l'acheteur.",
  },
  {
    question: "Quel wallet utiliser ?",
    answer:
      "N'importe quel wallet Lightning qui sait payer une facture : le paiement se fait en scannant un QR code ou en touchant un bouton.",
  },
] as const;
