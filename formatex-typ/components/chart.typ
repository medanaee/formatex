#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/widgets.typ": *

// <chart>: a table with the labels in its first column and one series per other column.
#let chart-types = ("bar", "line", "pie", "donut")

#let chart-hues = (
  theme.accent, color-presets.teal, color-presets.pink, color-presets.yellow,
  color-presets.purple, color-presets.green, color-presets.red, color-presets.blue,
)

// formal: shades of the accent alternating with neutral greys, like a printed report.
#let chart-formal-hues = {
  let tone(c, p) = color.mix((c, p), (theme.bg, 100% - p))
  if theme.dark {
    (theme.accent, tone(theme.fg, 55%), color.mix((theme.accent, 55%), (theme.fg, 45%)), tone(theme.fg, 85%), tone(theme.accent, 55%), tone(theme.fg, 32%))
  } else {
    (theme.accent.darken(20%), tone(theme.fg, 45%), tone(theme.accent, 45%), tone(theme.fg, 75%), color.mix((theme.accent, 70%), (theme.fg, 30%)), tone(theme.fg, 22%))
  }
}

// Text drawn on a chart colour: the darker or the lighter of the theme's fg/bg.
#let chart-ink(c) = {
  let light = luma(c).components().first() > 58%
  if light != theme.dark { theme.fg } else { theme.bg }
}

// Axis from lo to hi in steps of 1, 2, 2.5 or 5 × a power of ten, about five of them.
#let chart-scale(lo, hi) = {
  let top-value = if hi == lo { lo + 1 } else { hi }
  let raw = (top-value - lo) / 5
  let mag = calc.pow(10.0, calc.floor(calc.log(raw, base: 10)))
  let norm = raw / mag
  let step = mag * if norm <= 1 { 1 } else if norm <= 2 { 2 } else if norm <= 2.5 { 2.5 } else if norm <= 5 { 5 } else { 10 }
  (bottom: calc.floor(lo / step + 1e-9) * step, top: calc.ceil(top-value / step - 1e-9) * step, step: step)
}

#let find-table(it) = {
  if type(it) == array {
    for c in it {
      let found = find-table(c)
      if found != none { return found }
    }
    return none
  }
  if type(it) != content { return none }
  if it.func() == table { return it }
  if it.has("children") { return find-table(it.children) }
  if it.has("body") { return find-table(it.body) }
  if it.has("child") { return find-table(it.child) }
  none
}

#let chart-data(attrs, body) = {
  let rows = if "src" in attrs { csv(root-path(attrs.src)) } else {
    let t = find-table(body)
    assert(t != none, message: at-of(attrs) + "<chart> needs a Markdown table inside it, or src=\"data.csv\"")
    let cols = if type(t.columns) == int { t.columns } else { t.columns.len() }
    let cells = ()
    for c in t.children {
      if c.func() == table.header {
        cells += c.children.map(x => if x.func() == table.cell { x.body } else { x })
      } else if c.func() == table.cell {
        cells.push(c.body)
      } else if c.func() not in (table.hline, table.vline, table.footer) {
        cells.push(c)
      }
    }
    range(calc.div-euclid(cells.len(), cols)).map(i => cells.slice(i * cols, (i + 1) * cols))
  }
  assert(
    rows.len() >= 2 and rows.first().len() >= 2,
    message: at-of(attrs) + "<chart> needs a header row, at least one data row, a label column and at least one value column",
  )
  let header = rows.first()
  let data-rows = rows.slice(1)
  (
    labels: data-rows.map(row => row.first()),
    series: range(1, header.len()).map(k => (
      name: header.at(k),
      values: data-rows.map(row => chart-number(plain-text(row.at(k, default: "")), "column " + repr(plain-text(header.at(k))), attrs: attrs)),
    )),
  )
}

