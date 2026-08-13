# DESIGN SYSTEM — Fiche procédure Optimium NC

Charte extraite par rétro-ingénierie des PDF de `references/`.
Toutes les valeurs sont mesurées dans le PDF (unités **points PostScript**, 1 pt = 1/72").
Aucune valeur n'est estimée à l'œil : couleurs relevées au pixel, géométrie relevée sur les
objets vectoriels et les boîtes de texte.

---

## 0. Corpus analysé

| Fichier | Pages | Producteur | Version fiche | Statut |
|---|---|---|---|---|
| `PROCEDURE_DEMANDE_DE_DEVIS.pdf` | 8 | LibreOffice Writer | 1.0 — 04/08/2026 | **Référence canonique** |
| `PROCEDURE_PRISE_EN_CHARGE_DATEC.pdf` | 5 | LibreOffice Writer | 1.0 — 30/07/2026 | **Référence canonique** |
| `Retrouver_information_machine_via_Copypark.pdf` | 2 | ReportLab | 3.0 — 15/07/2026 | Itération antérieure (cf. §12) |
| `PROCEDURE_ECHANGE_MATERIEL.pdf` | — | — | — | ⚠️ **Fichier vide (2 octets)** — non analysable |

> ⚠️ `PROCEDURE_ECHANGE_MATERIEL.pdf` ne contient que `\r\n` : l'upload a échoué.
> La charte ci-dessous est établie sur les 3 autres. Il faudra le re-pousser pour confirmer
> qu'il n'introduit aucun élément de charte inédit.

La charte de référence est celle des **deux fiches v1.0** (Devis + DATEC), rigoureusement
identiques entre elles. Le PDF Copypark est une génération antérieure de la même identité
(même palette exacte, mêmes blocs) mais avec des proportions et un jeu d'encarts plus pauvre :
il est documenté à part en §12 et **ne doit pas servir de cible**.

---

## 1. Page

| Propriété | Valeur |
|---|---|
| Format | **A4 paysage** — 841.89 × 595.28 pt (297 × 210 mm) |
| Fond | `#FFFFFF` |
| Marge gauche (bord des cartes) | x = **19.90** |
| Marge droite (bord des cartes) | x = **805.05** |
| Largeur utile grille | **785.15** pt |
| Filet d'en-tête | x 28.40 → 813.55 |
| Bandeau de pied | y 558.90 → 595.25, pleine largeur |

Deux gabarits de page :

* **Page 1** — en-tête + titre 20 pt + sous-titre + bande O/P/R + cartes d'étape à partir de y = 195.10
* **Pages suivantes** — en-tête + titre 17.5 pt + sous-titre + cartes d'étape à partir de y = 118.60

---

## 2. Palette

| Rôle | Hex | Usage |
|---|---|---|
| **Bleu marine (primaire)** | `#263F8B` | Bandeau de pied, badge d'en-tête, titre H1, titres d'étape, pastilles n° d'étape, pastille O, label OBJECTIF, encarts « important » (bordure + label), texte des boutons, label VALIDATION FINALE |
| **Bleu clair (secondaire)** | `#159FD0` | Filet d'en-tête, filet supérieur des cartes, label ACTION, label PRÉREQUIS, pastille P, encarts « info » (bordure + label), liens hypertexte, bordure des boutons |
| **Vert (validation)** | `#178653` | Pastille R, label RÉSULTAT, ligne RÉSULTAT ATTENDU, pastille OK de VALIDATION FINALE |
| **Encre corps de texte** | `#14213D` | Tout le texte courant |
| **Gris-bleu secondaire** | `#5A6A80` | Sous-titre de page, exemples en italique |
| **Fond bloc clair** | `#F5F8FC` | Fond des cellules O/P/R, fond des encarts « info » |
| **Fond bloc accentué** | `#EAF4FA` | Fond des encarts « important », fond des boutons, fond du bloc VALIDATION FINALE |
| **Bordure neutre** | `#CBD9E8` | Contours de cartes, cellules O/P/R, cadres de captures, contour VALIDATION FINALE |
| **Blanc** | `#FFFFFF` | Fond des cartes, texte sur bandeau/badge/pastilles |

Aucune autre couleur n'apparaît dans la charte (hors captures d'écran incrustées).

