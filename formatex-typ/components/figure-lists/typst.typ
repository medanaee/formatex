#import "/src/kit.typ": *

// <lof> / <lot> / <lol>: captioned figures of one kind, laid out like <toc> entries.
#let figure-list(kind, tag-name, attrs, fa-title, en-title) = {
  let d = attrs.at("dir", default: if doc-dir != "auto" { doc-dir } else { "rtl" })
  let title = attrs.at("title", default: if d == "ltr" { en-title } else { fa-title })
  let nums = list-numbers(attrs, tag-name, "auto")
  let pages = list-pages-on(attrs, tag-name)

  show outline.entry: it => context {
    let el = it.element
    let caption = if el.caption == none { [] } else { el.caption.body }
    let has-caption = caption != []
    if el.numbering == none and not has-caption { return none }
    let entry-rtl = content-dir(if has-caption { caption } else { el.supplement }) != ltr
    let entry-dir = if d == "rtl" { rtl } else if d == "ltr" { ltr } else if entry-rtl { rtl } else { ltr }
    let fa-digits = if nums == "auto" { entry-rtl } else { nums == "rtl" }
    set text(dir: entry-dir)
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
#let figure-lists-tags = (
    lof: (attrs, body) => figure-list(image, "lof", attrs, "فهرست شکل‌ها", "List of Figures"),
    lot: (attrs, body) => figure-list(table, "lot", attrs, "فهرست جدول‌ها", "List of Tables"),
    lol: (attrs, body) => figure-list(raw, "lol", attrs, "فهرست کدها", "List of Listings"),
)
