// `conf`, the document show rule: equations, code, tables, headings, quotes, footnotes and the page setup.
#import "/src/core.typ": *
#import "/src/page.typ": *

// Display equations. "labelled": only those with `{#id}` get a number (main.typ sets
// `equation-next` right before such an equation); "all": every one; "none": never.
#let equation-mode = config.at("equation", default: (:)).at("numbering", default: "labelled")
#assert(equation-mode in ("labelled", "all", "none"), message: "[equation] numbering must be labelled, all or none, got " + repr(equation-mode))
#let equation-next = state("equation-next", none)
#let equation-number(n, rtl-digits) = "(" + numbering(if rtl-digits { "۱" } else { "1" }, n) + ")"
#let equation-numbering = n => context equation-number(n, last-dir.get() == rtl)

// Set by <code> around its code block: first line number and highlighted lines.
#let code-options = state("code-options", (:))

// Language badge of a code block (`lang` from code-language), placed at its top-right corner.
#let code-badge(lang) = box(
  fill: color.mix((theme.code-bg, 90%), (theme.fg, 10%)),
  stroke: 0.5pt * zoom + theme.code-stroke,
  inset: (x: 6pt * zoom, y: 4pt * zoom),
  // The top-right corner follows the code block's own corner.
  radius: (bottom-left: feel.badge, top-right: feel.code),
  {
    set text(fill: theme.fg, size: 0.9em, weight: "bold")
    grid(
      columns: 2,
      column-gutter: 4pt * zoom,
      align: horizon,
      text(top-edge: "bounds", bottom-edge: "bounds", fa-icon(lang.icon)),
      text(top-edge: "cap-height", bottom-edge: "baseline", lang.name),
    )
  },
)

#let table-options = state("table-options", (:))
// [table] in config.toml / front matter: defaults that a `{...}` line above a table overrides.
#let table-defaults = config.at("table", default: (:))
#let table-option-keys = option-keys("table")

// Columns get explicit sizes only when a full-width table is rebuilt.
#let table-has-widths(it) = type(it.columns) == array and it.columns.len() > 0 and auto not in it.columns

// Sizes columns the way browsers do: if everything fits, each column grows in proportion to
// its natural width; otherwise narrow columns keep their width and wide ones share the rest.
#let table-full-width(it, available, inset-x) = {
  let fields = it.fields()
  let children = fields.remove("children")
  let n = if type(it.columns) == int { it.columns } else { it.columns.len() }
  let cells = children.map(c => if c.func() in (table.header, table.footer) { c.children } else { (c,) }).flatten()
  let natural = range(n).map(_ => 0pt)
  for (i, c) in cells.enumerate() {
    let body = if c.func() == table.cell { c.body } else { c }
    let k = calc.rem(i, n)
    natural.at(k) = calc.max(natural.at(k), measure(body).width + 2 * inset-x)
  }
  let total = natural.sum()
  let share = available / n
  fields.insert("columns", if total <= available {
    natural.map(w => w + (available - total) * (w / total))
  } else {
    natural.map(w => if w <= share { w } else { (w / 1pt) * 1fr })
  })
  table(..fields, ..children)
}

