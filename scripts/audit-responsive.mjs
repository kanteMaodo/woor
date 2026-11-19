/* global document, window, HTMLElement, getComputedStyle */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const auditRoot = path.join(root, "node_modules/.woor-audit");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(auditRoot, "browsers");
process.env.TEMP = path.join(auditRoot, "tmp");
process.env.TMP = process.env.TEMP;
const output = path.join(auditRoot, "results");
await mkdir(output, { recursive: true });
await mkdir(process.env.TEMP, { recursive: true });
const { chromium } = await import(
  pathToFileURL(path.join(auditRoot, "node_modules/playwright/index.mjs"))
);
const launchOptions = { headless: true, args: ["--disable-gpu"] };
let browser = await chromium.launch(launchOptions);
const base = process.env.WOOR_AUDIT_URL ?? "http://127.0.0.1:5173";
const routes = [
  "/",
  "/fonctionnement",
  "/solutions/vendeurs",
  "/solutions/acheteurs",
  "/solutions/livreurs",
  "/securite",
  "/aide",
  "/a-propos",
  "/contact",
  "/connexion",
];
const widths = (
  process.env.WOOR_AUDIT_WIDTHS ??
  "320,360,390,540,700,701,768,820,899,900,1000,1024,1280,1440,1920"
)
  .split(",")
  .map(Number);
const report = { layouts: [], issues: [], interactions: [], runtimeErrors: [] };

