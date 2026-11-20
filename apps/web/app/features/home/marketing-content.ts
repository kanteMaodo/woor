import type { IconName } from "../../components/ui/icon";

export const CONTACT = {
  email: "contact@woor.com",
  phone: "+221 78 418 42 15",
  telephone: "tel:+221784184215",
  whatsapp: "https://wa.me/221784184215",
} as const;

export const IMAGES = {
  commerce: "/images/commerce-dakar.jpg",
  atelier: "/images/atelier-dakar.jpg",
  dakar: "/images/quartier-dakar.jpg",
} as const;

export const SOLUTIONS: {
  slug: string;
  title: string;
  short: string;
  description: string;
  icon: IconName;
}[] = [
  {
    slug: "vendeurs",
    title: "Pour les vendeurs",
    short: "Vendre sereinement",
    description: "Vos conversations deviennent des commandes protégées.",
    icon: "box",
  },
  {
    slug: "acheteurs",
    title: "Pour les acheteurs",
    short: "Acheter en confiance",
    description: "Un lien pour acheter. Un code pour confirmer la remise.",
    icon: "wallet",
  },
  {
    slug: "livreurs",
    title: "Pour les livreurs",
    short: "Suivre ses livraisons",
    description: "Une course identifiée et un paiement prévu avant de partir.",
    icon: "moto",
  },
];

export const PAGE_CONTENT = {
  fonctionnement: {
    label: "La plateforme",
    title: "Comment une commande Wóor se déroule, du lien à la livraison.",
    description:
      "Un lien de commande, un paiement bloqué et un code de remise : découvrez ce qui se passe à chaque étape d’une vente avec Wóor.",
    image: IMAGES.commerce,
    tag: "Un parcours partagé, trois espaces dédiés",
  },
  vendeurs: {
    label: "Wóor pour les vendeurs",
    title: "Vos ventes en ligne, avec un paiement protégé et un suivi clair.",
    description:
      "Continuez à vendre là où vos clients vous écrivent. Wóor ajoute un lien de paiement protégé et un suivi clair à vos échanges.",
    image: IMAGES.atelier,
    tag: "WhatsApp, Instagram, TikTok. Vos habitudes restent.",
  },
  acheteurs: {
    label: "Wóor pour les acheteurs",
    title: "Achetez avec un paiement bloqué jusqu’à la remise.",
    description:
      "Ouvrez le lien de votre vendeur, vérifiez la commande et bloquez votre paiement. Vous donnez le code lorsque le colis vous est remis.",
    image: IMAGES.atelier,
    tag: "Aucun compte à créer pour acheter",
  },
  livreurs: {
    label: "Wóor pour les livreurs",
    title: "Vos courses, du ramassage à la confirmation de remise.",
    description:
      "Les informations de la course sont réunies au même endroit. Le paiement est bloqué avant le départ et le code confirme la remise.",
    image: IMAGES.commerce,
    tag: "Moins d’espèces. Plus de visibilité.",
  },
  securite: {
    label: "Paiements et protection",
    title: "Comprendre ce qui protège votre paiement.",
    description:
      "L’argent de la commande reste bloqué jusqu’à la confirmation de remise. Découvrez les règles, les protections et les limites du service.",
    image: IMAGES.commerce,
    tag: "Paiements Bitcoin Lightning · Code à 6 chiffres",
  },
  aide: {
    label: "Le centre d’aide",
    title: "Vos questions sur les commandes, les paiements et les livraisons.",
    description:
      "Comprendre un paiement, préparer une livraison ou retrouver une commande : choisissez votre sujet et avancez étape par étape.",
    image: IMAGES.atelier,
    tag: "Des explications simples, pour chaque rôle",
  },
  "a-propos": {
    label: "Notre raison d’être",
    title: "Un projet pour les vendeurs, les acheteurs et les livreurs de Dakar.",
    description:
      "Wóor est né d’une idée simple : une vente en ligne devrait rassurer autant la personne qui achète que celle qui vend et celle qui livre.",
    image: IMAGES.dakar,
    tag: "Né à Dakar. Construit autour des échanges du quotidien.",
  },
  contact: {
    label: "Contacter Wóor",
    title: "Une question sur le service ou envie de rejoindre le pilote ?",
    description:
      "Que vous vendiez, achetiez ou livriez, nous sommes à votre écoute. Choisissez le canal qui vous convient et parlons de votre besoin.",
    image: IMAGES.dakar,
    tag: "L’équipe Wóor · Dakar, Sénégal",
  },
} as const;

