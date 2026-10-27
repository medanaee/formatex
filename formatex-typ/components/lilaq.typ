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
