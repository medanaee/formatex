#import "/src/kit.typ": *

// <lof> / <lot> / <lol>: captioned figures of one kind, laid out like <toc> entries.
#let figure-list(kind, tag-name, attrs, fa-title, en-title) = {
  let d = attrs.at("dir", default: "rtl")
  let title = attrs.at("title", default: if d == "ltr" { en-title } else { fa-title })
  let nums = list-numbers(attrs, tag-name, "auto")
  let pages = list-pages-on(attrs, tag-name)

  show outline.entry: it => context {
    let el = it.element
    // A figure may have a number only, a caption only, or both; a figure with neither is not listed
    let caption = if el.caption == none { [] } else { el.caption.body }
    let has-caption = caption != []
    if el.numbering == none and not has-caption { return none }
    let entry-rtl = content-dir(if has-caption { caption } else { el.supplement }) != ltr
    let entry-dir = if d == "rtl" { rtl } else if d == "ltr" { ltr } else if entry-rtl { rtl } else { ltr }
    let fa-digits = if nums == "auto" { entry-rtl } else { nums == "rtl" }
    set text(dir: entry-dir)
    // Isolates keep a caption's own direction inside a forced-direction list.
    let number = if el.numbering != none { reference-text(el, fa-digits) }
    let shown = if number != none and has-caption [#number: #caption] else if number != none { number } else { caption }
    let isolated = [#if entry-rtl { "\u{2067}" } else { "\u{2066}" }#shown#"\u{2069}"]
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

// The HTML form of the three lists (optional, used by the HTML export): the figures of one kind, each a link
#let html-figure-list(kind, attrs, fa-title, en-title) = context {
  let d = attrs.at("dir", default: "rtl")
  let title = attrs.at("title", default: if d == "ltr" { en-title } else { fa-title })
  let entries = ()
  for el in query(figure.where(kind: kind)) {
    let caption = if el.caption == none { [] } else { el.caption.body }
    let has-caption = caption != []
    if el.numbering == none and not has-caption { continue }
    let number = if el.numbering != none { reference-text(el, d != "ltr") }
    entries.push((indent: 0, target: el.location(), text: if number != none and has-caption [#number: #caption] else if number != none { number } else { caption }))
  }
  if entries.len() == 0 { return none }
  html-link-list(title, entries, d)
}
#let figure-lists-html = (
    lof: (attrs, body) => html-figure-list(image, attrs, "فهرست شکل‌ها", "List of Figures"),
    lot: (attrs, body) => html-figure-list(table, attrs, "فهرست جدول‌ها", "List of Tables"),
    lol: (attrs, body) => html-figure-list(raw, attrs, "فهرست کدها", "List of Listings"),
)

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

- `<lof>` lists every `<fig>`, `<tree>` and `<chart>` that has a number or a caption; `<lot>` every table that has one (`{caption="..."}` above it); `<lol>` every `<code>` that has one. An entry reads «شکل ۱: توضیح», «شکل ۱» (number only) or «توضیح» (caption only). `lof="false"` on a figure, `lot="false"` on a table and `lol="false"` on a listing leave it out.
- `dir`, `numbers`, `title`, `pages="false"` (captions only) and `break` (`true`, `before`, `after`) are the options; each entry keeps its caption's own direction. Use `break="after"` on the last list to keep the lists on one page.
`````.text,
  ),
  fa: (
    about: `````md
فهرست خودکار شکل‌ها (`<lof>`)، جدول‌ها (`<lot>`) و کدها (`<lol>`) که از عنوان‌های (caption) سند ساخته می‌شود، با شمارهٔ صفحه.

- `<lof>` هر `<fig>`، `<tree>` و `<chart>` دارای شماره یا عنوان را فهرست می‌کند؛ `<lot>` هر جدول دارای آن را (`{caption="..."}` بالای جدول)؛ `<lol>` هر `<code>` دارای آن را. هر ورودی «شکل ۱: توضیح»، «شکل ۱» (فقط شماره) یا «توضیح» (فقط عنوان) است. `lof="false"` روی شکل، `lot="false"` روی جدول و `lol="false"` روی کد آن را بیرون می‌گذارد.
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