---

## 3. Typographie

Famille unique : **DejaVu Sans** (Book / Bold / Oblique). Aucune autre police n'est
embarquée dans les fiches de référence.

| Élément | Police | Corps | Couleur | Notes |
|---|---|---|---|---|
| Titre H1 — page 1 | Bold | **20** | `#263F8B` | x 28.45, sommet y 79.34 |
| Titre H1 — pages suivantes | Bold | **17.5** | `#263F8B` | x 28.45, sommet y 79.36 |
| Sous-titre de page | Book | **8.5** | `#5A6A80` | sommet y 104.66 (p.1) / 101.71 (suites) |
| Label O / P / R | Bold | **8.5** | couleur du bloc | |
| Corps O / P / R | Book | **7** | `#14213D` | interligne 8.55 |
| Titre d'étape | Bold | **10** | `#263F8B` | |
| Label `ACTION` | Bold | **7** | `#159FD0` | toujours en capitales |
| Corps d'étape | Book | **7.5** | `#14213D` | interligne 9.15 |
| Label d'encart | Bold | **7** | `#159FD0` (info) / `#263F8B` (important) | capitales |
| Corps d'encart | Book | **7** | `#14213D` | interligne 8.15 |
| Exemple illustré | **Oblique** | **6.5** | `#5A6A80` | interligne 7.55 |
| Ligne RÉSULTAT ATTENDU | Bold | **7** | `#178653` | fer à droite |
| Label `LIEN DIRECT` | Bold | **6.5** | `#159FD0` | suivi de l'URL en Book 6.5 `#263F8B` |
| Lien inline | Book | 7 ou 8 | `#159FD0` | souligné, filet 0.4 pt |
| Texte de bouton | Bold | **7.5** | `#263F8B` | capitales, centré, souligné (filet 0.4 pt) |
| Titre VALIDATION FINALE | Bold | **9.5** | `#263F8B` | |
| Items VALIDATION FINALE | Book | **7.5** | `#14213D` | interligne 9.6 |
| Pied de page | Book | **7.5** | `#FFFFFF` | |
| Badge « FICHE PROCÉDURE » | Bold | **11.5** | `#FFFFFF` | |
| Badge « SUPPORT & OUTILS » | Book | **7.7** | `#FFFFFF` | |

---

## 4. Bandeau d'en-tête

Présent à l'identique sur **toutes** les pages.

```
  x=37.40                                                      x=634.45
  ┌────────────────────┐                            ┌────────────────────────┐
  │  logo Optimium NC  │                            │   FICHE PROCÉDURE      │  y 18.35
  │  164.40 × 46.75    │                            │   SUPPORT & OUTILS     │  → 60.85
  └────────────────────┘                            └────────────────────────┘
  ──────────────────────────────────────────────────────────────────────────── y=77.15
  x=28.40                                                            x=813.55   #159FD0, 2.25 pt
```

**Logo** — image bitmap 681 × 194 px, posée en 164.40 × 46.75 pt à (37.40, 18.35).
Le lettrage « optimium », la baseline « SOLUTIONS, SERVICES, / INFOGERANCE INFORMATIQUE »
**et le suffixe « NC »** sont contenus dans le même fichier image : c'est un asset unique,
il n'y a pas de bloc « NC » composé séparément.

> Exception : dans la variante Copypark (§11) le « NC » est du texte composé
> (DejaVu Sans Bold 11 pt `#159FD0`, à droite de la baseline). Le rendu final est identique.

**Badge** — image bitmap 709 × 177 px, posée en 170.10 × 42.50 pt à (634.45, 18.35).
Rectangle à coins arrondis plein `#263F8B`, deux lignes centrées :
`FICHE PROCÉDURE` (Bold 11.5, blanc) puis `SUPPORT & OUTILS` (Book 7.7, blanc).
En vectoriel (variante Copypark) : rayon d'arrondi ≈ 10 pt.

---

## 5. Zone titre

```
Demande de devis                                    ← Bold 20 (p.1) / 17.5 (suites), #263F8B
Identification de la pièce, chiffrage, création…    ← Book 8.5, #5A6A80
```

