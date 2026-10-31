#!/usr/bin/env python3
"""Renders two sets of real pages with the engine (formatex-typ):

* `src/assets/themes/<lang>/<feel>/<theme>.svg`: one fixed page in each of the eight themes and three feels of the app, all
  cropped to the same height; the dial and the feel switch of the landing choose between them.
* `src/assets/refs/<lang>/{toc,lists,body}.svg` (and the Markdown of each, `.md`): the automatic parts of a document: the table of
  contents, the lists of figures, tables and listings, and a page with cross-references, a citation and its bibliography.

    python scripts/render-pages.py            # needs the Typst CLI on the PATH and Pillow (pip install pillow)
"""
import shutil
from pathlib import Path

from typst_page import ENGINE, PAD, ROOT, TMP, compile_page, content_rows, crop_svg

THEMES = ["paper", "sepia", "ocean", "sage", "midnight", "nord", "zinc", "dracula"]
FEELS = ["formal", "standard", "friendly"]
OUT = ROOT / "src" / "assets"

BIB = """@book{knuth1984texbook,
  author = {Donald E. Knuth},
  title = {The {TeX}book},
  publisher = {Addison-Wesley},
  year = {1984}
}
"""

SAMPLE = {
    "en": '''# Q3 report

Results match Excel and Python: 12% growth over last quarter, most of it from the home market.

<alert type="info">

Pages are numbered from the cover.

</alert>

<grid cols="3" gap-x="8pt">
<item>

<box color="green">

**Growth**

12%

</box>

</item>
<item>

<box color="blue">

**Clients**

48

</box>

</item>
<item>

<box color="purple">

**Cities**

3

</box>

</item>
</grid>

<chart caption="Sales by season" values="true">

| Season | 2025 |
|---|---|
| Spring | 12 |
| Summer | 16 |
| Autumn | 9 |
| Winter | 14 |

</chart>

<code highlight="2">

```python
def total(rows):
    return sum(r.sales for r in rows)
```

</code>
''',
    "fa": '''# گزارش فصل سوم

نتایج با Excel و Python هم‌خوان بود؛ ۱۲٪ رشد نسبت به فصل پیش، و بیشترِ آن از بازار داخلی.

<alert type="info">

شماره‌ی صفحه‌ها از جلد شروع می‌شود.

</alert>

<grid cols="3" gap-x="8pt">
<item>

<box color="green">

**رشد**

۱۲٪

</box>

</item>
<item>

<box color="blue">

**مشتری**

۴۸

</box>

</item>
<item>

<box color="purple">

**شهر**

۳

</box>

</item>
</grid>

<chart caption="فروش به تفکیک فصل" values="true">

| فصل | ۱۴۰۴ |
|---|---|
| بهار | ۱۲ |
| تابستان | ۱۶ |
| پاییز | ۹ |
| زمستان | ۱۴ |

</chart>

<code highlight="2">

```python
def total(rows):
    return sum(r.sales for r in rows)
```

</code>
''',
}

# The automatic parts, as one small document: the contents, the lists and a page of text that refers to its own figure, table and book
FRONT = "---\nbibliography:\n  file: .tags-tmp/refs.bib\n  style: ieee\n  title: \"{title}\"\n---\n\n"
REFS = {
    "en": FRONT.format(title="References") + '''<toc dir="ltr" break="true"></toc>

<lof dir="ltr"></lof>

<lot dir="ltr"></lot>

<lol dir="ltr" break="after"></lol>

# Introduction

Sales grew in every season, as <ref to="fig-sales"></ref> and <ref to="tbl-sales"></ref> show. The method follows <cite key="knuth1984texbook"></cite>.

## Results

<chart caption="Sales by season" id="fig-sales">

| Season | 2025 |
|---|---|
| Spring | 12 |
| Summer | 16 |
| Autumn | 9 |

</chart>

{caption="Sales by season" #tbl-sales}
| Season | Sales |
|---|---|
| Spring | 12 |
| Summer | 16 |

<code caption="Total of the sales" id="code-total">

```python
total = sum(rows)
```

</code>

<bibliography dir="ltr"></bibliography>
''',
    "fa": FRONT.format(title="منابع") + '''<toc break="true"></toc>

<lof></lof>

<lot></lot>

<lol break="after"></lol>

# مقدمه

فروش در همه‌ی فصل‌ها رشد کرد، چنان‌که <ref to="fig-sales"></ref> و <ref to="tbl-sales"></ref> نشان می‌دهند. روش کار از <cite key="knuth1984texbook"></cite> پیروی می‌کند.

## نتایج

<chart caption="فروش به تفکیک فصل" id="fig-sales">

| فصل | ۱۴۰۴ |
|---|---|
| بهار | ۱۲ |
| تابستان | ۱۶ |
| پاییز | ۹ |

</chart>

{caption="فروش به تفکیک فصل" #tbl-sales}
| فصل | فروش |
|---|---|
| بهار | ۱۲ |
| تابستان | ۱۶ |

<code caption="مجموع فروش" id="code-total">

```python
total = sum(rows)
```

</code>

<bibliography></bibliography>
''',
}

