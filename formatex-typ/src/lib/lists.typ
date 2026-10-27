#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *

// Lists: [list] in config.toml / front matter; a `{...}` line above one list overrides it (`list-attrs`).
#let list-config = config.at("list", default: (:))

#let list-number-kinds = option-schemas.list.attrs.numbers.values

#let list-option-keys = option-keys("list")

#let abjad-letters = ("الف", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ی", "ک", "ل", "م", "ن", "س", "ع", "ف", "ص", "ق", "ر", "ش", "ت", "ث", "خ", "ذ", "ض", "ظ", "غ")

#let alefba-letters = ("الف", "ب", "پ", "ت", "ث", "ج", "چ", "ح", "خ", "د", "ذ", "ر", "ز", "ژ", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی")

#let marker-names = (disc: "•", circle: "◦", square: "▪", dash: "–", triangle: "‣", arrow: "→", check: "✓", star: "★", "none": "")

// 23 -> «بیست و سه»
#let persian-words(n) = {
  if n == 0 { return "صفر" }
  let ones = ("", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه")
  let teens = ("ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده")
  let tens = ("", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود")
  let hundreds = ("", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد")
  let below-thousand(n) = {
    let parts = ()
    if n >= 100 { parts.push(hundreds.at(calc.div-euclid(n, 100))) }
    let r = calc.rem(n, 100)
    if r >= 20 {
      parts.push(tens.at(calc.div-euclid(r, 10)))
      if calc.rem(r, 10) > 0 { parts.push(ones.at(calc.rem(r, 10))) }
    } else if r >= 10 { parts.push(teens.at(r - 10)) } else if r > 0 { parts.push(ones.at(r)) }
    parts.join(" و ")
  }
  let thousands = calc.div-euclid(n, 1000)
  let rest = calc.rem(n, 1000)
  let parts = ()
  if thousands > 0 { parts.push(if thousands == 1 { "هزار" } else { below-thousand(thousands) + " هزار" }) }
  if rest > 0 { parts.push(below-thousand(rest)) }
  parts.join(" و ")
}

// Enum numbering for a `numbers` kind; "auto" follows the list's direction (its first letter).
#let list-numbering(kind, suffix, prefix: "") = (..nums) => context {
  let n = nums.pos().last()
  let letters(all) = if n <= all.len() { all.at(n - 1) } else { numbering("۱", n) }
  let label = if kind in ("auto", "fa", "en") {
    numbering(if (kind == "auto" and text.dir == rtl) or kind == "fa" { "۱" } else { "1" }, n)
  } else if kind == "fatxt" { persian-words(n) }
    else if kind == "rome" { numbering("I", n) }
    else if kind == "abc" { numbering("a", n) }
    else if kind == "abjad" { letters(abjad-letters) }
    else { letters(alefba-letters) }
  prefix + label + suffix
}

// `numbers`, `prefix`, `suffix`, `marker` ("•", "dash", or one per level: "disc,circle,dash") and `indent`.
#let list-style(opts, body) = {
  let setting(key) = opts.at(key, default: list-config.at(key, default: none))
  let kind = setting("numbers")
  let kind = if kind == none { "auto" } else { kind }
  assert(kind in list-number-kinds, message: (if "numbers" in opts { at-prefix(opts.at("md-at", default: none)) } else { setting-prefix("list", "numbers") }) + "List numbers must be one of " + list-number-kinds.join(", ") + ", got " + repr(kind))
  let suffix = setting("suffix")
  let suffix = if suffix == none { "." } else { str(suffix) }
  let prefix = setting("prefix")
  let prefix = if prefix == none { "" } else { str(prefix) }
  let marker = setting("marker")
  let indent = setting("indent")
  set enum(numbering: list-numbering(kind, suffix, prefix: prefix))
  set list(marker: str(marker).split(",").map(m => [#marker-names.at(m.trim(), default: m.trim())])) if marker != none
  set enum(indent: parse-length(str(indent), attrs: opts)) if indent != none
  set list(indent: parse-length(str(indent), attrs: opts)) if indent != none
  body
}

// One list with a `{...}` line above it: its own style; `caption` / `#id` number it «فهرست ۱» / "List 1".
#let list-block(opts, body) = {
  for key in opts.keys() {
    if key == "md-at" { continue }
    assert(key in list-option-keys, message: at-prefix(opts.at("md-at", default: none)) + "Unknown list option " + repr(key) + "; available: " + list-option-keys.join(", "))
  }
  let styled = list-style(opts, body)
  let caption = opts.at("caption", default: none)
  let id = opts.at("id", default: none)
  if caption == none and id == none { return styled }
  context {
    let detected = content-dir(if caption != none { caption } else { body })
    let d = if detected == none { last-dir.get() } else { detected }
    set text(dir: d)
    show figure: set block(breakable: true)
    let fig = figure(
      block(width: 100%, align(start, styled)),
      kind: "list",
      caption: caption,
      supplement: if d == rtl [فهرست] else [List],
      numbering: n => digits(n, d == rtl),
    )
    if id != none [#fig#label(id)] else { fig }
  }
}
