#!/usr/bin/env python3
"""
compare.py — comparaison visuelle d'un PDF généré avec un PDF de référence.

Rend les deux fichiers page par page, produit une image de différence et
un rapport chiffré (proportion de pixels divergents, écart moyen).
C'est l'outil de contrôle exigé par la contrainte de fidélité : aucune
itération n'est terminée tant que le rapport n'a pas été relu.

    python3 tools/compare.py output/datec.pdf references/PROCEDURE_PRISE_EN_CHARGE_DATEC.pdf

Options :
    --dpi N        résolution de rendu (défaut 110)
    --out DIR      dossier des images (défaut output/diff)
    --threshold N  écart par canal au-delà duquel un pixel compte comme différent (défaut 24)
"""

from __future__ import annotations

import argparse
import pathlib
import sys

import pymupdf
import numpy as np


def render(path: pathlib.Path, dpi: int) -> list[np.ndarray]:
    doc = pymupdf.open(path)
    pages = []
    for page in doc:
        pix = page.get_pixmap(dpi=dpi)
        arr = np.frombuffer(pix.samples, dtype=np.uint8)
        pages.append(arr.reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(np.int16))
    return pages


def pad_to(a: np.ndarray, shape: tuple[int, int]) -> np.ndarray:
    out = np.full((*shape, 3), 255, dtype=np.int16)
    out[: a.shape[0], : a.shape[1]] = a[: shape[0], : shape[1]]
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("generated", type=pathlib.Path)
    parser.add_argument("reference", type=pathlib.Path)
    parser.add_argument("--dpi", type=int, default=110)
    parser.add_argument("--out", type=pathlib.Path, default=pathlib.Path("output/diff"))
    parser.add_argument("--threshold", type=int, default=24)
    args = parser.parse_args()

    left = render(args.generated, args.dpi)
    right = render(args.reference, args.dpi)
    args.out.mkdir(parents=True, exist_ok=True)

    print(f"généré   : {args.generated}  ({len(left)} pages)")
    print(f"référence: {args.reference}  ({len(right)} pages)")
    if len(left) != len(right):
        print(f"!! nombre de pages différent : {len(left)} vs {len(right)}")

    print()
    print(f"{'page':>5} {'pixels différents':>18} {'écart moyen':>12}")
    print("-" * 38)

    worst = 0.0
    for i in range(max(len(left), len(right))):
        a = left[i] if i < len(left) else np.full_like(right[i], 255)
        b = right[i] if i < len(right) else np.full_like(left[i], 255)
        shape = (max(a.shape[0], b.shape[0]), max(a.shape[1], b.shape[1]))
        a, b = pad_to(a, shape), pad_to(b, shape)

        delta = np.abs(a - b)
        mask = delta.max(axis=2) > args.threshold
        ratio = mask.mean() * 100
        worst = max(worst, ratio)
        print(f"{i + 1:>5} {ratio:>17.2f}% {delta.mean():>11.2f}")

        # Image de contrôle : original en fond atténué, différences en rouge.
        canvas = (b * 0.35 + 255 * 0.65).astype(np.uint8)
        canvas[mask] = (220, 20, 60)
        pymupdf.Pixmap(
            pymupdf.csRGB, shape[1], shape[0], canvas.tobytes(), False
        ).save(args.out / f"diff_p{i + 1}.png")

    print("-" * 38)
    print(f"pire page : {worst:.2f}% de pixels différents")
    print(f"images de contrôle : {args.out}/diff_p*.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