try {
  let context = await browser.newContext({ reducedMotion: "reduce" });
  let page = await context.newPage();
  let currentPath = "";
  page.on("pageerror", (error) =>
    report.runtimeErrors.push({ path: currentPath, message: error.message }),
  );
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    for (const route of routes) {
      currentPath = route;
      const response = await page.goto(base + route, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        await Promise.all(
          [...document.images].map(async (image) => {
            image.loading = "eager";
            await image.decode().catch(() => {});
          }),
        );
      });
      const layout = await page.evaluate(() => {
        const width = window.innerWidth;
        const overflowing = [...document.querySelectorAll("body *")]
          .filter((element) => {
            if (!(element instanceof HTMLElement) || element.closest(".m-table-scroll"))
              return false;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              (rect.right > width + 2 || rect.left < -2)
            );
          })
          .map((element) => ({
            tag: element.tagName,
            class: element.className,
            text: element.textContent.trim().slice(0, 90),
            left: Math.round(element.getBoundingClientRect().left),
            right: Math.round(element.getBoundingClientRect().right),
          }));
        const brokenImages = [...document.images]
          .filter((image) => !image.complete || !image.naturalWidth)
          .map((image) => image.getAttribute("src"));
        return {
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          overflowing: overflowing.slice(0, 15),
          brokenImages,
          h1: document.querySelectorAll("h1").length,
        };
      });
      const result = { path: route, width, status: response.status(), ...layout };
      report.layouts.push(result);
      if (
        result.status !== 200 ||
        result.overflowing.length ||
        result.brokenImages.length ||
        result.documentWidth > width + 2 ||
        result.h1 !== 1
      )
        report.issues.push(result);
      if ([390, 1440].includes(width) && ["/", "/connexion", "/contact"].includes(route))
        await page.screenshot({
          path: path.join(output, `${route === "/" ? "home" : route.slice(1)}-${width}.png`),
          fullPage: false,
        });
    }
    process.stdout.write(`${width}px: ${routes.length} pages checked.\n`);
    // Release browser resources between viewports, including on modest Windows PCs.
    await context.close();
    await browser.close();
    browser = await chromium.launch(launchOptions);
    context = await browser.newContext({ reducedMotion: "reduce" });
    page = await context.newPage();
    page.on("pageerror", (error) =>
      report.runtimeErrors.push({ path: currentPath, message: error.message }),
    );
  }
  async function check(name, callback) {
    try {
      await callback();
      report.interactions.push({ name, passed: true });
    } catch (error) {
      report.interactions.push({ name, passed: false, error: error.message });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: "networkidle" });
  await check("Desktop dropdowns are above the page and close with Escape", async () => {
    for (const label of ["La plateforme", "Solutions", "Ressources"]) {
      const trigger = page.getByRole("button", { name: label, exact: true });
      await trigger.click();
      const panel = page.locator(".m-dropdown:visible");
      assert.equal(await panel.count(), 1);
      assert.ok(
        await panel.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(rect.left + 20, rect.top + 15));
        }),
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".m-dropdown:visible").count(), 0);
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await check("Mobile navigation opens, follows a link and closes", async () => {
    assert.equal(
      await page.locator(".m-header a:visible").filter({ hasText: "Se connecter" }).count(),
      0,
    );
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    assert.ok(await page.locator("#mobile-navigation").isVisible());
    assert.equal(
      await page.locator(".m-header a:visible").filter({ hasText: "Se connecter" }).count(),
      1,
    );
    await page
      .locator("#mobile-navigation")
      .getByRole("link", { name: "À propos de Wóor" })
      .click();
    await page.waitForURL("**/a-propos");
    assert.ok(!(await page.locator("#mobile-navigation").isVisible()));
  });
  await check("Mobile navigation remains scrollable in landscape", async () => {
    await page.setViewportSize({ width: 740, height: 390 });
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const last = page
      .locator("#mobile-navigation")
      .getByRole("link", { name: "Se connecter", exact: true });
    await last.scrollIntoViewIfNeeded();
    const box = await last.boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height <= 390);
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
  });
  await check("Four order stages work manually and respect reduced motion", async () => {
    await page.goto(base, { waitUntil: "networkidle" });
    const tabs = page.getByRole("tab");
    assert.equal(await tabs.count(), 4);
    for (let stage = 0; stage < 4; stage++) {
      await tabs.nth(stage).click();
      assert.equal(await page.locator("#journey-panel").getAttribute("data-stage"), String(stage));
    }
    await page.keyboard.press("Home");
    assert.equal(await tabs.nth(0).getAttribute("aria-selected"), "true");
    assert.ok(
      await page.getByRole("button", { name: "Lire la démonstration", exact: true }).isDisabled(),
    );
  });
  await check("Help search and category filters work", async () => {
    await page.goto(base + "/aide", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Paiement", exact: true }).click();
    assert.equal(await page.locator(".m-faq-list details").count(), 3);
    await page.getByRole("button", { name: "Tout", exact: true }).click();
    await page.locator("#help-search").fill("  code  ");
    assert.ok((await page.locator(".m-faq-list details").count()) > 0);
    await page.locator("#help-search").fill("zzzzzzzzzz");
    assert.ok(await page.getByRole("button", { name: "Afficher toutes les réponses" }).isVisible());
    await page.getByRole("button", { name: "Afficher toutes les réponses" }).click();
    assert.equal(await page.locator(".m-faq-list details").count(), 10);
  });
  await check("Contact prepares an email without sending it", async () => {
    await page.goto(base + "/contact", { waitUntil: "networkidle" });
    await page.getByLabel("Votre nom", { exact: true }).fill("Test local");
    await page.getByLabel("Votre adresse e-mail").fill("test@example.invalid");
    await page
      .getByLabel("Votre message")
      .fill("Vérification locale du formulaire, aucun message ne doit être envoyé.");
    await page.getByRole("button", { name: "Préparer mon e-mail" }).click();
    assert.match(
      await page.getByRole("link", { name: "Ouvrir ma messagerie" }).getAttribute("href"),
      /^mailto:contact@woor\.com\?subject=/,
    );
    assert.ok((await page.locator(".m-prepared-message").innerText()).includes("Test local"));
  });
  await check("PIN visibility and mobile input sizes", async () => {
    await page.goto(base + "/connexion", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Afficher le PIN" }).click();
    assert.equal(await page.locator("#pin").getAttribute("type"), "text");
    await page.getByRole("button", { name: "Masquer le PIN" }).click();
    assert.equal(await page.locator("#pin").getAttribute("type"), "password");
    assert.ok(
      await page
        .locator("#phone")
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize) >= 16),
    );
  });
  await check("Invalid login is blocked before any POST request", async () => {
    let posts = 0;
    const watch = (request) => {
      if (request.method() === "POST") posts++;
    };
    page.on("request", watch);
    await page.locator("#phone").fill("not a phone");
    await page.locator("#pin").fill("12345a");
    await page.getByRole("button", { name: "Accéder à mon espace", exact: true }).click();
    assert.ok(await page.locator(".form-validation-error").isVisible());
    assert.equal(await page.locator("#phone").getAttribute("aria-invalid"), "true");
    assert.equal(posts, 0);
    page.off("request", watch);
  });
  await check("Contact refuses HTML, invalid email and blank messages", async () => {
    await page.goto(base + "/contact", { waitUntil: "networkidle" });
    await page.getByLabel("Votre nom", { exact: true }).fill("Awa Diop");
    await page.getByLabel("Votre adresse e-mail").fill("bad-email");
    await page.getByLabel("Votre message").fill("<script>alert(1)</script>");
    await page.getByRole("button", { name: "Préparer mon e-mail" }).click();
    assert.equal(await page.locator(".m-prepared-message").count(), 0);
    assert.ok(await page.locator(".form-validation-error").isVisible());
    await page.getByLabel("Votre adresse e-mail").fill("awa@example.invalid");
    await page.getByRole("button", { name: "Préparer mon e-mail" }).click();
    assert.equal(await page.getByLabel("Votre message").getAttribute("aria-invalid"), "true");
    await page.getByLabel("Votre message").fill("          ");
    await page.getByRole("button", { name: "Préparer mon e-mail" }).click();
    assert.equal(await page.locator(".m-prepared-message").count(), 0);
    assert.equal(
      await page.locator("body script:not([src])").filter({ hasText: "alert(1)" }).count(),
      0,
    );
  });
  await check("Order and delivery forms validate fields before submission", async () => {
    await page.goto(base + "/apercu/vendeuse-nouvelle", { waitUntil: "networkidle" });
    await page.locator("#itemLabel").fill("<img src=x onerror=alert(1)>");
    await page.locator("#itemPriceXof").fill("12000");
    await page.locator("#deliveryFeeXof").fill("1500");
    await page.locator("#neighborhood").fill("Sacré-Cœur 3");
    await page.getByRole("button", { name: "Créer le lien", exact: true }).click();
    assert.ok(await page.locator(".form-validation-error").isVisible());
    assert.equal(await page.locator("#itemLabel").getAttribute("aria-invalid"), "true");
    await page.locator("#itemLabel").fill("Robe en wax, taille M");
    await page.locator("#itemPriceXof").fill("499");
    await page.getByRole("button", { name: "Créer le lien", exact: true }).click();
    assert.equal(await page.locator("#itemPriceXof").getAttribute("aria-invalid"), "true");
    await page.goto(base + "/apercu/livreur-code", { waitUntil: "networkidle" });
    await page.locator("#code").fill("12a456");
    await page.getByRole("button", { name: "Valider le code", exact: true }).click();
    assert.ok(await page.locator(".form-validation-error").isVisible());
    assert.equal(await page.locator("#code").getAttribute("aria-invalid"), "true");
  });
  for (const viewport of [
    { width: 900, height: 600 },
    { width: 1440, height: 900 },
  ]) {
    await check(
      `Login image remains fixed; only the form scrolls at ${viewport.width}x${viewport.height}`,
      async () => {
        await page.setViewportSize(viewport);
        await page.goto(base + "/connexion", { waitUntil: "networkidle" });
        const before = await page.locator(".auth-side").boundingBox();
        assert.ok(Math.abs(before.height - viewport.height) <= 2);
        assert.ok(Math.abs(before.y) <= 2);
        await page.locator(".auth-main").evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        const after = await page.locator(".auth-side").boundingBox();
        assert.equal(after.y, before.y);
        assert.equal(await page.evaluate(() => window.scrollY), 0);
        const lastLink = await page.locator(".auth-bottom-links").boundingBox();
        assert.ok(lastLink.y + lastLink.height <= viewport.height + 1);
      },
    );
  }
  await context.close();
  const motionContext = await browser.newContext({
    reducedMotion: "no-preference",
    viewport: { width: 1440, height: 900 },
  });
  const animatedPage = await motionContext.newPage();
  animatedPage.on("pageerror", (error) =>
    report.runtimeErrors.push({ path: "/animation", message: error.message }),
  );
  await check("Order playback advances, pauses and stops outside the viewport", async () => {
    await animatedPage.clock.install();
    await animatedPage.goto(base, { waitUntil: "networkidle" });
    await animatedPage.locator("#journey-panel").scrollIntoViewIfNeeded();
    await animatedPage.mouse.move(0, 0);
    await animatedPage.clock.runFor(100);
    await animatedPage.clock.runFor(4600);
    assert.equal(await animatedPage.locator("#journey-panel").getAttribute("data-stage"), "1");
    await animatedPage.getByRole("button", { name: "Mettre la démonstration en pause" }).click();
    await animatedPage.clock.runFor(6000);
    assert.equal(await animatedPage.locator("#journey-panel").getAttribute("data-stage"), "1");
    await animatedPage.getByRole("button", { name: "Lire la démonstration", exact: true }).click();
    await animatedPage.mouse.move(0, 0);
    await animatedPage.clock.runFor(4600);
    assert.equal(await animatedPage.locator("#journey-panel").getAttribute("data-stage"), "2");
    await animatedPage.screenshot({
      path: path.join(output, "order-animation-1440.png"),
      animations: "disabled",
    });
    await animatedPage.evaluate(() => window.scrollTo(0, 0));
    await animatedPage.clock.runFor(100);
    const stoppedAt = await animatedPage.locator("#journey-panel").getAttribute("data-stage");
    await animatedPage.clock.runFor(6000);
    assert.equal(
      await animatedPage.locator("#journey-panel").getAttribute("data-stage"),
      stoppedAt,
    );
  });
  await motionContext.close();
} finally {
  await browser.close();
  await writeFile(path.join(output, "responsive-report.json"), JSON.stringify(report, null, 2));
}
const failures =
  report.issues.length +
  report.interactions.filter((item) => !item.passed).length +
  report.runtimeErrors.length;
process.stdout.write(
  JSON.stringify(
    {
      pagesAndSizes: report.layouts.length,
      layoutIssues: report.issues,
      interactions: report.interactions,
      runtimeErrors: report.runtimeErrors,
    },
    null,
    2,
  ) + "\n",
);
process.exitCode = failures ? 1 : 0;
