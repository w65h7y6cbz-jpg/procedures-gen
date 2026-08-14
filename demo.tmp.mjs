import { chromium } from 'playwright';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
const exe = readdirSync(base).filter(n=>n.startsWith('chromium-'))
  .map(n=>join(base,n,'chrome-linux','chrome')).find(existsSync);
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto('http://127.0.0.1:8080/docs/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__api);

await page.fill('#f-titre', 'Remplacer un toner sur MFP Sharp');
await page.fill('#f-sousTitre', 'Identification de la référence, remplacement et traçabilité.');
await page.fill('#f-objectif', 'Remplacer un toner vide et tracer l’intervention dans le BI.');
await page.fill('#f-prerequis', 'BI ouvert dans CopyPark ; toner de remplacement en stock technicien.');
await page.fill('#f-resultat', 'Le toner est remplacé, la sortie de stock est saisie et le BI est clôturé.');

const steps = await page.$$('#steps .step');
const fill = async (el, sel, v) => el.$eval(sel, (n, val) => { n.value = val; n.dispatchEvent(new Event('input')); }, v);
await fill(steps[0], '[data-field="titre"]', 'Relever la référence du toner');
await fill(steps[0], '[data-field="action"]', 'Ouvrir le BI dans CopyPark et relever le modèle de la machine, puis la référence exacte du toner correspondant à la couleur épuisée.');
await fill(steps[0], '[data-field="resultat"]', 'La référence du toner à commander est identifiée.');
await (await steps[0].$('[data-action="add-callout"]')).click();
await fill(steps[0], '.callout-row [data-field="label"]', 'DONNÉES VARIABLES');
await fill(steps[0], '.callout-row [data-field="texte"]', 'BI • modèle machine • référence toner • couleur.');
await fill(steps[1], '[data-field="titre"]', 'Remplacer le toner et sortir le stock');
await fill(steps[1], '[data-field="action"]', 'Remplacer la cartouche, puis saisir la sortie de stock technicien dans l’onglet « Saisie Pièce » du BI.');
await fill(steps[1], '[data-field="resultat"]', 'Le toner est remplacé et sorti du stock du technicien.');
await (await steps[1].$('[data-action="add-callout"]')).click();
await fill(steps[1], '.callout-row [data-field="label"]', 'POINT D’ARRÊT OBLIGATOIRE');
await fill(steps[1], '.callout-row [data-field="texte"]', 'Ne pas clôturer le BI avant d’avoir saisi la sortie de stock.');
await page.click('#btn-suggest');

// Collage d'une capture : on injecte via le vrai chemin (DataTransfer) sur la 1re étape
const b64 = readFileSync('content/assets/datec/etape-01.png').toString('base64');
await page.evaluate(async (b64) => {
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  const file = new File([arr], 'capture.png', { type: 'image/png' });
  const dt = new DataTransfer(); dt.items.add(file);
  const drop = document.querySelector('#steps .step [data-role="capture-drop"]');
  drop.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}, b64);
await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Capture chargée'), null, {timeout:15000});

await page.click('#btn-preview');
await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Aperçu à jour'), null, {timeout: 40000});
await page.waitForTimeout(3000);
await page.screenshot({ path: 'output/interface.png' });

const res = await page.evaluate(async () => {
  const m = await import('/docs/js/renderer.js');
  const s = await import('/docs/js/schema.js');
  const doc = await s.hydrate(s.normalise(JSON.parse(localStorage.getItem('procedures-gen:draft'))));
  const { bytes } = await m.renderProcedure(doc);
  let bin=''; const c=0x8000;
  for (let i=0;i<bytes.length;i+=c) bin += String.fromCharCode(...bytes.subarray(i,i+c));
  return btoa(bin);
});
writeFileSync('output/exemple_neuf.pdf', Buffer.from(res, 'base64'));
console.log('ok');
await browser.close();
