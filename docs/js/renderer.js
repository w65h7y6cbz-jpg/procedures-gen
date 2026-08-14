/**
 * renderer.js — exécution du plan de mise en page vers un PDF (pdf-lib).
 *
 * Le module ne prend aucune décision de charte : toutes les cotes viennent de
 * tokens.js via layout.js. Il ne fait que convertir le repère écran (y vers le bas,
 * utilisé partout ailleurs) en repère PDF (y vers le haut) et dessiner.
 */

import {
  COLORS, FONT_METRICS, PAGE, HEADER, TITLE, OPR, GRID, CARD, VALIDATION, FOOTER,
} from './tokens.js';
import { layoutDocument, wrapText, lineBox, baselineFromTop, labelIndent } from './layout.js';

const { PDFDocument, rgb, PDFName, PDFString, PDFArray } = window.PDFLib;

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Repère écran → repère PDF. */
const flip = (y) => PAGE.height - y;

/* ------------------------------------------------------------------ polices */

let fontCache = null;

async function loadFonts(pdfDoc, base = '') {
  if (!fontCache) {
    const files = {
      regular: `${base}fonts/DejaVuSans.ttf`,
      bold:    `${base}fonts/DejaVuSans-Bold.ttf`,
      italic:  `${base}fonts/DejaVuSans-Oblique.ttf`,
    };
    const entries = await Promise.all(Object.entries(files).map(async ([key, url]) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Police introuvable : ${url}`);
      return [key, new Uint8Array(await response.arrayBuffer())];
    }));
    fontCache = Object.fromEntries(entries);
  }
  pdfDoc.registerFontkit(window.fontkit);
  const embedded = {};
  for (const [key, bytes] of Object.entries(fontCache)) {
    embedded[key] = await pdfDoc.embedFont(bytes, { subset: true });
  }
  return embedded;
}

/** Mesureur utilisé par layout.js. */
export function makeMeasurer(fonts) {
  return { width: (text, size, style = 'regular') => fonts[style].widthOfTextAtSize(text ?? '', size) };
}

/**
 * Mesureur autonome, sans document PDF : sert à l'aperçu et au calcul de
 * pagination avant génération. Utilise les mêmes polices via fontkit.
 */
export async function makeStandaloneMeasurer(base = '') {
  const doc = await PDFDocument.create();
  const fonts = await loadFonts(doc, base);
  return { measurer: makeMeasurer(fonts), fonts };
}

/* ---------------------------------------------------------------- primitives */

function drawTextTop(page, fonts, { text, x, top, size, style = 'regular', color, align }) {
  if (text === undefined || text === null || text === '') return;
  const font = fonts[style];
  const width = font.widthOfTextAtSize(text, size);
  const drawX = align === 'right' ? x - width
    : align === 'center' ? x - width / 2
      : x;
  page.drawText(text, {
    x: drawX, y: flip(baselineFromTop(top, size)),
    size, font, color: hexToRgb(color),
  });
  return { x: drawX, width };
}

/** Texte centré verticalement dans un cercle (pastilles). */
function drawCentredInCircle(page, fonts, { text, cx, cy, size, color, style = 'bold' }) {
  const font = fonts[style];
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: cx - width / 2,
    y: flip(cy + (size * FONT_METRICS.capHeight) / 2),
    size, font, color: hexToRgb(color),
  });
}

function drawRect(page, { x, top, width, height, fill, stroke, strokeWidth }) {
  page.drawRectangle({
    x, y: flip(top + height), width, height,
    color: fill ? hexToRgb(fill) : undefined,
    borderColor: stroke ? hexToRgb(stroke) : undefined,
    borderWidth: stroke ? strokeWidth ?? 1 : undefined,
  });
}

function drawLine(page, { x0, y0, x1, y1, color, width }) {
  page.drawLine({
    start: { x: x0, y: flip(y0) }, end: { x: x1, y: flip(y1) },
    thickness: width, color: hexToRgb(color),
  });
}

/** Rectangle à coins arrondis (badge d'en-tête), tracé en repère écran. */
function drawRoundedRect(page, { x, top, width, height, radius, fill }) {
  const r = Math.min(radius, width / 2, height / 2);
  const path = [
    `M ${x + r} ${top}`,
    `H ${x + width - r}`, `A ${r} ${r} 0 0 1 ${x + width} ${top + r}`,
    `V ${top + height - r}`, `A ${r} ${r} 0 0 1 ${x + width - r} ${top + height}`,
    `H ${x + r}`, `A ${r} ${r} 0 0 1 ${x} ${top + height - r}`,
    `V ${top + r}`, `A ${r} ${r} 0 0 1 ${x + r} ${top}`, 'Z',
  ].join(' ');
  // drawSvgPath interprète le chemin en repère SVG (y vers le bas) et place son
  // origine au point donné : on la pose en haut de page pour retomber sur nos cotes.
  page.drawSvgPath(path, { x: 0, y: PAGE.height, color: hexToRgb(fill) });
}

function addLinkAnnotation(pdfDoc, page, rect, action) {
  const annot = pdfDoc.context.obj({
    Type: 'Annot', Subtype: 'Link',
    Rect: rect, Border: [0, 0, 0], F: 4, A: action,
  });
  const ref = pdfDoc.context.register(annot);
  const existing = page.node.Annots();
  if (existing) existing.push(ref);
  else page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([ref]));
}

/* ------------------------------------------------------------------- blocs */

function drawHeader(page, fonts, logoImage, badgeImage) {
  if (logoImage) {
    // Le logo est inscrit dans son bloc sans déformation : un fichier de
    // proportion différente est réduit et centré plutôt qu'étiré.
    const box = HEADER.logo;
    const scale = Math.min(box.width / logoImage.width, box.height / logoImage.height);
    const width = logoImage.width * scale;
    const height = logoImage.height * scale;
    page.drawImage(logoImage, {
      x: box.x + (box.width - width) / 2,
      y: flip(box.y + (box.height + height) / 2),
      width, height,
    });
  }
  const b = HEADER.badge;
  if (badgeImage) {
    page.drawImage(badgeImage, {
      x: b.x, y: flip(b.y + b.height), width: b.width, height: b.height,
    });
  } else {
    // Repli vectoriel si l'asset manque : mêmes cotes, police DejaVu.
    drawRoundedRect(page, { x: b.x, top: b.y, width: b.width, height: b.height, radius: b.radius, fill: b.fill });
    for (const line of [b.line1, b.line2]) {
      drawTextTop(page, fonts, {
        text: line.text, x: b.x + b.width / 2,
        top: b.y + line.capTop - (FONT_METRICS.ascender - FONT_METRICS.capHeight) * line.size,
        size: line.size, style: line.bold ? 'bold' : 'regular',
        color: line.color, align: 'center',
      });
    }
  }
  drawLine(page, {
    x0: HEADER.rule.x0, y0: HEADER.rule.y, x1: HEADER.rule.x1, y1: HEADER.rule.y,
    color: HEADER.rule.color, width: HEADER.rule.width,
  });
}

function drawTitle(page, fonts, doc, pageSpec) {
  const spec = pageSpec.first ? TITLE.first : TITLE.continued;
  drawTextTop(page, fonts, {
    text: doc.titre ?? '', x: TITLE.x, top: spec.top,
    size: spec.size, style: 'bold', color: TITLE.color,
  });
  drawTextTop(page, fonts, {
    text: pageSpec.subtitle ?? '', x: TITLE.x, top: spec.subtitleTop,
    size: TITLE.subtitle.size, style: 'regular', color: TITLE.subtitle.color,
  });
}

function drawOpr(page, fonts, doc, measurer, height) {
  OPR.slots.forEach((slot, i) => {
    const x = OPR.cellX[i];
    const cellWidth = OPR.cellX1[i] - x;
    drawRect(page, {
      x, top: OPR.y0, width: cellWidth, height,
      fill: OPR.fill, stroke: OPR.border.color, strokeWidth: OPR.border.width,
    });
    const r = OPR.pastille.diameter / 2;
    page.drawCircle({
      x: x + OPR.pastille.dx + r, y: flip(OPR.pastille.y + r),
      size: r, color: hexToRgb(slot.color),
    });
    drawCentredInCircle(page, fonts, {
      text: slot.letter, cx: x + OPR.pastille.dx + r, cy: OPR.pastille.y + r,
      size: OPR.pastille.letterSize, color: COLORS.white,
    });
    drawTextTop(page, fonts, {
      text: slot.label, x: x + OPR.label.dxSpan + labelIndent(OPR.label.size), top: OPR.label.top,
      size: OPR.label.size, style: 'bold', color: slot.color,
    });
    const textWidth = cellWidth - 2 * OPR.body.dx;
    const lines = wrapText(doc[slot.key] ?? '', textWidth, OPR.body.size, 'regular', measurer);
    lines.forEach((line, j) => {
      drawTextTop(page, fonts, {
        text: line, x: x + OPR.body.dx, top: OPR.body.top + j * OPR.body.leading,
        size: OPR.body.size, style: 'regular', color: OPR.body.color,
      });
    });
  });
}

async function drawCard(pdfDoc, page, fonts, card, imageCache, stepPages) {
  const { geom, top, height, blocks } = card;
  const { x0, x1 } = geom;
  const width = x1 - x0;

  drawRect(page, { x: x0, top, width, height, fill: CARD.fill });
  // bordures gauche / droite / bas
  const b = CARD.border;
  drawLine(page, { x0, y0: top, x1: x0, y1: top + height, color: b.color, width: b.width });
  drawLine(page, { x0: x1, y0: top, x1, y1: top + height, color: b.color, width: b.width });
  drawLine(page, { x0, y0: top + height, x1, y1: top + height, color: b.color, width: b.width });
  // filet d'accent supérieur
  drawLine(page, {
    x0, y0: top + CARD.accent.width / 2, x1, y1: top + CARD.accent.width / 2,
    color: CARD.accent.color, width: CARD.accent.width,
  });

  for (const block of blocks) {
    const y = top + (block.top ?? 0);
    switch (block.type) {
      case 'pastille': {
        page.drawCircle({
          x: block.cx, y: flip(top + block.cy), size: block.r, color: hexToRgb(block.fill),
        });
        drawCentredInCircle(page, fonts, {
          text: block.text, cx: block.cx, cy: top + block.cy,
          size: block.size, color: block.textColor,
        });
        break;
      }
      case 'text': {
        const drawn = drawTextTop(page, fonts, { ...block, top: y });
        if (block.uri && drawn) {
          const y0 = flip(baselineFromTop(y, block.size) + block.size * FONT_METRICS.descender);
          const y1 = flip(y);
          addLinkAnnotation(pdfDoc, page, [drawn.x, y0, drawn.x + drawn.width, y1],
            pdfDoc.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(block.uri) }));
        }
        break;
      }
      case 'shot': {
        drawRect(page, { x: block.x, top: y, width: block.width, height: block.height, fill: COLORS.white });
        const image = await embedImage(pdfDoc, imageCache, block.dataUrl);
        if (image) {
          page.drawImage(image, {
            x: block.imgX, y: flip(top + block.imgTop + block.imgHeight),
            width: block.imgWidth, height: block.imgHeight,
          });
        }
        // Le filet est tracé APRÈS l'image : avec le calage d'origine, une capture
        // à la largeur maximale mord de 5.9 pt sur le bord droit du cadre, et le
        // filet doit rester continu comme dans les fiches de référence.
        drawRect(page, {
          x: block.x, top: y, width: block.width, height: block.height,
          stroke: block.border.color, strokeWidth: block.border.width,
        });
        break;
      }
      case 'callout': {
        drawRect(page, { x: block.x, top: y, width: block.width, height: block.height, fill: block.fill });
        const s = block.stroke, w = block.borderWidth;
        drawLine(page, { x0: block.x, y0: y, x1: block.x + block.width, y1: y, color: s, width: w });
        drawLine(page, {
          x0: block.x, y0: y + block.height, x1: block.x + block.width, y1: y + block.height,
          color: s, width: w,
        });
        drawLine(page, {
          x0: block.x + block.width, y0: y, x1: block.x + block.width, y1: y + block.height,
          color: s, width: w,
        });
        drawLine(page, {
          x0: block.x + block.accentWidth / 2, y0: y,
          x1: block.x + block.accentWidth / 2, y1: y + block.height,
          color: s, width: block.accentWidth,
        });
        break;
      }
      case 'button': {
        drawRect(page, {
          x: block.x, top: y, width: block.width, height: block.height,
          fill: CARD.buttons.fill, stroke: CARD.buttons.stroke, strokeWidth: CARD.buttons.borderWidth,
        });
        const drawn = drawTextTop(page, fonts, {
          text: block.text, x: block.x + block.width / 2, top: y + CARD.buttons.textTop,
          size: CARD.buttons.textSize, style: 'bold', color: CARD.buttons.textColor, align: 'center',
        });
        if (drawn) {
          const underlineY = y + CARD.buttons.textTop + lineBox(CARD.buttons.textSize) - 1.2;
          drawLine(page, {
            x0: drawn.x, y0: underlineY, x1: drawn.x + drawn.width, y1: underlineY,
            color: CARD.buttons.textColor, width: CARD.buttons.underline,
          });
        }
        const rect = [block.x, flip(y + block.height), block.x + block.width, flip(y)];
        if (block.uri) {
          addLinkAnnotation(pdfDoc, page, rect,
            pdfDoc.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(block.uri) }));
        } else if (block.target && stepPages.has(String(block.target))) {
          const targetPage = pdfDoc.getPage(stepPages.get(String(block.target)));
          const dest = PDFArray.withContext(pdfDoc.context);
          dest.push(targetPage.ref);
          dest.push(PDFName.of('Fit'));
          addLinkAnnotation(pdfDoc, page, rect,
            pdfDoc.context.obj({ Type: 'Action', S: 'GoTo', D: dest }));
        }
        break;
      }
      default: break;
    }
  }
}

function drawValidation(page, fonts, validation) {
  const { top, height, lines } = validation;
  const width = VALIDATION.x1 - VALIDATION.x0;
  drawRect(page, {
    x: VALIDATION.x0, top, width, height,
    fill: VALIDATION.fill, stroke: VALIDATION.border.color, strokeWidth: VALIDATION.border.width,
  });
  const r = VALIDATION.pastille.diameter / 2;
  const cx = VALIDATION.x0 + VALIDATION.pastille.dx + r;
  const cy = top + VALIDATION.pastille.dy + r;
  page.drawCircle({ x: cx, y: flip(cy), size: r, color: hexToRgb(VALIDATION.pastille.fill) });
  drawCentredInCircle(page, fonts, {
    text: VALIDATION.pastille.text, cx, cy,
    size: VALIDATION.pastille.size, color: VALIDATION.pastille.textColor,
  });
  drawTextTop(page, fonts, {
    text: VALIDATION.title.text,
    x: VALIDATION.x0 + VALIDATION.title.dxSpan + labelIndent(VALIDATION.title.size),
    top: top + VALIDATION.title.dy,
    size: VALIDATION.title.size, style: 'bold', color: VALIDATION.title.color,
  });
  lines.forEach((line, i) => {
    drawTextTop(page, fonts, {
      text: line, x: VALIDATION.x0 + VALIDATION.items.dx,
      top: top + VALIDATION.items.dy + i * VALIDATION.items.leading,
      size: VALIDATION.items.size, style: 'regular', color: VALIDATION.items.color,
    });
  });
}

function drawFooter(page, fonts, doc, pageNumber, pageCount) {
  const band = FOOTER.band;
  drawRect(page, {
    x: 0, top: band.y0, width: PAGE.width, height: band.y1 - band.y0, fill: band.fill,
  });
  drawTextTop(page, fonts, {
    text: FOOTER.left.text, x: FOOTER.left.x, top: FOOTER.left.top,
    size: FOOTER.left.size, style: 'regular', color: FOOTER.left.color,
  });
  const right = [
    `Version ${doc.version ?? '1.0'}`,
    doc.date ?? '',
    `Page ${pageNumber}/${pageCount}`,
  ].filter(Boolean).join(FOOTER.right.separator);
  drawTextTop(page, fonts, {
    text: right, x: FOOTER.right.rightEdge, top: FOOTER.right.top,
    size: FOOTER.right.size, style: 'regular', color: FOOTER.right.color, align: 'right',
  });
}

/* ------------------------------------------------------------------ images */

async function embedImage(pdfDoc, cache, dataUrl) {
  if (!dataUrl) return null;
  if (cache.has(dataUrl)) return cache.get(dataUrl);
  const isPng = /^data:image\/png/i.test(dataUrl);
  const image = isPng ? await pdfDoc.embedPng(dataUrl) : await pdfDoc.embedJpg(dataUrl);
  cache.set(dataUrl, image);
  return image;
}

/* -------------------------------------------------------------------- API */

/**
 * Génère le PDF d'une procédure.
 * @returns {Promise<{bytes: Uint8Array, overflow: Array}>}
 */
export async function renderProcedure(doc, options = {}) {
  const base = options.base ?? '';
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc, base);
  const measurer = makeMeasurer(fonts);

  pdfDoc.setTitle(doc.titre ?? 'Fiche procédure');
  pdfDoc.setAuthor('Optimium NC');
  pdfDoc.setSubject(doc.sousTitre ?? '');
  pdfDoc.setProducer('procedures-gen');
  pdfDoc.setCreator('procedures-gen');

  const { pages, overflow, oprHeight } = layoutDocument(doc, measurer);
  const imageCache = new Map();

  const logoImage = doc.logo ? await embedImage(pdfDoc, imageCache, doc.logo) : null;
  const badgeImage = doc.badge ? await embedImage(pdfDoc, imageCache, doc.badge) : null;

  // Toutes les pages sont créées d'abord : les liens internes ont besoin des références.
  const pdfPages = pages.map(() => pdfDoc.addPage([PAGE.width, PAGE.height]));

  const stepPages = new Map();
  pages.forEach((spec, i) => {
    spec.cards.forEach((card) => {
      if (card.step?.numero !== undefined) stepPages.set(String(card.step.numero), i);
    });
  });

  for (let i = 0; i < pages.length; i += 1) {
    const spec = pages[i];
    const page = pdfPages[i];
    page.drawRectangle({
      x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: hexToRgb(PAGE.background),
    });
    drawHeader(page, fonts, logoImage, badgeImage);
    drawTitle(page, fonts, doc, spec);
    if (spec.first) drawOpr(page, fonts, doc, measurer, oprHeight);
    for (const card of spec.cards) {
      await drawCard(pdfDoc, page, fonts, card, imageCache, stepPages);
    }
    if (spec.validation) drawValidation(page, fonts, spec.validation);
    drawFooter(page, fonts, doc, i + 1, pages.length);
  }

  return { bytes: await pdfDoc.save(), overflow };
}