* x = **28.45** pour les deux lignes.
* Le **titre est identique sur toutes les pages** (nom de la procédure).
* Le **sous-titre change à chaque page** : il décrit la phase couverte par la page.
  Ex. sur la fiche Devis : « Parcours commun — création et préparation de la demande d'achat »,
  « Transmission de la demande et réception de la PR », « Parcours HP — exemple illustré… ».
  C'est donc un champ **par page**, pas un champ du document.

---

## 6. Bande O / P / R (page 1 uniquement)

```
 y=120.60 ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
          │ (O)  OBJECTIF     │   │ (P)  PRÉREQUIS    │   │ (R)  RÉSULTAT     │
          │ texte…            │   │ texte…            │   │ texte…            │
 y=182.15 └───────────────────┘   └───────────────────┘   └───────────────────┘
          x 20.90 → 273.05        x 287.30 → 539.55        x 553.80 → 806.05
```

| Propriété | Valeur |
|---|---|
| Hauteur du bloc | 61.55 pt (y 120.60 → 182.15) — **fixe** |
| Largeur d'une cellule | 252.15 pt |
| Gouttière | 14.15 pt |
| Fond | `#F5F8FC` |
| Bordure | `#CBD9E8`, 1.0 pt |
| Pastille | cercle Ø **20.4** pt à (cellule.x0 + 16.50, 127.00) |
| Couleur pastille | O `#263F8B` · P `#159FD0` · R `#178653` |
| Lettre de pastille | Bold 8.5, blanc, centrée |
| Label | Bold 8.5, sommet y 139.56, x ≈ cellule.x0 + 46 |
| Couleur label | OBJECTIF `#263F8B` · PRÉREQUIS `#159FD0` · RÉSULTAT `#178653` |
| Corps | Book 7 `#14213D`, x = cellule.x0 + 7.55, 1re ligne y 151.45, interligne 8.55 |
| Capacité | 3 lignes de corps max dans la hauteur fixe |

Les liens présents dans le corps (ex. « HP PartSurfer », « Lenovo Support ») sont en
`#159FD0` soulignés (filet 0.4 pt).

---

## 7. Carte d'étape

### 7.1 Grille

| Cas | x0 | x1 | Largeur |
|---|---|---|---|
| Carte gauche | 19.90 | 405.35 | 385.45 |
| Carte droite | 419.50 | 805.05 | 385.55 |
| Carte pleine largeur (étape orpheline en fin de fiche) | 19.90 | 805.05 | 785.15 |

* Gouttière horizontale : **14.15 pt**
* Espacement vertical sous une rangée : **12.95 pt** (mesuré bas de carte → haut du bloc
  suivant : 402.15 → 415.10 sur Devis p.6, 320.95 → 333.90 sur DATEC p.5). Aucune page v1.0
  ne comporte deux rangées de cartes, cette valeur est donc extrapolée depuis l'espacement
  carte → bloc VALIDATION FINALE (la variante Copypark utilise 10.00 pt entre deux rangées).
* **2 cartes par rangée.** Le nombre de rangées par page dépend de la hauteur des cartes :
  les fiches v1.0 tiennent **1 rangée (= 2 étapes) par page**, la variante Copypark en tient 2.
* **Les deux cartes d'une même rangée ont la même hauteur** (hauteur = max des deux),
  calée sur le contenu le plus long.
* Une étape isolée en fin de procédure occupe **toute la largeur** (cf. DATEC étape 9).

### 7.2 Habillage

| Propriété | Valeur |
|---|---|
| Fond | `#FFFFFF` |
| Filet supérieur (accent) | `#159FD0`, **3.0 pt**, pleine largeur de la carte |
| Bordures gauche / droite / bas | `#CBD9E8`, 1.0 pt |
| Coins | droits (carrés) |

### 7.3 Anatomie interne

