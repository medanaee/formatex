"""Prepare subsettable quadratic TTF outlines from bundled Font Awesome 7 CFF OTFs for HTML embedding."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen

root = Path(__file__).resolve().parent.parent
fonts_dir = root / "fonts"
output = root / "src-tauri/web-fonts"
output.mkdir(exist_ok=True)

SOURCES = [
    ("Font Awesome 7 Pro-Regular-400.otf", "fa7-pro-regular.ttf", "Formatex FA7 Pro Web Regular"),
    ("Font Awesome 7 Pro-Solid-900.otf", "fa7-pro-solid.ttf", "Formatex FA7 Pro Web Solid"),
    ("Font Awesome 7 Brands-Regular-400.otf", "fa7-brands-regular.ttf", "Formatex FA7 Brands Web"),
]

for src_name, dst_name, web_family in SOURCES:
    source = TTFont(fonts_dir / src_name)
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
    for record in builder.font["name"].names:
        replacements = {1: web_family, 4: web_family, 6: web_family.replace(" ", ""), 16: web_family}
        if record.nameID in replacements:
            record.string = replacements[record.nameID].encode(record.getEncoding())
    builder.setupPost()
    target = output / dst_name
    builder.save(target)
    print(dst_name, target.stat().st_size)
