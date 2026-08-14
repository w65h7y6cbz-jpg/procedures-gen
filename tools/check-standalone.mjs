#!/usr/bin/env node
/**
 * check-standalone.mjs — ouvre la version fichier unique dans Chromium et vérifie
 * qu'elle démarre et sait produire un PDF.
 *
 * Les modules ES étant concaténés dans une portée commune, une simple collision de
 * noms au premier niveau suffit à casser le script entier — sans que rien ne le
 * signale à la construction. Ce contrôle ferme cette porte.
 *
 * fetch() est neutralisé pendant le test : certains hébergeurs (aperçu HTML de
 * OneDrive et SharePoint) servent la page avec une politique qui l'interdit, et
 * le générateur ne doit dépendre d'aucune requête pour ses ressources embarquées.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function findChromium() {
  const explicit = process.env.CHROMIUM_PATH;
  if (explicit && existsSync(explicit)) return explicit;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !existsSync(base)) return undefined;
  return readdirSync(base)
    .filter((name) => name.startsWith('chromium-'))
    .map((name) => join(base, name, 'chrome-linux', 'chrome'))
    .find(existsSync);
}

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', (error) => problems.push(String(error)));
page.on('console', (message) => { if (message.type() === 'error') problems.push(message.text()); });

try {
  await page.goto(`file://${resolve(root, 'dist/generateur-fiches-procedure.html')}`, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__api), null, { timeout: 20000 });
  await page.evaluate(() => { window.fetch = () => Promise.reject(new TypeError('Failed to fetch')); });

  const ecrans = await page.$$eval('#wizard > *', (els) => els.length);
  if (ecrans === 0) throw new Error("l'assistant ne s'affiche pas");

  const taille = await page.evaluate(async () => {
    const fiche = 'titre: Contrôle\netapes:\n  - numero: 1\n    titre: Une étape\n    action: Faire quelque chose.\n';
    const { base64 } = await window.__api.renderYaml(fiche);
    return base64.length;
  });
  if (!taille) throw new Error('le PDF produit est vide');

  if (problems.length) throw new Error(`erreurs dans la page :\n  ${problems.join('\n  ')}`);
  console.log(`fichier unique vérifié : assistant affiché, PDF produit sans aucun fetch (${ecrans} écran)`);
} catch (error) {
  console.error(`ÉCHEC du contrôle du fichier unique : ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
