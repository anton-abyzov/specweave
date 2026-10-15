#!/usr/bin/env python3
"""Write every SpecWeave/SpecWithCode logo file from one master SVG.

Master: scripts/brand/specwithcode-logo.svg (the indigo tile with the spec page and
prompt, the same file as assets/prod/logo.svg in specweave-studio). Change the master
and rerun `python3 scripts/brand/export-icons.py`; do not edit the outputs by hand.
Needs rsvg-convert and Pillow.
"""
import io
import re
import shutil
import subprocess
import urllib.parse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "scripts/brand/specwithcode-logo.svg"
TILE = "#5B6CFF"


def render(size: int, full_bleed: bool = False) -> Image.Image:
    svg = MASTER.read_text()
    if full_bleed:
        # Apple and Android mask touch icons themselves, so fill the tile's corners.
        svg = re.sub(r'rx="[^"]*"', 'rx="0"', svg, count=1)
    png = subprocess.run(
        ["rsvg-convert", "-w", str(size), "-h", str(size)],
        input=svg.encode(), capture_output=True, check=True,
    ).stdout
    return Image.open(io.BytesIO(png)).convert("RGBA")


def save_png(image: Image.Image, rel: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


def main() -> None:
    site = "docs-site/static"
    for rel in (f"{site}/img/logo.svg", f"{site}/img/logo-dark.svg", "contrib/subscription-switch/public/mark.svg"):
        shutil.copyfile(MASTER, ROOT / rel)

    for size in (16, 32, 48):
        save_png(render(size), f"{site}/favicon-{size}x{size}.png")
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    render(256).save(ROOT / f"{site}/favicon.ico", sizes=ico_sizes)
    save_png(render(180, full_bleed=True), f"{site}/apple-touch-icon.png")
    save_png(render(192, full_bleed=True), f"{site}/img/favicon-192x192.png")
    save_png(render(512, full_bleed=True), f"{site}/img/favicon-512x512.png")
    save_png(render(256), f"{site}/img/studio/specwithcode-icon.png")

    # The local dashboard has no public dir; its favicon is the master inlined in index.html.
    dashboard = ROOT / "src/dashboard/client/index.html"
    data_uri = "data:image/svg+xml," + urllib.parse.quote(MASTER.read_text().strip().replace('"', "'"), safe=" =:/'")
    html = re.sub(
        r'<link rel="icon"[^\n]*',
        lambda _: f'<link rel="icon" type="image/svg+xml" href="{data_uri}" />',
        dashboard.read_text(), count=1,
    )
    dashboard.write_text(html)


if __name__ == "__main__":
    main()
