/**
 * layout.js — moteur de mise en page.
 *
 * Transforme un objet « procédure » en une liste de pages, chaque page portant une
 * liste d'opérations de dessin à coordonnées absolues (repère écran, y vers le bas).
 * Aucune dépendance à pdf-lib ici : le module ne sait que mesurer et positionner.
 * Le renderer se contente d'exécuter les opérations.
 *
 * Le moteur a besoin d'un « measurer » : { width(text, size, style) } où style vaut
 * 'regular' | 'bold' | 'italic'. En pratique il est fourni par pdf-lib (PDFFont).
 */

import {
  COLORS, FONT_METRICS, PAGE, HEADER, TITLE, OPR, GRID, CARD, VALIDATION, FOOTER,
  FLOW_GAP_AFTER, LABEL_INDENT_EM,
} from './tokens.js';

/** Hauteur de boîte d'une ligne de texte, pour un corps donné. */
export const lineBox = (size) => size * FONT_METRICS.lineBox;

/** Convertit un « sommet de ligne » (comme mesuré dans les PDF) en ligne de base. */
export const baselineFromTop = (top, size) => top + size * FONT_METRICS.ascender;

/** Sommet de ligne correspondant à une ligne de base donnée. */
export const topFromBaseline = (baseline, size) => baseline - size * FONT_METRICS.ascender;

/** Décalage des libellés précédés de deux espaces dans les fiches d'origine. */
export const labelIndent = (size) => size * LABEL_INDENT_EM;

/* ------------------------------------------------------------------ mesure */

/**
 * Découpe un texte en lignes tenant dans maxWidth.
 * Coupe uniquement sur les espaces sécables ; l'espace insécable (U+00A0) et
 * l'espace fine insécable (U+202F) ne sont jamais des points de coupure, ce qui
 * préserve les chevrons français « … » et les unités.
 */
export function wrapText(text, maxWidth, size, style, measurer) {
  const out = [];
  for (const paragraph of String(text ?? '').split('\n')) {
    if (paragraph.trim() === '') { out.push(''); continue; }
    // On segmente sur les espaces sécables en les gardant collés au mot précédent.
    const chunks = paragraph.split(/( )/).filter((s) => s !== '');
    let line = '';
    for (const chunk of chunks) {
      const candidate = line + chunk;
      if (line !== '' && measurer.width(candidate.trimEnd(), size, style) > maxWidth) {
        out.push(line.trimEnd());
        line = chunk === ' ' ? '' : chunk;
      } else {
        line = candidate;
      }
    }
    if (line.trimEnd() !== '') out.push(line.trimEnd());
  }
  return out.length ? out : [''];
}

/**
 * Répartit des items sur plusieurs lignes en les joignant par un séparateur.
 * Une ligne ne se termine jamais par le séparateur (§10 du DESIGN_SYSTEM).
 */
export function wrapJoined(items, separator, maxWidth, size, style, measurer) {
  const lines = [];
  let current = [];
  for (const item of items) {
    const candidate = [...current, item].join(separator);
    if (current.length && measurer.width(candidate, size, style) > maxWidth) {
      lines.push(current.join(separator));
      current = [item];
    } else {
      current.push(item);
    }
  }
  if (current.length) lines.push(current.join(separator));
  return lines;
}

/* ------------------------------------------------- construction d'une carte */

/**
 * Calcule la géométrie interne d'une carte d'étape et renvoie
 * { height, blocks } où blocks est la liste des opérations, y relatif au haut de la carte.
 */
