// The page: size, margins, columns, header, footer and cover page.
#import "/src/core.typ": *

// Page sizes by name, width by height. `desktop-*` are documents for print and screen; `mobile-*` are pages for reading on a phone
// (named by the ratio of the screen). `custom` takes `page-width` and `page-height`. `a4` and `mobile` are the names these had before.
#let page-sizes = (
  "desktop-a3": (width: 297mm, height: 420mm),
  "desktop-a4": (width: 210mm, height: 297mm),
  "desktop-a4-landscape": (width: 297mm, height: 210mm),
  "desktop-a5": (width: 148mm, height: 210mm),
  "desktop-a6": (width: 105mm, height: 148mm),
  "desktop-b4": (width: 250mm, height: 353mm),
  "desktop-b5": (width: 176mm, height: 250mm),
  "desktop-letter": (width: 215.9mm, height: 279.4mm),
  "desktop-legal": (width: 215.9mm, height: 355.6mm),
  "desktop-tabloid": (width: 279.4mm, height: 431.8mm),
  "desktop-square": (width: 210mm, height: 210mm),
  "mobile-16-9": (width: 110mm, height: 196mm),
  "mobile-18-9": (width: 110mm, height: 220mm),
  "mobile-20-9": (width: 110mm, height: 245mm),
  "mobile-21-9": (width: 110mm, height: 257mm),
)
#let page-aliases = (a4: "desktop-a4", mobile: "mobile-20-9")
#let page-given = sys.inputs.at("page", default: config.at("page", default: "desktop-a4"))
#let page-name = page-aliases.at(page-given, default: page-given)
#assert(page-name == "custom" or page-name in page-sizes, message: setting-prefix("page") + "Unknown page size " + repr(page-given) + "; available: " + (page-sizes.keys() + ("custom",)).join(", "))

// A page narrower than this gets the phone rules, whatever its name: one column (`columns` is ignored), small margins (`margin` is
// ignored), no center item in the header, and the images of a <docheader> in a row of their own.
#let phone-max-width = 120mm
#let phone-margin = (x: 7mm, top: 15mm, bottom: 13mm)

// `page-width` / `page-height` of a custom page: a number with mm, cm, in or pt (a bare number is points).
#let page-length(key, fallback) = {
  let raw = sys.inputs.at(key, default: config.at(key, default: none))
  if raw == none { return fallback }
  let text = if type(raw) == str { raw.trim() } else { str(raw) }
  let m = text.match(regex("^([0-9]*[.]?[0-9]+) *(pt|mm|cm|in)?$"))
  assert(m != none, message: setting-prefix(key) + key + " must be a length such as \"148mm\", \"6in\" or \"420pt\", got " + repr(raw))
  let v = float(m.captures.at(0))
  let unit = m.captures.at(1)
  let length = if unit == "mm" { v * 1mm } else if unit == "cm" { v * 1cm } else if unit == "in" { v * 1in } else { v * 1pt }
  assert(length >= 40mm and length <= 5000mm, message: setting-prefix(key) + key + " must be between 40mm and 5000mm, got " + repr(raw))
  length
}
#let page-size = if page-name == "custom" {
  (width: page-length("page-width", 210mm), height: page-length("page-height", 297mm))
} else { page-sizes.at(page-name) }

// Does the page get the phone rules: a `mobile-*` page, or a custom one narrower than `phone-max-width`.
#let is-phone = page-name.starts-with("mobile-") or (page-name == "custom" and page-size.width < phone-max-width)

// Margins as a part of the page's shorter side, so a name means the same on every size: on A4 `narrow` is 15 mm at the sides and
// 18 mm above and below, `normal` is Typst's default (about 25 mm), `wide` is 35 mm and 30 mm. A phone page keeps its own.
#let margin-sizes = (
  narrow: (x: 15 / 210, y: 18 / 210),
  normal: (x: 2.5 / 21, y: 2.5 / 21),
  wide: (x: 35 / 210, y: 30 / 210),
)
#let margin-name = sys.inputs.at("margin", default: config.at("margin", default: "normal"))
#assert(margin-name in margin-sizes, message: setting-prefix("margin") + "Unknown margin " + repr(margin-name) + "; available: " + margin-sizes.keys().join(", "))

// The margins of the page as lengths.
#let page-margin = if is-phone { phone-margin } else {
  let shorter = calc.min(page-size.width, page-size.height)
  let share = margin-sizes.at(margin-name)
  (x: shorter * share.x, top: shorter * share.y, bottom: shorter * share.y)
}

// Page margins as lengths (x, top), for components that bleed to the page edge (<picHeader>).
#let page-margins = (x: page-margin.x, top: page-margin.top)

// Text columns for the whole document; a phone page is too narrow, so it always gets one.
#let column-count = if is-phone { 1 } else {
  int(sys.inputs.at("columns", default: str(config.at("columns", default: 1))))
}
#assert(column-count >= 1, message: setting-prefix("columns") + "columns must be 1 or more")
// Which column is filled first: "rtl" = right, "ltr" = left, "auto" = Typst's default.
#let column-dir = sys.inputs.at("column-dir", default: config.at("column-dir", default: "auto"))
#assert(column-dir in ("rtl", "ltr", "auto"), message: setting-prefix("column-dir") + "column-dir must be rtl, ltr or auto, got " + repr(column-dir))

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
  let center-text = if is-phone { "" } else { cfg.at("center", default: "") }
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
