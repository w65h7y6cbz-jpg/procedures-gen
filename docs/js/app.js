/**
 * app.js — assistant de saisie, un écran à la fois.
 *
 * Écran 0        : la fiche (titre, sous-titre, objectif / prérequis / résultat)
 * Écrans 1..n    : une étape par écran
 * Écran n+1      : validation finale, version, date, récupération du PDF
 *
 * Rien n'est calculé ici : la mise en page et le tracé restent dans
 * layout.js / renderer.js. Ce module ne fait que collecter la saisie.
 */

import { renderProcedure } from './renderer.js';
import { ouvrirPdf, vignette, extraire, nouvelId } from './annexes.js';
import {
  emptyDoc, emptyStep, normalise, suggestValidationItems,
  toYaml, fromYaml, hydrate, readFileAsDataUrl, measureImage, todayFr, CALLOUT_PRESETS,
} from './schema.js';

const DRAFT_KEY = 'procedures-gen:draft';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let doc = normalise(emptyDoc());
let screen = 0;                 // 0 = fiche, 1..n = étapes, n+1 = terminer
let previewUrl = null;

const stepCount = () => doc.etapes.length;
const lastScreen = () => stepCount() + 1;
const currentStep = () => doc.etapes[screen - 1];
const isStep = () => screen >= 1 && screen <= stepCount();

/* ------------------------------------------------------------------ statut */

let statusTimer = null;
function status(message, kind = '') {
  const el = $('#status');
  el.textContent = message;
  el.className = `status ${kind}`;
  el.hidden = !message;
  clearTimeout(statusTimer);
  if (message && kind === 'ok') statusTimer = setTimeout(() => { el.hidden = true; }, 4000);
}

/* --------------------------------------------------------------- brouillon */

/**
 * Le stockage local est refusé dans un cadre bac à sable — c'est le cas de
 * l'aperçu HTML de SharePoint, OneDrive et Teams. Le générateur y fonctionne,
 * mais sans conservation du brouillon et souvent sans téléchargement direct :
 * mieux vaut le dire d'emblée que de perdre le travail de l'utilisateur.
 */
const stockageDisponible = (() => {
  try {
    localStorage.setItem('procedures-gen:test', '1');
    localStorage.removeItem('procedures-gen:test');
    return true;
  } catch { return false; }
})();

function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(doc)); }
  catch { /* quota dépassé : le brouillon est simplement perdu */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) doc = normalise(JSON.parse(raw));
  } catch { /* brouillon illisible : on repart d'une fiche vide */ }
}

/** Les numéros suivent l'ordre des étapes, sauf ceux saisis à la main (branches). */
function renumber() {
  doc.etapes.forEach((step, i) => {
    if (!step.numeroManuel) step.numero = String(i + 1);
  });
}

/* ------------------------------------------------------------ progression */

function drawStepper() {
  const host = $('#stepper');
  host.textContent = '';
  const items = [
    { label: 'Fiche', index: 0 },
    ...doc.etapes.map((step, i) => ({ label: step.numero || String(i + 1), index: i + 1 })),
    { label: 'Fin', index: lastScreen() },
  ];
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    if (item.index === screen) button.classList.add('active');
    else if (item.index < screen) button.classList.add('done');
    button.addEventListener('click', () => go(item.index));
    host.appendChild(button);
  }
}

function go(index) {
  screen = Math.max(0, Math.min(index, lastScreen()));
  render();
  window.scrollTo({ top: 0 });
}

/* ------------------------------------------------------------------ rendu */

function render() {
  renumber();
  drawStepper();
  const host = $('#wizard');
  host.textContent = '';
  host.appendChild(
    screen === 0 ? buildFiche()
      : isStep() ? buildEtape(currentStep())
        : buildFin(),
  );

  $('#btn-prev').disabled = screen === 0;
  $('#btn-next').disabled = screen === lastScreen();
  $('#btn-next').textContent = screen === stepCount() ? 'Terminer ›' : 'Suivant ›';
  $('#btn-del-step').hidden = !isStep();
  $('#btn-del-step').disabled = stepCount() <= 1;
  saveDraft();
}

/** Lie un champ de saisie à une propriété du document ou de l'étape. */
function bind(input, target, field, after) {
  input.value = target[field] ?? '';
  input.addEventListener('input', () => {
    target[field] = input.value;
    saveDraft();
    if (after) after();
  });
}

