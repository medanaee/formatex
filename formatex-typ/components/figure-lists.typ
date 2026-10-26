#import "/src/prelude.typ": *
#import "/src/lib/refs.typ": *

// <lof> / <lot> / <lol>: captioned figures of one kind, laid out like <toc> entries.
#let figure-list(kind, tag-name, attrs, fa-title, en-title) = {
  let d = attrs.at("dir", default: "rtl")
  let title = attrs.at("title", default: if d == "ltr" { en-title } else { fa-title })
  let nums = list-numbers(attrs, tag-name, "auto")
  let pages = list-pages-on(attrs, tag-name)

  show outline.entry: it => context {
    let el = it.element
    if el.caption == none { return none }
    let caption = el.caption.body
    let entry-rtl = content-dir(caption) != ltr
    let entry-dir = if d == "rtl" { rtl } else if d == "ltr" { ltr } else if entry-rtl { rtl } else { ltr }
    let fa-digits = if nums == "auto" { entry-rtl } else { nums == "rtl" }
    set text(dir: entry-dir)
    // Isolates keep a caption's own direction inside a forced-direction list.
    let isolated = [#if entry-rtl { "\u{2067}" } else { "\u{2066}" }#reference-text(el, fa-digits): #caption#"\u{2069}"]
    let line = if pages { [#isolated #box(width: 1fr, it.fill) #page-digits(el, fa-digits)] } else { isolated }
    link(el.location(), block(width: 100%, line))
  }
  let (before, after) = page-breaks(attrs)
  if before { pagebreak(weak: true) }
  block(below: 2em, {
    set text(dir: if d == "ltr" { ltr } else { rtl })
    outline(title: title, target: figure.where(kind: kind))
  })
  if after { pagebreak(weak: true) }
}

#let figure-lists-tags = (
    lof: (attrs, body) => figure-list(image, "lof", attrs, "فهرست شکل‌ها", "List of Figures"),
    lot: (attrs, body) => figure-list(table, "lot", attrs, "فهرست جدول‌ها", "List of Tables"),
    lol: (attrs, body) => figure-list(raw, "lol", attrs, "فهرست کدها", "List of Listings"),
)

#let figure-lists-schema = (
  "lof": (
    kind: "block",
    description: (en: "lists of figures, tables and code", fa: "فهرست شکل‌ها، جدول‌ها و کدها"),
    attrs: (
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "rtl", doc: (en: "`rtl` (all entries RTL), `ltr`, `auto` (each entry follows its caption)", fa: "`rtl` (همهٔ ردیف‌ها راست‌به‌چپ)، `ltr`، `auto` (هر ردیف از عنوان خودش پیروی می‌کند)")),
      "title": (type: "string", doc: (en: "Any text", fa: "هر متنی")),
      "numbers": (type: "enum", values: ("rtl", "ltr", "auto"), default: "auto", doc: (en: "`rtl`: «شکل ۱» and Persian page numbers. `ltr`: \"Figure 1\" and Latin page numbers. `auto`: each entry follows its own caption.", fa: "`rtl`: «شکل ۱» و شمارهٔ صفحهٔ فارسی. `ltr`: \"Figure 1\" و شمارهٔ صفحهٔ لاتین. `auto`: هر ردیف از عنوان خودش پیروی می‌کند.")),
      "pages": (type: "bool", default: "true", doc: (en: "`true`: dot leaders and page numbers; `false`: captions only", fa: "`true`: نقطه‌چین و شمارهٔ صفحه؛ `false`: فقط عنوان‌ها")),
      "break": (type: "enum", values: ("true", "false", "before", "after"), default: "false", doc: (en: "`true`, `before`, `after`, `false` (as on `<toc>`)", fa: "`true`، `before`، `after`، `false` (مثل `<toc>`)")),
    ),
  ),
  "lot": (
    kind: "block",
    description: (en: "lists of figures, tables and code", fa: "فهرست شکل‌ها، جدول‌ها و کدها"),
    attrs: (
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "rtl", doc: (en: "`rtl` (all entries RTL), `ltr`, `auto` (each entry follows its caption)", fa: "`rtl` (همهٔ ردیف‌ها راست‌به‌چپ)، `ltr`، `auto` (هر ردیف از عنوان خودش پیروی می‌کند)")),
      "title": (type: "string", doc: (en: "Any text", fa: "هر متنی")),
      "numbers": (type: "enum", values: ("rtl", "ltr", "auto"), default: "auto", doc: (en: "`rtl`: «شکل ۱» and Persian page numbers. `ltr`: \"Figure 1\" and Latin page numbers. `auto`: each entry follows its own caption.", fa: "`rtl`: «شکل ۱» و شمارهٔ صفحهٔ فارسی. `ltr`: \"Figure 1\" و شمارهٔ صفحهٔ لاتین. `auto`: هر ردیف از عنوان خودش پیروی می‌کند.")),
      "pages": (type: "bool", default: "true", doc: (en: "`true`: dot leaders and page numbers; `false`: captions only", fa: "`true`: نقطه‌چین و شمارهٔ صفحه؛ `false`: فقط عنوان‌ها")),
      "break": (type: "enum", values: ("true", "false", "before", "after"), default: "false", doc: (en: "`true`, `before`, `after`, `false` (as on `<toc>`)", fa: "`true`، `before`، `after`، `false` (مثل `<toc>`)")),
    ),
  ),
  "lol": (
    kind: "block",
    description: (en: "lists of figures, tables and code", fa: "فهرست شکل‌ها، جدول‌ها و کدها"),
    attrs: (
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "rtl", doc: (en: "`rtl` (all entries RTL), `ltr`, `auto` (each entry follows its caption)", fa: "`rtl` (همهٔ ردیف‌ها راست‌به‌چپ)، `ltr`، `auto` (هر ردیف از عنوان خودش پیروی می‌کند)")),
      "title": (type: "string", doc: (en: "Any text", fa: "هر متنی")),
      "numbers": (type: "enum", values: ("rtl", "ltr", "auto"), default: "auto", doc: (en: "`rtl`: «شکل ۱» and Persian page numbers. `ltr`: \"Figure 1\" and Latin page numbers. `auto`: each entry follows its own caption.", fa: "`rtl`: «شکل ۱» و شمارهٔ صفحهٔ فارسی. `ltr`: \"Figure 1\" و شمارهٔ صفحهٔ لاتین. `auto`: هر ردیف از عنوان خودش پیروی می‌کند.")),
      "pages": (type: "bool", default: "true", doc: (en: "`true`: dot leaders and page numbers; `false`: captions only", fa: "`true`: نقطه‌چین و شمارهٔ صفحه؛ `false`: فقط عنوان‌ها")),
      "break": (type: "enum", values: ("true", "false", "before", "after"), default: "false", doc: (en: "`true`, `before`, `after`, `false` (as on `<toc>`)", fa: "`true`، `before`، `after`، `false` (مثل `<toc>`)")),
    ),
  ),
)



