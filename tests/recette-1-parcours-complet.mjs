import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("JS: " + e.message));
page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("favicon")) erreurs.push(`${r.status()} ${r.url()}`); });

// Un numero different a chaque execution, pour que la recette soit rejouable
// sans avoir a vider la base.
const SUFFIXE = String(Date.now()).slice(-6);
const TEL_BAILLEUR = "6" + SUFFIXE.padStart(8, "9");
const TEL_LOCATAIRE = "6" + String(Number(SUFFIXE) + 1).padStart(8, "8");
let n = 0, ko = 0;
async function etape(titre, fn) {
  n++;
  try { await fn(); console.log(`  ✓ ${n}. ${titre}`); }
  catch (e) { ko++; console.log(`  ✗ ${n}. ${titre}\n      → ${e.message.split("\n")[0]}`); }
}
const attendre = async (t, ms = 8000) => page.waitForSelector(`text=${t}`, { timeout: ms });
// L'application écrit « 60 000 FCFA » avec des espaces insécables : on normalise avant de comparer.
const normal = (s) => s.replace(/[\u00A0\u202F]/g, " ");
const texte = async (sel = "main") => normal(await page.locator(sel).innerText());

console.log("RECETTE laloc — scénario complet du brief\n");

await etape("Je crée un compte avec mon numéro", async () => {
  await page.goto("http://localhost:3000/inscription", { waitUntil: "networkidle" });
  await page.fill("#nom", "Dom Owen");
  await page.fill("#telephone", TEL_BAILLEUR);
  await page.fill("#mot_de_passe", "monmotdepasse");
  await page.click("button[type=submit]");
  await page.waitForURL("**/inscription/code**", { timeout: 15000 });
});

await etape("On me donne un code de récupération à noter", async () => {
  await attendre("Code de récupération");
  const t = await page.locator("body").innerText();
  if (!/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(t)) throw new Error("pas de code affiché");
});

await etape("Je continue vers mes biens", async () => {
  await page.check("input[type=checkbox]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/app**", { timeout: 15000 });
});

await etape("J'ajoute un immeuble avec 3 studios", async () => {
  await page.goto("http://localhost:3000/app/biens/nouveau", { waitUntil: "networkidle" });
  await page.fill("#nom", "Immeuble Bonapriso " + SUFFIXE);
  await page.selectOption("#type", "immeuble");
  await page.selectOption("#ville", "Douala");
  await page.fill("#quartier", "Bonapriso");
  await page.fill("#point_repere", "Après la station Tradex, portail bleu");
  await page.check('input[name="plusieurs_unites"][value="1"]');
  await page.fill("#nb_unites", "3");
  await page.fill("#loyer_reference", "60000");
  await page.fill("#caution_reference", "120000");
  await page.click('button[type=submit]');
  await page.waitForURL("**/app/biens/**", { timeout: 15000 });
  await attendre("Logement 1");
  await attendre("Logement 3");
});

await etape("J'ajoute un locataire avec sa pièce d'identité", async () => {
  await page.goto("http://localhost:3000/app/locataires/nouveau", { waitUntil: "networkidle" });
  await page.fill("#nom", "Estelle Mballa " + SUFFIXE);
  await page.fill("#telephone", TEL_LOCATAIRE);
  await page.fill("#profession", "Comptable");
  await page.fill("#numero_piece", "119988776");
  await page.click('button[value="fiche"]');
  await page.waitForURL("**/app/locataires/**", { timeout: 15000 });
  await attendre("Estelle Mballa " + SUFFIXE);
});

let urlBail = "";
await etape("Je crée un bail à 60 000 FCFA à partir du 1er du mois", async () => {
  await page.goto("http://localhost:3000/app/baux/nouveau", { waitUntil: "networkidle" });
  await page.fill("#date_debut", "2026-09-01");
  await page.selectOption("#duree_mois", "12");
  await page.fill("#loyer_mensuel", "60000");
  await page.fill("#charges_mensuelles", "0");
  await page.click('button[type=submit]');
  await page.waitForURL((u) => /\/app\/baux\/[0-9a-f-]{36}/.test(u.pathname + u.search), { timeout: 20000 });
  urlBail = page.url().split("?")[0];
});

await etape("L'échéancier se génère tout seul", async () => {
  await attendre("Loyer septembre 2026");
  const t = await texte();
  if (!t.includes("Échéancier")) throw new Error("pas d'échéancier");
  if (!t.includes("60 000")) throw new Error("montant absent dans : " + t.slice(0, 300));
});

