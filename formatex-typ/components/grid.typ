#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *

#let panel-parts(it) = {
  let args = it.fields()
  let body = args.remove("body")
  let _ = args.remove("label", default: none)
  let kids = if body.func() == [].func() { body.children } else { (body,) }
  let first = kids.at(0, default: none)
  let narrow = if first != none and first.func() == metadata and type(first.value) == dictionary {
    first.value.at("panel-narrow", default: none)
  }
  (args: args, body: body, narrow: narrow)
}

// fit: (width: "auto"|"fill", height: "auto"|"fill", extra: how much taller the row is than
// the item, outer: the alignment around the grid, restored inside the frame).
#let fit-panel(fit) = it => {
  let (args, body, narrow) = panel-parts(it)
  let _ = args.remove("width", default: none)
  let _ = args.remove("height", default: none)
  let shrink = fit.width == "auto"
  // Boxes nested in this one keep their default look.
  let inside = {
    show <component-panel>: inner => { let p = panel-parts(inner); block(..p.args, p.body) }
    set align(fit.outer)
    if shrink and narrow != none { narrow } else { body }
  }
  layout(size => {
    let frame = args.keys().filter(k => k in ("fill", "stroke", "radius", "inset", "outset", "clip"))
    let box-args = frame.map(k => (k, args.at(k))).to-dict()
    let w = if shrink { measure(box(..box-args, inside), width: size.width).width } else { size.width }
    let h = if fit.height == "fill" {
      measure(block(width: w, ..args, inside), width: size.width).height + fit.extra
    } else { auto }
    block(width: w, height: h, ..args, inside)
  })
}

#let grid-tags = (
    item: (attrs, body) => tag("item", attrs, body),
    grid: (attrs, body) => {
      let items = untag(body, "item").tagged
      let cols = int(attrs.at("cols", default: "2"))
      let gap-x = parse-length(attrs.at("gap-x", default: "1em"), attrs: attrs)
      let gap-y = parse-length(attrs.at("gap-y", default: "1em"), attrs: attrs)
      let d = attrs.at("dir", default: "auto")

      // Typst errors on a colspan that overflows the row, so items are placed manually
      // and wrap to the next row when they don't fit. x = 0 is the start side (right in RTL).
      let placed = ()
      let (x, y) = (0, 0)
      for it in items {
        let span = calc.max(1, calc.min(cols, int(it.attrs.at("span", default: "1"))))
        if x + span > cols {
          x = 0
          y += 1
        }
        placed.push((x: x, y: y, span: span, attrs: it.attrs, body: it.body))
        x += span
      }

      let option(attrs, key, names, default) = {
        let v = attrs.at(key, default: default)
        assert(v in names, message: at-of(attrs) + "<item> " + key + " must be one of " + names.keys().join(", ") + ", got " + repr(v))
        names.at(v)
      }
      let sizes = ("auto": "auto", "fill": "fill")
      let valigns = (start: top, center: horizon, end: bottom)
      span-columns(attrs, "grid", context {
        set text(dir: resolve-dir(d, body))
        let outer = align.alignment
        layout(size => {
          // `height="fill"` needs the row height, so every item is measured at its cell width first.
          let gx = if type(gap-x) == relative { gap-x.ratio * size.width + gap-x.length } else { gap-x }
          let col-w = (size.width - gx.to-absolute() * (cols - 1)) / cols
          let natural = placed.map(p => measure(block(width: col-w * p.span + gx.to-absolute() * (p.span - 1), p.body)).height)
          let row-h = (:)
          for (p, h) in placed.zip(natural) {
            row-h.insert(str(p.y), calc.max(row-h.at(str(p.y), default: 0pt), h))
          }
          let cells = placed.zip(natural).map(((p, h)) => {
            let fit = (
              width: option(p.attrs, "width", sizes, "fill"),
              height: option(p.attrs, "height", sizes, "fill"),
              extra: calc.max(0pt, row-h.at(str(p.y)) - h),
              outer: outer,
            )
            let ha = if "halign" in p.attrs { option(p.attrs, "halign", align-names, none) }
            let va = option(p.attrs, "valign", valigns, "start")
            grid.cell(
              x: p.x, y: p.y, colspan: p.span,
              align: if ha == none { va } else { ha + va },
              { show <component-panel>: fit-panel(fit); p.body },
            )
          })
          grid(
            columns: (1fr,) * cols,
            column-gutter: gap-x,
            row-gutter: gap-y,
            ..cells,
          )
        })
      })
    },
)

#let grid-schema = (
  "grid": (
    kind: "block",
    description: (en: "columns", fa: "ستون‌بندی"),
    attrs: (
      "cols": (type: "int", default: "2", doc: (en: "Number of columns", fa: "تعداد ستون‌ها")),
      "gap-x": (type: "length", default: "1em", doc: (en: "Horizontal gap between cells", fa: "فاصلهٔ افقی بین خانه‌ها")),
      "gap-y": (type: "length", default: "1em", doc: (en: "Vertical gap between cells", fa: "فاصلهٔ عمودی بین خانه‌ها")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Direction of the cells", fa: "جهت خانه‌ها")),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: (en: "`column` (default) or `all` to span all columns in a multi-column document", fa: "`column` (پیش‌فرض) یا `all` برای پوشاندن همهٔ ستون‌ها در سند چندستونه")),
    ),
    children: ("item",),
  ),
  "item": (
    kind: "block",
    scoped: true,
    description: (en: "One cell of a <grid>", fa: "یک خانه از <grid>"),
    attrs: (
      "span": (type: "int", default: "1", doc: (en: "Number of columns the cell covers (clamped to `cols`)", fa: "تعداد ستون‌هایی که خانه می‌پوشاند (حداکثر `cols`)")),
      "width": (type: "enum", values: ("fill", "auto"), default: "fill", doc: (en: "`fill` (as wide as the cell) or `auto` (as wide as its content)", fa: "`fill` (هم‌عرض خانه) یا `auto` (هم‌عرض محتوا)")),
      "height": (type: "enum", values: ("fill", "auto"), default: "fill", doc: (en: "`fill` (as tall as the row) or `auto` (as tall as its content)", fa: "`fill` (هم‌قد ردیف) یا `auto` (هم‌قد محتوا)")),
      "halign": (type: "enum", values: ("start", "center", "end", "left", "right"), doc: (en: "Horizontal alignment inside the cell", fa: "تراز افقی داخل خانه")),
      "valign": (type: "enum", values: ("start", "center", "end"), default: "start", doc: (en: "Vertical alignment inside the cell", fa: "تراز عمودی داخل خانه")),
    ),
  ),
)



