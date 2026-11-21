// The page: size, margins, columns, header, footer and footer.
#import "/src/core.typ": *
#let page-config = merge-config(config, config.at("typ", default: (:)))

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
#let page-given = sys.inputs.at("page", default: page-config.at("page", default: "desktop-a4"))
#let page-name = page-aliases.at(page-given, default: page-given)
#assert(page-name == "custom" or page-name in page-sizes, message: setting-prefix("page") + "Unknown page size " + repr(page-given) + "; available: " + (page-sizes.keys() + ("custom",)).join(", "))

// A page narrower than this gets the phone rules, whatever its name: one column (`columns` is ignored), small margins (`margin` is
// ignored), no center item in the header, and the images of a <docheader> in a row of their own.
#let phone-max-width = 120mm
#let phone-margin = (x: 7mm, top: 15mm, bottom: 13mm)

// `page-width` / `page-height` of a custom page: a number with mm, cm, in or pt (a bare number is points).
#let page-length(key, fallback) = {
  let raw = sys.inputs.at(key, default: page-config.at(key, default: none))
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
#let margin-name = sys.inputs.at("margin", default: page-config.at("margin", default: "normal"))
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
  int(sys.inputs.at("columns", default: str(page-config.at("columns", default: 1))))
}
#assert(column-count >= 1, message: setting-prefix("columns") + "columns must be 1 or more")
// Which column is filled first: "rtl" = right, "ltr" = left, "auto" = Typst's default.
#let column-dir = sys.inputs.at("column-dir", default: page-config.at("column-dir", default: "auto"))
#assert(column-dir in ("rtl", "ltr", "auto"), message: setting-prefix("column-dir") + "column-dir must be rtl, ltr or auto, got " + repr(column-dir))

