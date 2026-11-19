import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// Exercise the production server renderer with a local, read-only session fixture.
// No real accounts, database, payment service or running application are modified.
const roles = { "check-seller": "seller", "check-courier": "courier" };
let apiCalls = 0;
const api = createServer((request, response) => {
  apiCalls++;
  const cookie = request.headers.cookie ?? "";
  const token = cookie.match(/(?:^|;\s*)woor_session=([^;]+)/)?.[1];
  const role = roles[token];
  response.setHeader("content-type", "application/json");
  if (request.url === "/v1/me" && role) {
    response.end(JSON.stringify({ displayName: "Vérification locale", role }));
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
  process.stdout.write(
    "OK: 9 public pages, seller/courier navigation, expired/unavailable sessions, invalid routes, login and contact links.\n",
  );
} finally {
  api.closeAllConnections();
  await new Promise((resolve, reject) => api.close((error) => (error ? reject(error) : resolve())));
}