function buildFiche() {
  const node = $('#tpl-fiche').content.firstElementChild.cloneNode(true);
  for (const input of $$('[data-doc]', node)) bind(input, doc, input.dataset.doc);
  return node;
}

function buildFin() {
  const node = $('#tpl-fin').content.firstElementChild.cloneNode(true);
  for (const input of $$('[data-doc]', node)) bind(input, doc, input.dataset.doc);

  const actif = $('[data-role="validation-actif"]', node);
  const bloc = $('[data-role="validation-bloc"]', node);
  const lignes = $('[data-role="validation-lignes"]', node);

  const sync = () => { bloc.hidden = !actif.checked; };
  actif.checked = doc.validation.actif !== false;
  sync();
  actif.addEventListener('change', () => { doc.validation.actif = actif.checked; sync(); saveDraft(); });

  lignes.value = (doc.validation.lignes?.length ? doc.validation.lignes : doc.validation.items ?? []).join('\n');
  lignes.addEventListener('input', () => {
    doc.validation.lignes = lignes.value.split('\n').map((s) => s.trim()).filter(Boolean);
    doc.validation.items = [];
    saveDraft();
  });

  $('[data-action="suggest"]', node).addEventListener('click', () => {
    doc.validation.lignes = suggestValidationItems(doc);
    doc.validation.items = [];
    lignes.value = doc.validation.lignes.join('\n');
    saveDraft();
    status('Proposition écrite à partir de vos étapes — relisez et raccourcissez si besoin.', 'ok');
  });

  $('[data-action="download"]', node).addEventListener('click', download);
  $('[data-action="preview"]', node).addEventListener('click', preview);
  return node;
}

/* ------------------------------------------------------------------ étape */

function buildEtape(step) {
  const node = $('#tpl-etape').content.firstElementChild.cloneNode(true);
  $('[data-role="heading"]', node).textContent =
    `Étape ${step.numero || screen} sur ${stepCount()}`;

  for (const input of $$('[data-step]', node)) bind(input, step, input.dataset.step, drawStepper);
  bindShot(node, step);
  drawExtras(node, step);

  const extras = $('[data-role="extras"]', node);
  const add = (kind) => {
    if (kind === 'callout') step.encarts.push({ style: 'info', label: '', texte: '' });
    if (kind === 'bouton') step.boutons.push({ texte: '', cible: '', url: '' });
    if (kind === 'exemple') step.exemple = step.exemple || ' ';
    if (kind === 'lien') step.lien = step.lien || ' ';
    if (kind === 'annexe') step.annexes.push({ id: nouvelId(), texte: '', dataUrl: '', nbPages: 0, source: '' });
    if (kind === 'advanced') step.afficherAvance = true;
    drawExtras(node, step);
    saveDraft();
    const dernier = extras.lastElementChild?.querySelector('input, textarea, select');
    if (dernier) dernier.focus();
  };
  $('[data-action="add-callout"]', node).addEventListener('click', () => add('callout'));
  $('[data-action="add-exemple"]', node).addEventListener('click', () => add('exemple'));
  $('[data-action="add-lien"]', node).addEventListener('click', () => add('lien'));
  $('[data-action="add-bouton"]', node).addEventListener('click', () => add('bouton'));
  $('[data-action="add-annexe"]', node).addEventListener('click', () => add('annexe'));
  $('[data-action="advanced"]', node).addEventListener('click', () => add('advanced'));
  return node;
}

