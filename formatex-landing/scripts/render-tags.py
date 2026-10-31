#!/usr/bin/env python3
"""Renders the tags of the landing's component slider with the real engine (formatex-typ), in the midnight theme.

For every tag and language it compiles a short Markdown snippet with the Typst CLI to an SVG on a phone-sized page, then crops the
page to its content (found on a PNG of the same page), and writes `src/assets/tags/<lang>/<id>.svg` next to `<id>.md`, the snippet
the slider shows as code.

    python scripts/render-tags.py            # needs the Typst CLI on the PATH and Pillow (pip install pillow)
"""
import shutil
from pathlib import Path

from typst_page import PAD, ROOT, TMP, compile_page, content_rows, crop_svg

OUT = ROOT / "src" / "assets" / "tags"

SNIPPETS = {
    "en": {
        "alert": '''<alert type="info">

Pages are numbered from the cover.

</alert>

<alert type="warning">

**Careful:** check the page numbers before you print.

</alert>
''',
        "box": '''<box color="blue">

A note in a **blue** box that follows the theme.

</box>

<box color="green">

And one in green.

</box>
''',
        "chart": '''<chart caption="Sales by season" values="true">

| Season | 2025 |
|---|---|
| Spring | 12 |
| Summer | 16 |
| Autumn | 9 |
| Winter | 14 |

</chart>
''',
        "tree": '''<tree caption="Project layout">

```
project/
  main.md
  config.toml
  img/
    chart.png
```

</tree>
''',
        "steps": '''<steps>
<step title="Write">

Plain Markdown.

</step>
<step title="See">

The page, beside the text.

</step>
<step title="Export">

A PDF, ready to print.

</step>
</steps>
''',
        "progress": '''<progress>

- Design: 100
- Writing: 70
- Review: 35

</progress>

<progress style="stars">

- Typst: 4.5
- Formatex: 5

</progress>
''',
        "badge": '''Press <kbd>Ctrl+P</kbd> to export.

<badge color="green" icon="circle-check">stable</badge> <badge color="yellow">beta</badge> <badge>neutral</badge>
''',
        "compare": '''<compare>

<pros>

- Free and open source
- Persian and English together

</pros>

<cons title="Limits">

- A new tag language to learn

</cons>

</compare>
''',
        "theorem": '''<theorem title="Uniqueness of limits">

A sequence has at most one limit.

</theorem>
''',
        "chat": '''<chat title="A question">

<user>

Can you make a table?

</user>

<ai>

Done. It is on **page 3**.

</ai>

</chat>
''',
        "diff": '''<diff>
<before title="Before">

```python
total = a + b
```

</before>
<after title="After">

```python
total = sum(rows)
```

</after>
</diff>
''',
        "todo": '''This sentence <todo>add a source</todo> is unfinished.

<todo>

Update this section with the second experiment.

</todo>
''',
        "grid": '''<grid cols="3" gap-x="8pt">
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
''',
    },
    "fa": {
        "alert": '''<alert type="info">

شماره‌ی صفحه‌ها از جلد شروع می‌شود.

</alert>

<alert type="warning">

**دقت کنید:** پیش از چاپ، شماره‌ی صفحه‌ها را بازبینی کنید.

</alert>
''',
        "box": '''<box color="blue">

یادداشتی در کادر **آبی** که از تم پیروی می‌کند.

</box>

<box color="green">

و یکی در کادر سبز.

</box>
''',
        "chart": '''<chart caption="فروش به تفکیک فصل" values="true">

| فصل | ۱۴۰۴ |
|---|---|
| بهار | ۱۲ |
| تابستان | ۱۶ |
| پاییز | ۹ |
| زمستان | ۱۴ |

</chart>
''',
        "tree": '''<tree caption="ساختار پروژه">

```
project/
  main.md
  config.toml
  img/
    chart.png
```

</tree>
''',
        "steps": '''<steps>
<step title="بنویس">

مارک‌داون ساده.

</step>
<step title="ببین">

صفحه، کنار متن.

</step>
<step title="خروجی بگیر">

یک PDF آماده‌ی چاپ.

</step>
</steps>
''',
        "progress": '''<progress>

- طراحی: ۱۰۰
- نوشتن: ۷۰
- بازبینی: ۳۵

</progress>

<progress style="stars">

- Typst: 4.5
- فرمتکس: 5

</progress>
''',
        "badge": '''برای خروجی <kbd>Ctrl+P</kbd> را بزنید.

<badge color="green" icon="circle-check">پایدار</badge> <badge color="yellow">آزمایشی</badge> <badge>خنثی</badge>
''',
        "compare": '''<compare>

<pros>

- رایگان و متن‌باز
- فارسی و انگلیسی کنار هم

</pros>

<cons title="محدودیت">

- یک زبان تگ تازه برای یادگیری

</cons>

</compare>
''',
        "theorem": '''<theorem title="یکتایی حد">

هر دنباله حداکثر یک حد دارد.

</theorem>
''',
        "chat": '''<chat title="یک پرسش">

<user>

یک جدول می‌سازی؟

</user>

<ai>

انجام شد. در **صفحه‌ی ۳** است.

</ai>

</chat>
''',
        "diff": '''<diff>
<before title="پیش از">

```python
total = a + b
```

</before>
<after title="پس از">

```python
total = sum(rows)
```

</after>
</diff>
''',
        "todo": '''این جمله <todo>منبع اضافه شود</todo> هنوز ناتمام است.

<todo>

این بخش را با آزمایش دوم به‌روز کن.

</todo>
''',
        "grid": '''<grid cols="3" gap-x="8pt">
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
''',
    },
}


