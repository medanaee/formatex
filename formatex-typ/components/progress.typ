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

#let progress-html = (
  progress: (attrs, body) => {
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
    context {
      let d = resolve-dir(attrs.at("dir", default: "auto"), rows.map(row => if row.label == none { [] } else { row.label }).join())
      let r = d == rtl
      let hue = if "color" in attrs { css-color(pick-hue(attrs.color, "progress", theme.accent, attrs: attrs)) } else { "var(--accent)" }
      html.elem("div", attrs: (class: "fx-progress", dir: if r { "rtl" } else { "ltr" }, style: "--progress-ink: " + hue), {
        for row in rows {
          html.elem("div", attrs: (class: "fx-progress-row"), {
            if row.label != none { html.elem("span", attrs: (class: "fx-progress-label"), row.label) }
            html.elem("div", attrs: (class: "fx-progress-indicator", role: "meter", "aria-valuemin": "0", "aria-valuemax": str(max-value), "aria-valuenow": str(row.value)), {
              if style == "bar" {
                html.elem("div", attrs: (class: "fx-progress-track"), html.elem("div", attrs: (class: "fx-progress-fill", style: "width: " + str(calc.clamp(row.value / max-value, 0, 1) * 100) + "%")))
              } else {
                html.elem("div", attrs: (class: "fx-rating"), {
                  for i in range(int(calc.ceil(max-value))) {
                    html.elem("span", attrs: (class: "fx-rating-cell fx-rating-" + style, style: "--part: " + str(calc.clamp(row.value - i, 0, 1) * 100) + "%"), {
                      if style == "stars" { html.elem("span", "★"); html.elem("span", attrs: (class: "fx-rating-filled"), "★") } else { html.elem("span", attrs: (class: "fx-rating-filled"), "") }
                    })
                  }
                })
              }
            })
            if show-values { html.elem("span", attrs: (class: "fx-progress-value"), if style == "bar" and max-value == 100 { chart-label(row.value, "%", r) } else if r [#chart-label(row.value, none, r) از #chart-label(max-value, none, r)] else [#chart-label(row.value, none, r)/#chart-label(max-value, none, r)]) }
          })
        }
      })
    }
  },
)
#let progress-css = `````css
.fx-progress { display: grid; gap: .55em; margin-block: .75em; } .fx-progress-row { display: flex; align-items: center; gap: .7em; } .fx-progress-label { flex: 0 1 24%; min-width: 0; } .fx-progress-indicator { flex: 1; min-width: 0; } .fx-progress-value { font-size: .85em; color: var(--muted); white-space: nowrap; }
.fx-progress-track { height: .55em; background: var(--code-bg); border: 1px solid var(--code-stroke); border-radius: var(--r-badge); overflow: hidden; } .fx-progress-fill { height: 100%; background: var(--progress-ink); }
.fx-rating { display: flex; gap: .2em; flex-wrap: wrap; } .fx-rating-cell { position: relative; display: inline-block; color: var(--rule); line-height: 1; } .fx-rating-filled { position: absolute; inset-inline-start: 0; top: 0; width: var(--part); overflow: hidden; color: var(--progress-ink); } .fx-rating-dots { width: .8em; height: .8em; border: 1px solid var(--rule); border-radius: var(--r-badge); overflow: hidden; } .fx-rating-dots .fx-rating-filled { height: 100%; background: var(--progress-ink); }
`````.text

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

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let progress-docs = (
  en: (
    about: `````md
Progress bars, star ratings and dot ratings from a Markdown list of `label: value` lines (`style` picks the look).

- Put a Markdown list inside: one `label: value` item per row (the value is what follows the last colon; Persian digits work). A list item without `label: value`, a negative value or a `max` of zero is a compile error.
- `style`: `bar` (default), `stars` or `dots`; `max` sets the top of the scale; `values="false"` hides the numbers; `color` takes a preset or hex. A single bar can be written `<progress value="62" color="pink">Overall progress</progress>`.
- The fill grows from the start side (right in Persian). The look follows the feel: thin and square in `formal`, pill-shaped in `friendly`.
`````.text,
  ),
  fa: (
    about: `````md
نوار پیشرفت، امتیاز ستاره‌ای و امتیاز نقطه‌ای از یک فهرست Markdown با خط‌های `label: value` (`style` ظاهر را تعیین می‌کند).

- یک فهرست Markdown داخلش بگذارید: هر ردیف یک آیتم `label: value` (مقدار آنچه بعد از آخرین دونقطه می‌آید؛ ارقام فارسی کار می‌کنند). آیتم بدون `label: value`، مقدار منفی یا `max` برابر صفر خطای ساخت است.
- ‏`style`: ‏`bar` (پیش‌فرض)، `stars` یا `dots`؛ `max` سقف مقیاس را می‌دهد؛ `values="false"` عددها را پنهان می‌کند؛ `color` رنگ آماده یا hex می‌گیرد. یک نوار تنها را می‌توان `<progress value="62" color="pink">پیشرفت کلی</progress>` نوشت.
- پر شدن از سمت شروع است (در فارسی راست). ظاهر از حالت (feel) پیروی می‌کند: باریک و تیز در `formal`، قرصی در `friendly`.
`````.text,
  ),
  example: (
    en: `````md
<progress>

- Design: 100
- Implementation: 70
- Testing: 35

</progress>

<progress style="stars">

- Typst: 4.5
- LaTeX: 3

</progress>

<progress value="62" color="pink">Overall progress</progress>
`````.text,
    fa: `````md
<progress>

- طراحی: ۱۰۰
- پیاده‌سازی: ۷۰
- آزمون: ۳۵

</progress>

<progress style="stars">

- تایپست: ۴٫۵
- لاتک: ۳

</progress>

<progress value="62" color="pink">پیشرفت کلی</progress>
`````.text,
  ),
)
