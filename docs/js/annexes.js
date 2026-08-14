/**
 * annexes.js — pages empruntées à un autre PDF.
 *
 * Permet de choisir visuellement une ou plusieurs pages dans un PDF existant.
 * Les pages retenues sont extraites dans un petit PDF autonome, conservé avec la
 * fiche ; elles sont ensuite ajoutées à la fin du document généré, et un bouton
 * à la charte y renvoie par un lien interne.
 *
 * pdf.js sert uniquement à l'aperçu des pages ; l'extraction et l'assemblage
 * passent par pdf-lib, comme le reste du générateur.
 */

import { fetchAssetBytes, dataUriToBytes } from './tokens.js';

// On adresse pdf-lib au point d'usage plutôt que de le déstructurer : en version
// fichier unique tous les modules partagent une portée, et deux déclarations du
// même nom au premier niveau casseraient le script entier.

/* ------------------------------------------------------------------ pdf.js */

let workerReady = null;

/**
 * pdf.js exige une URL de worker. Un Blob convient dans les deux modes de
 * distribution — servi par HTTP comme embarqué en data: URI dans le fichier
 * unique — là où une data: URI directe est refusée par le navigateur.
 */
async function ensureWorker() {
  if (!workerReady) {
    workerReady = (async () => {
      const bytes = await fetchAssetBytes('js/vendor/pdfjs.worker.min.js');
      const blob = new Blob([bytes], { type: 'text/javascript' });
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    })();
  }
  await workerReady;
  return window.pdfjsLib;
}

/** Ouvre un PDF pour aperçu. Renvoie { doc, nbPages }. */
export async function ouvrirPdf(dataUrl) {
  const pdfjsLib = await ensureWorker();
  const doc = await pdfjsLib.getDocument({ data: dataUriToBytes(dataUrl) }).promise;
  return { doc, nbPages: doc.numPages };
}

/** Rend une page en vignette PNG. */
export async function vignette(doc, numero, largeurMax = 190) {
  const page = await doc.getPage(numero);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: largeurMax / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas.toDataURL('image/png');
}

/* ------------------------------------------------------------- extraction */

/**
 * Extrait les pages retenues dans un PDF autonome et compact.
 * On ne conserve pas le PDF source : seules les pages choisies sont stockées
 * avec la fiche, ce qui garde le brouillon et le fichier enregistré légers.
 * @param {number[]} numeros numéros de page, à partir de 1
 */
export async function extraire(dataUrlSource, numeros) {
  const source = await window.PDFLib.PDFDocument.load(dataUrlSource);
  const cible = await window.PDFLib.PDFDocument.create();
  const indices = numeros
    .map((n) => n - 1)
    .filter((i) => i >= 0 && i < source.getPageCount())
    .sort((a, b) => a - b);
  const copiees = await cible.copyPages(source, indices);
  for (const page of copiees) cible.addPage(page);
  return cible.saveAsBase64({ dataUri: true });
}

/** Identifiant stable, sans dépendre de crypto.randomUUID (absent en file:// ancien). */
export function nouvelId() {
  return `a${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
