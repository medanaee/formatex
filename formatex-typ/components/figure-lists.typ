#import "/src/kit.typ": *

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

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let figure-lists-docs = (
  en: (
    about: `````md
Automatic lists of figures (`<lof>`), tables (`<lot>`) and code listings (`<lol>`), built from the captions in the document, with page numbers.

- `<lof>` lists every `<fig>`, `<tree>` and `<chart>` that has a caption; `<lot>` every table with a caption (`{caption="..."}` above it); `<lol>` every `<code>` with a caption. Things without a caption are not listed.
- `dir`, `numbers`, `title`, `pages="false"` (captions only) and `break` (`true`, `before`, `after`) are the options; each entry keeps its caption's own direction. Use `break="after"` on the last list to keep the lists on one page.
`````.text,
  ),
  fa: (
    about: `````md
فهرست خودکار شکل‌ها (`<lof>`)، جدول‌ها (`<lot>`) و کدها (`<lol>`) که از عنوان‌های (caption) سند ساخته می‌شود، با شمارهٔ صفحه.

- `<lof>` هر `<fig>`، `<tree>` و `<chart>` دارای عنوان را فهرست می‌کند؛ `<lot>` هر جدول دارای عنوان را (`{caption="..."}` بالای جدول)؛ `<lol>` هر `<code>` دارای عنوان را. چیزهای بدون عنوان فهرست نمی‌شوند.
- گزینه‌ها: `dir`، `numbers`، `title`، `pages="false"` (فقط عنوان‌ها) و `break` (`true`، `before`، `after`)؛ هر ورودی جهت عنوان خودش را نگه می‌دارد. روی آخرین فهرست `break="after"` بگذارید تا فهرست‌ها در یک صفحه بمانند.
`````.text,
  ),
  example: (
    en: `````md
<toc break="true"></toc>

<lof></lof>

<lot></lot>

<lol break="after"></lol>
`````.text,
    fa: `````md
<toc break="true"></toc>

<lof></lof>

<lot></lot>

<lol break="after"></lol>
`````.text,
  ),
)
