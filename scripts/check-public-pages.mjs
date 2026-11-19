import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// Exercise the production server renderer with a local, read-only session fixture.
// No real accounts, database, payment service or running application are modified.
const roles = { "check-seller": "seller", "check-courier": "courier" };
let apiCalls = 0;
let writeCalls = 0;
const courierId = "0190a1b2-0000-7000-8000-000000000001";
const api = createServer((request, response) => {
  apiCalls++;
  if (request.method === "POST") writeCalls++;
  const cookie = request.headers.cookie ?? "";
  const token = cookie.match(/(?:^|;\s*)woor_session=([^;]+)/)?.[1];
  const role = roles[token];
  response.setHeader("content-type", "application/json");
  if (request.url === "/v1/me" && role) {
    response.end(JSON.stringify({ displayName: "Vérification locale", role }));
  } else if (request.url === "/v1/seller/couriers" && role === "seller") {
    response.end(
      JSON.stringify([{ id: courierId, displayName: "Livraison test", phoneLast2: "02" }]),
    );
  } else if (request.url === `/v1/courier/orders/${courierId}` && role === "courier") {
    response.end(
      JSON.stringify({
        id: courierId,
        itemLabel: "Commande test",
        deliveryFeeXof: 1500,
        state: "in_transit",
        sellerName: "Vendeur test",
        neighborhood: "Dakar",
        landmark: null,
        lockedAt: null,
        pickupDeadline: null,
        pickedUpAt: null,
        deliveredAt: null,
        closedAt: null,
        codeAttemptsLeft: 5,
        codeLocked: false,
      }),
    );
  } else {
    response.statusCode = token === "check-unavailable" ? 503 : 401;
    response.end(JSON.stringify({ title: "Session indisponible", status: response.statusCode }));
  }
});
api.listen(0, "127.0.0.1");
await once(api, "listening");

try {
  process.env.API_URL = `http://127.0.0.1:${api.address().port}`;
  const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
  const { createRequestHandler } = await import(
    pathToFileURL(webRequire.resolve("react-router")).href
  );
  const build = await import("../apps/web/build/server/index.js");
  const handle = createRequestHandler(build, "production");
  async function render(path, token) {
    const headers = token ? { cookie: `woor_session=${token}` } : {};
    const response = await handle(new Request(`http://woor.local${path}`, { headers }));
    return { status: response.status, html: await response.text() };
  }
  const paths = [
    "/",
    "/fonctionnement",
    "/solutions/vendeurs",
    "/solutions/acheteurs",
    "/solutions/livreurs",
    "/securite",
    "/aide",
    "/a-propos",
    "/contact",
  ];
  const removedText = [
    "Votre prochain échange commence ici",
    "La conversation est lancée",
    "Les scènes photographiques sont des illustrations",
    "FR · F CFA / Bitcoin Lightning",
    "Découvrez le projet Wóor",
  ];
  for (const path of paths) {
    const { status, html } = await render(path);
    assert.equal(status, 200, path);
    const header = html.match(/<header class="m-header"[\s\S]*?<\/header>/)?.[0];
    assert.ok(header, `${path}: public navigation`);
    assert.ok(header.includes("Se connecter"), `${path}: visitor sign-in`);
    assert.ok(!header.includes("Mon espace"), `${path}: no account button for a visitor`);
    assert.ok(!header.includes("m-mega"), `${path}: simple dropdowns`);
    for (const text of removedText) assert.ok(!html.includes(text), `${path}: removed copy`);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, `${path}: one main heading`);
  }
  assert.equal(apiCalls, 0, "Public pages without a session do not need the API");
  for (const [token, destination] of [
    ["check-seller", "/vendeuse"],
    ["check-courier", "/livreur"],
  ]) {
    const { status, html } = await render("/", token);
    assert.equal(status, 200);
    const header = html.match(/<header class="m-header"[\s\S]*?<\/header>/)?.[0];
    assert.ok(header.includes("Mon espace"));
    assert.ok(header.includes(`href="${destination}"`));
    assert.ok(!header.includes("Se connecter"));
  }
  for (const token of ["check-expired", "check-unavailable"]) {
    const { status, html } = await render("/", token);
    assert.equal(
      status,
      200,
      "Public pages remain available if a session expires or its API is unavailable",
    );
    assert.ok(
      html.match(/<header class="m-header"[\s\S]*?<\/header>/)?.[0].includes("Se connecter"),
    );
  }
  for (const path of ["/solutions/inconnue", "/solutions/securite"]) {
    assert.equal((await render(path)).status, 404, path);
  }
  const login = await render("/connexion");
  assert.equal(login.status, 200);
  assert.ok(login.html.includes('name="phone"'));
  assert.ok(login.html.includes('name="pin"'));
  assert.ok(login.html.includes('type="password"'));
  const contact = await render("/contact");
  assert.ok(contact.html.includes('href="mailto:contact@woor.com"'));
  assert.ok(contact.html.includes('href="https://wa.me/221784184215"'));
  assert.ok(contact.html.includes('href="tel:+221784184215"'));
  async function submit(path, values, token, contentType = "application/x-www-form-urlencoded") {
    const response = await handle(
      new Request(`http://woor.local${path}`, {
        method: "POST",
        headers: {
          origin: "http://woor.local",
          "content-type": contentType,
          ...(token && { cookie: `woor_session=${token}` }),
        },
        body: typeof values === "string" ? values : new URLSearchParams(values),
      }),
    );
    return { status: response.status, html: await response.text() };
  }
  const invalidLogin = await submit("/connexion", {
    phone: "<script>alert(1)</script>",
    pin: "123456",
  });
  assert.equal(invalidLogin.status, 200);
  assert.ok(invalidLogin.html.includes("mobile sénégalais"));
  assert.ok(!invalidLogin.html.includes("<script>alert(1)</script>"));
  assert.equal(
    (await submit("/connexion", "phone=770000001&phone=780000002&pin=123456")).status,
    200,
  );
  assert.equal((await submit("/connexion", "x=" + "a".repeat(17000))).status, 413);
  assert.equal((await submit("/connexion", "{}", undefined, "application/json")).status, 415);
  const invalidOrder = await submit(
    "/vendeuse/nouvelle",
    {
      itemLabel: "<script>alert(1)</script>",
      itemPriceXof: "12000",
      deliveryFeeXof: "1500",
      courierId,
      neighborhood: "Dakar",
      landmark: "",
    },
    "check-seller",
  );
  assert.equal(invalidOrder.status, 200);
  assert.ok(invalidOrder.html.includes("sans balise HTML"));
  const invalidCode = await submit(
    `/livreur/courses/${courierId}`,
    { intent: "code", code: "12a456" },
    "check-courier",
  );
  assert.equal(invalidCode.status, 200);
  assert.ok(invalidCode.html.includes("exactement 6 chiffres"));
  assert.equal(writeCalls, 0, "Invalid forms must never call an API write endpoint");
  process.stdout.write(
    "OK: 9 public pages, session navigation, contact links, invalid login/order/code forms and bounded requests; no API writes.\n",
  );
} finally {
  api.closeAllConnections();
  await new Promise((resolve, reject) => api.close((error) => (error ? reject(error) : resolve())));
}