export type MarketingPageKey = keyof typeof PAGE_CONTENT;

export const HELP_QUESTIONS = [
  {
    category: "Acheter",
    question: "Faut-il créer un compte pour acheter ?",
    answer:
      "Non. Ouvrez le lien de commande envoyé par votre vendeur, vérifiez l’article et renseignez votre livraison. Le paiement nécessite un wallet compatible avec Bitcoin Lightning. Gardez le même navigateur pour retrouver votre commande.",
  },
  {
    category: "Paiement",
    question: "Puis-je payer avec Wave, Orange Money ou une carte ?",
    answer:
      "Le pilote Wóor utilise actuellement Bitcoin Lightning. Le prix de l’article et de la course est affiché en francs CFA, puis les factures sont proposées en bitcoin. Les moyens de paiement mobile money et la carte ne sont pas intégrés à ce stade.",
  },
  {
    category: "Paiement",
    question: "Pourquoi deux factures de paiement ?",
    answer:
      "L’article et la course sont deux paiements distincts. Cette séparation permet de traiter la rémunération du livreur indépendamment de celle du vendeur, notamment lors d’un refus de colis. L’écran de paiement vous accompagne pour régler les deux factures.",
  },
  {
    category: "Acheter",
    question: "Quand dois-je donner le code de remise ?",
    answer:
      "Uniquement lorsque le livreur est devant vous et que le colis vous est remis. Ce code à six chiffres déclenche le déblocage du paiement. Ne l’envoyez ni au vendeur ni au livreur avant ce moment.",
  },
  {
    category: "Paiement",
    question: "Et si ma commande n’est pas remise ?",
    answer:
      "Sans confirmation de remise, le paiement bloqué est annulé à l’échéance prévue. Dans le pilote, la durée maximale est de 18 heures après le blocage. Le traitement de la course dépend de la situation : consultez le statut et les indications de votre commande.",
  },
  {
    category: "Vendre",
    question: "Comment créer et partager une commande ?",
    answer:
      "Connectez-vous à votre espace vendeur avec votre numéro et votre PIN. Renseignez l’article, son prix, les frais de livraison et le livreur associé. Copiez ensuite le lien généré dans votre conversation avec l’acheteur.",
  },
  {
    category: "Livrer",
    question: "Que faire si le client refuse le colis ?",
    answer:
      "Ne validez pas le code d’un colis refusé. Gardez le lien de la course et contactez l’équipe Wóor pour connaître la marche à suivre. Le traitement du prix de l’article et de la course dépend de la situation de la commande.",
  },
  {
    category: "Livrer",
    question: "Le code de remise ne fonctionne pas : que faire ?",
    answer:
      "Vérifiez les six chiffres avec l’acheteur, sans deviner ni multiplier les essais. Après cinq tentatives erronées, la saisie est verrouillée. Suivez les indications de la commande et contactez l’équipe si nécessaire.",
  },
  {
    category: "Vendre",
    question: "Quels sont les montants autorisés pendant le pilote ?",
    answer:
      "Le prix de l’article doit être compris entre 500 et 50 000 F CFA. Les frais de livraison vont de 500 à 10 000 F CFA. Ces limites concernent le pilote actuel et sont vérifiées lors de la création d’une commande.",
  },
  {
    category: "Compte",
    question: "Comment accéder à mon espace ou retrouver mon PIN ?",
    answer:
      "Les vendeurs et les livreurs se connectent avec leur numéro de téléphone et leur PIN à six chiffres. Si vous ne retrouvez pas votre accès, contactez l’équipe Wóor. Ne communiquez jamais votre PIN ni votre code de remise dans un message de support.",
  },
] as const;
