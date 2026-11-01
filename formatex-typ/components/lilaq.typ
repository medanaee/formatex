#import "/src/kit.typ": *

// <lilaq>: a data plot drawn with the Lilaq package. The code block holds Typst whose last expression is a
// `lq.diagram(...)`. Strokes, ticks, grid and text take the theme's colors so plots stay visible on dark pages.

// cz(x, y, { draw.content(...); draw.bezier(...) }): a CeTZ canvas whose origin sits on the data point (x, y), so a
// note or a curved arrow can point at data on any kind of axis. Coordinates inside it are in `unit` (default 1cm).
#let lilaq-cetz-note(x, y, body, unit: 1cm, align: left + horizon) = lilaq.place(x, y, align: align, cetz.canvas(length: unit, {
  cetz.draw.set-style(stroke: theme.fg)
  body
}))

#let lilaq-tags = (
    lilaq: (attrs, body) => {
      let code = if "src" in attrs { read(root-path(attrs.src)) } else {
        let r = find-raw(body)
        if r != none { r.text }
      }
      assert(code != none, message: at-of(attrs) + "<lilaq> needs a fenced code block inside it, or src=\"file.typ\"")
      let plot = {
        set text(fill: theme.fg)
        show: lilaq.set-spine(stroke: 0.7pt * zoom + theme.fg)
        show: lilaq.set-tick(stroke: 0.7pt * zoom + theme.fg)
        show: lilaq.set-grid(stroke: 0.5pt * zoom + theme.rule)
        eval(latex-in-code(code), mode: "code", scope: (
          lq: lilaq, lilaq: lilaq, tiptoe: tiptoe, cetz: cetz, draw: cetz.draw, cz: lilaq-cetz-note,
          theme: theme, zoom: zoom, latex-math: s => mitex(s, block: false),
        ))
      }
      // Inside <fig> the plot is taken from the metadata, like a <cetz> drawing; on its own it is centered
      // (or follows an enclosing <align>).
      tag("drawing", (canvas: plot), context align(align-names.at(inherited-align("center")), plot))
    },
)

#let lilaq-schema = (
  "lilaq": (
    kind: "block",
    description: (en: "data plots (Lilaq)", fa: "نمودار داده (Lilaq)"),
    attrs: (
      "src": (type: "path", doc: (en: "Load the code from a file (`src=\"plots/x.typ\"`) instead of the code block.", fa: "کد را به‌جای بلوک کد از یک فایل بخوان (`src=\"plots/x.typ\"`).")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let lilaq-docs = (
  en: (
    about: `````md
A data plot with real axes, ticks and grid, drawn by the Lilaq package from Typst code in a fenced block whose last expression is `lq.diagram(...)`. `lq`, `theme` and `zoom` are in scope. For a quick chart from a table use `<chart>`.

- The code block is Typst whose last expression is `lq.diagram(...)`; `lq` (also `lilaq`), `theme` and `zoom` are in scope without importing. Everything in the Lilaq documentation works: `lq.plot`, `lq.scatter`, `lq.bar`, `lq.fill-between`, `lq.place`, ...
- Text, axes, ticks and grid take the theme's colors; colors you pass yourself should come from `theme` too. LaTeX math works in labels.
- Inside `<fig>` a plot behaves like a drawing (`id`, `align`, a caption; a plot wider than the line shrinks). `range` takes a named step (`range(0, 10, step: 2)`); the package is fetched on the first build, which needs internet.
`````.text,
  ),
  fa: (
    about: `````md
نمودار داده با محور، تیک و شبکهٔ واقعی که بستهٔ Lilaq از کد Typst در یک بلوک کد می‌کشد؛ آخرین عبارت بلوک باید `lq.diagram(...)` باشد. `lq`، `theme` و `zoom` در دسترس‌اند. برای نمودار سریع از روی جدول `<chart>` را به کار ببرید.

- بلوک کد Typst است و آخرین عبارتش `lq.diagram(...)` است؛ `lq` (و `lilaq`)، `theme` و `zoom` بدون import در دسترس‌اند. هر چه در مستندات Lilaq هست کار می‌کند: `lq.plot`، `lq.scatter`، `lq.bar`، `lq.fill-between`، `lq.place` و ...
- متن، محورها، تیک‌ها و شبکه رنگ تم را می‌گیرند؛ رنگ‌هایی که خودتان می‌دهید هم از `theme` باشند. ریاضی LaTeX در برچسب‌ها کار می‌کند.
- داخل `<fig>` نمودار مثل رسم رفتار می‌کند (`id`، `align` و عنوان؛ نمودار پهن‌تر از خط کوچک می‌شود). گام `range` نام‌دار است (`range(0, 10, step: 2)`)؛ بسته در اولین ساخت دانلود می‌شود و اینترنت می‌خواهد.
`````.text,
  ),
  example: (
    en: `````md
<lilaq>

```typ
let xs = range(0, 17).map(i => i * 1000)
let ys = (1.45, 1.45, 0.37, 0.84, 0.92, 1.07, 1.27, 1.14, 1.15, 1.25, 1.4, 1.39, 1.37, 1.36, 1.38, 1.43, 1.45)
lq.diagram(
  title: strong[Syscall impact on user-mode IPC],
  xlabel: [Time (in cycles)], ylabel: [User-mode IPC],
  width: 11cm, height: 5cm,
  xaxis: (exponent: none),
  lq.fill-between(xs, ys, y2: xs.map(_ => 1.45), fill: theme.accent.transparentize(45%)),
  lq.plot(xs, ys, color: theme.fg, stroke: 1.6pt),
  lq.place(8800, 0.62, [Lost performance], align: left),
)
```

</lilaq>
`````.text,
    fa: `````md
<lilaq>

```typ
let xs = range(0, 17).map(i => i * 1000)
let ys = (1.45, 1.45, 0.37, 0.84, 0.92, 1.07, 1.27, 1.14, 1.15, 1.25, 1.4, 1.39, 1.37, 1.36, 1.38, 1.43, 1.45)
lq.diagram(
  title: strong[تأثیر فراخوانی سیستمی بر IPC],
  xlabel: [Time (in cycles)], ylabel: [User-mode IPC],
  width: 11cm, height: 5cm,
  xaxis: (exponent: none),
  lq.fill-between(xs, ys, y2: xs.map(_ => 1.45), fill: theme.accent.transparentize(45%)),
  lq.plot(xs, ys, color: theme.fg, stroke: 1.6pt),
  lq.place(8800, 0.62, [Lost performance], align: left),
)
```

</lilaq>
`````.text,
  ),
)
