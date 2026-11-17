import type { Actor } from "../../actor";
import { BusinessRuleError, NotFoundError } from "../../errors";
import type { CodeCheck, CourierDeliveries } from "../../ports/courier-deliveries";
import type { DeliveryCodeHasher } from "../../ports/order-links";
import { CODE_MAX_ATTEMPTS } from "./delivery-view";

export type CodeSubmission = { result: "ok" } | { result: "wrong"; attemptsLeft: number };

/**
 * Le livreur saisit le code lu sur le téléphone de l'acheteur.
 * Code juste : le paiement est débloqué. Cinq codes faux : la commande se verrouille
 * et un litige s'ouvre tout seul.
 */
export class SubmitDeliveryCode {
  constructor(
    private readonly deliveries: CourierDeliveries,
    private readonly codes: DeliveryCodeHasher,
  ) {}

  async execute(actor: Actor, orderId: string, code: string): Promise<CodeSubmission> {
    if (!/^\d{6}$/.test(code)) {
      throw new BusinessRuleError("code_format", "Le code a 6 chiffres.");
    }
    const check: CodeCheck = await this.deliveries.verifyCode(
      actor,
      orderId,
      this.codes.hmacDeliveryCode(code),
    );

    switch (check) {
      case "ok":
        return { result: "ok" };
      case "wrong": {
        const delivery = await this.deliveries.find(actor, orderId);
        const attemptsLeft = delivery ? Math.max(0, CODE_MAX_ATTEMPTS - delivery.codeAttempts) : 0;
        return { result: "wrong", attemptsLeft };
      }
      case "locked":
        throw new BusinessRuleError(
          "code_locked",
          "Trop de codes faux : la commande est verrouillée et un arbitre va trancher.",
        );
      case "not_allowed":
        throw new NotFoundError();
    }
  }
}