export function layoutCard(step, geom, measurer) {
  const { x0, x1 } = geom;
  const width = x1 - x0;
  const padLeft = geom.padLeft ?? CARD.padLeft;
  const contentLeft = x0 + padLeft;
  const contentWidth = geom.contentWidth ?? (width - padLeft - CARD.padRight);
  const blocks = [];

  // La carte pleine largeur compose titre et corps un cran plus grand (§7.1).
  const isFull = width > (GRID.left.x1 - GRID.left.x0) * 1.5;
  const titleSize = isFull ? CARD.fullWidth.titleSize : CARD.title.size;
  const bodySize = isFull ? CARD.fullWidth.bodySize : CARD.action.bodySize;
  const bodyLeading = isFull ? CARD.fullWidth.bodyLeading : CARD.action.bodyLeading;
  const bodyGap = isFull ? CARD.fullWidth.bodyGap : CARD.action.bodyGap;

  // — pastille + titre —
  blocks.push({
    type: 'pastille',
    cx: x0 + CARD.pastille.dx + CARD.pastille.diameter / 2,
    cy: CARD.pastille.dy + CARD.pastille.diameter / 2,
    r: CARD.pastille.diameter / 2,
    fill: CARD.pastille.fill,
    text: String(step.numero ?? ''),
    textColor: CARD.pastille.textColor,
    size: CARD.pastille.size,
  });
  const titleTop = topFromBaseline(CARD.title.baselineDy, titleSize);
  blocks.push({
    type: 'text',
    x: x0 + CARD.title.dxSpan + labelIndent(titleSize),
    top: titleTop,
    size: titleSize,
    style: 'bold',
    color: CARD.title.color,
    text: step.titre ?? '',
  });

  let y = titleTop + lineBox(titleSize);
  let prev = 'title';
  const advance = () => { y += FLOW_GAP_AFTER[prev]; };

  // — capture d'écran —
  if (step.capture && step.capture.dataUrl) {
    advance();
    const frameX0 = x0 + CARD.shot.frameLeft;
    const frameW = width - CARD.shot.frameLeft - CARD.shot.frameRight;
    const maxW = frameW - 2 * CARD.shot.imageInsetX;
    const ratio = step.capture.height / step.capture.width;
    // Largeur imposée par le contenu si elle est fournie, sinon pleine largeur du
    // cadre, plafonnée par la hauteur maximale admise (§7.4).
    let imgW = step.capture.largeur ? Math.min(step.capture.largeur, maxW) : maxW;
    const maxH = step.capture.hauteurMax ?? CARD.shot.maxHeight;
    if (imgW * ratio > maxH) imgW = maxH / ratio;
    const imgH = imgW * ratio;
    const frameH = CARD.shot.insetTop + imgH + CARD.shot.insetBottom;
    const atMaxWidth = imgW >= maxW - 0.5;
    const imgX = CARD.shot.align === 'origine' && atMaxWidth
      ? x0 + CARD.shot.legacyIndent
      : frameX0 + (frameW - imgW) / 2;
    blocks.push({
      type: 'shot',
      x: frameX0, top: y, width: frameW, height: frameH,
      imgX,

      imgTop: y + CARD.shot.insetTop,
      imgWidth: imgW, imgHeight: imgH,
      dataUrl: step.capture.dataUrl,
      border: CARD.shot.border,
    });
    y += frameH;
    prev = 'shot';
  }

  // — ACTION —
  advance();
  blocks.push({
    type: 'text', x: contentLeft, top: y,
    size: CARD.action.labelSize, style: 'bold',
    color: CARD.action.labelColor, text: CARD.action.label,
  });
  const bodyLines = wrapText(step.action ?? '', contentWidth, bodySize, 'regular', measurer);
  const bodyTop = y + bodyGap;
  bodyLines.forEach((line, i) => {
    blocks.push({
      type: 'text', x: contentLeft, top: bodyTop + i * bodyLeading,
      size: bodySize, style: 'regular',
      color: CARD.action.bodyColor, text: line,
    });
  });
  y = bodyTop + (bodyLines.length - 1) * bodyLeading + lineBox(bodySize);
  prev = 'body';

  // — LIEN DIRECT —
  if (step.lien) {
    advance();
    const labelText = CARD.link.label + '  ';
    blocks.push({
      type: 'text', x: contentLeft, top: y,
      size: CARD.link.labelSize, style: 'bold',
      color: CARD.link.labelColor, text: CARD.link.label,
    });
    blocks.push({
      type: 'text',
      x: contentLeft + measurer.width(labelText, CARD.link.labelSize, 'bold'),
      top: y, size: CARD.link.urlSize, style: 'regular',
      color: CARD.link.urlColor, text: step.lien, uri: step.lien,
    });
    y += lineBox(CARD.link.labelSize);
    prev = 'link';
  }

  // — encarts —
  for (const callout of step.encarts ?? []) {
    advance();
    const style = CARD.callout.styles[callout.style] ?? CARD.callout.styles.info;
    const frameX0 = x0 + CARD.callout.left;
    const frameW = width - CARD.callout.left - CARD.callout.right;
    const textLeft = frameX0 + CARD.callout.padText;
    const textWidth = frameW - 2 * CARD.callout.padText;
    const lines = wrapText(callout.texte ?? '', textWidth, CARD.callout.bodySize, 'regular', measurer);
    const height = CARD.callout.heightBase + CARD.callout.bodyLeading * lines.length;
    blocks.push({
      type: 'callout', x: frameX0, top: y, width: frameW, height,
      fill: style.fill, stroke: style.stroke,
      borderWidth: CARD.callout.borderWidth, accentWidth: CARD.callout.accentWidth,
    });
    blocks.push({
      type: 'text', x: textLeft, top: y + CARD.callout.labelTop,
      size: CARD.callout.labelSize, style: 'bold',
      color: style.label, text: callout.label ?? '',
    });
    lines.forEach((line, i) => {
      blocks.push({
        type: 'text', x: textLeft,
        top: y + CARD.callout.labelTop + CARD.callout.bodyGap + i * CARD.callout.bodyLeading,
        size: CARD.callout.bodySize, style: 'regular',
        color: CARD.callout.bodyColor, text: line,
      });
    });
    y += height;
    prev = 'callout';
  }

  // — exemple illustré —
  if (step.exemple) {
    advance();
    const lines = wrapText(step.exemple, contentWidth, CARD.example.size, 'italic', measurer);
    lines.forEach((line, i) => {
      blocks.push({
        type: 'text', x: contentLeft, top: y + i * CARD.example.leading,
        size: CARD.example.size, style: 'italic',
        color: CARD.example.color, text: line,
      });
    });
    y += (lines.length - 1) * CARD.example.leading + lineBox(CARD.example.size);
    prev = 'example';
  }

  // — RÉSULTAT ATTENDU (fer à droite) —
  if (step.resultat) {
    advance();
    const full = CARD.outcome.label + CARD.outcome.separator + step.resultat;
    const rightEdge = x1 - CARD.outcome.rightInset;
    const lines = wrapText(full, rightEdge - contentLeft, CARD.outcome.size, 'bold', measurer);
    lines.forEach((line, i) => {
      blocks.push({
        type: 'text', x: rightEdge, align: 'right',
        top: y + i * CARD.outcome.leading,
        size: CARD.outcome.size, style: 'bold',
        color: CARD.outcome.color, text: line,
      });
    });
    y += (lines.length - 1) * CARD.outcome.leading + lineBox(CARD.outcome.size);
    prev = 'outcome';
  }

  // — boutons —
  // Une annexe se présente comme un bouton : même habillage, mais la cible est
  // une page empruntée à un autre PDF, ajoutée à la fin du document.
  const buttons = [
    ...(step.boutons ?? []),
    ...(step.annexes ?? [])
      .filter((a) => a.capture?.dataUrl && (a.texte ?? '').trim())
      .map((a) => ({ texte: a.texte, annexeId: a.id })),
  ];
  if (buttons.length) {
    advance();
    const zoneX0 = x0 + CARD.buttons.left;
    const zoneW = width - CARD.buttons.left - CARD.buttons.right;
    const each = zoneW / buttons.length;
    buttons.forEach((button, i) => {
      blocks.push({
        type: 'button',
        x: zoneX0 + i * each, top: y, width: each, height: CARD.buttons.height,
        text: button.texte ?? '', target: button.cible ?? null, uri: button.url ?? null,
        annexeId: button.annexeId ?? null,
      });
    });
    y += CARD.buttons.height;
    prev = 'buttons';
  }

  return { height: y + CARD.padBottom, blocks };
}

