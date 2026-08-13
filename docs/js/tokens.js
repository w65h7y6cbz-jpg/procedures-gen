/**
 * tokens.js — transcription littérale de DESIGN_SYSTEM.md.
 *
 * Toutes les valeurs sont en points PostScript, dans un repère « écran »
 * (origine en haut à gauche, y vers le bas), comme les mesures du DESIGN_SYSTEM.
 * La conversion vers le repère PDF (origine en bas à gauche) est faite au dernier
 * moment par renderer.js, jamais ici.
 *
 * Ne rien coder en dur ailleurs : ce fichier est la seule source de vérité de la charte.
 */

export const COLORS = {
  navy:       '#263F8B', // primaire
  cyan:       '#159FD0', // secondaire
  green:      '#178653', // validation
  ink:        '#14213D', // corps de texte
  slate:      '#5A6A80', // sous-titre, exemples
  bgLight:    '#F5F8FC', // cellules O/P/R, encarts info
  bgAccent:   '#EAF4FA', // encarts important, boutons, validation finale
  border:     '#CBD9E8', // contours neutres
  white:      '#FFFFFF',
};

/** Métriques DejaVu Sans, en em (hhea). Servent à convertir un « sommet de ligne » en ligne de base. */
export const FONT_METRICS = {
  ascender:  1901 / 2048, // 0.928223
  descender:  483 / 2048, // 0.235840
  capHeight: 1493 / 2048, // 0.729004
  lineBox:   (1901 + 483) / 2048, // 1.164063 — hauteur de boîte de ligne mesurée dans les PDF
  spaceBold: 713 / 2048,  // 0.348145 — chasse de l'espace en DejaVu Sans Bold
};

/**
 * Dans les fiches d'origine, les libellés composés à côté d'une pastille sont
 * précédés de DEUX espaces (« ␣␣OBJECTIF », « ␣␣VALIDATION FINALE », titres d'étape).
 * Le décalage dépend donc du corps : on le recalcule au lieu de le figer.
 */
export const LABEL_INDENT_EM = 2 * (713 / 2048);

export const PAGE = {
  width:  841.89,
  height: 595.28,
  background: COLORS.white,
};

export const HEADER = {
  logo:  { x: 37.40, y: 18.35, width: 164.40, height: 46.75 },
  /**
   * Le badge est un bitmap dans les fiches d'origine, composé dans une police
   * plus étroite que DejaVu : on réemploie l'image extraite plutôt que de la
   * réinterpréter. Le tracé vectoriel ci-dessous ne sert que de repli si
   * l'asset est absent (cotes relevées : rayon 10, corps 8.35 et 5.45).
   */
  badge: {
    x: 634.45, y: 18.35, width: 170.10, height: 42.50,
    image: 'assets/badge_fiche_procedure.jpeg',
    radius: 10,
    fill: COLORS.navy,
    line1: { text: 'FICHE PROCÉDURE', size: 8.35, bold: true,  color: COLORS.white, capTop: 9.08 },
    line2: { text: 'SUPPORT & OUTILS', size: 5.45, bold: false, color: COLORS.white, capTop: 24.56 },
  },
  rule: { y: 77.15, x0: 28.40, x1: 813.55, color: COLORS.cyan, width: 2.25 },
};

export const TITLE = {
  x: 28.45,
  first:      { size: 20,   top: 79.34, subtitleTop: 104.66 },
  continued:  { size: 17.5, top: 79.36, subtitleTop: 101.71 },
  color: COLORS.navy,
  subtitle: { size: 8.5, color: COLORS.slate },
};

/**
 * Bande OBJECTIF / PRÉREQUIS / RÉSULTAT — page 1 uniquement.
 * Hauteur variable : heightBase + leading × (nombre de lignes de la cellule la plus longue).
 * Mesuré : 61.55 pour 3 lignes (Devis), 70.05 pour 4 lignes (DATEC).
 */
