#import "/src/kit.typ": *

#let cetz-tags = (
    cetz: (attrs, body) => {
      let code = if "src" in attrs { read(root-path(attrs.src)) } else {
        let r = find-raw(body)
        if r != none { r.text }
      }
      assert(code != none, message: at-of(attrs) + "<cetz> needs a fenced code block inside it, or src=\"file.typ\"")
      // Labels are not paragraphs, so the auto-dir rules never reach them;
      // each label gets the direction of its own first letter instead.
      let directed-content(..args) = {
        let pos = args.pos()
        let body = pos.last()
        let d = if type(body) in (content, str) { text-dir(body) }
        cetz.draw.content(..pos.slice(0, -1), if d == none { body } else { text(dir: d, body) }, ..args.named())
      }
      let canvas = cetz.canvas(length: parse-length(attrs.at("unit", default: "1cm"), attrs: attrs), {
        // Default strokes follow the theme so drawings stay visible on dark pages.
        cetz.draw.set-style(stroke: theme.fg)
        eval(latex-in-code(code), mode: "code", scope: (
          ..dictionary(cetz.draw), content: directed-content, cetz: cetz, theme: theme,
          latex-math: s => mitex(s, block: false),
        ))
      })
      // Inside <fig> the canvas is taken from the metadata; on its own it is centered
      // (or follows an enclosing <align>).
      tag("drawing", (canvas: canvas), context align(align-names.at(inherited-align("center")), canvas))
    },
)