#let chart-block(attrs, body) = {
  let kind = attrs.at("type", default: "bar")
  assert(kind in chart-types, message: at-of(attrs) + "<chart> type must be one of " + chart-types.join(", ") + ", got " + repr(kind))
  let flag(key, default, allowed) = {
    let v = attrs.at(key, default: default)
    assert(v in allowed, message: at-of(attrs) + "<chart> " + key + " must be one of " + allowed.join(", ") + ", got " + repr(v))
    v
  }
  let data = chart-data(attrs, body)
  let round = kind in ("pie", "donut")
  if round { assert(data.series.len() == 1, message: at-of(attrs) + "<chart type=\"" + kind + "\"> takes one value column, got " + str(data.series.len())) }
  let hues = if "colors" in attrs {
    attrs.colors.split(",").map(c => c.trim()).filter(c => c != "").map(c => {
      if c in color-presets { color-presets.at(c) } else if c == "accent" { theme.accent } else {
        assert(c.starts-with("#"), message: at-of(attrs) + "<chart> colors: unknown color " + repr(c) + "; use accent, a hex color or one of: " + color-names.join(", ") + " (optionally with a shade, like blue-200)")
        rgb(c)
      }
    })
  } else if feel-name == "formal" { chart-formal-hues } else { chart-hues }
  let color-at(i) = {
    let hue = hues.at(calc.rem(i, hues.len()))
    if theme.dark and hues != chart-formal-hues { hue.lighten(12%) } else { hue }
  }
  let show-values = flag("values", "false", ("true", "false")) == "true"
  let legend = flag("legend", "auto", ("auto", "true", "false"))
  let show-legend = if legend == "auto" { round or data.series.len() > 1 } else { legend == "true" }
  let unit = attrs.at("unit", default: none)
  let width = parse-length(attrs.at("width", default: "100%"), attrs: attrs)
  let height = parse-length(attrs.at("height", default: if round { "150" } else { "170" }), attrs: attrs)
  let x-title = attrs.at("x-title", default: none)
  let y-title = attrs.at("y-title", default: none)
  let caption = attrs.at("caption", default: none)

  context {
    let d = resolve-dir(attrs.at("dir", default: "auto"), if caption != none { caption } else { [#data.labels.map(l => [#l ]).join()] })
    let r = d == rtl
    set text(dir: d)
    let label-text(l, ..args) = {
      let ld = content-dir([#l])
      text(dir: if ld == none { d } else { ld }, ..args, l)
    }
    let plot = layout(region => {
      // The geometry is laid out left to right (place() anchors at the start side); labels keep their own direction.
      set text(dir: ltr, size: 8pt * zoom, fill: theme.muted)
      let full-w = if type(width) == ratio { width * region.width } else { calc.min(width.to-absolute(), region.width) }
      let full-h = height.to-absolute()
      // Positions are computed left to right; `fx` mirrors them in RTL.
      let fx(x, w) = if r { full-w - x - w } else { x }
      let put(x, y, ax, ay, it) = {
        let m = measure(it)
        place(top + left, dx: x - m.width * ax, dy: y - m.height * ay, it)
      }
      let marks = ()
      let n = data.labels.len()

      if round {
        let values = data.series.first().values.map(v => if v == none { 0 } else { v })
        assert(values.all(v => v >= 0), message: at-of(attrs) + "<chart type=\"" + kind + "\"> values must not be negative")
        let total = values.sum()
        assert(total > 0, message: at-of(attrs) + "<chart type=\"" + kind + "\"> needs at least one value above zero")
        let radius = calc.min(full-w, full-h) / 2 - 2pt * zoom
        let (cx, cy) = (full-w / 2, full-h / 2)
        let side = if r { -1 } else { 1 }
        // The feel sets the gap between slices, their corner rounding and the donut's ring width.
        let slice-gap = (if feel-name == "formal" { 0.8pt } else if feel-name == "friendly" { 3pt } else { 1.6pt }) * zoom
        let corner = feel.badge / 2
        let hole = if kind == "donut" { radius * (if feel-name == "formal" { 0.5 } else if feel-name == "friendly" { 0.58 } else { 0.54 }) } else { 0pt }
        let point(d, a) = (cx + side * d * calc.cos(a), cy + d * calc.sin(a))
        let arc(d, from, to) = {
          let steps = calc.max(2, int(calc.ceil(calc.abs((to - from) / 2deg))))
          range(steps + 1).map(j => point(d, from + (to - from) * j / steps))
        }
        // The slice is shrunk by its corner radius and drawn with a round-joined stroke of twice
        // that width, which grows it back with rounded corners.
        let slice(a0, sweep, c) = {
          let half = calc.sin(sweep / 2)
          let inner = if hole > 0pt { hole } else { radius }
          let t = calc.min(corner, inner * half * 0.35, (radius - hole) / 4)
          let e = t + calc.min(slice-gap, inner * half * 0.3) / 2
          let outer-d = radius - t
          let da = calc.asin(e / outer-d)
          let pts = arc(outer-d, a0 + da, a0 + sweep - da)
          pts += if hole > 0pt {
            let inner-d = hole + t
            let di = calc.asin(calc.min(1, e / inner-d))
            arc(inner-d, a0 + sweep - di, a0 + di)
          } else {
            (point(if half > 0.001 { e / half } else { 0pt }, a0 + sweep / 2),)
          }
          place(top + left, curve(
            fill: c,
            stroke: if t > 0pt { (paint: c, thickness: 2 * t, join: "round") } else { none },
            curve.move(pts.first()),
            ..pts.slice(1).map(p => curve.line(p)),
            curve.close(),
          ))
        }
        let start = -90deg
        for (i, v) in values.enumerate() {
          if v == 0 { continue }
          let sweep = v / total * 360deg
          marks.push(slice(start, sweep, color-at(i)))
          if sweep >= 22deg {
            let mid = start + sweep / 2
            let at = if kind == "donut" { (radius + hole) / 2 } else { radius * 0.62 }
            marks.push(put(..point(at, mid), 0.5, 0.5, text(
              fill: chart-ink(color-at(i)),
              size: if kind == "donut" { 0.9em } else { 1em },
              weight: if feel-name == "formal" { "regular" } else { "bold" },
              chart-label(calc.round(v / total * 100, digits: 1), "%", r),
            )))
          }
          start += sweep
        }
        if kind == "donut" {
          if show-values {
            marks.push(put(cx, cy, 0.5, 0.5, text(fill: theme.fg, weight: "bold", size: 1.3em, chart-label(total, unit, r))))
          }
        }
      } else {
        let all = data.series.map(s => s.values).flatten().filter(v => v != none)
        assert(all.len() > 0, message: at-of(attrs) + "<chart> has no values")
        let lo = if "min" in attrs { chart-number(attrs.min, "min", attrs: attrs) } else if kind == "bar" { calc.min(0, ..all) } else { calc.min(..all) }
        let hi = if "max" in attrs { chart-number(attrs.max, "max", attrs: attrs) } else if kind == "bar" { calc.max(0, ..all) } else { calc.max(..all) }
        // Labels under the lowest line points need room above the category labels.
        let axis = chart-scale(if kind == "line" and show-values and "min" not in attrs { lo - (hi - lo) * 0.12 } else { lo }, hi)
        let axis-min = if "min" in attrs { lo } else { axis.bottom }
        let axis-max = if "max" in attrs { hi } else { axis.top }
        assert(axis-max > axis-min, message: at-of(attrs) + "<chart> max must be greater than min")
        let ticks = range(int(calc.ceil(axis-min / axis.step - 1e-9)), int(calc.floor(axis-max / axis.step + 1e-9)) + 1).map(k => k * axis.step)
        let tick-labels = ticks.map(v => chart-label(v, unit, r))
        let gap = 0.6em.to-absolute()
        let tick-w = calc.max(..tick-labels.map(t => measure(t).width)) + gap
        let y-title-text = if y-title != none {
          let t = label-text(y-title)
          rotate(-90deg, reflow: true, box(width: measure(t).width, t))
        }
        let y-title-w = if y-title != none { measure(y-title-text).width + gap } else { 0pt }
        let plot-left = y-title-w + tick-w
        let slot = (full-w - plot-left) / n
        let category(l) = box(width: slot - 0.3em, align(center, label-text(l, fill: theme.fg, size: 8.5pt * zoom)))
        let category-h = calc.max(..data.labels.map(l => measure(category(l)).height))
        let x-title-text = if x-title != none { label-text(x-title) }
        let x-title-h = if x-title != none { measure(x-title-text).height + gap } else { 0pt }
        let plot-top = (if show-values { 1.3em } else { 0.6em }).to-absolute()
        let plot-bottom = full-h - category-h - gap - x-title-h
        assert(plot-bottom - plot-top > 20pt * zoom, message: at-of(attrs) + "<chart> is too small for its labels; give it a larger height")
        let yv(v) = plot-bottom - (v - axis-min) / (axis-max - axis-min) * (plot-bottom - plot-top)

        for (v, t) in ticks.zip(tick-labels) {
          let y = yv(v)
          marks.push(place(dx: fx(plot-left, full-w - plot-left), dy: y, line(
            length: full-w - plot-left,
            stroke: if v == 0 { 0.7pt * zoom + theme.rule } else { 0.4pt * zoom + theme.code-stroke },
          )))
          marks.push(put(fx(plot-left - gap, 0pt), y, if r { 0 } else { 1 }, 0.5, t))
        }
        if feel-name == "formal" {
          marks.push(place(dx: fx(plot-left, 0pt), dy: plot-top, line(angle: 90deg, length: plot-bottom - plot-top, stroke: 0.6pt * zoom + theme.rule)))
        }
        for (i, l) in data.labels.enumerate() {
          marks.push(place(dx: fx(plot-left + slot * i + 0.15em, slot - 0.3em), dy: plot-bottom + gap, category(l)))
        }
        if x-title != none { marks.push(put(fx(plot-left + (full-w - plot-left) / 2, 0pt), full-h, 0.5, 1, x-title-text)) }
        if y-title != none { marks.push(put(fx(0pt, y-title-w - gap), (plot-top + plot-bottom) / 2, 0, 0.5, y-title-text)) }
        let value-label(v) = text(fill: theme.fg, size: 0.9em, chart-label(v, unit, r))

        if kind == "bar" {
          let count = data.series.len()
          let group = slot * 0.72
          let bar-w = group / count
          let base = calc.max(axis-min, calc.min(0, axis-max))
          let base-y = yv(base)
          let corner = calc.min(feel.badge, bar-w / 2.5)
          for (k, s) in data.series.enumerate() {
            for (i, v) in s.values.enumerate() {
              if v == none { continue }
              let w = if count == 1 { bar-w } else { bar-w * 0.88 }
              let x = plot-left + slot * i + (slot - group) / 2 + bar-w * k + (bar-w - w) / 2
              let y = yv(calc.max(axis-min, calc.min(v, axis-max)))
              marks.push(place(dx: fx(x, w), dy: calc.min(y, base-y), rect(
                width: w,
                height: calc.abs(base-y - y),
                fill: color-at(k),
                radius: if v >= base { (top: corner) } else { (bottom: corner) },
              )))
              if show-values {
                marks.push(if v >= base {
                  put(fx(x + w / 2, 0pt), y - 0.25em, 0.5, 1, value-label(v))
                } else {
                  put(fx(x + w / 2, 0pt), y + 0.25em, 0.5, 0, value-label(v))
                })
              }
            }
          }
        } else {
          let thickness = (if feel-name == "formal" { 1pt } else if feel-name == "friendly" { 1.8pt } else { 1.4pt }) * zoom
          let dot-size = (if feel-name == "friendly" { 5pt } else { 4.2pt }) * zoom
          let rounded = feel-name != "formal"
          for (k, s) in data.series.enumerate() {
            let c = color-at(k)
            let points = range(n).filter(i => s.values.at(i) != none).map(i => (fx(plot-left + slot * (i + 0.5), 0pt), yv(s.values.at(i)), s.values.at(i), i))
            if points.len() > 1 {
              marks.push(place(curve(
                stroke: (paint: c, thickness: thickness, join: if rounded { "round" } else { "miter" }, cap: if rounded { "round" } else { "butt" }),
                curve.move((points.first().at(0), points.first().at(1))),
                ..points.slice(1).map(p => curve.line((p.at(0), p.at(1)))),
              )))
            }
            for (x, y, v, i) in points {
              let dot = if feel-name == "formal" {
                rect(width: dot-size, height: dot-size, fill: theme.bg, stroke: 0.9pt * zoom + c)
              } else if feel-name == "friendly" {
                circle(radius: dot-size / 2, fill: c, stroke: 1pt * zoom + theme.bg)
              } else {
                rect(width: dot-size, height: dot-size, fill: c, radius: calc.min(feel.badge, dot-size / 3))
              }
              marks.push(place(dx: x - dot-size / 2, dy: y - dot-size / 2, dot))
              if show-values {
                // The lowest series at a point is labelled below it, so neighbouring labels do not collide.
                let others = data.series.map(o => o.values.at(i)).filter(o => o != none)
                let below = others.len() > 1 and v == calc.min(..others) and k == data.series.position(o => o.values.at(i) == v)
                marks.push(if below {
                  put(x, y + dot-size / 2 + 0.25em, 0.5, 0, value-label(v))
                } else {
                  put(x, y - dot-size / 2 - 0.25em, 0.5, 1, value-label(v))
                })
              }
            }
          }
        }
      }
      align(center, box(width: full-w, height: full-h, marks.join()))
    })

    let entries = if round {
      let values = data.series.first().values.map(v => if v == none { 0 } else { v })
      data.labels.zip(values).enumerate().map(((i, (l, v))) => (color-at(i), if show-values [#label-text(l): #chart-label(v, unit, r)] else { label-text(l) }))
    } else {
      data.series.enumerate().map(((k, s)) => (color-at(k), label-text(s.name)))
    }
    let swatch(c) = box(rect(
      width: 0.8em,
      height: 0.8em,
      fill: c,
      radius: if feel-name == "friendly" { 50% } else { calc.min(feel.badge, 2pt * zoom) },
    ))
    block(width: 100%, {
      plot
      if show-legend {
        v(0.6em)
        set text(size: 8.5pt * zoom)
        align(center, entries.map(((c, l)) => box[#swatch(c)#h(0.4em)#l]).join(h(1.2em)))
      }
    })
  }
}

#let chart-tags = (
    chart: (attrs, body) => {
      let to = attrs.at("dir", default: "auto")
      assert(to in ("rtl", "ltr", "auto"), message: at-of(attrs) + "<chart> dir must be rtl, ltr or auto, got " + repr(to))
      if to == "auto" { caption-figure(attrs, "chart", chart-block(attrs, body)) } else {
        dir-stack.update(s => s + (to,))
        caption-figure(attrs, "chart", chart-block(attrs, body))
        dir-stack.update(s => s.slice(0, -1))
      }
    },
)

#let chart-schema = (
  "chart": (
    kind: "block",
    description: (en: "data charts", fa: "نمودار داده"),
    attrs: (
      "type": (type: "enum", values: ("bar", "line", "pie", "donut"), default: "bar", doc: (en: "`bar` (default), `line`, `pie`, `donut`.", fa: "`bar` (پیش‌فرض)، `line`، `pie`، `donut`.")),
      "src": (type: "path", doc: (en: "CSV file with the same layout as the table, relative to the project root.", fa: "فایل CSV با همان چیدمان جدول، نسبت به پوشهٔ ریشهٔ پروژه.")),
      "values": (type: "bool", default: "false", doc: (en: "`false` (default) or `true`: print the values on the bars / points. On pie / donut the legend shows the values too, and a donut shows the total in its centre.", fa: "`false` (پیش‌فرض) یا `true`: مقدارها روی میله‌ها / نقطه‌ها چاپ می‌شوند. در `pie` / `donut` راهنما هم مقدارها را نشان می‌دهد و نمودار حلقه‌ای جمع کل را در مرکزش می‌نویسد.")),
      "legend": (type: "enum", values: ("auto", "true", "false"), default: "auto", doc: (en: "`auto` (default: shown for pie / donut or when there is more than one series), `true`, `false`.", fa: "`auto` (پیش‌فرض: برای `pie` / `donut` یا وقتی بیش از یک سری هست نمایش داده می‌شود)، `true`، `false`.")),
      "unit": (type: "string", doc: (en: "Suffix after values and axis ticks, e.g. `%` or `h`.", fa: "پسوند بعد از مقدارها و عددهای محور، مثلاً `%` یا `h`.")),
      "width": (type: "length", default: "100%", doc: (en: "Length or `%` of the line width. Default `100%`.", fa: "طول یا `%` از پهنای خط. پیش‌فرض `100%`.")),
      "height": (type: "length", doc: (en: "Bare number (points) or length. Default `150` for pie / donut, `170` otherwise.", fa: "عدد تنها (پوینت) یا طول. پیش‌فرض برای `pie` / `donut` مقدار `150` و برای بقیه `170`.")),
      "x-title": (type: "string", doc: (en: "Axis titles (bar and line). The y title is rotated.", fa: "عنوان محورها (میله‌ای و خطی). عنوان محور عمودی چرخانده می‌شود.")),
      "y-title": (type: "string", doc: (en: "Axis titles (bar and line). The y title is rotated.", fa: "عنوان محورها (میله‌ای و خطی). عنوان محور عمودی چرخانده می‌شود.")),
      "min": (type: "number", doc: (en: "Fix the value axis range. Without them a round scale is chosen automatically; bar charts always include 0.", fa: "بازهٔ محور مقدار را ثابت می‌کنند. بدون آن‌ها یک مقیاس رُند خودکار انتخاب می‌شود؛ نمودار میله‌ای همیشه صفر را دربر دارد.")),
      "max": (type: "number", doc: (en: "Fix the value axis range. Without them a round scale is chosen automatically; bar charts always include 0.", fa: "بازهٔ محور مقدار را ثابت می‌کنند. بدون آن‌ها یک مقیاس رُند خودکار انتخاب می‌شود؛ نمودار میله‌ای همیشه صفر را دربر دارد.")),
      "colors": (type: "string", doc: (en: "Comma-separated colors, one per series (per slice on pie / donut), reused in turn: color presets, `accent`, or hex `#rrggbb`. Default: the theme's accent, then teal, pink, yellow, purple, green, red, blue.", fa: "رنگ‌های جداشده با ویرگول، یکی برای هر سری (در `pie` / `donut` برای هر برش)، که به نوبت تکرار می‌شوند: رنگ‌های آماده، `accent` یا hex به شکل `#rrggbb`. پیش‌فرض: رنگ تأکید تم، سپس teal، pink، yellow، purple، green، red، blue.")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`auto` (default: from the caption, else the labels; follows the `dir` setting and `<dir>`), `rtl`, `ltr`.", fa: "`auto` (پیش‌فرض: از عنوان، وگرنه از برچسب‌ها؛ از تنظیم `dir` و `<dir>` پیروی می‌کند)، `rtl`، `ltr`.")),
      "caption": (type: "string", doc: (en: "Numbered caption below the chart: «شکل ۱: ...» / \"Figure 1: ...\". Listed in `<lof>`. Not parsed as Markdown.", fa: "عنوان شماره‌دار زیر نمودار: «شکل ۱: ...» / \"Figure 1: ...\". در `<lof>` می‌آید. Markdown داخلش پردازش نمی‌شود.")),
      "id": (type: "string", doc: (en: "Target for `<ref>`. Gives a number even without a caption.", fa: "هدف `<ref>`. حتی بدون عنوان هم شماره می‌دهد.")),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: (en: "`column` (default) or `all`, as on `<tree>`.", fa: "`column` (پیش‌فرض) یا `all`، مثل `<tree>`.")),
    ),
  ),
)



