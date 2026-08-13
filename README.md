# procedures-gen — générateur de fiches procédure Optimium NC

Produit des fiches procédure PDF à la charte « FICHE PROCÉDURE — SUPPORT & OUTILS »,
à partir d'un formulaire web ou d'un fichier de contenu.

La charte n'est pas réinventée : elle a été **relevée au point près dans les PDF existants**
(`references/`) et figée dans [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md), puis transcrite
littéralement dans [`docs/js/tokens.js`](docs/js/tokens.js) — seule source de vérité du rendu.

---

## Usage courant : la page web

L'interface tourne **entièrement dans le navigateur**. Aucune installation, aucun envoi de
données : les captures d'écran et le PDF ne quittent jamais le poste.

1. ouvrir la page publiée (GitHub Pages, cf. §Déploiement) ;
2. remplir le formulaire : titre, O/P/R, puis une carte par étape ;
3. coller ou glisser les captures d'écran directement dans chaque étape ;
4. **Aperçu** pour contrôler, **Télécharger le PDF** pour récupérer la fiche.

Le brouillon est conservé dans le navigateur : fermer l'onglet ne perd rien.
**Exporter le YAML** enregistre la fiche sous forme de fichier texte, à archiver dans
`content/` pour pouvoir la reprendre ou la régénérer plus tard.

### Ce que contient une étape

| Champ | Obligatoire | Rendu |
|---|---|---|
| Numéro | oui | pastille bleu marine — accepte `1`, `2`… mais aussi `H1`, `L2` pour les branches |
| Titre | oui | titre de carte, 10 pt gras |
| Sous-titre de page | non | remplace le sous-titre du document sur la page où l'étape commence |
| Action | oui | label `ACTION` + corps |
| Lien direct | non | ligne `LIEN DIRECT` + URL cliquable |
| Capture d'écran | non | cadre encadré sous le titre |
| Encarts (0..n) | non | style *info* (cyan) ou *important* (marine), libellé libre |
| Exemple illustré | non | italique gris |
| Résultat attendu | non | ligne verte fer à droite |
| Boutons (0..n) | non | boutons de navigation, lien interne vers une étape ou URL externe |

Les libellés d'encart connus (`ATTENTION`, `POINT D’ARRÊT OBLIGATOIRE`, `NE PAS CONFONDRE`,
`DONNÉES VARIABLES`…) sont proposés en autocomplétion et **choisissent automatiquement leur
style** — dans les fiches d'origine, ces libellés ne sont pas des types graphiques distincts
mais deux styles seulement (cf. `DESIGN_SYSTEM.md` §8).

### Pagination

Automatique : **2 étapes par page**, comme les fiches v1.0. Une étape isolée en fin de
procédure passe en pleine largeur. Le bloc VALIDATION FINALE se pose sous la dernière rangée,
ou sur une page supplémentaire s'il ne tient pas. Si le contenu d'une carte déborde du bas de
page, l'interface le signale explicitement au lieu de tronquer.

---

## Usage par fichier

Une procédure peut aussi s'écrire directement en YAML (voir [`content/datec.yaml`](content/datec.yaml)) :

```yaml
titre: Prise en charge DATEC
sousTitre: Constitution, transmission et traçabilité…
version: "1.0"
date: 30/07/2026
objectif: …
prerequis: …
resultat: …
etapes:
  - numero: 1
    titre: Relever les informations du BI
    capture: { fichier: assets/datec/etape-01.png, largeur: 289.15 }
    action: >-
      Dans CopyPark, ouvrir le BI concerné…
    encarts:
      - style: important
        label: POINT D’ARRÊT OBLIGATOIRE
        texte: Ne pas calculer le prix tant que la PR n'est pas reçue.
    exemple: "Exemple illustré : les valeurs visibles correspondent au BI n° 206596."
    resultat: Les informations techniques sont réunies.
    boutons:
      - texte: CONTINUER VERS LA DEMANDE D’ACHAT
        cible: 3
validation:
  actif: true
  lignes:                       # une entrée = une ligne imprimée
    - Garantie contrôlée | Modèle vérifié | Référence relevée
```

Le champ `capture.largeur` (en points) est facultatif : sans lui, la capture occupe toute la
largeur du cadre. `capture.fichier` est résolu relativement au fichier YAML.

Génération :

```bash
npm install
npx playwright install chromium      # une seule fois
node tools/render.mjs content/datec.yaml output/datec.pdf
```

`tools/render.mjs` pilote **le code de la page web** dans Chromium : il n'existe qu'un seul
moteur de rendu, la ligne de commande ne peut donc pas diverger de ce que voit l'utilisateur.

Pour travailler en local sur l'interface : `npm run serve` puis <http://localhost:8080/docs/index.html>.

---

## Contrôle de fidélité

La contrainte du projet est que le rendu soit indiscernable des fiches existantes. C'est
vérifiable à tout moment :

```bash
npm run compare
```