function drawExtras(node, step) {
  const host = $('[data-role="extras"]', node);
  host.textContent = '';

  step.encarts.forEach((callout, i) => {
    const row = $('#tpl-callout').content.firstElementChild.cloneNode(true);
    for (const input of $$('[data-field]', row)) {
      const field = input.dataset.field;
      input.value = callout[field] ?? '';
      input.addEventListener('input', () => {
        callout[field] = input.value;
        // Les libellés connus portent un style par défaut (DESIGN_SYSTEM §8).
        if (field === 'label') {
          const preset = CALLOUT_PRESETS.find((p) => p.label === input.value);
          if (preset) {
            callout.style = preset.style;
            $('[data-field="style"]', row).value = preset.style;
          }
        }
        saveDraft();
      });
    }
    $('[data-action="remove"]', row).addEventListener('click', () => {
      step.encarts.splice(i, 1); drawExtras(node, step); saveDraft();
    });
    host.appendChild(row);
  });

  const simple = (titre, field, placeholder) => {
    const row = $('#tpl-simple').content.firstElementChild.cloneNode(true);
    $('[data-role="titre"]', row).textContent = titre;
    const champ = $('[data-role="champ"]', row);
    champ.placeholder = placeholder;
    champ.value = (step[field] ?? '').trim();
    champ.addEventListener('input', () => { step[field] = champ.value; saveDraft(); });
    $('[data-action="remove"]', row).addEventListener('click', () => {
      step[field] = ''; drawExtras(node, step); saveDraft();
    });
    host.appendChild(row);
  };
  if (step.exemple) simple('Exemple illustré (en italique sous le texte)', 'exemple',
    'Exemple illustré : les valeurs visibles correspondent uniquement au BI n° 206596.');
  if (step.lien) simple('Lien direct', 'lien', 'https://partsurfer.hp.com/');

  step.boutons.forEach((bouton, i) => {
    const row = $('#tpl-bouton').content.firstElementChild.cloneNode(true);
    for (const input of $$('[data-field]', row)) {
      const field = input.dataset.field;
      input.value = bouton[field] ?? '';
      input.addEventListener('input', () => { bouton[field] = input.value; saveDraft(); });
    }
    $('[data-action="remove"]', row).addEventListener('click', () => {
      step.boutons.splice(i, 1); drawExtras(node, step); saveDraft();
    });
    host.appendChild(row);
  });

  step.annexes.forEach((annexe, i) => {
    host.appendChild(buildAnnexe(annexe, () => {
      step.annexes.splice(i, 1); drawExtras(node, step); saveDraft();
    }));
  });

  if (step.afficherAvance) {
    const row = $('#tpl-advanced').content.firstElementChild.cloneNode(true);
    const numero = $('[data-field="numero"]', row);
    numero.value = step.numero ?? '';
    numero.addEventListener('input', () => {
      step.numero = numero.value;
      step.numeroManuel = numero.value.trim() !== '';
      saveDraft(); drawStepper();
    });
    bind($('[data-field="sousTitre"]', row), step, 'sousTitre');
    $('[data-action="remove"]', row).addEventListener('click', () => {
      step.afficherAvance = false; drawExtras(node, step); saveDraft();
    });
    host.appendChild(row);
  }
}

/* ----------------------------------------------------------- annexes PDF */

/**
 * Bloc « page empruntée à un autre PDF » : on ouvre un PDF, on clique les pages
 * voulues, et elles sont extraites dans un petit document conservé avec la fiche.
 */
function buildAnnexe(annexe, onRemove) {
  const row = $('#tpl-annexe').content.firstElementChild.cloneNode(true);
  const file = $('[data-role="file"]', row);
  const grille = $('[data-role="pages"]', row);
  const source = $('[data-role="source"]', row);
  const aide = $('[data-role="aide"]', row);
  const libelle = $('[data-role="libelle-bloc"]', row);
  const champ = $('[data-field="texte"]', row);

  let sourceDataUrl = null;      // le PDF ouvert, gardé le temps du choix
  let retenues = [];             // numéros de page retenus, à partir de 1

  const majLibelle = () => {
    libelle.hidden = retenues.length === 0;
    if (retenues.length && !champ.value.trim()) {
      champ.value = 'VOIR LA PROCÉDURE';
      annexe.texte = champ.value;
    }
  };

  if (annexe.dataUrl) {
    source.hidden = false;
    source.textContent = annexe.nbPages === 1
      ? `1 page retenue${annexe.source ? ` de « ${annexe.source} »` : ''}.`
      : `${annexe.nbPages} pages retenues${annexe.source ? ` de « ${annexe.source} »` : ''}.`;
    libelle.hidden = false;
  }
  champ.value = annexe.texte ?? '';
  champ.addEventListener('input', () => { annexe.texte = champ.value; saveDraft(); });

  const appliquer = async () => {
    if (!sourceDataUrl || !retenues.length) return;
    try {
      annexe.dataUrl = await extraire(sourceDataUrl, [...retenues].sort((a, b) => a - b));
      annexe.nbPages = retenues.length;
      source.hidden = false;
      source.textContent = retenues.length === 1
        ? `1 page retenue${annexe.source ? ` de « ${annexe.source} »` : ''}.`
        : `${retenues.length} pages retenues${annexe.source ? ` de « ${annexe.source} »` : ''}.`;
      majLibelle();
      saveDraft();
    } catch (error) {
      status(`Ces pages n'ont pas pu être extraites : ${error.message}`, 'error');
    }
  };

  const ouvrir = async (blob) => {
    if (!blob) return;
    annexe.source = blob.name;
    grille.hidden = false;
    grille.innerHTML = '<p class="pages-chargement">Ouverture du PDF…</p>';
    try {
      sourceDataUrl = await readFileAsDataUrl(blob);
      const { doc: pdf, nbPages } = await ouvrirPdf(sourceDataUrl);
      grille.textContent = '';
      aide.hidden = false;
      retenues = [];
      for (let numero = 1; numero <= nbPages; numero += 1) {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'page-choix';
        const img = document.createElement('img');
        img.alt = `Page ${numero}`;
        bouton.append(img, document.createTextNode(`Page ${numero}`));
        bouton.addEventListener('click', () => {
          const at = retenues.indexOf(numero);
          if (at >= 0) retenues.splice(at, 1);
          else retenues.push(numero);
          bouton.classList.toggle('retenue', at < 0);
          appliquer();
        });
        grille.appendChild(bouton);
        // Les vignettes arrivent au fil de l'eau : la grille est utilisable tout de suite.
        vignette(pdf, numero).then((url) => { img.src = url; }).catch(() => {});
      }
    } catch (error) {
      grille.innerHTML = '';
      grille.hidden = true;
      status(`Ce PDF n'a pas pu être ouvert : ${error.message}`, 'error');
    }
  };

  $('[data-action="pick-pdf"]', row).addEventListener('click', () => file.click());
  file.addEventListener('change', () => ouvrir(file.files[0]));
  $('[data-action="remove"]', row).addEventListener('click', onRemove);
  return row;
}

