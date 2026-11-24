/**
 * Localités desservies, regroupées par zone de la région de Dakar.
 * La vendeuse choisit dans cette liste pour une orthographe unique ; « Autre » ouvre
 * une saisie libre quand son quartier n’y figure pas.
 */
export const DELIVERY_ZONES = [
  {
    zone: "Dakar centre",
    localities: [
      "Plateau",
      "Médina",
      "Gueule Tapée",
      "Fass",
      "Colobane",
      "Fann",
      "Point E",
      "Amitié",
      "Grand Dakar",
      "Biscuiterie",
      "HLM",
      "Hann Bel-Air",
      "Hann Maristes",
      "Dalifort",
    ],
  },
  {
    zone: "Sicap et Mermoz",
    localities: [
      "Liberté 1 à 5",
      "Liberté 6",
      "Sacré-Cœur 1",
      "Sacré-Cœur 2",
      "Sacré-Cœur 3",
      "Sicap Baobab",
      "Dieuppeul",
      "Derklé",
      "Castors",
      "Mermoz",
      "Cité Keur Gorgui",
      "VDN",
    ],
  },
  {
    zone: "Dakar ouest et nord",
    localities: [
      "Ouakam",
      "Mamelles",
      "Almadies",
      "Ngor",
      "Yoff",
      "Ouest Foire",
      "Nord Foire",
      "Grand Yoff",
      "Patte d’Oie",
      "Grand Médine",
      "Parcelles Assainies",
      "Cambérène",
    ],
  },
  {
    zone: "Guédiawaye",
    localities: [
      "Guédiawaye",
      "Golf Sud",
      "Sam Notaire",
      "Ndiarème Limamoulaye",
      "Wakhinane Nimzatt",
      "Médina Gounass",
    ],
  },
  {
    zone: "Pikine",
    localities: ["Pikine", "Guinaw Rails", "Thiaroye", "Diamaguène", "Mbao"],
  },
  {
    zone: "Keur Massar",
    localities: ["Keur Massar", "Yeumbeul", "Malika", "Jaxaay"],
  },
  {
    zone: "Rufisque",
    localities: [
      "Rufisque",
      "Bargny",
      "Diamniadio",
      "Sébikotane",
      "Sangalkam",
      "Bambilor",
      "Tivaouane Peulh",
      "Lac Rose",
    ],
  },
] as const;

/** Choix du formulaire qui ouvre la saisie libre ; jamais enregistré tel quel. */
export const OTHER_LOCALITY = "Autre";

export type Locality = (typeof DELIVERY_ZONES)[number]["localities"][number];

const LOCALITIES: ReadonlySet<string> = new Set(
  DELIVERY_ZONES.flatMap((zone) => [...zone.localities]),
);

export function isLocality(value: string): value is Locality {
  return LOCALITIES.has(value);
}
