import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { AuthenticationError, BusinessRuleError, NotFoundError } from "../application/errors";

/** Corps d'erreur au format RFC 9457, type application/problem+json. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  /** Code stable d'une règle métier, lisible par le client. */
  code?: string;
}

export function sendProblem(reply: FastifyReply, problem: Problem): FastifyReply {
  return reply.status(problem.status).type("application/problem+json").send(problem);
}

/** Même réponse pour « inexistant » et « interdit » : aucune énumération possible. */
export function notFoundHandler(_request: FastifyRequest, reply: FastifyReply): FastifyReply {
  return sendProblem(reply, { type: "about:blank", title: "Introuvable", status: 404 });
}

export function errorHandler(
  error: FastifyError | BusinessRuleError | NotFoundError | AuthenticationError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof NotFoundError) {
    return notFoundHandler(request, reply);
  }
  if (error instanceof AuthenticationError) {
    return sendProblem(reply, {
      type: "about:blank",
      title: error.message,
      status: 401,
      code: error.code,
    });
  }
  if (error instanceof ZodError) {
    // Corps ou paramètres mal formés : on ne renvoie pas le détail de la validation.
    return sendProblem(reply, { type: "about:blank", title: "Données invalides", status: 400 });
  }
  if (error instanceof BusinessRuleError) {
    return sendProblem(reply, {
      type: "about:blank",
      title: error.message,
      status: 409,
      code: error.code,
    });
  }

  const status = error.statusCode ?? 500;
  if (status >= 500) {
    request.log.error({ err: error }, "Erreur interne");
    // Aucun détail technique ne sort vers le client.
    return sendProblem(reply, { type: "about:blank", title: "Erreur interne", status });
  }
  return sendProblem(reply, { type: "about:blank", title: error.message, status });
}