#let conf(doc) = {
  set page(
    ..page-sizes.at(page-name),
    ..if page-name == "a4" { (margin: margin-sizes.at(margin-name)) },
    columns: column-count,
    numbering: "1",
    number-align: center,
    fill: theme.bg,
    header: context page-header(),
    footer: if footer-config == none { auto } else { context page-footer() },
  )

  set text(
    font: (latin-font, persian-font),
    spacing: word-spacing,
    tracking: letter-spacing,
    size: 10pt * zoom,
    fill: theme.fg,
  )
  set par(justify: justify, leading: line-spacing)
  // Page columns are ordered by the document-level text direction. Every block sets its
  // own direction (auto-dir), so this mostly decides the column order.
  set text(dir: if column-count > 1 and column-dir != "auto" { named-dir(column-dir) } else if doc-dir != "auto" { named-dir(doc-dir) } else { auto })
  set line(stroke: theme.rule)
  set footnote(numbering: n => context {
    let is-fa = if doc-dir == "rtl" { true } else if doc-dir == "ltr" { false } else { text.dir == rtl }
    if is-fa { numbering("۱", n) } else { numbering("1", n) }
  })
  show footnote.entry: it => context {
    let d = content-dir(it.note.body)
    if d != none { set text(dir: d); it } else { it }
  }
  set heading(numbering: if heading-numbered { heading-numbering } else { none })
  show heading: set text(fill: theme.heading)
  show heading: it => context {
    let o = heading-options.get()
    let underline = o.at("underline", default: heading-underline)
    let fill = o.at("fill", default: heading-fill)
    let hue = if "color" in o { resolve-heading-color(o.color) } else { heading-color }
    let styled = underline or fill
    // `max-level` only limits the [heading] look; a heading that sets fill or underline itself gets it.
    if styled and not ("underline" in o or "fill" in o) {
      // Levels count from the document's top heading level, like the numbers do (a document
      // starting at ## numbers it 1). Unnumbered titles (bibliography) don't set the top.
      let all = query(heading.where(outlined: true))
      let numbered = all.filter(h => h.numbering != none)
      if numbered.len() > 0 { all = numbered }
      let top = if all.len() == 0 { 1 } else { calc.min(..all.map(h => h.level)) }
      if it.level - top + 1 > heading-max-level { styled = false }
    }
    if not styled { return if "color" in o { text(fill: hue, it) } else { it } }
    set text(fill: hue)
    let r = feel.heading
    block(
      width: 100%,
      above: 1.4em,
      below: 0.9em,
      sticky: true,
      fill: if fill { color.mix((hue, if theme.dark { 7% } else { 9% }), (theme.bg, if theme.dark { 84% } else { 91% })) },
      stroke: if underline { (bottom: 1pt * zoom + hue) },
      // A rule along a rounded bottom edge would bend up at the corners.
      radius: if underline { (top: r, bottom: 0pt) } else { r },
      inset: if fill { (x: 0.85em, y: 0.7em) } else { (bottom: 0.65em) },
      it,
    )
  }
  set raw(theme: if theme.dark { "/code-dark.tmTheme" } else { auto })

  show par: auto-dir
  show title: auto-dir
  show heading: auto-dir
  show list: auto-dir
  show enum: auto-dir
  show terms: auto-dir
  show table: auto-dir
  show table.cell: it => context {
    let d = content-dir(it)
    if d == none { it } else {
      set text(dir: d)
      it
    }
  }

  show raw.where(block: true): it => {
    set text(dir: ltr, size: 8pt * zoom, font: (code-font, persian-font), tracking: 0pt)
    // Code lines stay left-aligned inside a centered <align>.
    set align(left)
    set par(justify: false)
    let lang = code-language(it.lang)
    block(
      width: 100%,
      fill: theme.code-bg,
      stroke: 0.5pt * zoom + theme.code-stroke,
      inset: (x: 8pt * zoom, top: if lang != none { 20pt * zoom } else { 12pt * zoom }, bottom: 12pt * zoom),
      radius: feel.code,
      {
        if lang != none {
          place(top + right, dx: 8pt * zoom, dy: -20pt * zoom, code-badge(lang))
        }
        // Markdown fences often end with a newline, which would show as an empty numbered line.
        let lines = it.lines
        while lines.len() > 1 and lines.last().text.trim() == "" { lines = lines.slice(0, -1) }
        context {
          let opts = code-options.get()
          let first = opts.at("start", default: 1)
          let marked = opts.at("highlight", default: ())
          let mark-fill = color.mix((theme.secondary, 16%), (theme.code-bg, 84%))
          let rows = ()
          for (i, line) in lines.enumerate() {
            let n = first + i
            let hit = n in marked
            rows.push(align(right, text(fill: if hit { theme.fg } else { theme.muted }, size: 0.85em, str(n))))
            // The outset fills the row gap, so consecutive highlighted lines form one band.
            rows.push(if hit { block(width: 100%, fill: mark-fill, outset: (left: 0.5em, right: 4pt * zoom, y: 0.3em), line) } else { line })
          }
          grid(
            columns: (if first + lines.len() > 100 { 2.2em } else { 1.5em }, 1fr),
            column-gutter: 1em,
            row-gutter: 0.6em,
            ..rows
          )
        }
      }
    )
  }

  show raw.where(block: false): it => {
    set text(dir: ltr, font: (code-font, persian-font), size: 9pt * zoom, tracking: 0pt)
    box(
      fill: theme.code-bg,
      stroke: 0.5pt * zoom + theme.code-stroke,
      radius: feel.inline,
      inset: (x: 3pt * zoom, y: 0pt),
      outset: (y: 3pt * zoom),
      it
    )
  }

  show quote.where(block: true): it => context {
    let rtl_flag = content-dir(it) != ltr
    let stroke-prop = if rtl_flag { (right: 2.5pt * zoom + theme.accent) } else { (left: 2.5pt * zoom + theme.accent) }
    block(
      above: 1.5em,
      below: 1.5em,
      pad(
        x: 1.5em,
        block(
          width: 100%,
          stroke: stroke-prop,
          inset: (x: 1.0em, y: 0.2em),
          {
            set text(dir: if rtl_flag { rtl } else { ltr })
            text(style: "italic", fill: theme.muted, it)
          }
        )
      )
    )
  }

  // rules = academic top/bottom rules; lined = light frame, tinted header, row lines;
  // card = rounded card, colored header, striped rows.
  let style = feel.table
  let header-tint = if style == "card" { 16% } else { 8% }
  // Rounder corners need more room so the corner cells don't look cramped.
  let inset-x = if style == "card" { 1.3em } else { 0.8em }
  show table: set text(size: 9pt * zoom)
  // [paragraph] justify is for body text; narrow cells would get stretched word gaps.
  show table: set par(justify: false)
  show table: set table(
    align: center + horizon,
    inset: (x: inset-x, y: if style == "card" { 0.8em } else { 0.6em }),
    fill: (x, y) => if style == "rules" { none }
      else if y == 0 { color.mix((theme.bg, 100% - header-tint), (theme.secondary, header-tint)) }
      else if style == "card" and calc.even(y) { theme.code-bg },
    stroke: (x, y) => if style == "rules" { if y == 0 { (bottom: 0.5pt * zoom + theme.rule) } }
      else if style == "lined" and y > 0 { (top: 0.5pt * zoom + theme.code-stroke) },
  )
  show table.cell.where(y: 0): it => if style == "rules" { it } else {
    set text(weight: "bold", fill: theme.heading)
    it
  }
  show figure.where(kind: table): set figure.caption(position: top)
  show figure.where(kind: raw): set figure.caption(position: top)

  set math.equation(numbering: if equation-mode == "all" { equation-numbering } else { none })
  // In "labelled" mode an equation preceded by `equation-next` is rebuilt with a number.
  show math.equation.where(block: true): it => {
    if equation-mode != "labelled" or it.numbering != none { return it }
    context if equation-next.get() == none { it } else {
      math.equation(it.body, block: true, numbering: equation-numbering)
    }
  }
  // Options come from a `{width=full align=left caption="..." #id}` line above the table
  // (see `table-attrs` in main.typ); they apply to that one table and are then cleared.
  show table: it => context {
    let opts = table-options.get()
    for key in opts.keys() {
      assert(key in table-option-keys, message: "Unknown table option " + repr(key) + "; available: " + table-option-keys.join(", "))
    }
    let width = opts.at("width", default: table-defaults.at("width", default: "auto"))
    assert(width in ("auto", "full"), message: "Table width must be auto or full, got " + repr(width))
    let a = opts.at("align", default: inherited-align(table-defaults.at("align", default: "center")))
    assert(a in align-names, message: "Table align must be one of " + align-names.keys().join(", ") + ", got " + repr(a))
    let full = width == "full"
    // `head-align` / `body-align` set the text alignment of the header row / the other rows and win over the
    // column colons (`:---`, `---:`) of the Markdown separator row.
    let cell-align(key) = {
      let v = opts.at(key, default: none)
      if v == none { return none }
      assert(v in align-names, message: "Table " + key + " must be one of " + align-names.keys().join(", ") + ", got " + repr(v))
      align-names.at(v) + horizon
    }
    let body-align = cell-align("body-align")
    let head-align = cell-align("head-align")
    // Column alignments given to table() (the Markdown colons) beat set rules and cell show rules, so the
    // table is rebuilt with an `align` function; the rebuilt copy has a function there, which stops the loop.
    let with-cell-align(tbl) = {
      let fields = tbl.fields()
      let children = fields.remove("children")
      let original = tbl.align
      fields.insert("align", (x, y) => {
        if y == 0 and head-align != none { head-align }
        else if y > 0 and body-align != none { body-align }
        else if type(original) == array { original.at(calc.rem(x, original.len())) }
        else if type(original) == function { original(x, y) }
        else { original }
      })
      table(..fields, ..children)
    }
    let it = if (head-align != none or body-align != none) and type(it.align) != function { with-cell-align(it) } else { it }
    // `span=all`: in a multi-column document the table floats to the top or bottom of the page
    // across all columns. A full-width table is placed before it is measured, so its rebuilt
    // copy (which comes back through this rule with explicit widths) is not placed again.
    let span = opts.at("span", default: table-defaults.at("span", default: "column"))
    assert(span in ("column", "all"), message: "Table span must be column or all, got " + repr(span))
    let spanning = span == "all" and column-count > 1
    let float-wide(body) = place(auto, scope: "parent", float: true, clearance: 1.5em, body)

    if full and not table-has-widths(it) {
      let rebuilt = layout(region => table-full-width(it, region.width, inset-x.to-absolute()))
      if spanning { float-wide(rebuilt) } else { rebuilt }
    } else {
      let framed = if style == "rules" {
        block(width: if full { 100% } else { auto }, stroke: (top: 1pt * zoom + theme.rule, bottom: 1pt * zoom + theme.rule), inset: 0pt, it)
      } else {
        block(width: if full { 100% } else { auto }, radius: feel.box, clip: true, stroke: 0.5pt * zoom + theme.code-stroke, it)
      }
      let caption = opts.at("caption", default: none)
      let id = opts.at("id", default: none)
      let placed = if caption == none and id == none { framed } else {
        let detected = if caption != none { content-dir(caption) }
        let d = if detected == none { last-dir.get() } else { detected }
        set text(dir: d)
        let fig = figure(
          framed,
          kind: table,
          caption: caption,
          supplement: if d == rtl [جدول] else [Table],
          numbering: n => numbering(if d == rtl { "۱" } else { "1" }, n),
        )
        block(width: if full { 100% } else { auto }, if id != none [#fig#label(id)] else { fig })
      }
      let aligned = align(align-names.at(a), placed)
      if spanning and not (full and table-has-widths(it)) { float-wide(aligned) } else { aligned }
      table-options.update((:))
    }
  }

  if sys.inputs.at("cover", default: repr(cover-config.at("enabled", default: cover-config.len() > 0))) == "true" { cover-page() }
  doc
}