export const OPR = {
  y0: 120.60,
  heightBase: 35.90,
  cellX:  [20.90, 287.30, 553.80],
  cellX1: [273.05, 539.55, 806.05], // la 1re cellule est 0.1 pt plus étroite dans l'original
  fill: COLORS.bgLight,
  border: { color: COLORS.border, width: 1.0 },
  pastille: { diameter: 20.4, dx: 16.50, y: 127.00, letterSize: 8.5 },
  label: { dxSpan: 46.05, top: 139.56, size: 8.5 }, // dx réel = dxSpan + indentation de 2 espaces
  body:  { dx: 7.55, top: 151.45, size: 7, leading: 8.55, color: COLORS.ink },
  slots: [
    { key: 'objectif',  letter: 'O', label: 'OBJECTIF',  color: COLORS.navy  },
    { key: 'prerequis', letter: 'P', label: 'PRÉREQUIS', color: COLORS.cyan  },
    { key: 'resultat',  letter: 'R', label: 'RÉSULTAT',  color: COLORS.green },
  ],
};

/** Grille des cartes d'étape. */
/**
 * Les trois colonnes n'ont pas exactement la même gouttière intérieure dans les
 * fiches d'origine : la carte droite a un retrait gauche de 8.60 et une colonne
 * de texte 1 pt plus étroite que la gauche. Les largeurs sont donc figées par
 * colonne, déduites des coupures de lignes observées :
 *   gauche : 370.38 < W < 370.54   droite : 369.08 < W < 369.73
 *   pleine largeur : 726.45 < W < 771.93
 */
export const GRID = {
  left:  { x0: 19.90, x1: 405.35, padLeft: 8.55, contentWidth: 370.46 },
  right: { x0: 419.50, x1: 805.05, padLeft: 8.60, contentWidth: 369.40 },
  full:  { x0: 19.90, x1: 805.05, padLeft: 8.55, contentWidth: 770.16 },
  gutter: 14.15,
  rowGap: 12.95,
  /** y du haut de la première rangée sur les pages de suite (page 1 : bas de la bande O/P/R + rowGap) */
  topNextPage:  118.60,
  /** un bloc ne doit jamais descendre plus bas que cette limite (bandeau de pied à 558.90) */
  bottomLimit: 548.00,
  stepsPerPage: 2,
};

export const CARD = {
  fill: COLORS.white,
  accent: { color: COLORS.cyan, width: 3.0 },
  border: { color: COLORS.border, width: 1.0 },
  padLeft: 8.55,
  padRight: 6.50,           // largeur de coupure du corps mesurée : 370.38 < W < 370.54
  padBottom: 6.50,

  pastille: { diameter: 25.0, dx: 17.50, dy: 9.42, fill: COLORS.navy, textColor: COLORS.white, size: 9.5 },
  /** La ligne de base du titre est fixe (card.top + 34.44) quel que soit le corps. */
  title:    { dxSpan: 51.60, baselineDy: 34.44, size: 10, color: COLORS.navy },

  /**
   * Carte pleine largeur : la seule occurrence du corpus (DATEC étape 9) compose
   * le titre et le corps un cran plus grand. Repris tel quel — une mesure unique,
   * facile à ramener aux valeurs demi-carte si la règle se révèle fortuite.
   */
  fullWidth: { titleSize: 10.5, bodySize: 8.0, bodyLeading: 9.75, bodyGap: 9.18 },

  /** capture d'écran : cadre fin, image centrée dedans */
  shot: {
    gapAfterTitle: 4.00,
    frameLeft: 8.85,          // décalage depuis card.x0
    frameRight: 11.05,        // retrait depuis card.x1
    imageInsetX: 2.825,       // marge latérale mini entre le cadre et l'image
    maxHeight: 204.10,        // plus grande hauteur d'image observée dans les fiches
    /**
     * Placement horizontal de l'image dans son cadre.
     *   'centre'  — centrée (défaut). Cohérent, et identique à l'original pour
     *               toutes les captures plus étroites que le cadre.
     *   'origine' — reproduit le calage des fiches d'origine : les captures à la
     *               largeur maximale y sont posées à card.x0 + 20.35 et débordent
     *               du filet droit de 5.9 pt. À n'utiliser que pour recomposer
     *               une fiche existante à l'identique.
     */
    align: 'origine',
    legacyIndent: 20.35,
    insetTop: 3.20,
    insetBottom: 2.50,
    border: { color: COLORS.border, width: 0.75 },
  },

  action: {
    gapAfterShot: 14.15,
    gapAfterTitle: 4.00,      // quand il n'y a pas de capture
    label: 'ACTION',
    labelSize: 7,
    labelColor: COLORS.cyan,
    bodyGap: 9.14,            // sommet du label → sommet de la 1re ligne de corps
    bodySize: 7.5,
    bodyLeading: 9.15,
    bodyColor: COLORS.ink,
  },

  link: {
    gapBefore: 2.46,
    label: 'LIEN DIRECT',
    labelSize: 6.5,
    labelColor: COLORS.cyan,
    urlSize: 6.5,
    urlColor: COLORS.navy,
    leading: 8.15,
    gapAfter: 1.40,
  },

  callout: {
    gapBefore: 2.45,          // bas de la ligne précédente → haut du cadre
    gapAfter: 14.65,          // haut du cadre suivant, depuis le bas du cadre
    labelTop: 5.25,           // depuis le haut du cadre
    labelSize: 7,
    bodyGap: 9.15,            // sommet du label → sommet de la 1re ligne
    bodySize: 7,
    bodyLeading: 8.15,
    bodyColor: COLORS.ink,
    heightBase: 18.35,        // hauteur = heightBase + bodyLeading * nbLignes
    left: 9.60,               // décalage du cadre depuis card.x0
    right: 10.30,             // retrait du cadre depuis card.x1
    padText: 6.05,            // retrait du texte depuis le bord du cadre
    accentWidth: 2.25,        // barre gauche
    borderWidth: 1.25,
    styles: {
      info:      { fill: COLORS.bgLight,  stroke: COLORS.cyan, label: COLORS.cyan },
      important: { fill: COLORS.bgAccent, stroke: COLORS.navy, label: COLORS.navy },
    },
  },

  example: {
    gapBefore: 1.97,
    size: 6.5,
    leading: 7.55,
    color: COLORS.slate,
    italic: true,
  },

  outcome: {
    gapBefore: 1.97,
    label: 'RÉSULTAT ATTENDU',
    separator: '  ',
    size: 7,
    leading: 8.15,
    color: COLORS.green,
    align: 'right',
    rightInset: 8.72,         // retrait depuis card.x1
  },

  buttons: {
    gapBefore: 0.05,
    height: 18.95,
    left: 9.10,
    right: 10.80,
    fill: COLORS.bgAccent,
    stroke: COLORS.cyan,
    borderWidth: 1.25,
    textSize: 7.5,
    textColor: COLORS.navy,
    textTop: 6.19,            // depuis le haut du cadre
    underline: 0.40,
  },
};

