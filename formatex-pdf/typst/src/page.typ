// Paged header/footer rendering. Source of truth: formatex-pdf.
#import "/src/core.typ": *
#import "/src/lib/vars.typ": rooted-path
#import "/src/page-options.typ": *

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
  let logo-in-front = "logo" in front-matter.at("typ", default: (:)).at("header", default: (:))
  let logo-from = if logo-in-front { source-path } else { none }
  let start-cell = {
    if logo != none { box(height: 1.6em, baseline: 30%, image(rooted-path(logo, from: logo-from))) + h(0.6em) }
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