```
┌═══════════════════════════════════════════════┐  ← filet 3 pt #159FD0
│                                               │
│   (1)     Ouvrir le BI et relever les données │  ← pastille + titre 10 pt
│                                               │
│   ┌───────────────────────────────────────┐   │
│   │            capture d'écran            │   │  ← cadre 0.75 pt #CBD9E8
│   └───────────────────────────────────────┘   │
│                                               │
│   ACTION                                      │  ← Bold 7 #159FD0
│   Ouvrir le BI concerné dans CopyPark…        │  ← Book 7.5 #14213D
│                                               │
│  ▌ DONNÉES VARIABLES                          │  ← encart (0..n)
│  ▌ BI • client • marque/modèle • n° série…    │
│                                               │
│   Exemple illustré : les informations…        │  ← Oblique 6.5 #5A6A80
│         RÉSULTAT ATTENDU  Les données…        │  ← Bold 7 #178653, fer à droite
└───────────────────────────────────────────────┘
```

Ordre des éléments — **strictement celui-ci**, chacun optionnel sauf `ACTION` :

1. **Pastille + titre d'étape** (obligatoire)
2. **Capture d'écran** (optionnelle)
3. **Label `ACTION` + corps** (obligatoire)
4. **Ligne `LIEN DIRECT` + URL** (optionnelle)
5. **Encart(s)** — 0, 1 ou 2 (cf. §8)
6. **Exemple illustré** en italique (optionnel)
7. **Ligne `RÉSULTAT ATTENDU`** (optionnelle en pratique, présente partout sauf Copypark)
8. **Bouton(s)** de navigation (optionnels, cf. §9)

> Dans DATEC étape 4 et Devis étape H2, l'exemple italique est placé **entre** le corps
> et le RÉSULTAT ATTENDU, même quand un encart précède : l'ordre ci-dessus est respecté
> dans les 3 fiches sans exception.

### 7.4 Métriques internes

| Élément | Valeur |
|---|---|
| Pastille n° d'étape | cercle Ø **25.0** pt à (carte.x0 + 17.50, carte.y0 + 9.40) |
| Couleur pastille | `#263F8B`, numéro en Bold blanc (≈ 9.5 pt) |
| Le « numéro » peut être alphanumérique | `1`…`12`, mais aussi `H1`, `H2`, `L1`, `L2` (branches) |
| Titre d'étape | Bold 10 `#263F8B`, x = carte.x0 + **51.60**, sommet = carte.y0 + **25.12** |
| Padding gauche du contenu | **8.55** pt (texte à carte.x0 + 8.55) |
| Padding droit du contenu | **10.30** pt |
| Cadre de capture | bordure `#CBD9E8` **0.75** pt ; largeur image 360 pt (demi-carte), 759.70 pt (pleine largeur) |
| Interligne corps | 9.15 pt |
| `RÉSULTAT ATTENDU` | fer à **droite** ; label et texte tous deux en Bold 7 `#178653`, séparés par 2 espaces ; passe à la ligne si trop long (toujours fer à droite) |

---

## 8. Encarts

**Deux styles seulement** — le libellé, lui, est libre.

### 8.1 Style « info » (bleu clair)

| Propriété | Valeur |
|---|---|
| Fond | `#F5F8FC` |
| Bordure haut / bas / droite | `#159FD0`, **1.25** pt |
| Barre d'accent gauche | `#159FD0`, **2.25** pt |
| Label | Bold 7 `#159FD0` |
| Corps | Book 7 `#14213D` |
| Padding interne | 6.05 pt à gauche, ~2.4 pt en haut |
| Hauteur | 26.45 pt pour 1 ligne de corps, 34.65 pt pour 2 |

Libellés observés : `DONNÉES VARIABLES`, `DESTINATAIRE`, `CHAMPS À RENSEIGNER`,
`VALEUR FIXE / DONNÉES VARIABLES`.

### 8.2 Style « important » (bleu marine)

| Propriété | Valeur |
|---|---|
| Fond | `#EAF4FA` |
| Bordure haut / bas / droite | `#263F8B`, **1.25** pt |
| Barre d'accent gauche | `#263F8B`, **2.25** pt |
| Label | Bold 7 `#263F8B` |
| Corps | Book 7 `#14213D` |

Libellés observés : `ATTENTION AU PN`, `POINT D'ARRÊT OBLIGATOIRE`, `POINT D'ATTENTE`,
`NE PAS CONFONDRE`, `PARCOURS INTERACTIF`, `CONTRÔLE OBLIGATOIRE — COLONNE TOUT À GAUCHE`,
`ORDRE DANS DÉSIGNATION`, `VALEURS OBLIGATOIRES`.

