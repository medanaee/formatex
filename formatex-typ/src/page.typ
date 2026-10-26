// The page: size, margins, columns, header, footer and cover page.
#import "/src/core.typ": *

// Page size: "a4" for print, "mobile" for reading on a phone (narrow page, small margins).
#let page-sizes = (
  a4: (paper: "a4"),
  mobile: (width: 110mm, height: 245mm, margin: (x: 7mm, top: 15mm, bottom: 13mm)),
)
#let page-name = sys.inputs.at("page", default: config.at("page", default: "a4"))
#assert(page-name in page-sizes, message: "Unknown page size " + repr(page-name) + "; available: " + page-sizes.keys().join(", "))

// A4 margins; "normal" is Typst's default (about 25 mm). The mobile page keeps its own.
#let margin-sizes = (
  narrow: (x: 15mm, y: 18mm),
  normal: auto,
  wide: (x: 35mm, y: 30mm),
)
#let margin-name = sys.inputs.at("margin", default: config.at("margin", default: "normal"))
#assert(margin-name in margin-sizes, message: "Unknown margin " + repr(margin-name) + "; available: " + margin-sizes.keys().join(", "))

// Page margins as lengths (x, top), for components that bleed to the page edge (<picHeader>).
#let page-margins = {
  let size = page-sizes.at(page-name)
  let m = if page-name == "a4" { margin-sizes.at(margin-name) } else { size.margin }
  if m == auto { (x: 25mm, top: 25mm) } else { (x: m.x, top: m.at("top", default: m.at("y", default: 25mm))) }
}

// Text columns for the whole document; a phone page is too narrow, so it always gets one.
#let column-count = if page-name == "mobile" { 1 } else {
  int(sys.inputs.at("columns", default: str(config.at("columns", default: 1))))
}
#assert(column-count >= 1, message: "columns must be 1 or more")
// Which column is filled first: "rtl" = right, "ltr" = left, "auto" = Typst's default.
#let column-dir = sys.inputs.at("column-dir", default: config.at("column-dir", default: "auto"))
#assert(column-dir in ("rtl", "ltr", "auto"), message: "column-dir must be rtl, ltr or auto, got " + repr(column-dir))

#let header-config = config.at("header", default: (:))
#let header-styles = ("minimal", "line", "band", "double")

#let header-placeholder = regex("\{(page|pages|section|section-number)\}")

// The section shown on a page: the first top-level section starting on it,
// otherwise the last one started before it. Must be called inside `context`.
#let current-section() = {
  let all = query(heading.where(outlined: true))
  // Unnumbered titles (bibliography "منابع", contents) are level 1 and would hide the real sections.
  let numbered = all.filter(h => h.numbering != none)
  if numbered.len() > 0 { all = numbered }
  if all.len() == 0 { return none }
  let top = calc.min(..all.map(h => h.level))
  let sections = all.filter(h => h.level == top)
  let this-page = here().page()
  let on-page = sections.filter(h => h.location().page() == this-page)
  if on-page.len() > 0 { return on-page.first() }
  let before = sections.filter(h => h.location().page() < this-page)
  if before.len() > 0 { before.last() } else { none }
}

