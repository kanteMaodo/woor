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
const browser = await chromium.launch({ headless: true });
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
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
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
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    assert.ok(await page.locator("#mobile-navigation").isVisible());
    await page
      .locator("#mobile-navigation")
      .getByRole("link", { name: "À propos de Wóor" })
      .click();
    await page.waitForURL("**/a-propos");
    assert.ok(!(await page.locator("#mobile-navigation").isVisible()));
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
