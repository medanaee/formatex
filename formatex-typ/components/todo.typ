#import "/src/kit.typ": *

// <todo>: draft notes. `todo = "hide"` (config / --input) removes them and <todos> for the final version.
#let todo-mode = sys.inputs.at("todo", default: str(config.at("todo", default: "show")))
#assert(todo-mode in ("show", "hide"), message: setting-prefix("todo") + "todo must be show or hide, got " + repr(todo-mode))

#let todo-block(attrs, body) = {
  if todo-mode == "hide" { return [] }
  let kind = flag-attr(attrs, "type", "note", ("note", "figure"), "todo")
  let tint = tinted(pick-hue(attrs.at("color", default: none), "todo", color-presets.yellow, attrs: attrs))
  let ink = if theme.dark { tint.icon } else { color.mix((tint.icon, 60%), (theme.fg, 40%)) }
  let author = attrs.at("author", default: none)
  let note = plain-text(body).trim()
  let marker = [#metadata((todo-text: if author != none { author + ": " + note } else { note }))<formatex-todo>]
  let is-block = kind == "figure" or (type(body) == content and body.has("children") and body.children.any(c => c.func() in (parbreak, par)))
  let who = if author != none { text(weight: "bold", author + ":") + h(0.35em) }
  if kind == "figure" {
    let box-w = parse-length(attrs.at("width", default: "100%"), attrs: attrs)
    let box-h = parse-length(attrs.at("height", default: "120"), attrs: attrs)
    marker
    align(center, block(
      width: box-w, height: box-h, fill: tint.fill, radius: feel.image, breakable: false,
      stroke: (thickness: 0.8pt * zoom, paint: tint.border, dash: "dashed"),
      align(center + horizon, context {
        let dd = resolve-dir(attrs.at("dir", default: "auto"), body)
        set text(dir: dd, fill: ink)
        stack(spacing: 0.7em, text(size: 2em, fa-icon("image")), [#who#body])
      }),
    ))
  } else if is-block {
    marker
    block(
      width: 100%, fill: tint.fill, radius: feel.alert, inset: (x: 10pt * zoom, y: 8pt * zoom),
      stroke: (thickness: 0.8pt * zoom, paint: tint.border, dash: "dashed"),
      context {
        let dd = resolve-dir(attrs.at("dir", default: "auto"), body)
        set text(dir: dd)
        grid(columns: (auto, 1fr), column-gutter: 0.8em, text(fill: ink, fa-icon("thumbtack")), block(width: 100%, [#who#body]))
      },
    )
  } else {
    marker + box(
      fill: tint.fill, stroke: 0.5pt * zoom + tint.border, radius: feel.badge,
      inset: (x: 4pt * zoom, y: 0pt), outset: (y: 2.5pt * zoom),
      text(size: 0.85em, fill: ink, [#fa-icon("thumbtack")#h(0.3em)#who#body]),
    )
  }
}

#let todo-list(attrs) = {
  if todo-mode == "hide" { return [] }
  context {
    let items = query(<formatex-todo>)
    let d = attrs.at("dir", default: "auto")
    let title = attrs.at("title", default: none)
    let dd = if d == "rtl" { rtl } else if d == "ltr" { ltr } else { resolve-dir("auto", if title != none { title } else { [#items.map(i => i.value.todo-text).join(" ")] }) }
    let r = dd == rtl
    set text(dir: dd)
    block(below: 1.2em, text(size: 1.25em, weight: "bold", fill: theme.heading, if title != none { title } else if r { "کارهای باقی‌مانده" } else { "To-do list" }))
    if items.len() == 0 {
      text(fill: theme.muted, if r { "کاری باقی نمانده است." } else { "Nothing left to do." })
    }
    for (i, it) in items.enumerate() {
      let t = it.value.todo-text
      let td = text-dir(t)
      let fa = if td == none { r } else { td == rtl }
      let isolated = [#if fa { "\u{2067}" } else { "\u{2066}" }#t#"\u{2069}"]
      link(it.location(), block(width: 100%, [#text(fill: theme.muted, digits(i + 1, r) + ".") #isolated #box(width: 1fr, repeat[.#h(0.3em)]) #page-digits(it, r)]))
    }
  }
}

#let todo-tags = (
    todo: (attrs, body) => todo-block(attrs, body),
    todos: (attrs, body) => todo-list(attrs),
)

#let todo-schema = (
  "todo": (
    kind: "block",
    description: (en: "draft notes", fa: "یادداشت‌های پیش‌نویس"),
    attrs: (
      "author": (type: "string", doc: (en: "Name shown in bold before the text (`Ali: ...`).", fa: "نامی که پررنگ پیش از متن می‌آید (`علی: ...`).")),
      "color": (type: "color", default: "yellow", doc: (en: "A color preset, `accent`, or a hex color. Default `yellow`.", fa: "یک رنگ آماده، `accent` یا رنگ hex. پیش‌فرض `yellow`.")),
      "type": (type: "enum", values: ("note", "figure"), default: "note", doc: (en: "`note` (default) or `figure`.", fa: "نوع: `note` (پیش‌فرض) یا `figure`.")),
      "width": (type: "length", default: "100%", doc: (en: "Width of the placeholder. Default `100%`.", fa: "پهنای جای‌نگهدار. پیش‌فرض `100%`.")),
      "height": (type: "length", default: "120", doc: (en: "Height of the placeholder; a bare number is points. Default `120`.", fa: "ارتفاع جای‌نگهدار؛ عدد تنها یعنی پوینت. پیش‌فرض `120`.")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`auto` (default), `rtl`, `ltr`.", fa: "جهت: `auto` (پیش‌فرض)، `rtl`، `ltr`.")),
    ),
  ),
  "todos": (
    kind: "block",
    description: (en: "draft notes", fa: "یادداشت‌های پیش‌نویس"),
    attrs: (
      "title": (type: "string", doc: (en: "Title of the list. Default «کارهای باقی‌مانده» / \"To-do list\".", fa: "عنوان فهرست. پیش‌فرض «کارهای باقی‌مانده» / \"To-do list\".")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`auto` (default), `rtl`, `ltr`.", fa: "جهت: `auto` (پیش‌فرض)، `rtl`، `ltr`.")),
    ),
  ),
)



