/**
 * Bornes d'une commande, miroir des contraintes CHECK de woor.orders.
 * Vérifiées avant l'envoi pour un message clair ; la base reste l'arbitre final.
 */
export const ORDER_LIMITS = {
  itemLabel: { min: 2, max: 80 },
  itemPriceXof: { min: 500, max: 50_000 },
  deliveryFeeXof: { min: 500, max: 10_000 },
  landmark: { max: 160 },
} as const;
