/**
 * schema.js — modèle de données d'une procédure, valeurs par défaut,
 * sérialisation YAML et résolution des images.
 *
 * Format canonique (voir content/*.yaml) :
 *
 *   titre: Prise en charge DATEC
 *   sousTitre: Constitution, transmission et traçabilité…
 *   version: "1.0"
 *   date: 30/07/2026
 *   objectif: …
 *   prerequis: …
 *   resultat: …
 *   etapes:
 *     - numero: 1
 *       titre: Relever les informations du BI
 *       sousTitre: …            # facultatif — devient le sous-titre de sa page
 *       action: …
 *       lien: https://…         # facultatif
 *       capture:                # facultatif
 *         fichier: assets/datec/etape-01.png
 *         largeur: 289.15       # facultatif, en points ; défaut = pleine largeur
 *       encarts:                # facultatif, 0..n
 *         - style: info | important
 *           label: DONNÉES VARIABLES
 *           texte: …
 *       exemple: …              # facultatif, rendu en italique
 *       resultat: …             # ligne RÉSULTAT ATTENDU
 *       boutons:                # facultatif
 *         - texte: HP — OUVRIR LA RECHERCHE
 *           cible: H1           # numéro d'étape visé (lien interne)
 *           url: https://…      # ou lien externe
 *   validation:
 *     actif: true
 *     lignes:                 # une entrée = une ligne imprimée, points séparés par « | »
 *       - Garantie contrôlée | Modèle vérifié | Référence relevée
 *     items: [ …, … ]         # variante : liste de points, répartie automatiquement
 */

import { resolveAsset } from './tokens.js';

export const CALLOUT_STYLES = [
  { value: 'info', label: 'Info (bleu clair)' },
  { value: 'important', label: 'Important (bleu marine)' },
];

/** Libellés d'encart rencontrés dans les fiches existantes, proposés en raccourci. */
export const CALLOUT_PRESETS = [
  { label: 'DONNÉES VARIABLES', style: 'info' },
  { label: 'CHAMPS À RENSEIGNER', style: 'info' },
  { label: 'DESTINATAIRE', style: 'info' },
  { label: 'VALEUR FIXE / DONNÉES VARIABLES', style: 'info' },
  { label: 'ATTENTION', style: 'important' },
  { label: 'POINT D’ARRÊT OBLIGATOIRE', style: 'important' },
  { label: 'POINT D’ATTENTE', style: 'important' },
  { label: 'NE PAS CONFONDRE', style: 'important' },
  { label: 'PARCOURS INTERACTIF', style: 'important' },
  { label: 'CONTRÔLE OBLIGATOIRE', style: 'important' },
  { label: 'VALEURS OBLIGATOIRES', style: 'important' },
];

export const todayFr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export function emptyStep(numero = 1) {
  return {
    numero, titre: '', sousTitre: '', action: '', lien: '',
    capture: null, encarts: [], exemple: '', resultat: '', boutons: [],
  };
}

export function emptyDoc() {
  return {
    titre: '', sousTitre: '', version: '1.0', date: todayFr(),
    objectif: '', prerequis: '', resultat: '',
    etapes: [emptyStep(1), emptyStep(2)],
    validation: { actif: true, items: [], lignes: [] },
  };
}

/** Incrémente « 1.0 » → « 1.1 », « 2.9 » → « 3.0 ». */
export function bumpVersion(version) {
  const match = /^(\d+)\.(\d+)$/.exec(String(version ?? '').trim());
  if (!match) return '1.0';
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return minor >= 9 ? `${major + 1}.0` : `${major}.${minor + 1}`;
}

/** Normalise un objet issu du YAML ou du localStorage vers le modèle complet. */
export function normalise(raw) {
  const base = emptyDoc();
  const doc = { ...base, ...(raw ?? {}) };
  doc.validation = { actif: true, items: [], lignes: [], ...(raw?.validation ?? {}) };
  doc.etapes = (raw?.etapes ?? []).map((step, i) => ({
    ...emptyStep(i + 1),
    ...step,
    encarts: (step.encarts ?? []).map((c) => ({ style: 'info', label: '', texte: '', ...c })),
    boutons: (step.boutons ?? []).map((b) => ({ texte: '', cible: '', url: '', ...b })),
    capture: step.capture ? { ...step.capture } : null,
  }));
  if (!doc.etapes.length) doc.etapes = base.etapes;
  return doc;
}

/**
 * Pré-remplit les items de VALIDATION FINALE à partir des résultats attendus.
 * Les phrases sont condensées comme dans les fiches existantes : on retire la
 * détermination initiale et le point final, sans plus — c'est une proposition,
 * destinée à être relue et réécrite.
 */
export function suggestValidationItems(doc, parLigne = 3) {
  const points = (doc.etapes ?? [])
    .map((step) => String(step.resultat ?? '').trim())
    .filter(Boolean)
    .map((text) => text.replace(/\s*\.$/, ''))
    .map((text) => text.charAt(0).toUpperCase() + text.slice(1));
  const lignes = [];
  for (let i = 0; i < points.length; i += parLigne) {
    lignes.push(points.slice(i, i + parLigne).join(' | '));
  }
  return lignes;
}

