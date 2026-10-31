"""Shared helpers of the render scripts: compile a Markdown file with the engine (formatex-typ) to SVG or PNG, and crop an SVG page."""
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ENGINE = ROOT.parent / "formatex-typ"
TMP = ENGINE / ".tags-tmp"
PAD = 10  # points of page color around the content


def compile_page(source: Path, out: Path, lang: str, fmt: str, theme: str = "midnight", feel: str = "standard", pages: str | None = "1", ppi: int = 144):
    """Compiles `source` (a file under the engine's folder) with the page of a phone, to `out` (which may hold `{p}` for several pages)."""
    fonts = [ENGINE / "fonts", ENGINE.parent / "formatex-app" / "fonts"]
    args = [
        "typst", "compile", "main.typ", str(out), "--format", fmt,
        "--input", f"theme={theme}", "--input", f"feel={feel}", "--input", f"source={source.relative_to(ENGINE).as_posix()}",
        "--input", "cover=false", "--input", "page=mobile", "--input", f"dir={'rtl' if lang == 'fa' else 'ltr'}",
    ]
    if pages:
        args += ["--pages", pages]
    if fmt == "png":
        args += ["--ppi", str(ppi)]
    for font in fonts:
        if font.exists():
            args += ["--font-path", str(font)]
    result = subprocess.run(args, cwd=ENGINE, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"typst failed for {source.name}:\n{result.stderr}")


def content_rows(png: Path, ppi: int = 144):
    """First and last row (in points) of the body that differ from the page color, and the size of the page in points."""
    image = Image.open(png).convert("RGB")
    width, height = image.size
    scale = ppi / 72
    background = image.getpixel((2, 2))
    pixels = image.load()
    # The page number sits in the bottom margin: only the body above it counts
    body = int(height - 45 * scale)
    rows = [y for y in range(body) if any(pixels[x, y] != background for x in range(0, width, 2))]
    return rows[0] / scale, rows[-1] / scale, width / scale, height / scale


def crop_svg(markup: str, y0: float, width: float, height: float) -> str:
    """Crops an SVG page to a new view box: the same width, `height` points from `y0`."""
    markup = re.sub(r'viewBox="[^"]*"', f'viewBox="0 {y0:.2f} {width:.2f} {height:.2f}"', markup, count=1)
    markup = re.sub(r'(<svg[^>]*?) width="[^"]*"', rf'\1 width="{width:.2f}"', markup, count=1)
    markup = re.sub(r'(<svg[^>]*?) height="[^"]*"', rf'\1 height="{height:.2f}"', markup, count=1)
    return markup
