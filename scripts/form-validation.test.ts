import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { LogInBody } from "../apps/api/src/http/routes/auth-routes";
import { CodeBody } from "../apps/api/src/http/routes/courier-routes";
import { NewOrderBody } from "../apps/api/src/http/routes/seller-routes";
import { readPlainForm } from "../apps/web/app/lib/form-data.server";
import { assertSameOrigin } from "../apps/web/app/lib/security.server";
import {
  BuyerReportFormSchema,
  ContactFormSchema,
  DeliveryCodeFormSchema,
  formValues,
  LoginFormSchema,
  NewOrderFormSchema,
} from "../apps/web/app/lib/form-validation";

const contact = {
  name: "Awa N’Diaye",
  email: "awa@example.com",
  profile: "Vendeur ou vendeuse",
  subject: "Découvrir Wóor",
  message: "Bonjour, je voudrais rejoindre le pilote à Dakar.\nMerci !",
};
const order = {
  itemLabel: "Robe d’été, taille M",
  itemPriceXof: "12000",
  deliveryFeeXof: "1500",
  courierId: "0190a1b2-0000-7000-8000-000000000001",
  neighborhood: "Sacré-Cœur 3",
  landmark: "À côté de l’école\nPortail bleu",
};

test("Senegal phone formats normalize; invalid numbers and PINs are rejected", () => {
  for (const phone of ["77 000 00 01", "+221 77 000 00 01", "00221770000001"]) {
    assert.equal(LoginFormSchema.parse({ phone, pin: "012345" }).phone, "+221770000001");
    assert.ok(LogInBody.safeParse({ phone, pin: "012345" }).success);
  }
  for (const phone of ["", "12345", "+33123456789", "<script>alert(1)</script>"]) {
    assert.ok(!LoginFormSchema.safeParse({ phone, pin: "012345" }).success);
    assert.ok(!LogInBody.safeParse({ phone, pin: "012345" }).success);
  }
  for (const pin of ["12345", "1234567", "12a456", "123\n45", "１２３４５６"]) {
    assert.ok(!LoginFormSchema.safeParse({ phone: "770000001", pin }).success);
    assert.ok(!LogInBody.safeParse({ phone: "770000001", pin }).success);
    assert.ok(!CodeBody.safeParse({ code: pin }).success);
  }
  assert.ok(DeliveryCodeFormSchema.safeParse({ intent: "code", code: "012345" }).success);
});

test("Amounts use whole CFA values within the same browser and API limits", () => {
  const parsed = NewOrderFormSchema.parse(order);
  assert.equal(parsed.itemPriceXof, 12000);
  assert.ok(NewOrderBody.safeParse(parsed).success);
  for (const amount of ["", "-500", "500.5", "1e3", "0x400", "NaN", "Infinity", "499", "50001"])
    assert.ok(!NewOrderFormSchema.safeParse({ ...order, itemPriceXof: amount }).success, amount);
  for (const amount of [499, 50000.5, 50001, NaN, Infinity])
    assert.ok(!NewOrderBody.safeParse({ ...parsed, itemPriceXof: amount }).success);
  assert.ok(
    NewOrderFormSchema.safeParse({ ...order, itemPriceXof: "50000", deliveryFeeXof: "10000" })
      .success,
  );
  assert.ok(!NewOrderFormSchema.safeParse({ ...order, deliveryFeeXof: "10001" }).success);
});

test("Valid French punctuation and Unicode survive; markup and controls do not", () => {
  assert.equal(NewOrderFormSchema.parse(order).itemLabel, "Robe d’été, taille M");
  for (const payload of [
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    "Robe\u0000wax",
    "Robe\u202eevil",
  ]) {
    assert.ok(!NewOrderFormSchema.safeParse({ ...order, itemLabel: payload }).success);
    assert.ok(
      !NewOrderBody.safeParse({ ...NewOrderFormSchema.parse(order), neighborhood: payload })
        .success,
    );
    assert.ok(!ContactFormSchema.safeParse({ ...contact, message: payload }).success);
  }
  assert.ok(
    !NewOrderFormSchema.safeParse({ ...order, courierId: "'; DROP TABLE users; --" }).success,
  );
});