# What the pages show as code on hover
CODE = {
    "en": {
        "toc": '<toc dir="ltr" break="true"></toc>\n',
        "lists": '<lof dir="ltr"></lof>\n<lot dir="ltr"></lot>\n<lol dir="ltr"></lol>\n',
        "body": '<ref to="fig-sales"></ref> and <ref to="tbl-sales"></ref>\n<cite key="knuth1984texbook"></cite>\n<bibliography></bibliography>\n',
    },
    "fa": {
        "toc": '<toc break="true"></toc>\n',
        "lists": "<lof></lof>\n<lot></lot>\n<lol></lol>\n",
        "body": '<ref to="fig-sales"></ref> و <ref to="tbl-sales"></ref>\n<cite key="knuth1984texbook"></cite>\n<bibliography></bibliography>\n',
    },
}


def render_themes():
    for lang, text in SAMPLE.items():
        source = TMP / f"sample-{lang}.md"
        source.write_text(text, encoding="utf-8")
        bottoms = {}
        for feel in FEELS:
            for theme in THEMES:
                png = TMP / f"{lang}-{feel}-{theme}.png"
                compile_page(source, png, lang, "png", theme=theme, feel=feel)
                top, bottom, width, _ = content_rows(png)
                bottoms[(feel, theme)] = bottom
        # One height for all of them, so the page stays the same size when the theme or the feel changes
        height = max(bottoms.values()) + PAD
        for feel in FEELS:
            folder = OUT / "themes" / lang / feel
            folder.mkdir(parents=True, exist_ok=True)
            for theme in THEMES:
                svg = TMP / f"{lang}-{feel}-{theme}.svg"
                compile_page(source, svg, lang, "svg", theme=theme, feel=feel)
                (folder / f"{theme}.svg").write_text(crop_svg(svg.read_text(encoding="utf-8"), 0, width, height), encoding="utf-8")
        print(f"themes/{lang}: {width:.0f} x {height:.0f} pt")


def render_refs():
    (TMP / "refs.bib").write_text(BIB, encoding="utf-8")
    for lang, text in REFS.items():
        source = TMP / f"refs-{lang}.md"
        source.write_text(text, encoding="utf-8")
        svg = TMP / f"refs-{lang}-{{p}}.svg"
        png = TMP / f"refs-{lang}-{{p}}.png"
        compile_page(source, svg, lang, "svg", pages=None)
        compile_page(source, png, lang, "png", pages=None)
        folder = OUT / "refs" / lang
        folder.mkdir(parents=True, exist_ok=True)
        for page, name in ((1, "toc"), (2, "lists"), (3, "body")):
            top, bottom, width, _ = content_rows(TMP / f"refs-{lang}-{page}.png")
            y0 = max(0, top - PAD)
            markup = (TMP / f"refs-{lang}-{page}.svg").read_text(encoding="utf-8")
            (folder / f"{name}.svg").write_text(crop_svg(markup, y0, width, bottom + PAD - y0), encoding="utf-8")
            (folder / f"{name}.md").write_text(CODE[lang][name], encoding="utf-8")
            print(f"refs/{lang}/{name}: {width:.0f} x {bottom + PAD - y0:.0f} pt")


if __name__ == "__main__":
    TMP.mkdir(exist_ok=True)
    try:
        render_themes()
        render_refs()
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