export const VALIDATION = {
  x0: 19.40, x1: 804.55,
  fill: COLORS.bgAccent,
  border: { color: COLORS.border, width: 1.0 },
  pastille: { diameter: 26.1, dx: 18.00, dy: 8.40, fill: COLORS.green, text: 'OK', textColor: COLORS.white, size: 9.5 },
  title: { text: 'VALIDATION FINALE', dxSpan: 53.25, dy: 25.73, size: 9.5, color: COLORS.navy },
  items: { dx: 51.55, dy: 39.79, size: 7.5, leading: 9.60, color: COLORS.ink, separator: ' | ' },
  heightBase: 47.35,          // hauteur = heightBase + leading * nbLignes
  rightInset: 10.30,
};

export const FOOTER = {
  band: { y0: 558.90, y1: 595.25, fill: COLORS.navy },
  left:  { text: 'OPTIMIUM NC - SUPPORT & OUTILS', x: 28.45, top: 573.44, size: 7.5, color: COLORS.white },
  // NB : dans les PDF de référence les chiffres de « Page n/N » sont en #14213D sur
  // fond #263F8B, donc illisibles (artefact LibreOffice). On compose tout en blanc.
  right: { rightEdge: 813.91, top: 573.44, size: 7.5, color: COLORS.white, separator: ' | ' },
};

/** Ordre canonique des éléments dans une carte (§7.3 du DESIGN_SYSTEM). */
export const CARD_ELEMENT_ORDER = [
  'shot', 'action', 'link', 'callouts', 'example', 'outcome', 'buttons',
];

/**
 * Interlignage entre blocs, mesuré dans les PDF de référence :
 * distance entre le BAS du bloc précédent et le SOMMET du bloc suivant.
 * La valeur ne dépend que du bloc qui précède, jamais de celui qui suit
 * (vérifié sur les 15 pages des fiches v1.0).
 */
export const FLOW_GAP_AFTER = {
  title:   4.00,
  shot:   14.15,
  body:    2.45,
  link:    1.96,
  callout:14.65,
  example: 1.97,
  outcome: 0.05,
};
