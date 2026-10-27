#import "/src/kit.typ": *

// <compare>: <pros> and <cons> side by side, list items marked with ✓ / ✗.
#let compare-block(attrs, body) = {
  let sides = untag(body, "compare-side").tagged
  assert(sides.len() > 0, message: at-of(attrs) + "<compare> needs <pros> and/or <cons> inside it")
  context {
    let d = resolve-dir(attrs.at("dir", default: "auto"), sides.map(s => s.body).join())
    let r = d == rtl
    set text(dir: d)
    let column(s) = {
      let pro = s.attrs.side == "pros"
      let hue = pick-hue(s.attrs.at("color", default: none), s.attrs.side, if pro { color-presets.green } else { color-presets.red }, attrs: s.attrs)
      let tint = tinted(hue)
      let title = s.attrs.at("title", default: if pro { if r { "مزایا" } else { "Pros" } } else { if r { "معایب" } else { "Cons" } })
      let mark = text(fill: tint.icon, fa-icon(if feel-name == "friendly" { if pro { "circle-check" } else { "circle-xmark" } } else { if pro { "check" } else { "xmark" } }))
      let head = text(weight: "bold", fill: tint.icon, [#fa-icon(if pro { "thumbs-up" } else { "thumbs-down" })#h(0.5em)#title])
      (tint: tint, hue: hue, inner: {
        block(below: 0.8em, head)
        set list(marker: mark)
        block(width: 100%, s.body)
      })
    }
    let cols = sides.map(column)
    let gap = 1em.to-absolute()
    layout(size => {
      let w = (size.width - gap * (cols.len() - 1)) / cols.len()
      let frame(c, h) = if feel-name == "formal" {
        block(width: w, height: h, stroke: (top: 1.2pt * zoom + c.tint.icon), inset: (top: 0.7em, bottom: 0.4em), c.inner)
      } else if feel-name == "friendly" {
        block(width: w, height: h, fill: color.mix((c.hue, if theme.dark { 22% } else { 14% }), (theme.bg, if theme.dark { 78% } else { 86% })), radius: feel.box, inset: 12pt * zoom, c.inner)
      } else {
        block(width: w, height: h, fill: c.tint.fill, stroke: 0.6pt * zoom + c.tint.border, radius: feel.box, inset: 10pt * zoom, c.inner)
      }
      let tallest = calc.max(..cols.map(c => measure(frame(c, auto)).height))
      grid(columns: cols.len(), column-gutter: gap, ..cols.map(c => frame(c, tallest)))
    })
  }
}

#let compare-tags = (
    pros: (attrs, body) => tag("compare-side", attrs + (side: "pros"), body),
    cons: (attrs, body) => tag("compare-side", attrs + (side: "cons"), body),
    compare: (attrs, body) => compare-block(attrs, body),
)

#let compare-schema = (
  "compare": (
    kind: "block",
    description: (en: "pros and cons", fa: "مزایا و معایب"),
    attrs: (
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`auto` (default: from the content), `rtl`, `ltr`.", fa: "جهت: `auto` (پیش‌فرض: از روی محتوا)، `rtl`، `ltr`.")),
    ),
    children: ("pros", "cons"),
  ),
  "pros": (
    kind: "block",
    scoped: true,
    description: (en: "Pros column of <compare>", fa: "ستون مزایای <compare>"),
    attrs: (
      "title": (type: "string", doc: (en: "Column title. Default «مزایا» / \"Pros\" and «معایب» / \"Cons\", by the direction.", fa: "عنوان ستون. پیش‌فرض «مزایا» / \"Pros\" و «معایب» / \"Cons\"، بسته به جهت.")),
      "color": (type: "color", default: "green", doc: (en: "A color preset, `accent`, or a hex color. Default `green` for pros, `red` for cons.", fa: "یک رنگ آماده، `accent` یا رنگ hex. پیش‌فرض `green` برای مزایا و `red` برای معایب.")),
    ),
  ),
  "cons": (
    kind: "block",
    scoped: true,
    description: (en: "Cons column of <compare>", fa: "ستون معایب <compare>"),
    attrs: (
      "title": (type: "string", doc: (en: "Column title. Default «مزایا» / \"Pros\" and «معایب» / \"Cons\", by the direction.", fa: "عنوان ستون. پیش‌فرض «مزایا» / \"Pros\" و «معایب» / \"Cons\"، بسته به جهت.")),
      "color": (type: "color", default: "red", doc: (en: "A color preset, `accent`, or a hex color. Default `green` for pros, `red` for cons.", fa: "یک رنگ آماده، `accent` یا رنگ hex. پیش‌فرض `green` برای مزایا و `red` برای معایب.")),
    ),
  ),
)



