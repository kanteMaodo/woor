import { ORDER_STATES } from "@woor/core";
import { z } from "zod";

import {
  type CodeSubmission,
  CodeSubmissionSchema,
  type CreatedOrder,
  CreatedOrderSchema,
  type Delivery,
  DeliverySchema,
  type LinkedCourier,
  LinkedCourierSchema,
  type Profile,
  ProfileSchema,
  type SellerOrder,
  SellerOrderSchema,
} from "./account-schemas";
import { type ApiResponse, callApi } from "./api-client.server";

const StateSchema = z.object({ state: z.enum(ORDER_STATES) });

/** Connexion et profil. cookieHeader vient de la requête du navigateur. */
export const authApi = {
  logIn(phone: string, pin: string): Promise<ApiResponse<Profile>> {
    return callApi({
      method: "POST",
      path: "/v1/auth/login",
      cookieHeader: null,
      body: { phone, pin },
      schema: ProfileSchema,
    });
  },

  logOut(cookieHeader: string | null): Promise<ApiResponse<null>> {
    return callApi({ method: "POST", path: "/v1/auth/logout", cookieHeader, schema: z.null() });
  },

  async me(cookieHeader: string | null): Promise<Profile> {
    const { body } = await callApi({ path: "/v1/me", cookieHeader, schema: ProfileSchema });
    return body;
  },
};

export interface NewOrderInput {
  itemLabel: string;
  itemPriceXof: number;
  deliveryFeeXof: number;
  courierId: string;
  neighborhood: string;
  landmark: string;
}

/** Espace de la vendeuse. */
export const sellerApi = {
  async couriers(cookieHeader: string | null): Promise<LinkedCourier[]> {
    const { body } = await callApi({
      path: "/v1/seller/couriers",
      cookieHeader,
      schema: z.array(LinkedCourierSchema),
    });
    return body;
  },

  async orders(cookieHeader: string | null): Promise<SellerOrder[]> {
    const { body } = await callApi({
      path: "/v1/seller/orders",
      cookieHeader,
      schema: z.array(SellerOrderSchema),
    });
    return body;
  },

  async order(id: string, cookieHeader: string | null): Promise<SellerOrder> {
    const { body } = await callApi({
      path: `/v1/seller/orders/${encodeURIComponent(id)}`,
      cookieHeader,
      schema: SellerOrderSchema,
    });
    return body;
  },

  async create(input: NewOrderInput, cookieHeader: string | null): Promise<CreatedOrder> {
    const { body } = await callApi({
      method: "POST",
      path: "/v1/seller/orders",
      cookieHeader,
      body: input,
      schema: CreatedOrderSchema,
    });
    return body;
  },

  async cancel(id: string, cookieHeader: string | null): Promise<void> {
    await callApi({
      method: "POST",
      path: `/v1/seller/orders/${encodeURIComponent(id)}/cancel`,
      cookieHeader,
      schema: StateSchema,
    });
  },
};

/** Espace du livreur. */
export const courierApi = {
  async deliveries(cookieHeader: string | null): Promise<Delivery[]> {
    const { body } = await callApi({
      path: "/v1/courier/orders",
      cookieHeader,
      schema: z.array(DeliverySchema),
    });
    return body;
  },

  async delivery(id: string, cookieHeader: string | null): Promise<Delivery> {
    const { body } = await callApi({
      path: `/v1/courier/orders/${encodeURIComponent(id)}`,
      cookieHeader,
      schema: DeliverySchema,
    });
    return body;
  },

  async confirmPickup(id: string, cookieHeader: string | null): Promise<void> {
    await callApi({
      method: "POST",
      path: `/v1/courier/orders/${encodeURIComponent(id)}/pickup`,
      cookieHeader,
      schema: StateSchema,
    });
  },

  async submitCode(id: string, code: string, cookieHeader: string | null): Promise<CodeSubmission> {
    const { body } = await callApi({
      method: "POST",
      path: `/v1/courier/orders/${encodeURIComponent(id)}/code`,
      cookieHeader,
      body: { code },
      schema: CodeSubmissionSchema,
    });
    return body;
  },
};
