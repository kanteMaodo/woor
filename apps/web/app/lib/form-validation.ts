import {
  isLocality,
  isPlainText,
  isSingleLineText,
  isValidPin,
  ORDER_LIMITS,
  toSenegalE164,
} from "@woor/core";
import { z } from "zod";

const plain = (label: string, min: number, max: number, multiline = false) =>
  z
    .string({ error: `${label} est invalide.` })
    .trim()
    .normalize("NFC")
    .min(min, `${label} : au moins ${min} caractères.`)
    .max(max, `${label} : ${max} caractères au maximum.`)
    .refine(
      multiline ? isPlainText : isSingleLineText,
      `${label} : utilisez du texte sans balise HTML ni caractère de contrôle.`,
    );

export const LoginFormSchema = z.strictObject({
  phone: z
    .string({ error: "Saisissez un numéro de téléphone." })
    .trim()
    .max(30, "Le numéro est trop long.")
    .refine(
      (value) => toSenegalE164(value) !== null,
      "Saisissez un mobile sénégalais de 9 chiffres, par exemple 77 000 00 01.",
    )
    .transform((value) => toSenegalE164(value) ?? value),
  pin: z
    .string({ error: "Saisissez votre PIN." })
    .refine(isValidPin, "Le PIN doit contenir exactement 6 chiffres."),
});

const money = (label: string, limits: { min: number; max: number }) =>
  z
    .string({ error: `${label} est obligatoire.` })
    .trim()
    .regex(/^\d+$/, `${label} doit être un montant entier, sans signe ni décimale.`)
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(limits.min, `${label} : au moins ${limits.min} F CFA.`)
        .max(limits.max, `${label} : ${limits.max} F CFA au maximum.`),
    );

export const NewOrderFormSchema = z.strictObject({
  itemLabel: plain("La description", ORDER_LIMITS.itemLabel.min, ORDER_LIMITS.itemLabel.max),
  itemPriceXof: money("Le prix de l’article", ORDER_LIMITS.itemPriceXof),
  deliveryFeeXof: money("Les frais de livraison", ORDER_LIMITS.deliveryFeeXof),
  courierId: z.uuid("Sélectionnez un livreur valide."),
  neighborhood: z
    .string({ error: "Choisissez une localité dans la liste." })
    .refine(isLocality, "Choisissez une localité dans la liste."),
  landmark: plain("Le repère", 0, ORDER_LIMITS.landmark.max, true),
});

export const DeliveryCodeFormSchema = z.strictObject({
  intent: z.literal("code"),
  code: z.string().regex(/^\d{6}$/, "Le code de remise doit contenir exactement 6 chiffres."),
});

export const ContactFormSchema = z.strictObject({
  name: plain("Votre nom", 2, 100).refine(
    (value) => /\p{L}/u.test(value),
    "Votre nom doit contenir des lettres.",
  ),
  email: z
    .string()
    .trim()
    .max(254, "L’adresse e-mail est trop longue.")
    .email("Saisissez une adresse e-mail valide."),
  profile: z.enum(
    ["Vendeur ou vendeuse", "Acheteur ou acheteuse", "Livreur ou livreuse", "Partenaire / autre"],
    { error: "Choisissez un profil dans la liste." },
  ),
  subject: z.enum(
    [
      "Découvrir Wóor",
      "Rejoindre le pilote",
      "Question sur une commande",
      "Accès à mon compte",
      "Partenariat",
    ],
    { error: "Choisissez un sujet dans la liste." },
  ),
  message: plain("Votre message", 10, 3000, true),
});

export const BuyerReportFormSchema = z.strictObject({
  intent: z.literal("report"),
  reason: z.enum(["not_as_described", "courier_no_show", "code_lost", "other"], {
    error: "Choisissez un motif dans la liste.",
  }),
  description: plain("La description du problème", 0, 300, true),
});

/** Duplicated fields stay arrays and fail the scalar schemas; uploaded files also fail. */
export function formValues(form: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = Object.create(null);
  for (const key of new Set(form.keys())) {
    const entries = form.getAll(key);
    values[key] = entries.length === 1 ? entries[0] : entries;
  }
  return values;
}
