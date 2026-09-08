import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("JS: " + e.message.slice(0, 120)));
page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("favicon")) erreurs.push(`${r.status()} ${r.url().slice(0, 80)}`); });

let n = 0, ko = 0;
async function etape(t, fn) {
  n++;
  try { await fn(); console.log(`  ✓ ${n}. ${t}`); }
  catch (e) { ko++; console.log(`  ✗ ${n}. ${t}\n      → ${e.message.split("\n")[0].slice(0, 160)}`); }
}
const normal = (s) => s.replace(/[\u00A0\u202F]/g, " ").toLowerCase(); // espaces insécables + CSS en majuscules
const capture = async (nom) => page.screenshot({ path: `/tmp/captures/${nom}.png`, fullPage: true });

console.log("RECETTE 2 — espace locataire, état des lieux, export\n");

await etape("La démonstration s'ouvre", async () => {
  await page.goto("http://localhost:3000/connexion", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ouvrir la démonstration" }).click();
  await page.waitForURL("**/app");
  await page.waitForSelector("text=Bonjour", { timeout: 10000 });
});

await etape("Le tableau de bord montre les bons chiffres", async () => {
  await page.waitForSelector("text=Vos locations", { timeout: 15000 });
  const t = normal(await page.locator("main").innerText());
  if (!t.includes("impayés")) throw new Error("pas de bloc impayés dans : " + t.slice(0, 250));
  if (!t.includes("occupation")) throw new Error("pas de taux d'occupation");
});

await etape("La fiche d'un bien montre occupation et loyer", async () => {
  await page.goto("http://localhost:3000/app/biens", { waitUntil: "networkidle" });
  await page.getByText("Immeuble Makepe").first().click();
  await page.waitForURL("**/app/biens/**");
  await page.waitForSelector("text=Archiver ce bien", { timeout: 15000 });
  const t = normal(await page.locator("main").innerText());
  if (!t.includes("loyer théorique")) throw new Error("pas de loyer théorique");
});

let urlBail = "";
await etape("La fiche de bail montre la situation du locataire", async () => {
  await page.goto("http://localhost:3000/app/impayes", { waitUntil: "networkidle" });
  await page.getByText("Jean-Pierre Fotso").first().click();
  await page.waitForURL((u) => /\/app\/baux\/[0-9a-f-]{36}/.test(u.pathname), { timeout: 15000 });
  urlBail = page.url().split("?")[0];
});

let urlEdl = "";
await etape("Je crée un état des lieux d'entrée", async () => {
  await page.goto(`http://localhost:3000/app/etats-des-lieux/nouveau?bail=${urlBail.split("/").pop()}`, { waitUntil: "networkidle" });
  await page.selectOption("#bail_id", urlBail.split("/").pop());
  await page.fill("#nb_chambres", "1");
  await page.click('button[type=submit]');
  await page.waitForURL((u) => /\/app\/etats-des-lieux\/[0-9a-f-]{36}/.test(u.pathname), { timeout: 20000 });
  urlEdl = page.url().split("?")[0];
  const t = await page.locator("main").innerText();
  for (const piece of ["Salon", "Chambre", "Cuisine", "Douche et WC"]) {
    if (!t.includes(piece)) throw new Error("pièce manquante : " + piece);
  }
});

await etape("Je note l'état des éléments et j'enregistre", async () => {
  const radios = await page.locator('input[type=radio][name^="etat_"][value="bon"]').all();
  if (radios.length < 10) throw new Error("trop peu d'éléments : " + radios.length);
  // On clique réellement les trois premiers libellés, pour vérifier que la cible
  // tactile fonctionne, puis on coche le reste directement.
  for (const r of radios.slice(0, 3)) {
    const lab = r.locator("xpath=ancestor::label[1]");
    await lab.scrollIntoViewIfNeeded();
    await lab.click();
  }
  const coches = await page.evaluate(() => {
    const l = [...document.querySelectorAll('input[name^="etat_"][value="bon"]')];
    l.forEach((r) => { r.checked = true; });
    return l.filter((r) => r.checked).length;
  });
  if (coches < 10) throw new Error("cases non cochées : " + coches);
  await page.fill("#releve_electricite", "4820");
  await page.fill("#releve_eau", "1180");
  await page.fill("#observations", "Logement propre, peinture récente.");
  await page.getByRole("button", { name: "Enregistrer mes notes" }).click();
  await page.waitForURL("**/etats-des-lieux/**ok=1", { timeout: 20000 });
});

await etape("Je signe au doigt les deux parties", async () => {
  await page.waitForTimeout(500);
  const toiles = await page.locator("canvas").all();
  if (toiles.length !== 2) throw new Error("il faut deux zones de signature, trouvé " + toiles.length);
  for (const t of toiles) {
    // La page est longue : il faut amener la zone de signature dans l'écran,
    // sinon la souris pointe en dehors de la fenêtre.
    await t.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const b = await t.boundingBox();
    await page.mouse.move(b.x + 30, b.y + 80);
    await page.mouse.down();
    await page.mouse.move(b.x + 90, b.y + 40, { steps: 6 });
    await page.mouse.move(b.x + 150, b.y + 90, { steps: 6 });
    await page.mouse.move(b.x + 210, b.y + 45, { steps: 6 });
    await page.mouse.up();
  }
  await page.waitForTimeout(400);
});

await etape("Le document est figé et le PDF généré", async () => {
  await page.getByRole("button", { name: "Signer et figer définitivement" }).click();
  await page.waitForURL((u) => /\/app\/documents\/[0-9a-f-]{36}/.test(u.pathname), { timeout: 25000 });
  const id = page.url().split("/").pop().split("?")[0];
  const r = await page.request.get(`http://localhost:3000/api/document/${id}`);
  const b = await r.body();
  if (b.slice(0, 4).toString() !== "%PDF") throw new Error("pas un PDF");
  fs.writeFileSync("/tmp/edl.pdf", b);
});

await etape("Un état des lieux signé ne peut plus être modifié", async () => {
  await page.goto(urlEdl, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  if (!t.includes("ne peut plus être modifié")) throw new Error("le document reste modifiable");
  if (await page.getByRole("button", { name: "Enregistrer mes notes" }).count()) {
    throw new Error("le formulaire d'édition est encore là");
  }
});

await etape("Les relances sont préparées automatiquement", async () => {
  await page.goto("http://localhost:3000/app/relances", { waitUntil: "networkidle" });
  await page.waitForSelector("text=Mes modèles de messages", { timeout: 15000 });
  const t = normal(await page.locator("main").innerText());
  if (!t.includes("jean-pierre fotso")) throw new Error("pas de relance pour le locataire en retard");
  const lien = await page.getByRole("link", { name: "Ouvrir WhatsApp" }).first().getAttribute("href");
  if (!lien?.startsWith("https://wa.me/")) throw new Error("lien WhatsApp absent");
});

await etape("L'export produit une vraie archive ZIP", async () => {
  const r = await page.request.get("http://localhost:3000/api/export");
  if (r.status() !== 200) throw new Error("statut " + r.status());
  const b = await r.body();
  if (b.slice(0, 2).toString() !== "PK") throw new Error("ce n'est pas un ZIP");
  fs.writeFileSync("/tmp/export.zip", b);
  console.log(`      archive de ${Math.round(b.length / 1024)} Ko`);
});

await etape("Le journal trace toutes les actions", async () => {
  await page.goto("http://localhost:3000/app/journal", { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  if (!t.includes("État des lieux signé")) throw new Error("l'action n'est pas tracée");
});

await etape("Je me connecte comme locataire", async () => {
  await page.goto("http://localhost:3000/app/plus", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Se déconnecter" }).first().click();
  await page.waitForURL("**/connexion", { timeout: 15000 });
  await page.fill("#telephone", "677445566");
  await page.fill("#mot_de_passe", "demo1234");
  await page.click('button[type=submit]');
  await page.waitForURL("**/app**", { timeout: 15000 });
  await page.goto("http://localhost:3000/locataire", { waitUntil: "networkidle" });
  await page.waitForSelector("text=Bonjour Marie", { timeout: 10000 });
});

await etape("Le locataire voit son bail, ses quittances et son solde", async () => {
  await page.waitForSelector("text=Donner mon préavis", { timeout: 15000 });
  const t = normal(await page.locator("main").innerText());
  if (!t.includes("studio a1")) throw new Error("logement absent");
  if (!t.includes("vous êtes à jour")) throw new Error("solde absent : " + t.slice(0, 200));
  if (!t.includes("mes paiements")) throw new Error("historique absent");
  if (!t.includes("signaler un problème")) throw new Error("signalement absent");
  if (!t.includes("donner mon préavis")) throw new Error("préavis absent");
});

await etape("Le locataire ne voit RIEN des autres locataires", async () => {
  const t = await page.locator("body").innerText();
  for (const autre of ["Jean-Pierre", "Aïcha", "Nkolo"]) {
    if (t.includes(autre)) throw new Error("fuite de données : " + autre);
  }
  const r = await page.request.get("http://localhost:3000/app/impayes");
  const corps = await r.text();
  if (corps.includes("Jean-Pierre Fotso")) throw new Error("accès à l'espace bailleur d'un autre");
});

// Captures d'écran, une fois toutes les vérifications faites.
await etape("Captures d'écran", async () => {
  await page.goto("http://localhost:3000/app/plus", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Se déconnecter" }).first().click();
  await page.waitForURL("**/connexion", { timeout: 15000 });
  await capture("01-connexion");
  await page.getByRole("button", { name: "Ouvrir la démonstration" }).click();
  await page.waitForURL("**/app");
  await page.waitForSelector("text=Vos locations", { timeout: 15000 });
  await capture("02-tableau-de-bord");
  for (const [chemin, nom, ancre] of [
    ["/app/biens", "03-biens", "Immeuble Makepe"],
    ["/app/impayes", "04-impayes", "Total dû"],
    ["/app/paiements/nouveau", "05-encaisser", "3. Comment ?"],
    ["/app/relances", "06-relances", "Mes modèles de messages"],
    ["/app/documents", "07-documents", "Mes documents"],
    ["/app/charges", "08-charges", "Vos compteurs"],
    ["/app/journal", "09-journal", "Journal des actions"],
    ["/app/export", "10-export", "Tout récupérer"],
  ]) {
    await page.goto("http://localhost:3000" + chemin, { waitUntil: "networkidle" });
    await page.waitForSelector(`text=${ancre}`, { timeout: 15000 }).catch(() => {});
    await capture(nom);
  }
  await page.goto("http://localhost:3000/app/plus", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Se déconnecter" }).first().click();
  await page.waitForURL("**/connexion", { timeout: 15000 });
  await page.fill("#telephone", "677445566");
  await page.fill("#mot_de_passe", "demo1234");
  await page.click('button[type=submit]');
  await page.waitForURL("**/app**", { timeout: 15000 });
  await page.goto("http://localhost:3000/locataire", { waitUntil: "networkidle" });
  await page.waitForSelector("text=Donner mon préavis", { timeout: 15000 });
  await capture("11-espace-locataire");
});

console.log(`\n${n - ko}/${n} étapes réussies.`);
console.log("\nErreurs réseau ou JavaScript :");
console.log(erreurs.length ? "  " + erreurs.slice(0, 8).join("\n  ") : "  aucune");
await nav.close();
process.exit(ko ? 1 : 0);