test("Contact checks names, email headers, lengths and allowed choices", () => {
  assert.ok(ContactFormSchema.safeParse(contact).success);
  for (const email of [
    "not-an-email",
    "a@b",
    "a@example.com\r\nBcc: victim@example.com",
    "javascript:alert(1)",
  ])
    assert.ok(!ContactFormSchema.safeParse({ ...contact, email }).success);
  for (const name of [" ", "12345", "<b>Awa</b>"])
    assert.ok(!ContactFormSchema.safeParse({ ...contact, name }).success);
  assert.ok(!ContactFormSchema.safeParse({ ...contact, message: "          " }).success);
  assert.ok(!ContactFormSchema.safeParse({ ...contact, message: "a".repeat(3001) }).success);
  assert.ok(!ContactFormSchema.safeParse({ ...contact, profile: "admin" }).success);
  assert.ok(
    !ContactFormSchema.safeParse({ ...contact, subject: "\r\nBcc: attacker@example.com" }).success,
  );
});

test("Duplicate parameters, uploads and unexpected privileges are refused", () => {
  const repeated = new FormData();
  repeated.append("phone", "770000001");
  repeated.append("phone", "780000002");
  repeated.append("pin", "123456");
  assert.ok(!LoginFormSchema.safeParse(formValues(repeated)).success);
  const upload = new FormData();
  upload.append("phone", new Blob(["770000001"]), "phone.txt");
  upload.append("pin", "123456");
  assert.ok(!LoginFormSchema.safeParse(formValues(upload)).success);
  assert.ok(!LogInBody.safeParse({ phone: "770000001", pin: "123456", role: "admin" }).success);
  assert.ok(
    !ContactFormSchema.safeParse({ ...contact, __proto__: null, unexpected: "value" }).success,
  );
});

test("Reports keep a bounded plain-text description and a known reason", () => {
  assert.ok(
    BuyerReportFormSchema.safeParse({
      intent: "report",
      reason: "other",
      description: "La taille ne correspond pas.",
    }).success,
  );
  for (const description of ["a".repeat(301), "<svg onload=alert(1)>"])
    assert.ok(
      !BuyerReportFormSchema.safeParse({ intent: "report", reason: "other", description }).success,
    );
  assert.ok(
    !BuyerReportFormSchema.safeParse({ intent: "report", reason: "admin", description: "" })
      .success,
  );
});

const request = (body: string, contentType = "application/x-www-form-urlencoded") =>
  new Request("http://woor.local/connexion", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
test("Server form decoding preserves duplicates and bounds request streams", async () => {
  const form = await readPlainForm(request("phone=770000001&phone=780000002&pin=123456"));
  assert.equal(form.getAll("phone").length, 2);
  assert.ok(!LoginFormSchema.safeParse(formValues(form)).success);
  await assert.rejects(
    readPlainForm(request("x=" + "a".repeat(17000))),
    (error) => error instanceof Response && error.status === 413,
  );
  await assert.rejects(
    readPlainForm(request('{"phone":"770000001"}', "application/json")),
    (error) => error instanceof Response && error.status === 415,
  );
});

test("Encoded markup is rendered as text, never interpreted as HTML", () => {
  const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const value = "&lt;img src=x onerror=alert(1)&gt;";
  assert.ok(ContactFormSchema.safeParse({ ...contact, message: value }).success);
  const html = renderToStaticMarkup(React.createElement("p", null, value));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&amp;lt;img"));
});

test("Form origins must match the full origin, including scheme and port", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("https://woor.local/connexion", {
        method: "POST",
        headers: { origin: "https://woor.local" },
      }),
    ),
  );
  for (const origin of [
    "http://woor.local",
    "https://woor.local:444",
    "https://evil.example",
    "null",
    "invalid-origin",
  ]) {
    assert.throws(() =>
      assertSameOrigin(
        new Request("https://woor.local/connexion", { method: "POST", headers: { origin } }),
      ),
    );
  }
});
