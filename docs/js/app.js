/**
 * app.js — interface de saisie.
 *
 * L'aperçu affiché est le PDF réellement généré (même code que le
 * téléchargement) : ce qui est visible à l'écran est ce qui sortira.
 */

import { renderProcedure } from './renderer.js';
import {
  emptyDoc, emptyStep, normalise, bumpVersion, suggestValidationItems,
  toYaml, fromYaml, hydrate, readFileAsDataUrl, measureImage, CALLOUT_PRESETS,
} from './schema.js';

const DRAFT_KEY = 'procedures-gen:draft';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let doc = normalise(emptyDoc());
let previewUrl = null;

/* ------------------------------------------------------------------ statut */

function status(message, kind = '') {
  const el = $('#status');
  el.textContent = message;
  el.className = `status ${kind}`;
  el.hidden = !message;
}

/* ----------------------------------------------------------- champs simples */

const DOC_FIELDS = ['titre', 'sousTitre', 'version', 'date', 'objectif', 'prerequis', 'resultat'];

function bindDocFields() {
  for (const field of DOC_FIELDS) {
    const input = $(`#f-${field}`);
    input.addEventListener('input', () => { doc[field] = input.value; saveDraft(); });
  }
  $('#f-validation-actif').addEventListener('change', (e) => {
    doc.validation.actif = e.target.checked; saveDraft();
  });
  $('#f-validation-items').addEventListener('input', (e) => {
    // Chaque ligne saisie est une ligne imprimée (§10 du DESIGN_SYSTEM : les fiches
    // d'origine regroupent les points par thème, pas par largeur disponible).
    doc.validation.lignes = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
    doc.validation.items = [];
    saveDraft();
  });
}

function fillDocFields() {
  for (const field of DOC_FIELDS) $(`#f-${field}`).value = doc[field] ?? '';
  $('#f-validation-actif').checked = doc.validation.actif !== false;
  const lignes = doc.validation.lignes?.length ? doc.validation.lignes : (doc.validation.items ?? []);
  $('#f-validation-items').value = lignes.join('\n');
}

/* ------------------------------------------------------------------ étapes */

function renderSteps() {
  const host = $('#steps');
  host.textContent = '';
  doc.etapes.forEach((step, index) => host.appendChild(buildStep(step, index)));
}

function buildStep(step, index) {
  const node = $('#tpl-step').content.firstElementChild.cloneNode(true);
  const badge = $('[data-role="badge"]', node);
  const legend = $('[data-role="legend-title"]', node);

  const refreshLegend = () => {
    badge.textContent = step.numero || '?';
    legend.textContent = step.titre || 'Étape sans titre';
  };
  refreshLegend();

  for (const input of $$('[data-field]', node)) {
    const field = input.dataset.field;
    if (field === 'captureLargeur') {
      input.value = step.capture?.largeur ?? '';
      input.addEventListener('input', () => {
        if (!step.capture) return;
        const value = parseFloat(input.value);
        if (Number.isFinite(value) && value > 0) step.capture.largeur = value;
        else delete step.capture.largeur;
        saveDraft();
      });
      continue;
    }
    if (!(field in step)) continue;
    input.value = step[field] ?? '';
    input.addEventListener('input', () => {
      step[field] = input.value;
      if (field === 'numero' || field === 'titre') refreshLegend();
      saveDraft();
    });
  }

  $('[data-action="up"]', node).addEventListener('click', () => moveStep(index, -1));
  $('[data-action="down"]', node).addEventListener('click', () => moveStep(index, +1));
  $('[data-action="remove"]', node).addEventListener('click', () => {
    doc.etapes.splice(index, 1);
    if (!doc.etapes.length) doc.etapes.push(emptyStep(1));
    renderSteps(); saveDraft();
  });

  bindCapture(node, step);
  bindCallouts(node, step);
  bindButtons(node, step);
  return node;
}

function moveStep(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= doc.etapes.length) return;
  const [item] = doc.etapes.splice(index, 1);
  doc.etapes.splice(target, 0, item);
  renderSteps(); saveDraft();
}

/* ---------------------------------------------------------------- captures */

function bindCapture(node, step) {
  const file = $('[data-role="capture-file"]', node);
  const drop = $('[data-role="capture-drop"]', node);
  const thumb = $('[data-role="capture-thumb"]', node);

  const show = () => {
    const url = step.capture?.dataUrl;
    thumb.hidden = !url;
    if (url) thumb.src = url;
    drop.textContent = url
      ? 'Image chargée — déposez-en une autre pour la remplacer.'
      : 'Glissez une image ici, ou collez-la (Ctrl+V) après avoir cliqué dans cette zone.';
  };
  show();

  const accept = async (blob) => {
    if (!blob) return;
    try {
      const dataUrl = await readFileAsDataUrl(blob);
      const size = await measureImage(dataUrl);
      step.capture = { ...(step.capture ?? {}), dataUrl, ...size };
      delete step.capture.fichier;
      show(); saveDraft();
      status('Capture chargée.', 'ok');
    } catch (error) {
      status(`Capture refusée : ${error.message}`, 'error');
    }
  };

  $('[data-action="pick-capture"]', node).addEventListener('click', () => file.click());
  file.addEventListener('change', () => accept(file.files[0]));
  $('[data-action="clear-capture"]', node).addEventListener('click', () => {
    step.capture = null; show(); saveDraft();
  });

  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault(); drop.classList.remove('over');
    accept(e.dataTransfer.files[0]);
  });
  drop.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); accept(item.getAsFile()); }
  });
}