#let cetz-schema = (
  "cetz": (
    kind: "block",
    description: (en: "drawings", fa: "رسم"),
    attrs: (
      "unit": (type: "length", default: "1cm", doc: (en: "Length of one coordinate unit. Default `1cm`.", fa: "طول یک واحد مختصات. پیش‌فرض `1cm`.")),
      "src": (type: "path", doc: (en: "Load the code from a file (`src=\"diagrams/x.typ\"`) instead of the code block.", fa: "کد را به‌جای بلوک کد از یک فایل بخوان (`src=\"diagrams/x.typ\"`).")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let cetz-docs = (
  en: (
    about: `````md
A drawing made with CeTZ (Typst code) in a fenced code block, or from a file with `src`. The drawing functions (`line`, `circle`, `rect`, `content`, ...) are in scope without importing, and so is `theme`, so strokes stay visible on dark pages. Put it in `<fig>` for a numbered figure.

- Scope without importing: every `cetz.draw` function (`line`, `rect`, `circle`, `arc`, `bezier`, `content`, `group`, `set-style`, ...), `cetz`, and the `theme` dictionary (`theme.fg`, `theme.bg`, `theme.accent`, `theme.heading`, `theme.muted`, `theme.rule`).
- The code runs in Typst code mode: `let`, `for`, functions and `calc.*` work. Default strokes use `theme.fg`; use theme colors, not fixed hex, so drawings stay visible on dark pages.
- LaTeX math works in labels (`[$B_r \times B_c$]`, or bare: `$x_{n-1}$`); a string that is nothing but a formula (`"$x_{n-1}$"`) is the formula too, not text with dollar signs. Each `content(...)` label takes the direction of its own first letter.
- Inside `<fig>` a drawing behaves like an image (`id`, `align`, a caption; `height` and `width` are maximums, a wider drawing shrinks to the line). On its own it is centered at its natural size.
`````.text,
    more: `````md
- Labels in boxes: a fixed `rect` with a `content` on top lets long text spill out. Let the label draw its own frame instead, which grows with the text: `content((0, 0), box(width: 3cm, align(center)[Label]), frame: "rect", padding: 0.2, fill: theme.bg, stroke: theme.rule, name: "bias")`; arrows can then use `"bias.north"`, `"bias.west"`, ...
- Markdown habits in labels: `[**bold**]` is bold and `[page #03]` prints the `#`; a `#` starts code only before a name, `(`, `{` or `[`.
- Giving the `<fig>` a `height` shrinks the whole drawing, text included: leave it out unless the drawing is too big.
`````.text,
  ),
  fa: (
    about: `````md
رسمی که با CeTZ (کد Typst) در یک بلوک کد، یا از یک فایل با `src` کشیده می‌شود. تابع‌های رسم (`line`، `circle`، `rect`، `content` و ...) بدون import در دسترس‌اند و `theme` هم هست، پس خط‌ها روی صفحهٔ تیره دیده می‌شوند. برای شکل شماره‌دار آن را در `<fig>` بگذارید.

- در دسترس بدون import: همهٔ تابع‌های `cetz.draw` (`line`، `rect`، `circle`، `arc`، `bezier`، `content`، `group`، `set-style` و ...)، خود `cetz` و دیکشنری `theme` (`theme.fg`، `theme.bg`، `theme.accent`، `theme.heading`، `theme.muted`، `theme.rule`).
- کد در حالت code مود Typst اجرا می‌شود: `let`، `for`، تابع و `calc.*` کار می‌کنند. خط‌های پیش‌فرض `theme.fg` را می‌گیرند؛ به‌جای hex ثابت از رنگ‌های تم استفاده کنید تا رسم روی صفحهٔ تیره دیده شود.
- ریاضی LaTeX در برچسب‌ها کار می‌کند (`[$B_r \times B_c$]` یا بدون کروشه: `$x_{n-1}$`)؛ رشته‌ای که فقط یک فرمول است (`"$x_{n-1}$"`) هم فرمول حساب می‌شود، نه متنی با علامت دلار. هر برچسب `content(...)` جهت اولین حرف خودش را می‌گیرد.
- داخل `<fig>` رسم مثل تصویر رفتار می‌کند (`id`، `align` و عنوان؛ `height` و `width` سقف‌اند و رسم پهن‌تر به پهنای خط کوچک می‌شود). تنها، با اندازهٔ طبیعی وسط می‌نشیند.
`````.text,
    more: `````md
- برچسب در جعبه: یک `rect` ثابت با `content` روی آن اجازه می‌دهد متن بلند بیرون بزند. بگذارید برچسب خودش قاب بکشد تا با متن بزرگ شود: `content((0, 0), box(width: 3cm, align(center)[برچسب]), frame: "rect", padding: 0.2, fill: theme.bg, stroke: theme.rule, name: "bias")`؛ آن‌وقت پیکان‌ها می‌توانند `"bias.north"`، `"bias.west"` و ... را به کار ببرند.
- عادت‌های Markdown در برچسب‌ها: `[**ضخیم**]` ضخیم است و `[page #03]` علامت `#` را چاپ می‌کند؛ `#` فقط پیش از نام، `(`، `{` یا `[` کد را شروع می‌کند.
- اگر به `<fig>` `height` بدهید کل رسم، با متنش، کوچک می‌شود: مگر رسم بزرگ باشد آن را ندهید.
`````.text,
  ),
  example: (
    en: `````md
<fig id="fig-axes" height="4cm">
<cetz unit="1cm">

```typ
line((-1.5, 0), (1.5, 0), mark: (end: ">"))
line((0, -1.5), (0, 1.5), mark: (end: ">"))
circle((0, 0), radius: 1, stroke: theme.accent)
content((1.2, 1.2), [the point $P$])
```

</cetz>
<caption>A circle on the axes.</caption>
</fig>
`````.text,
    fa: `````md
<fig id="fig-axes" height="4cm">
<cetz unit="1cm">

```typ
line((-1.5, 0), (1.5, 0), mark: (end: ">"))
line((0, -1.5), (0, 1.5), mark: (end: ">"))
circle((0, 0), radius: 1, stroke: theme.accent)
content((1.2, 1.2), [نقطهٔ $P$])
```

</cetz>
<caption>یک دایره روی محورها.</caption>
</fig>
`````.text,
  ),
)
