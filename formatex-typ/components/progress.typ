#import "/src/kit.typ": *

// <progress>: a list of "label: value" lines (one bar each), or one bar from `value` with the body as its label.
#let progress-styles = ("bar", "stars", "dots")

#let progress-block(attrs, body) = {
  let style = flag-attr(attrs, "style", "bar", progress-styles, "progress")
  let max-value = chart-number(attrs.at("max", default: if style == "bar" { "100" } else { "5" }), "max", attrs: attrs)
  assert(max-value != none and max-value > 0, message: at-of(attrs) + "<progress> max must be a number above zero")
  let show-values = flag-attr(attrs, "values", "true", ("true", "false"), "progress") == "true"
  let found = find-first(body, list)
  let rows = if found != none {
    found.children.map(item => {
      let s = plain-text(item.body).trim()
      let m = s.match(regex("^(.*)[:：]\s*([^:：]+)$"))
      assert(m != none, message: at-of(attrs) + "<progress> list items must look like \"label: value\", got " + repr(s))
      (label: m.captures.first().trim(), value: chart-number(m.captures.last(), repr(s), attrs: attrs))
    })
  } else {
    assert("value" in attrs, message: at-of(attrs) + "<progress> needs value=\"...\" or a list of \"label: value\" lines")
    let label-text = plain-text(body).trim()
    ((label: if label-text == "" { none } else { body }, value: chart-number(attrs.value, "value", attrs: attrs)),)
  }
  for row in rows {
    assert(row.value != none and row.value >= 0, message: at-of(attrs) + "<progress> values must be numbers of zero or more")
  }
  let hue = pick-hue(attrs.at("color", default: none), "progress", if feel-name == "formal" { theme.heading } else { theme.accent }, attrs: attrs)
  let tint = tinted(hue)
  let strong = if theme.dark { hue.lighten(15%) } else { hue }

  // Fills `frac` of a shape from the start side.
  let filled(frac, w, h, corner, stroke) = block(
    width: w, height: h, fill: tint.fill, stroke: stroke, radius: corner, clip: true, spacing: 0pt,
    align(start, block(width: calc.clamp(frac, 0, 1) * 100%, height: 100%, fill: strong, spacing: 0pt)),
  )
  let indicator(v, d) = {
    let frac = v / max-value
    if style == "bar" {
      let bar-h = (if feel-name == "formal" { 5pt } else if feel-name == "friendly" { 8pt } else { 6pt }) * zoom
      let corner = if feel-name == "friendly" { bar-h / 2 } else { calc.min(feel.badge / 2, bar-h / 2) }
      filled(frac, 100%, bar-h, corner, if feel-name == "formal" { 0.5pt * zoom + tint.border })
    } else if style == "dots" {
      let s = 0.8em.to-absolute()
      let corner = if feel-name == "friendly" { s / 2 } else { calc.min(feel.badge / 2, s / 4) }
      let n = int(calc.ceil(max-value))
      box(stack(dir: d, spacing: 0.3em, ..range(n).map(i => box(filled(v - i, s, s, corner, 0.6pt * zoom + if v - i > 0 { strong } else { tint.border })))))
    } else {
      let n = int(calc.ceil(max-value))
      let star = fa-icon("star", solid: true)
      let size = measure(text(star))
      let rtl-fill = d == rtl
      box(stack(dir: d, spacing: 0.15em, ..range(n).map(i => {
        let part = calc.clamp(v - i, 0, 1) * size.width
        box(width: size.width, height: size.height, {
          place(top + left, text(fill: tint.border, star))
          // The filled copy is clipped to the start side's share of the star.
          place(top + if rtl-fill { right } else { left }, box(width: part, height: size.height, clip: true,
            place(top + left, dx: if rtl-fill { part - size.width } else { 0pt }, text(fill: strong, star))))
        })
      })))
    }
  }

  context {
    let d = resolve-dir(attrs.at("dir", default: "auto"), [#rows.map(row => [#row.label ]).join()])
    let r = d == rtl
    set text(dir: d)
    let value-text(v) = text(size: 0.85em, fill: theme.muted, if style == "bar" and max-value == 100 { chart-label(v, "%", r) } else if r [#chart-label(v, none, r) از #chart-label(max-value, none, r)] else [#chart-label(v, none, r)/#chart-label(max-value, none, r)])
    let has-labels = rows.any(row => row.label != none)
    let cells = ()
    for row in rows {
      if has-labels {
        let ld = content-dir([#row.label])
        cells.push(if row.label == none { [] } else { text(dir: if ld == none { d } else { ld }, row.label) })
      }
      cells.push(indicator(row.value, d))
      if show-values { cells.push(value-text(row.value)) }
    }
    let bar-col = if style == "bar" { 1fr } else { auto }
    block(width: 100%, grid(
      columns: (if has-labels { (auto,) } else { () }) + (bar-col,) + (if show-values { (auto,) } else { () }),
      column-gutter: 0.9em,
      row-gutter: 0.7em,
      align: start + horizon,
      ..cells,
    ))
  }
}

#let progress-tags = (
    progress: (attrs, body) => progress-block(attrs, body),
)

#let progress-schema = (
  "progress": (
    kind: "block",
    description: (en: "progress bars and ratings", fa: "نوار پیشرفت و امتیاز"),
    attrs: (
      "style": (type: "enum", values: ("bar", "stars", "dots"), default: "bar", doc: (en: "`bar` (default), `stars`, `dots`.", fa: "نوع نمایش: `bar` (پیش‌فرض)، `stars`، `dots`.")),
      "max": (type: "number", doc: (en: "The full value. Default `100` for `bar`, `5` for `stars` / `dots`. Decimals work: `4.5` gives four and a half stars, or a half-filled dot.", fa: "مقدار کامل. پیش‌فرض برای `bar` عدد `100` و برای `stars` / `dots` عدد `5`. عدد اعشاری هم کار می‌کند: `4.5` یعنی چهار ستاره و نیم، یا نقطه‌ای که نصفش پر است.")),
      "value": (type: "number", doc: (en: "A single bar without a list: its value. The tag's text is the label; an empty tag gives a bar without a label.", fa: "برای یک نوار تنها بدون فهرست: مقدار آن. متن داخل تگ برچسب است؛ تگ خالی نوار بدون برچسب می‌دهد.")),
      "values": (type: "bool", default: "true", doc: (en: "`true` (default) or `false`: the value at the end of each row. A bar with `max` 100 shows a percentage («۷۰٪» / \"70%\"); otherwise «۴٫۵ از ۵» in RTL and \"4.5/5\" in LTR.", fa: "مقدار `true` (پیش‌فرض) یا `false`: نمایش مقدار در انتهای هر ردیف. نوار با `max` برابر ۱۰۰ درصد نشان می‌دهد («۷۰٪» / \"70%\")؛ بقیه در راست‌به‌چپ «۴٫۵ از ۵» و در چپ‌به‌راست \"4.5/5\".")),
      "color": (type: "color", doc: (en: "A color preset, `accent`, or a hex color. Default: the theme's accent (heading color in `formal`).", fa: "یک رنگ آماده، `accent` یا رنگ hex. پیش‌فرض: رنگ تأکید تم (در `formal` رنگ تیترها).")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`auto` (default: from the labels), `rtl`, `ltr`.", fa: "جهت: `auto` (پیش‌فرض: از روی برچسب‌ها)، `rtl`، `ltr`.")),
    ),
  ),
)



