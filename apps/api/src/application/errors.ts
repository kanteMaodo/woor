/**
 * Règle métier refusée par la base : interrupteur général, plafond atteint, commande déjà prise.
 * Le code est stable et lisible par le client ; le message est en français, pour l'utilisateur.
 */
export class BusinessRuleError extends Error {
  override readonly name = "BusinessRuleError";

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Ressource inexistante ou interdite. Les deux cas donnent la même réponse :
 * un jeton deviné ne doit rien apprendre de plus qu'un jeton inventé.
 */
export class NotFoundError extends Error {
  override readonly name = "NotFoundError";

  constructor() {
    super("Introuvable");
  }
}