/* ----------------------------------------------------------------- encarts */

function bindCallouts(node, step) {
  const host = $('[data-role="callouts"]', node);
  const draw = () => {
    host.textContent = '';
    step.encarts.forEach((callout, i) => {
      const row = $('#tpl-callout').content.firstElementChild.cloneNode(true);
      for (const input of $$('[data-field]', row)) {
        const field = input.dataset.field;
        input.value = callout[field] ?? '';
        input.addEventListener('input', () => {
          callout[field] = input.value;
          // Les libellés connus portent un style par défaut (cf. DESIGN_SYSTEM §8).
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
      $('[data-action="remove-callout"]', row).addEventListener('click', () => {
        step.encarts.splice(i, 1); draw(); saveDraft();
      });
      host.appendChild(row);
    });
  };
  draw();
  $('[data-action="add-callout"]', node).addEventListener('click', () => {
    step.encarts.push({ style: 'info', label: '', texte: '' });
    draw(); saveDraft();
  });
}

/* ----------------------------------------------------------------- boutons */

function bindButtons(node, step) {
  const host = $('[data-role="buttons"]', node);
  const draw = () => {
    host.textContent = '';
    step.boutons.forEach((button, i) => {
      const row = $('#tpl-button').content.firstElementChild.cloneNode(true);
      for (const input of $$('[data-field]', row)) {
        const field = input.dataset.field;
        input.value = button[field] ?? '';
        input.addEventListener('input', () => { button[field] = input.value; saveDraft(); });
      }
      $('[data-action="remove-button"]', row).addEventListener('click', () => {
        step.boutons.splice(i, 1); draw(); saveDraft();
      });
      host.appendChild(row);
    });
  };
  draw();
  $('[data-action="add-button"]', node).addEventListener('click', () => {
    step.boutons.push({ texte: '', cible: '', url: '' });
    draw(); saveDraft();
  });
}

/* ------------------------------------------------------------- génération */

async function build() {
  const prepared = await hydrate(JSON.parse(JSON.stringify(doc)));
  const { bytes, overflow } = await renderProcedure(prepared);
  if (overflow.length) {
    const pages = overflow.map((o) => o.page).join(', ');
    status(`Attention : le contenu déborde du bas de page ${pages}. Raccourcissez le texte ou réduisez la capture.`, 'error');
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
    $('#preview-empty').hidden = true;
    if (!$('#status').classList.contains('error')) status('Aperçu à jour.', 'ok');
  } catch (error) {
    status(`Échec de la génération : ${error.message}`, 'error');
    console.error(error);
  }
}

function slugify(text) {
  return (text || 'procedure').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase() || 'PROCEDURE';
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* --------------------------------------------------------------- brouillon */

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

/* ------------------------------------------------------------------ actions */

function bindActions() {
  $('#btn-add-step').addEventListener('click', () => {
    doc.etapes.push(emptyStep(doc.etapes.length + 1));
    renderSteps(); saveDraft();
  });

  $('#btn-bump').addEventListener('click', () => {
    doc.version = bumpVersion(doc.version);
    $('#f-version').value = doc.version;
    saveDraft();
  });

  $('#btn-suggest').addEventListener('click', () => {
    doc.validation.lignes = suggestValidationItems(doc);
    doc.validation.items = [];
    $('#f-validation-items').value = doc.validation.lignes.join('\n');
    saveDraft();
    status('Items proposés depuis les résultats attendus — relisez-les et condensez-les.', 'ok');
  });

  $('#btn-preview').addEventListener('click', preview);

  $('#btn-pdf').addEventListener('click', async () => {
    status('Génération du PDF…');
    try {
      const bytes = await build();
      download(new Blob([bytes], { type: 'application/pdf' }), `${slugify(doc.titre)}.pdf`);
      if (!$('#status').classList.contains('error')) status('PDF téléchargé.', 'ok');
    } catch (error) {
      status(`Échec de la génération : ${error.message}`, 'error');
      console.error(error);
    }
  });

  $('#btn-export').addEventListener('click', () => {
    download(new Blob([toYaml(doc)], { type: 'text/yaml' }), `${slugify(doc.titre).toLowerCase()}.yaml`);
  });

  $('#btn-import').addEventListener('click', () => $('#file-yaml').click());
  $('#file-yaml').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      doc = fromYaml(await file.text());
      fillDocFields(); renderSteps(); saveDraft();
      status(`« ${doc.titre || file.name} » importé.`, 'ok');
    } catch (error) {
      status(`YAML illisible : ${error.message}`, 'error');
    }
    e.target.value = '';
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

loadDraft();
fillPresets();
bindDocFields();
bindActions();
fillDocFields();
renderSteps();

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