// Fills {page}, {pages}, {section}, {section-number}. Digits: "fa" / "en", or "auto" =
// Persian when the text is RTL. Must be called inside `context`.
#let header-text(s, digits: "auto") = {
  assert(digits in ("auto", "fa", "en"), message: "digits must be auto, fa or en, got " + repr(digits))
  if s == none or s == "" { return none }
  let s = str(s)
  let section = if s.contains("{section") { current-section() } else { none }
  // Before the first section, "{section-number}. {section}" would leave a lone ".".
  if s.contains("{section") and section == none { return none }

  let d = doc-text-dir(s.replace(header-placeholder, ""))
  if d == none and section != none { d = doc-text-dir(section.body) }
  let rtl-digits = if digits == "auto" { d == rtl } else { digits == "fa" }
  let pattern = if rtl-digits { "۱" } else { "1" }

  let values = (
    page: numbering(pattern, counter(page).get().first()),
    pages: numbering(pattern, counter(page).final().first()),
    section: if section != none { section.body } else { [] },
    section-number: if section != none and section.numbering != none {
      heading-number(counter(heading).at(section.location()), rtl-digits)
    } else { [] },
  )

  let parts = ()
  let pos = 0
  for m in s.matches(header-placeholder) {
    parts.push(s.slice(pos, m.start))
    parts.push(values.at(m.captures.first()))
    pos = m.end
  }
  parts.push(s.slice(pos))
  let filled = parts.map(p => [#p]).join()
  if d == none { filled } else { text(dir: d, filled) }
}

// Must be called inside `context`.
#let page-header() = {
  let cfg = header-config
  if not cfg.at("enabled", default: cfg.len() > 0) { return none }
  if cfg.at("skip-first-page", default: true) and counter(page).get().first() == 1 { return none }

  let style = sys.inputs.at("header-style", default: if feel.header != none { feel.header } else { cfg.at("style", default: "line") })
  assert(style in header-styles, message: "Unknown header style " + repr(style) + "; available: " + header-styles.join(", "))

  let start-text = cfg.at("start", default: "")
  // A phone-width header has no room for three items; the center one is dropped.
  let center-text = if page-name == "mobile" { "" } else { cfg.at("center", default: "") }
  let end-text = cfg.at("end", default: "")
  let digits = cfg.at("digits", default: "auto")
  let start-filled = header-text(start-text, digits: digits)
  let center-filled = header-text(center-text, digits: digits)
  let end-filled = header-text(end-text, digits: digits)
  let d = cfg.at("dir", default: "auto")
  let dir = if d == "rtl" { rtl } else if d == "ltr" { ltr } else {
    let detected = doc-text-dir([#start-filled #center-filled #end-filled])
    if detected == none { ltr } else { detected }
  }

  let logo = cfg.at("logo", default: none)
  let start-cell = {
    if logo != none { box(height: 1.6em, baseline: 30%, image(rooted(logo))) + h(0.6em) }
    start-filled
  }

  set text(dir: dir, size: 0.85em, fill: if style == "band" { theme.fg } else { theme.muted })
  let row = grid(
    columns: (1fr, auto, 1fr),
    align: (start + horizon, center + horizon, end + horizon),
    start-cell, center-filled, end-filled,
  )

  if style == "minimal" {
    row
  } else if style == "line" {
    stack(spacing: 5pt * zoom, row, line(length: 100%, stroke: 0.5pt * zoom + theme.rule))
  } else if style == "band" {
    block(width: 100%, fill: theme.code-bg, radius: feel.band, inset: (x: 10pt * zoom, y: 6pt * zoom), row)
  } else {
    stack(
      spacing: 5pt * zoom,
      line(length: 100%, stroke: 2pt * zoom + theme.accent),
      row,
      line(length: 100%, stroke: 0.5pt * zoom + theme.rule),
    )
  }
}

// `footer:` in the front matter replaces the plain centered page number.
#let footer-config = config.at("footer", default: none)
#let footer-styles = ("plain", "line")

// Must be called inside `context`.
#let page-footer() = {
  let cfg = footer-config
  if not cfg.at("enabled", default: true) { return none }
  if cfg.at("skip-first-page", default: false) and counter(page).get().first() == 1 { return none }

  let style = cfg.at("style", default: "plain")
  assert(style in footer-styles, message: "Unknown footer style " + repr(style) + "; available: " + footer-styles.join(", "))
  let digits = cfg.at("digits", default: "auto")
  let (start-filled, center-filled, end-filled) = ("start", "center", "end").map(k => header-text(cfg.at(k, default: ""), digits: digits))
  let d = cfg.at("dir", default: "auto")
  let dir = if d == "rtl" { rtl } else if d == "ltr" { ltr } else {
    let detected = doc-text-dir([#start-filled #center-filled #end-filled])
    if detected == none { ltr } else { detected }
  }

  set text(dir: dir, size: 0.85em, fill: theme.muted)
  // Decided from the settings, not the filled text: an empty {section} before the first
  // section must not move the footer.
  let both-sides = ("start", "end").all(k => str(cfg.at(k, default: "")) != "")
  let row = if both-sides {
    grid(
      columns: (1fr, auto, 1fr),
      align: (start + horizon, center + horizon, end + horizon),
      start-filled, center-filled, end-filled,
    )
  } else {
    align(center, (start-filled, center-filled, end-filled).filter(c => c != none).join(h(1.5em)))
  }
  if style == "line" { stack(spacing: 5pt * zoom, line(length: 100%, stroke: 0.5pt * zoom + theme.rule), row) } else { row }
}

#let cover-config = config.at("cover", default: (:))

// Lists (e.g. two supervisors) are shown one per line; YAML numbers (`date: 1405`) as text.
#let cover-value(v) = if type(v) == array { v.map(str).join(linebreak()) } else { str(v) }

#let cover-page() = {
  let c = cover-config
  let field(key) = {
    let v = c.at(key, default: "")
    if v == "" or v == () { none } else { cover-value(v) }
  }
  let title = field("title")
  let d = c.at("dir", default: "auto")
  let dir = if d == "rtl" { rtl } else if d == "ltr" { ltr } else {
    let detected = doc-text-dir(c.at("title", default: "") + " " + c.at("institution", default: ""))
    if detected == none { ltr } else { detected }
  }
  let labels = if dir == rtl {
    (author: "نگارش", supervisor: "استاد راهنما", advisor: "استاد مشاور")
  } else {
    (author: "Author", supervisor: "Supervisor", advisor: "Advisor")
  }

  let people = ()
  for key in ("author", "supervisor", "advisor") {
    let v = field(key)
    if v != none {
      people.push(text(fill: theme.muted, labels.at(key) + ":"))
      people.push(text(weight: "bold", v))
    }
  }

  let logo = c.at("logo", default: none)
  let content = {
    set text(dir: dir)
    set align(center)
    if logo != none {
      image(rooted(logo), height: 3cm)
      v(0.8em)
    }
    if field("institution") != none { text(size: 1.4em, weight: "bold", fill: theme.heading, field("institution")) }
    if field("faculty") != none { linebreak(); text(size: 1.15em, field("faculty")) }
    if field("department") != none { linebreak(); text(size: 1.05em, fill: theme.muted, field("department")) }
    v(1fr)
    if field("type") != none {
      text(size: 1.15em, fill: theme.muted, field("type"))
      v(0.8em)
    }
    if title != none { text(size: 2.2em, weight: "bold", fill: theme.heading, title) }
    if field("subtitle") != none {
      v(0.4em)
      text(size: 1.3em, fill: theme.muted, field("subtitle"))
    }
    v(1fr)
    if people.len() > 0 {
      grid(
        columns: 2,
        column-gutter: 1em,
        row-gutter: 0.9em,
        align: (end, start),
        ..people,
      )
    }
    v(1fr)
    if field("date") != none { text(size: 1.1em, field("date")) }
  }

  // The reset happens on the cover itself so the next page's header already sees page 1.
  page(numbering: none, header: none, footer: none, columns: 1, {
    counter(page).update(0)
    if c.at("frame", default: false) {
      block(width: 100%, height: 100%, stroke: 1.5pt * zoom + theme.rule, radius: feel.frame, inset: 1.2cm, content)
    } else {
      content
    }
  })
}
