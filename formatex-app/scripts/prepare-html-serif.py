"""Prepare browser-compatible quadratic outlines from Typst's stock NewCM CFF fonts.

Usage: python scripts/prepare-html-serif.py path/to/typst-assets/files/fonts
Requires fontTools. PDF font selection is unchanged; these assets are for HTML embedding only.
"""
from pathlib import Path
import argparse
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args = parser.parse_args()
output = Path(__file__).resolve().parent.parent / "src-tauri/web-fonts"
output.mkdir(exist_ok=True)
for style in ("Regular", "Bold", "Italic", "BoldItalic"):
    source = TTFont(args.source / f"NewCM10-{style}.otf")
    order = source.getGlyphOrder()
    glyphset = source.getGlyphSet()
    glyphs = {}
    for name in order:
        pen = TTGlyphPen(glyphset)
        glyphset[name].draw(Cu2QuPen(pen, max_err=1, reverse_direction=True))
        glyphs[name] = pen.glyph()
    builder = FontBuilder(source["head"].unitsPerEm, isTTF=True)
    builder.setupGlyphOrder(order)
    builder.setupCharacterMap(source.getBestCmap())
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics(source["hmtx"].metrics)
    hhea = source["hhea"]
    builder.setupHorizontalHeader(ascent=hhea.ascent, descent=hhea.descent, lineGap=hhea.lineGap)
    builder.setupOS2()
    builder.font["head"].macStyle = source["head"].macStyle
    builder.font["OS/2"] = source["OS/2"]
    builder.font["name"] = source["name"]
    # Distinguish the converted font from the original family, retaining all license records.
    for record in builder.font["name"].names:
        replacements = {1: "Formatex NewCM Web", 4: f"Formatex NewCM Web {style}", 6: f"FormatexNewCMWeb-{style}", 16: "Formatex NewCM Web"}
        if record.nameID in replacements:
            record.string = replacements[record.nameID].encode(record.getEncoding())
    builder.setupPost()
    for tag in ("GDEF", "GPOS", "GSUB"):
        if tag in source:
            builder.font[tag] = source[tag]
    target = output / f"newcm-{style.lower()}.ttf"
    builder.save(target)
    print(target.name, target.stat().st_size)
(output / "NOTICE.txt").write_bytes((args.source.parent.parent / "NOTICE").read_bytes())
(output / "README.md").write_text(
    "# HTML serif outlines\n\n"
    "Generated from Typst assets 0.15.1 NewCM10 Regular/Bold/Italic/BoldItalic using "
    "`scripts/prepare-html-serif.py`. Cubic outlines are converted to quadratic outlines "
    "with at most one font-unit error (1/1000 em), preserving shaping tables and metrics. "
    "The internal family is renamed Formatex NewCM Web; HTML uses the requested CSS family name. "
    "These assets do not participate in PDF font selection. See NOTICE.txt for the upstream "
    "GUST and GPL3 + font/distribution exception notices.\n",
    encoding="utf8",
)
