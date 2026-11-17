/**
 * Comptes de démonstration : une vendeuse, un livreur, et l'administrateur qui les a vérifiés.
 *
 * Remplace le parcours d'invitation, hors du périmètre du hackathon. Se connecte en
 * superutilisateur (ADMIN_DATABASE_URL) : jamais en production. Sans effet s'il a déjà tourné.
 *
 *   pnpm --filter @woor/api seed:demo
 */
import { createPool, type PoolClient, withTransaction } from "@woor/db";
import { z } from "zod";

import { AesGcmPiiCipher } from "../infrastructure/crypto/aes-gcm-pii-cipher";
import { NodeAuthSecrets } from "../infrastructure/crypto/node-auth-secrets";

interface DemoAccount {
  role: "admin" | "seller" | "courier";
  displayName: string;
  phone: string;
  pin: string | null;
}

const ADMIN: DemoAccount = {
  role: "admin",
  displayName: "Équipe Wóor",
  phone: "+221770000000",
  pin: null,
};
const SELLER: DemoAccount = {
  role: "seller",
  displayName: "Awa Couture",
  phone: "+221770000001",
  pin: "111111",
};
const COURIER: DemoAccount = {
  role: "courier",
  displayName: "Moussa Diop",
  phone: "+221770000002",
  pin: "222222",
};

const base64Key = z.string().refine((value) => Buffer.from(value, "base64").length === 32);
const env = z
  .object({
    NODE_ENV: z.string().default("development"),
    ADMIN_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    PHONE_HMAC_KEY: base64Key,
    PIN_PEPPER: base64Key,
    PII_KEY: base64Key,
    PII_KEY_ID: z.coerce.number().int().min(1).default(1),
  })
  .parse(process.env);

if (env.NODE_ENV === "production") {
  throw new Error("Les comptes de démonstration ne s'installent jamais en production.");
}

const secrets = new NodeAuthSecrets(
  Buffer.from(env.PHONE_HMAC_KEY, "base64"),
  Buffer.from(env.PIN_PEPPER, "base64"),
);
const cipher = new AesGcmPiiCipher(Buffer.from(env.PII_KEY, "base64"), env.PII_KEY_ID);
const pool = createPool({ connectionString: env.ADMIN_DATABASE_URL, applicationName: "woor-seed" });

async function insertAccount(
  client: PoolClient,
  account: DemoAccount,
  checkedBy: string | null,
): Promise<string> {
  const phone = cipher.seal(account.phone);
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO woor.users (role, display_name, phone_enc, phone_key_id, phone_hmac, phone_last2,
                             status, identity_checked_at, identity_checked_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', now(), $7)
     RETURNING id`,
    [
      account.role,
      account.displayName,
      phone.ciphertext,
      phone.keyId,
      secrets.hmacPhone(account.phone),
      account.phone.slice(-2),
      checkedBy,
    ],
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new Error(`Compte ${account.displayName} non créé`);
  }
  if (account.pin) {
    await client.query(
      `INSERT INTO woor.credentials (user_id, kind, pin_hash) VALUES ($1, 'pin', $2)`,
      [id, await secrets.hashPin(account.pin)],
    );
  }
  return id;
}

async function seed(): Promise<boolean> {
  return withTransaction(pool, async (client) => {
    const { rowCount } = await client.query(`SELECT 1 FROM woor.users WHERE phone_hmac = $1`, [
      secrets.hmacPhone(SELLER.phone),
    ]);
    if (rowCount) {
      return false;
    }

    // L'administrateur se vérifie lui-même : il faut bien un premier compte vérifié.
    const adminPhone = cipher.seal(ADMIN.phone);
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO woor.users (role, display_name, phone_enc, phone_key_id, phone_hmac, phone_last2, status)
       VALUES ('admin', $1, $2, $3, $4, $5, 'active')
       RETURNING id`,
      [
        ADMIN.displayName,
        adminPhone.ciphertext,
        adminPhone.keyId,
        secrets.hmacPhone(ADMIN.phone),
        "00",
      ],
    );
    const adminId = rows[0]?.id;
    if (!adminId) {
      throw new Error("Administrateur non créé");
    }
    await client.query(
      `UPDATE woor.users SET identity_checked_at = now(), identity_checked_by = id WHERE id = $1`,
      [adminId],
    );

    const sellerId = await insertAccount(client, SELLER, adminId);
    const courierId = await insertAccount(client, COURIER, adminId);
    await client.query(
      `INSERT INTO woor.seller_couriers (seller_id, courier_id, created_by) VALUES ($1, $2, $3)`,
      [sellerId, courierId, adminId],
    );
    return true;
  });
}

try {
  const created = await seed();
  process.stdout.write(
    `${created ? "Comptes de démonstration créés." : "Comptes de démonstration déjà présents."}\n` +
      `  Vendeuse : 77 000 00 01, PIN ${SELLER.pin}\n` +
      `  Livreur  : 77 000 00 02, PIN ${COURIER.pin}\n`,
  );
} finally {
  await pool.end();
}