> **Conclusion de charte :** il n'existe pas un style graphique par type d'encart.
> `ATTENTION`, `POINT D'ARRÊT`, `NE PAS CONFONDRE` et `PARCOURS INTERACTIF` partagent
> tous le style « important ». Le générateur doit donc exposer `style: info | important`
> + un `label` libre, et non une liste fermée de types.

Le corps d'encart utilise fréquemment ` | ` ou ` • ` comme séparateur d'items sur une seule
ligne (ex. `Affaire : SAVINFO | REFERENCE_M : n° BI – client | Référence : …`).

---

## 9. Boutons de navigation

Utilisés pour les embranchements (`PARCOURS INTERACTIF`) et les retours de branche.

| Propriété | Valeur |
|---|---|
| Fond | `#EAF4FA` |
| Bordure | `#159FD0`, 1.25 pt (barre gauche 1.25 également, pas d'accent renforcé) |
| Hauteur | **18.95** pt |
| Texte | Bold 7.5 `#263F8B`, capitales, **centré**, souligné (filet 0.4 pt) |
| Disposition | 1 bouton pleine largeur du contenu, ou **2 boutons accolés** partageant la largeur (182.75 + 182.85, sans gouttière — filet vertical commun) |

Exemples : `HP — OUVRIR LA RECHERCHE` / `LENOVO — OUVRIR LA RECHERCHE` (2 boutons, étape 2),
`CONTINUER VERS LA DEMANDE D'ACHAT` (1 bouton, fin des branches H2 et L2).

Dans les PDF de référence ces boutons sont des **liens internes** vers la page de la branche.

---

## 10. Bloc VALIDATION FINALE

Toujours en **dernier bloc du document**, sous la dernière rangée de cartes.

```
 y0 ┌──────────────────────────────────────────────────────────────────────────┐
    │  (OK)   VALIDATION FINALE                                                │
    │         Garantie HP contrôlée | Modèle, série et produit vérifiés | …    │
    │         Diagnostic rédigé en anglais | Document DATEC complété | …       │
 y1 └──────────────────────────────────────────────────────────────────────────┘
    x 19.40 → 804.55
```

| Propriété | Valeur |
|---|---|
| Emprise | x 19.40 → 804.55 (785.15 pt), pleine largeur |
| Fond | `#EAF4FA` |
| Bordure | `#CBD9E8`, 1.0 pt (pas de filet d'accent supérieur) |
| Pastille | cercle Ø **26.1** pt à (bloc.x0 + 18.00, bloc.y0 + 8.40), fond `#178653` |
| Texte pastille | `OK`, Bold blanc |
| Titre | `VALIDATION FINALE`, Bold 9.5 `#263F8B`, x = bloc.x0 + 53.25, sommet = bloc.y0 + 25.73 |
| Items | Book 7.5 `#14213D`, x = bloc.x0 + 51.55, 1re ligne à bloc.y0 + 39.79, interligne **9.6** |
| Séparateur d'items | ` | ` (espace, barre verticale, espace) |
| Retour à la ligne | les items sont répartis sur plusieurs lignes ; **une ligne ne se termine jamais par un séparateur** |
| Hauteur | 85.75 pt pour 4 lignes (Devis), 76.15 pt pour 3 lignes (DATEC) → ≈ 47.0 + 9.6 × n_lignes |

Les items sont des **reformulations condensées** des `RÉSULTAT ATTENDU`, pas leur copie
littérale (ex. « Le devis est calculé… » → « Devis PDF envoyé »). Ils ne peuvent donc pas
être dérivés automatiquement : c'est un champ saisi.

---

## 11. Pied de page

```
 y=558.90 ████████████████████████████████████████████████████████████████████████
          OPTIMIUM NC - SUPPORT & OUTILS        Version 1.0 | 04/08/2026 | Page 1/8
 y=595.25 ████████████████████████████████████████████████████████████████████████
```

| Propriété | Valeur |
|---|---|
| Bandeau | y 558.90 → 595.25 (h 36.35), **pleine largeur de page**, fond `#263F8B` |
| Texte gauche | `OPTIMIUM NC - SUPPORT & OUTILS`, Book 7.5 `#FFFFFF`, x 28.45, sommet y 573.44 |
| Texte droit | `Version X.X | JJ/MM/AAAA | Page n/N`, Book 7.5 `#FFFFFF`, **fer à droite** sur x = 813.91 |
| Séparateur | ` | ` |

> 🐞 **Défaut à corriger dans le générateur.** Dans les deux fiches v1.0, les chiffres
> `n` et `N` de « Page n/N » sont composés en **8.5 pt `#14213D`** (bleu nuit) — soit du
> texte sombre sur fond bleu marine, quasi illisible (visible sur toutes les pages :
> « Page 1/8 » n'affiche que le `/`). C'est un artefact de champ automatique LibreOffice.
> La variante Copypark compose la ligne entière en blanc 7.2 pt, ce qui est correct.
> **Le générateur doit tout composer en `#FFFFFF` 7.5 pt.**

---

## 12. Variante antérieure — fiche Copypark v3.0

Documentée pour mémoire ; **non retenue comme cible**. Même palette, mêmes blocs, mais :

| Point | v1.0 (cible) | v3.0 Copypark |
|---|---|---|
| Marges grille | 19.90 → 805.05 | 28.00 → 813.89 |
| Coins des cartes / cellules | droits | **arrondis** (rayon ≈ 6 pt) |
| Filet d'accent de carte | ligne 3.0 pt | **bandeau plein 5 pt** |
| Bordure de carte | 1.0 pt | 0.85 pt |
| Filet d'en-tête | 2.25 pt | 1.2 pt |
| Badge | image bitmap | rectangle vectoriel arrondi (r ≈ 10) |
| Pastilles | images bitmap | cercles vectoriels |
| Étapes par page | 2 (1 rangée) | **4 (2 rangées)** |
| Titre d'étape | 10 pt | 9.2 pt |
| Corps d'étape | 7.5 pt | 7.05 pt |
| Label ACTION | 7 pt | 6.8 pt (parfois `ACTION À EFFECTUER`) |
| Résultat attendu | préfixé `RÉSULTAT ATTENDU`, 7 pt | **sans préfixe**, 6.5 pt |
| Encarts | 2 styles | **aucun** |
| Boutons | oui | aucun |
| Bandeau de pied | y 558.90, h 36.35 | y 568.28, h 27.00 |
| Accents dans les labels | `PRÉREQUIS`, `RÉSULTAT` | `PREREQUIS`, `RESULTAT` (non accentués) |

Le sens de l'évolution v3.0 → v1.0 est net : densité par page réduite (4 → 2 étapes),
typographie agrandie, ajout des encarts, des boutons et du préfixe `RÉSULTAT ATTENDU`.
Le générateur cible la v1.0.

---

## 13. Règles de composition à respecter

1. **Fond de page blanc**, aucune bordure de page.
2. Un **filet bleu clair 3 pt** ouvre chaque carte d'étape : c'est la signature visuelle forte.
3. **Deux cartes par rangée**, hauteurs égalisées, gouttière 14.15 pt.
4. La **dernière étape seule** passe en pleine largeur.
5. Le **bloc VALIDATION FINALE** ferme le document, jamais isolé sur une page vide.
6. **Aucun texte ne déborde d'une carte** : le corps est justifié à gauche, la césure est
   naturelle (pas de coupure de mots dans les références).
7. Les **captures d'écran** sont toujours encadrées d'un filet fin `#CBD9E8` 0.75 pt et
   calées en haut de la carte, juste sous le titre.
8. La **ligne RÉSULTAT ATTENDU est fer à droite** et verte : elle clôt visuellement la carte.
9. L'**en-tête et le pied sont invariants** sur toutes les pages ; seuls le corps du titre
   (20 → 17.5 pt) et le sous-titre changent.
10. Les **accents sont composés en capitales accentuées** (`PRÉREQUIS`, `RÉSULTAT ATTENDU`,
    `POINT D'ARRÊT OBLIGATOIRE`, `CONTRÔLE OBLIGATOIRE`) — jamais dépouillés.
11. L'apostrophe utilisée est la **typographique `’`**, les guillemets sont les
    **chevrons français `« »` avec espaces insécables**.