/* ---------------------------------------------------------------- capture */

function bindShot(node, step) {
  const zone = $('[data-role="shot"]', node);
  const file = $('[data-role="file"]', node);
  const thumb = $('[data-role="thumb"]', node);
  const empty = $('[data-role="shot-empty"]', node);
  const tools = $('[data-role="shot-tools"]', node);

  const show = () => {
    const url = step.capture?.dataUrl;
    thumb.hidden = !url;
    tools.hidden = !url;
    empty.hidden = Boolean(url);
    if (url) thumb.src = url;
  };
  show();

  const accept = async (blob) => {
    if (!blob) return;
    try {
      const dataUrl = await readFileAsDataUrl(blob);
      const size = await measureImage(dataUrl);
      step.capture = { dataUrl, ...size };
      show(); saveDraft();
      status('Capture ajoutée.', 'ok');
    } catch (error) {
      status(`Cette image n'a pas pu être lue : ${error.message}`, 'error');
    }
  };

  for (const button of $$('[data-action="pick"]', node)) {
    button.addEventListener('click', (e) => { e.preventDefault(); file.click(); });
  }
  file.addEventListener('change', () => accept(file.files[0]));
  $('[data-action="clear"]', node).addEventListener('click', () => {
    step.capture = null; show(); saveDraft();
  });

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('over');
    accept(e.dataTransfer.files[0]);
  });

  // Le collage est écouté au niveau du document : voir plus bas.
  zone.__accept = accept;
}

// Coller une image fonctionne partout sur l'écran d'une étape, sans avoir à
// cliquer d'abord dans la zone. Un collage de texte dans un champ n'est pas touché.
document.addEventListener('paste', (e) => {
  if (!isStep()) return;
  const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
  const zone = $('[data-role="shot"]');
  if (!item || !zone?.__accept) return;
  e.preventDefault();
  zone.__accept(item.getAsFile());
});

/* ------------------------------------------------------------- génération */

/** Retire les valeurs de remplissage temporaires et les blocs restés vides. */
function cleaned() {
  const clone = JSON.parse(JSON.stringify(doc));
  for (const step of clone.etapes) {
    for (const field of ['exemple', 'lien']) {
      if (!String(step[field] ?? '').trim()) step[field] = '';
    }
    step.encarts = step.encarts.filter((c) => (c.label ?? '').trim() || (c.texte ?? '').trim());
    step.boutons = step.boutons.filter((b) => (b.texte ?? '').trim());
    step.annexes = (step.annexes ?? []).filter((a) => a.dataUrl && (a.texte ?? '').trim());
    delete step.afficherAvance;
    delete step.numeroManuel;
  }
  return clone;
}

async function build() {
  const prepared = await hydrate(cleaned());
  const { bytes, overflow } = await renderProcedure(prepared);
  if (prepared.logoAvertissement) status(prepared.logoAvertissement, 'error');
  else if (overflow.length) {
    status(`Le contenu déborde du bas de la page ${overflow.map((o) => o.page).join(', ')}. `
      + 'Raccourcissez le texte ou retirez une capture.', 'error');
  }
  return bytes;
}

