import { ORDER_STATES } from "@woor/core";
import { z } from "zod";

import { ApiError, type ApiResponse, callApi } from "./api-client.server";
import {
  type BuyerOrderView,
  BuyerOrderViewSchema,
  type PublicOrderSummary,
  PublicOrderSummarySchema,
} from "./buyer-schemas";

/** Appels de l'API pour l'acheteur. cookieHeader vient de la requête du navigateur. */
export const buyerApi = {
  async getPublicOrder(token: string, cookieHeader: string | null): Promise<PublicOrderSummary> {
    const { body } = await callApi({
      path: orderPath(token),
      cookieHeader,
      schema: PublicOrderSummarySchema,
    });
    return body;
  },

  /** Commande vue par ce téléphone, ou null s'il n'y est pas lié. */
  async findMyOrder(token: string, cookieHeader: string | null): Promise<BuyerOrderView | null> {
    try {
      const { body } = await callApi({
        path: `${orderPath(token)}/me`,
        cookieHeader,
        schema: BuyerOrderViewSchema,
      });
      return body;
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound) {
        return null;
      }
      throw error;
    }
  },

  claim(token: string, cookieHeader: string | null): Promise<ApiResponse<null>> {
    return callApi({
      method: "POST",
      path: `${orderPath(token)}/claim`,
      cookieHeader,
      schema: z.null(),
    });
  },

  async requestInvoices(token: string, cookieHeader: string | null): Promise<void> {
    await callApi({
      method: "POST",
      path: `${orderPath(token)}/invoices`,
      cookieHeader,
      schema: z.object({ status: z.enum(["requested", "pending", "exists"]) }),
    });
  },

  async revealCode(token: string, cookieHeader: string | null): Promise<string> {
    const { body } = await callApi({
      method: "POST",
      path: `${orderPath(token)}/code`,
      cookieHeader,
      schema: z.object({ code: z.string().regex(/^\d{6}$/) }),
    });
    return body.code;
  },

  async cancel(token: string, cookieHeader: string | null): Promise<void> {
    await callApi({
      method: "POST",
      path: `${orderPath(token)}/cancel`,
      cookieHeader,
      schema: z.object({ state: z.enum(ORDER_STATES) }),
    });
  },
};

function orderPath(token: string): string {
  return `/v1/o/${encodeURIComponent(token)}`;
}
