#!/usr/bin/env node
/**
 * build-standalone.mjs — fabrique une version en fichier unique de l'interface.
 *
 * Tout est embarqué : polices, bibliothèques, logo, badge, feuille de style et
 * code. Le fichier obtenu s'ouvre d'un double-clic, sans serveur, sans internet
 * et sans installation — utile quand GitHub Pages n'est pas disponible (dépôt
 * privé) ou sur un poste sans accès réseau.
 *
 *   node tools/build-standalone.mjs
 *   → dist/generateur-fiches-procedure.html
 *
 * Les modules ES sont concaténés en un script classique : ouverts en file://,
 * les navigateurs refusent les modules pour cause de politique d'origine.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(resolve(root, p));
const readText = (p) => readFile(resolve(root, p), 'utf-8');

const MIME = {
  '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
};

async function dataUri(path) {
  const bytes = await read(path);
  return `data:${MIME[extname(path)] ?? 'application/octet-stream'};base64,${bytes.toString('base64')}`;
}

/**
 * Les modules sont dans un ordre de dépendance connu et sans cycle : on retire
 * les lignes d'import et le mot-clé export, puis on enveloppe le tout.
 */
const MODULES = ['tokens.js', 'layout.js', 'renderer.js', 'schema.js', 'annexes.js', 'app.js'];

function flatten(source) {
  return source
    .replace(/^\s*import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*$/gm, '')
    .replace(/^\s*export\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];\s*$/gm, '')
    .replace(/^\s*export\s+\{[^}]*\};\s*$/gm, '')
    .replace(/^(\s*)export\s+(const|let|var|function|async function|class)\b/gm, '$1$2');
}

async function main() {
  const [css, ...modules] = await Promise.all([
    readText('docs/css/app.css'),
    ...MODULES.map((m) => readText(`docs/js/${m}`)),
  ]);

  const vendor = (await Promise.all([
    readText('docs/js/vendor/pdf-lib.min.js'),
    readText('docs/js/vendor/fontkit.umd.min.js'),
    readText('docs/js/vendor/js-yaml.min.js'),
    readText('docs/js/vendor/pdfjs.min.js'),
  ])).join('\n;\n');

  const assetPaths = [
    'fonts/DejaVuSans.ttf', 'fonts/DejaVuSans-Bold.ttf', 'fonts/DejaVuSans-Oblique.ttf',
    'assets/logo_optimium_nc.jpeg', 'assets/badge_fiche_procedure.jpeg',
    // Le worker pdf.js est chargé depuis un Blob construit à l'exécution : une
    // data: URI ne peut pas servir directement de source de Worker.
    'js/vendor/pdfjs.worker.min.js',
  ];
  const assets = Object.fromEntries(await Promise.all(
    assetPaths.map(async (p) => [p, await dataUri(`docs/${p}`)]),
  ));

  // Le corps de la page est repris tel quel : une seule définition de l'interface.
  const html = await readText('docs/index.html');
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/src="assets\/logo_optimium_nc\.jpeg"/, `src="${assets['assets/logo_optimium_nc.jpeg']}"`);

  const out = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Générateur de fiches procédure — Optimium NC</title>
<style>
${css}
</style>
</head>
<body>
${body}
<script>${vendor}</script>
<script>window.__ASSETS = ${JSON.stringify(assets)};</script>
<script>
(function () {
'use strict';
${modules.map(flatten).join('\n')}
})();
</script>
</body>
</html>
`;

  await mkdir(resolve(root, 'dist'), { recursive: true });
  const target = 'dist/generateur-fiches-procedure.html';
  await writeFile(resolve(root, target), out, 'utf-8');
  console.log(`${target} — ${(Buffer.byteLength(out) / 1024 / 1024).toFixed(1)} Mo`);
}

main().catch((error) => { console.error(error); process.exit(1); });