/* ------------------------------------------------------------------- YAML */

export function toYaml(doc, { inlineImages = false } = {}) {
  const clone = JSON.parse(JSON.stringify(doc));
  for (const step of clone.etapes ?? []) {
    if (!step.capture) { delete step.capture; continue; }
    if (!inlineImages) delete step.capture.dataUrl;
    delete step.capture.width;
    delete step.capture.height;
    if (!step.capture.fichier && !step.capture.dataUrl) delete step.capture;
  }
  for (const key of ['sousTitre', 'lien', 'exemple']) {
    for (const step of clone.etapes ?? []) if (!step[key]) delete step[key];
  }
  return window.jsyaml.dump(clone, { lineWidth: 100, noRefs: true, quotingType: '"' });
}

export function fromYaml(text) {
  return normalise(window.jsyaml.load(text));
}

/* ----------------------------------------------------------------- images */

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function measureImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = dataUrl;
  });
}

async function fetchAsDataUrl(url) {
  const response = await fetch(resolveAsset(url));
  if (!response.ok) throw new Error(`Capture introuvable : ${url}`);
  const blob = await response.blob();
  return readFileAsDataUrl(new File([blob], 'capture', { type: blob.type }));
}

/**
 * Le logo est cherché dans docs/assets/ (chemin relatif à la page), par ordre de
 * préférence : un fichier source déposé par l'utilisateur d'abord, l'extraction
 * issue des PDF en dernier recours.
 */
const LOGO_CANDIDATES = [
  'assets/logo_optimium_nc.svg',
  'assets/logo_optimium_nc.png',
  'assets/logo_optimium_nc.jpeg',
];

/** pdf-lib n'embarque que PNG et JPEG : un SVG est rastérisé en amont. */
async function rasteriseSvg(dataUrl, targetWidth = 1362) {
  const size = await measureImage(dataUrl);
  const scale = targetWidth / size.width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size.width * scale);
  canvas.height = Math.round(size.height * scale);
  const context = canvas.getContext('2d');
  const img = new Image();
  await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; img.src = dataUrl; });
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/**
 * Proportion du bloc logo dans la charte (164.40 × 46.75 pt). Un fichier dont la
 * proportion s'en écarte nettement n'est pas le bloc complet — typiquement la
 * marque seule, sans la baseline ni le « NC ». On le signale au lieu de le
 * déformer silencieusement.
 */
const LOGO_RATIO = 164.40 / 46.75;
const LOGO_RATIO_TOLERANCE = 0.05;

async function loadLogo() {
  // En version fichier unique, seuls les assets réellement embarqués sont
  // interrogeables : inutile de tenter les autres, file:// les refuse bruyamment.
  const candidats = globalThis.__ASSETS
    ? LOGO_CANDIDATES.filter((c) => c in globalThis.__ASSETS)
    : LOGO_CANDIDATES;
  for (const candidate of candidats) {
    try {
      const raw = await fetchAsDataUrl(candidate);
      const dataUrl = candidate.endsWith('.svg') ? await rasteriseSvg(raw) : raw;
      const { width, height } = await measureImage(dataUrl);
      const ratio = width / height;
      const avertissement = Math.abs(ratio - LOGO_RATIO) / LOGO_RATIO > LOGO_RATIO_TOLERANCE
        ? `Le logo ${candidate} a une proportion de ${ratio.toFixed(2)} là où la charte `
          + `en attend ${LOGO_RATIO.toFixed(2)} : il s'agit probablement de la marque seule, `
          + `sans la baseline ni le « NC ». Il est inséré sans déformation, mais l'en-tête `
          + `ne sera pas conforme aux fiches existantes.`
        : null;
      return { dataUrl, avertissement };
    } catch { /* on essaie le candidat suivant */ }
  }
  return { dataUrl: null, avertissement: null }; // l'en-tête se dessine sans logo
}

/**
 * Résout les captures : charge celles référencées par « fichier » et mesure
 * toutes les images pour que la mise en page connaisse leur ratio.
 * @param {string} contentBase préfixe appliqué aux chemins de captures
 */
export async function hydrate(doc, contentBase = '') {
  for (const step of doc.etapes ?? []) {
    const capture = step.capture;
    if (!capture) continue;
    if (!capture.dataUrl && capture.fichier) {
      capture.dataUrl = await fetchAsDataUrl(contentBase + capture.fichier);
    }
    if (capture.dataUrl && (!capture.width || !capture.height)) {
      Object.assign(capture, await measureImage(capture.dataUrl));
    }
  }
  if (!doc.logo) {
    const { dataUrl, avertissement } = await loadLogo();
    doc.logo = dataUrl;
    if (avertissement) doc.logoAvertissement = avertissement;
  }
  if (!doc.badge) {
    try { doc.badge = await fetchAsDataUrl('assets/badge_fiche_procedure.jpeg'); }
    catch { doc.badge = null; } // repli : le badge est alors tracé en vectoriel
  }
  return doc;
}