await etape("J'enregistre un paiement partiel de 40 000", async () => {
  await page.goto(`http://localhost:3000/app/paiements/nouveau?bail=${urlBail.split("/").pop()}`, { waitUntil: "networkidle" });
  await page.fill('input[name="montant"]', "40000");
  await page.check('input[name="mode"][value="especes"]');
  await page.click('button[type=submit]');
  await page.waitForURL((u) => /\/app\/paiements\/[0-9a-f-]{36}/.test(u.pathname), { timeout: 20000 });
  await attendre("Paiement enregistré", 12000);
});

await etape("Je reçois un REÇU, pas une quittance", async () => {
  await page.getByRole("button", { name: "Générer le document" }).click();
  await page.waitForURL((u) => /\/app\/documents\/[0-9a-f-]{36}/.test(u.pathname), { timeout: 20000 });
  const t = await texte();
  if (!t.includes("Reçu de paiement")) throw new Error("ce n'est pas un reçu : " + t.slice(0, 80));
  if (!/REC-\d{4}-\d{4}/.test(t)) throw new Error("numérotation reçu absente");
});

await etape("J'enregistre le solde de 20 000", async () => {
  await page.goto(`http://localhost:3000/app/paiements/nouveau?bail=${urlBail.split("/").pop()}`, { waitUntil: "networkidle" });
  await page.fill('input[name="montant"]', "20000");
  await page.click('button[type=submit]');
  await page.waitForURL((u) => /\/app\/paiements\/[0-9a-f-]{36}/.test(u.pathname), { timeout: 20000 });
});

let urlQuittance = "";
await etape("Je reçois une QUITTANCE, la période étant soldée", async () => {
  await page.getByRole("button", { name: "Générer le document" }).click();
  await page.waitForURL((u) => /\/app\/documents\/[0-9a-f-]{36}/.test(u.pathname), { timeout: 20000 });
  urlQuittance = page.url();
  const t = await texte();
  if (!t.includes("Quittance de loyer")) throw new Error("ce n'est pas une quittance : " + t.slice(0, 80));
  if (!/QUI-\d{4}-\d{4}/.test(t)) throw new Error("numérotation quittance absente");
});

await etape("Le PDF de la quittance s'ouvre vraiment", async () => {
  const id = urlQuittance.split("/").pop().split("?")[0];
  const r = await page.request.get(`http://localhost:3000/api/document/${id}`);
  if (r.status() !== 200) throw new Error("statut " + r.status());
  const b = await r.body();
  if (b.slice(0, 4).toString() !== "%PDF") throw new Error("ce n'est pas un PDF");
});

await etape("Le bouton WhatsApp est prêt avec le message et le lien", async () => {
  const lien = await page.getByRole("link", { name: "Envoyer sur WhatsApp" }).getAttribute("href");
  if (!lien?.startsWith(`https://wa.me/237${TEL_LOCATAIRE}`)) throw new Error("mauvais numéro : " + lien);
  if (!decodeURIComponent(lien).includes("/api/document/")) throw new Error("pas de lien vers le PDF");
});

await etape("Le studio est « occupé » et l'échéance « soldée »", async () => {
  await page.goto(urlBail, { waitUntil: "networkidle" });
  const t = await texte();
  if (!t.includes("Soldée")) throw new Error("échéance non soldée dans : " + t.slice(0, 400));
  await page.goto("http://localhost:3000/app/biens", { waitUntil: "networkidle" });
  const b = await texte();
  if (!b.includes("1 occupé")) throw new Error("logement non marqué occupé : " + b.slice(0, 200));
  if (!b.includes("2 libres")) throw new Error("les 2 autres studios devraient être libres");
});

await etape("Je coupe la connexion et je consulte mes locataires", async () => {
  await page.goto("http://localhost:3000/app/locataires", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200); // laisser le service worker s'installer
  await ctx.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  const t = await texte("body");
  if (!t.includes("Estelle Mballa " + SUFFIXE)) throw new Error("liste indisponible hors ligne : " + t.slice(0, 150));
  await ctx.setOffline(false);
});

console.log(`\n${n - ko}/${n} étapes réussies.`);
console.log("\nErreurs réseau ou JavaScript :");
console.log(erreurs.length ? erreurs.slice(0, 10).join("\n") : "  aucune");
await nav.close();
process.exit(ko ? 1 : 0);