SNIPPETS["en"].update({
    "code": '''<code highlight="2">

```python
def total(rows):
    return sum(r.sales for r in rows)
```

</code>
''',
    "exercise": '''<exercise title="Multiple choice" points="1">

Which language was made for typesetting?

<choices correct="3">

- Python
- JavaScript
- Typst

</choices>

</exercise>
''',
    "letter": '''<letter org="Example University" number="123/A" date="October 10, 2026" to="The Head of the Department" subject="Extension of the deadline" greeting="Dear Dr. Rahimi," closing="Sincerely," signer="Dr. Maryam Ahmadi">

We kindly ask that the deadline be extended by two weeks.

</letter>
''',
    "cetz": '''<cetz unit="1cm">

```typ
line((-1.5, 0), (1.5, 0), mark: (end: ">"))
line((0, -1.2), (0, 1.2), mark: (end: ">"))
circle((0, 0), radius: 1, stroke: theme.accent)
content((1.2, 1.1), [$P$])
```

</cetz>
''',
    "lilaq": '''<lilaq>

```typ
let xs = range(0, 9)
lq.diagram(
  width: 8cm, height: 3.6cm,
  lq.plot(xs, xs.map(x => calc.sin(x / 1.6)), color: theme.accent, stroke: 1.6pt),
)
```

</lilaq>
''',
    "div": '''<div tailwind="p-4 bg-blue rounded-lg border border-blue">

A padded blue card.

</div>
''',
    "icon": '''Done <icon name="check" color="green" /> and a warning <icon name="triangle-exclamation" color="orange" size="1.3em" /> in one line.
''',
})
SNIPPETS["fa"].update({
    "code": '''<code highlight="2">

```python
def total(rows):
    return sum(r.sales for r in rows)
```

</code>
''',
    "exercise": '''<exercise title="چهارگزینه‌ای" points="1">

کدام زبان برای حروف‌چینی ساخته شده است؟

<choices correct="3">

- Python
- JavaScript
- Typst

</choices>

</exercise>
''',
    "letter": '''<letter org="دانشگاه نمونه" number="۱۲۳/الف" date="۱۸ مهر ۱۴۰۵" to="مدیر محترم گروه" subject="تمدید مهلت" greeting="جناب آقای دکتر رحیمی،" closing="با احترام" signer="دکتر مریم احمدی">

خواهشمند است مهلت را دو هفته تمدید فرمایید.

</letter>
''',
    "cetz": '''<cetz unit="1cm">

```typ
line((-1.5, 0), (1.5, 0), mark: (end: ">"))
line((0, -1.2), (0, 1.2), mark: (end: ">"))
circle((0, 0), radius: 1, stroke: theme.accent)
content((1.2, 1.1), [نقطهٔ $P$])
```

</cetz>
''',
    "lilaq": '''<lilaq>

```typ
let xs = range(0, 9)
lq.diagram(
  width: 8cm, height: 3.6cm,
  lq.plot(xs, xs.map(x => calc.sin(x / 1.6)), color: theme.accent, stroke: 1.6pt),
)
```

</lilaq>
''',
    "div": '''<div tailwind="p-4 bg-blue rounded-lg border border-blue">

یک کارت آبی با فاصله‌ی داخلی.

</div>
''',
    "icon": '''انجام شد <icon name="check" color="green" /> و این یک هشدار <icon name="triangle-exclamation" color="orange" size="1.3em" /> در همان خط.
''',
})


def main():
    TMP.mkdir(exist_ok=True)
    try:
        for lang, tags in SNIPPETS.items():
            (OUT / lang).mkdir(parents=True, exist_ok=True)
            for name, text in tags.items():
                source = TMP / f"{lang}-{name}.md"
                source.write_text(text, encoding="utf-8")
                svg = TMP / f"{lang}-{name}.svg"
                png = TMP / f"{lang}-{name}.png"
                compile_page(source, svg, lang, "svg")
                compile_page(source, png, lang, "png")
                top, bottom, width, _ = content_rows(png)
                y0 = max(0, top - PAD)
                height = bottom + PAD - y0
                (OUT / lang / f"{name}.svg").write_text(crop_svg(svg.read_text(encoding="utf-8"), y0, width, height), encoding="utf-8")
                (OUT / lang / f"{name}.md").write_text("\n".join(line for line in text.splitlines() if line.strip()) + "\n", encoding="utf-8")
                print(f"{lang}/{name}: {width:.0f} x {height:.0f} pt")
    finally:
        shutil.rmtree(TMP, ignore_errors=True)


if __name__ == "__main__":
    main()
