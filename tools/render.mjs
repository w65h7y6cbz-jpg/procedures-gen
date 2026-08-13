#!/usr/bin/env node
/**
 * render.mjs — génère un PDF depuis un fichier de contenu, hors navigateur.
 *
 * Utilise le MÊME code que la page web (docs/js/*) piloté dans Chromium :
 * il n'existe donc qu'un seul moteur de rendu, et la CI ne peut pas diverger
 * de ce que voit l'utilisateur.
 *
 *   node tools/render.mjs content/datec.yaml output/datec.pdf
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.yaml': 'text/yaml; charset=utf-8',
};

/** Sert docs/ et content/ pour que le code du navigateur charge polices et captures. */
function serve(port = 0) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = resolve(root, `.${path}`);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      const info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

/**
 * Chromium peut être préinstallé dans l'image (PLAYWRIGHT_BROWSERS_PATH) sous une
 * révision différente de celle qu'attend le paquet npm. On réutilise ce binaire
 * plutôt que d'en télécharger un second.
 */
function findChromium() {
  const explicit = process.env.CHROMIUM_PATH;
  if (explicit && existsSync(explicit)) return explicit;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !existsSync(base)) return undefined;
  const candidates = readdirSync(base)
    .filter((name) => name.startsWith('chromium-'))
    .map((name) => join(base, name, 'chrome-linux', 'chrome'))
    .filter((path) => existsSync(path));
  return candidates[0];
}

async function main() {
  const [source, target] = process.argv.slice(2);
  if (!source || !target) {
    console.error('usage : node tools/render.mjs <contenu.yaml> <sortie.pdf>');
    process.exit(2);
  }

  const yaml = await readFile(resolve(root, source), 'utf-8');
  const contentBase = `/${dirname(source).replace(/\\/g, '/')}/`;

  const server = await serve();
  const { port } = server.address();
  const browser = await chromium.launch({ executablePath: findChromium() });
  try {
    const page = await browser.newPage();
    const problems = [];
    page.on('pageerror', (error) => problems.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });

    await page.goto(`http://127.0.0.1:${port}/docs/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__api), null, { timeout: 15000 });

    const result = await page.evaluate(
      ([text, base]) => window.__api.renderYaml(text, base),
      [yaml, `http://127.0.0.1:${port}${contentBase}`],
    );

    if (problems.length) {
      console.error('Erreurs relevées dans la page :');
      for (const problem of problems) console.error(`  ${problem}`);
    }

    const out = resolve(root, target);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(result.base64, 'base64'));
    console.log(`PDF écrit : ${target}`);
    if (result.overflow.length) {
      const pages = result.overflow.map((o) => `${o.page} (${o.bottom.toFixed(1)} pt)`).join(', ');
      console.warn(`Débordement bas de page : ${pages}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