/* -------------------------------------------------------------- pagination */

/**
 * Regroupe les étapes en rangées de 2 (§7.1). Une étape isolée en fin de
 * procédure occupe toute la largeur.
 */
export function buildRows(steps) {
  const rows = [];
  for (let i = 0; i < steps.length; i += GRID.stepsPerPage) {
    const slice = steps.slice(i, i + GRID.stepsPerPage);
    rows.push(slice.length === 1 ? [{ step: slice[0], geom: GRID.full }]
      : [{ step: slice[0], geom: GRID.left }, { step: slice[1], geom: GRID.right }]);
  }
  return rows;
}

/**
 * Compose le document complet.
 * Règle de pagination : une rangée (donc 2 étapes) par page, comme les fiches v1.0.
 * Le bloc VALIDATION FINALE se pose sous la dernière rangée s'il tient, sinon
 * sur une page supplémentaire.
 */
export function layoutDocument(doc, measurer) {
  const rows = buildRows(doc.etapes ?? []);
  const pages = [];

  // La bande O/P/R grandit avec la cellule la plus longue ; elle fixe le haut
  // de la première rangée de cartes.
  const oprTextWidth = Math.min(...OPR.cellX1.map((x1, i) => x1 - OPR.cellX[i])) - 2 * OPR.body.dx;
  const oprLines = Math.max(1, ...OPR.slots.map((slot) =>
    wrapText(doc[slot.key] ?? '', oprTextWidth, OPR.body.size, 'regular', measurer).length));
  const oprHeight = OPR.heightBase + OPR.body.leading * oprLines;
  const oprBottom = OPR.y0 + oprHeight;
  const topFirstPage = oprBottom + GRID.rowGap;

  rows.forEach((row, index) => {
    const first = index === 0;
    const top = first ? topFirstPage : GRID.topNextPage;
    const cards = row.map(({ step, geom }) => {
      const laid = layoutCard(step, geom, measurer);
      return { step, geom, ...laid };
    });
    // Les deux cartes d'une rangée partagent la hauteur de la plus haute (§7.1).
    const height = Math.max(...cards.map((c) => c.height));
    cards.forEach((c) => { c.height = height; c.top = top; });
    // Le sous-titre de page est celui de la première étape qui en déclare un.
    const subtitle = row.map(({ step }) => step.sousTitre).find(Boolean) ?? doc.sousTitre ?? '';
    pages.push({ first, subtitle, cards, bottom: top + height });
  });

  if (!pages.length) pages.push({ first: true, subtitle: doc.sousTitre ?? '', cards: [], bottom: topFirstPage });

  // — bloc VALIDATION FINALE —
  // `lignes` impose le regroupement (comme dans les fiches d'origine, où les items
  // sont répartis par thème et non par largeur) ; `items` est réparti automatiquement.
  const explicites = (doc.validation?.lignes ?? []).map((s) => String(s).trim()).filter(Boolean);
  const items = (doc.validation?.items ?? []).map((s) => String(s).trim()).filter(Boolean);
  if (doc.validation?.actif && (explicites.length || items.length)) {
    const width = VALIDATION.x1 - VALIDATION.x0;
    const textWidth = width - VALIDATION.items.dx - VALIDATION.rightInset;
    const size = VALIDATION.items.size;
    const lines = explicites.length
      // Une ligne imposée trop longue est repliée plutôt que tronquée.
      ? explicites.flatMap((ligne) => wrapText(ligne, textWidth, size, 'regular', measurer))
      : wrapJoined(items, VALIDATION.items.separator, textWidth, size, 'regular', measurer);
    const height = VALIDATION.heightBase + VALIDATION.items.leading * lines.length;
    const last = pages[pages.length - 1];
    let top = last.bottom + GRID.rowGap;
    if (top + height > GRID.bottomLimit) {
      pages.push({ first: false, subtitle: last.subtitle, cards: [], bottom: GRID.topNextPage });
      top = GRID.topNextPage;
    }
    const target = pages[pages.length - 1];
    target.validation = { top, height, lines };
    target.bottom = top + height;
  }

  const overflow = pages
    .map((p, i) => ({ page: i + 1, bottom: p.bottom }))
    .filter((p) => p.bottom > GRID.bottomLimit);

  return { pages, overflow, oprHeight };
}

export { COLORS, PAGE, HEADER, TITLE, OPR, GRID, CARD, VALIDATION, FOOTER };