régénère `content/datec.yaml` — reconstitution complète de `PROCEDURE_PRISE_EN_CHARGE_DATEC.pdf`
— et la compare page par page à l'original : proportion de pixels divergents, écart moyen, et
une image de contrôle par page dans `output/diff/` (différences en rouge sur l'original atténué).

État actuel :

| Contrôle | Résultat |
|---|---|
| Nombre de pages | identique (5) |
| Texte et **coupures de lignes** | identiques, ligne à ligne |
| Géométrie (cartes, cadres, bandes, bloc final) | identique à 0.1 pt près |
| Pixels divergents, seuil strict | 2.4 – 3.6 % selon la page |
| Pixels divergents, différences franches seulement | 0.5 – 0.8 % |

Le résidu tient à trois choses, toutes attendues : l'anticrénelage, la dérive d'espacement
intra-ligne de LibreOffice (qui compose le texte légèrement différemment à corps égal), et les
deux écarts volontaires ci-dessous.

### Écarts volontaires par rapport aux fiches d'origine

1. **Pagination du pied de page.** Dans les deux fiches v1.0, les chiffres de « Page n/N » sont
   composés en `#14213D` sur le bandeau `#263F8B` — texte bleu nuit sur bleu marine, illisible
   (seul le `/` apparaît). C'est un artefact de champ automatique LibreOffice. Le générateur
   compose la ligne entière en blanc.
2. **Pastilles vectorielles.** Les pastilles O/P/R, les numéros d'étape et le `OK` du bloc final
   sont des images bitmap dans les fiches d'origine ; ils sont ici tracés en vectoriel (cercle +
   texte). Rendu identique à l'œil, net à l'impression et à n'importe quel zoom.

Le logo et le badge « FICHE PROCÉDURE », eux, restent les **bitmaps d'origine** : le badge est
composé dans une police plus étroite que DejaVu, le redessiner l'aurait fait diverger.

### Calage des captures d'écran

Les fiches d'origine centrent les captures dans leur cadre, **sauf** celles à la largeur
maximale, posées 8.75 pt plus à droite et débordant du filet de 5.9 pt. Le générateur reproduit
ce calage par défaut (`CARD.shot.align: 'origine'` dans `tokens.js`) pour rester fidèle.
Passer le jeton à `'centre'` centre toutes les captures — plus propre pour de nouvelles fiches,
au prix d'un décalage visible si on compare avec une fiche ancienne.

---

## Remplacer le logo par un fichier source

Le logo livré est extrait des PDF (JPEG 681 × 194), un peu juste pour l'impression. Déposer un
fichier source dans `docs/assets/` sous l'un de ces noms le fait prendre automatiquement, par
ordre de préférence :

```
docs/assets/logo_optimium_nc.svg     ← rastérisé à la volée par le navigateur
docs/assets/logo_optimium_nc.png
docs/assets/logo_optimium_nc.jpeg    ← extraction actuelle
```

---

## Arborescence

```
DESIGN_SYSTEM.md         charte relevée dans les PDF de référence — le contrat
references/              les fiches PDF d'origine, intactes
assets/                  logo et badge extraits des PDF (sources)
docs/                    la page web — c'est aussi la racine publiée sur GitHub Pages
  index.html             formulaire + aperçu
  css/app.css
  js/tokens.js           TOUTES les cotes et couleurs de la charte
  js/layout.js           mesure, coupure de lignes, hauteurs, pagination
  js/renderer.js         tracé du PDF (pdf-lib)
  js/schema.js           modèle de données, YAML, résolution des images
  js/app.js              interface
  js/vendor/             pdf-lib, fontkit, js-yaml (aucun CDN)
  fonts/                 DejaVu Sans Book / Bold / Oblique
  assets/                logo et badge servis à la page
content/                 une procédure = un YAML (+ ses captures)
tools/render.mjs         génération hors navigateur
tools/compare.py         comparaison visuelle avec une fiche de référence
tools/serve.mjs          serveur statique local
output/                  PDF générés et images de différence (non versionnés)
```

---

## Déploiement

`.github/workflows/pages.yml` publie `docs/` sur GitHub Pages à chaque push sur `main`.
Il faut l'activer une fois : **Settings → Pages → Source : GitHub Actions**.

`.github/workflows/pdf.yml` régénère un PDF par fichier de `content/` à chaque push, rejoue la
comparaison de fidélité et publie le tout en artefacts de build.

---

## Notes

- Tout est hors-ligne : polices et bibliothèques sont versionnées dans le dépôt, aucune requête
  vers un CDN. La page fonctionne donc aussi depuis un partage réseau ou un poste sans internet.
- `references/PROCEDURE_ECHANGE_MATERIEL.pdf` ne fait que 2 octets — l'upload a échoué. Il n'a
  pas pu être analysé ; la charte repose sur les trois autres fiches. S'il est repoussé, il
  faudra vérifier qu'il n'introduit aucun élément de charte inédit.