async function preview() {
  status('Génération de l’aperçu…');
  try {
    const bytes = await build();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    $('#preview-frame').src = previewUrl;
    $('#overlay').hidden = false;
    if (!$('#status').classList.contains('error')) status('');
  } catch (error) {
    status(`La génération a échoué : ${error.message}`, 'error');
    console.error(error);
  }
}

function slugify(text) {
  return (text || 'procedure').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase() || 'PROCEDURE';
}

function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function download() {
  status('Génération du PDF…');
  try {
    const bytes = await build();
    saveFile(new Blob([bytes], { type: 'application/pdf' }), `${slugify(doc.titre)}.pdf`);
    if (!$('#status').classList.contains('error')) {
      status(stockageDisponible
        ? 'PDF téléchargé.'
        : 'PDF envoyé au téléchargement. S’il ne s’est rien passé, ouvrez « Voir le PDF » '
          + 'et utilisez l’icône de téléchargement du lecteur.', 'ok');
    }
  } catch (error) {
    status(`La génération a échoué : ${error.message}`, 'error');
    console.error(error);
  }
}

/* ---------------------------------------------------------------- actions */

function bindActions() {
  $('#btn-prev').addEventListener('click', () => go(screen - 1));
  $('#btn-next').addEventListener('click', () => go(screen + 1));

  $('#btn-add-step').addEventListener('click', () => {
    const at = isStep() ? screen : stepCount();
    doc.etapes.splice(at, 0, emptyStep(at + 1));
    go(at + 1);
  });

  $('#btn-del-step').addEventListener('click', () => {
    if (stepCount() <= 1) return;
    doc.etapes.splice(screen - 1, 1);
    go(Math.min(screen, stepCount()));
  });

  $('#btn-preview').addEventListener('click', preview);
  $('#btn-pdf').addEventListener('click', download);
  $('#btn-close-preview').addEventListener('click', () => { $('#overlay').hidden = true; });

  // Dernier recours quand le téléchargement direct est bloqué par un cadre bac à
  // sable : le PDF s'ouvre dans un onglet, où le lecteur du navigateur permet de
  // l'enregistrer et de l'imprimer.
  $('#btn-open-tab').addEventListener('click', () => {
    if (previewUrl) window.open(previewUrl, '_blank');
  });

  const menu = $('#menu');
  $('#btn-menu').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.addEventListener('click', (e) => e.stopPropagation());

  $('#btn-export').addEventListener('click', () => {
    saveFile(new Blob([toYaml(cleaned(), { inlineImages: true })], { type: 'text/yaml' }),
      `${slugify(doc.titre).toLowerCase()}.yaml`);
    status('Fiche enregistrée. Rouvrez-la plus tard avec « Ouvrir une fiche enregistrée ».', 'ok');
  });

  $('#btn-import').addEventListener('click', () => $('#file-yaml').click());
  $('#file-yaml').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      doc = fromYaml(await file.text());
      go(0);
      status(`« ${doc.titre || file.name} » ouverte.`, 'ok');
    } catch (error) {
      status(`Ce fichier n'a pas pu être lu : ${error.message}`, 'error');
    }
    e.target.value = '';
  });

  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('Effacer la fiche en cours et repartir de zéro ?')) return;
    doc = normalise(emptyDoc());
    doc.date = todayFr();
    go(0);
    status('Nouvelle fiche.', 'ok');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#overlay').hidden = true;
  });
}

/* -------------------------------------------------------------------- init */

function fillPresets() {
  const list = $('#callout-presets');
  for (const preset of CALLOUT_PRESETS) {
    const option = document.createElement('option');
    option.value = preset.label;
    list.appendChild(option);
  }
}

if (!stockageDisponible) {
  $('#avertissement').hidden = false;
  $('#btn-fermer-avertissement').addEventListener('click', () => { $('#avertissement').hidden = true; });
}

loadDraft();
fillPresets();
bindActions();
render();

/** Encode sans dépasser la taille d'argument maximale de String.fromCharCode. */
function toBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Point d'entrée utilisé par tools/render.mjs pour la génération hors navigateur. */
window.__api = {
  async renderYaml(yamlText, contentBase = '') {
    const parsed = await hydrate(fromYaml(yamlText), contentBase);
    const { bytes, overflow } = await renderProcedure(parsed);
    return { base64: toBase64(bytes), overflow };
  },
};
