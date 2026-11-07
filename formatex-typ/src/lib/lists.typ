#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/captioned.typ": caption-flag, captioned

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

// Guide lines between the levels of a bulleted list (`guides`): "line" is a line down the side of every nested level, from its first
// item to its last; "tree" is the same line with a branch to each item (├ └), like a folder tree. The top level has none.
#let list-depth = state("list-depth", 0)
// The guides of the list being laid out: one entry for the document (`[list] guides`), one more for every list with its own `{guides=...}`
#let list-guides-default = {
  let value = list-config.at("guides", default: none)
  let value = if value == none { "none" } else { str(value) }
  assert(value in ("none", "line", "tree"), message: setting-prefix("list", "guides") + "[list] guides must be none, line or tree, got " + repr(value))
  value
}
#let list-guides = state("list-guides", (list-guides-default,))

// A stroke or an outset on the start side of a block: Typst names the sides left and right, so it depends on the direction
#let on-start(value) = {
  let side = if text.dir == rtl { "right" } else { "left" }
  let out = (:)
  out.insert(side, value)
  out
}

// `branches: false` is the `line` look: the same level without the branches, one line down its whole side. Both take the place of the markers.
#let tree-list(it, depth, branches: true) = {
  let stroke = 0.8pt * zoom + theme.rule
  // The space between items is inside the cells, so the line goes on across it
  let gap = if it.tight { par.leading } else { par.spacing }
  // The width of the branch, and how far down the first line of an item it leaves the line
  let stem = if branches { 1.1em } else { 0.8em }
  let reach = 0.5em
  let count = it.children.len()
  let rows = ()
  for (i, item) in it.children.enumerate() {
    let last = i == count - 1
    // The line of the level runs down the start edge of this cell, the whole height of the row; for the last item it stops at the branch.
    // The branch is a line out of it, at the height of the first line of the item. The branch stands in for the marker.
    // The last item has no space below it: the space belongs between items, and the level around it adds its own
    let below = if last { 0pt } else { gap }
    rows.push(grid.cell(
      inset: (bottom: below),
      // The sides of a table cell are named by the direction of the table: its first column is on the right in a right-to-left one
      stroke: if last and branches { none } else { (left: stroke) },
      {
        if last and branches { place(top + start, block(width: 0pt, height: reach, stroke: on-start(stroke), [])) }
        if branches {
        // A box with a top edge, not a `line`: a line takes no room, so it would not stay on the side the text is on in a right-to-left list
        place(top + start, dy: reach, block(width: stem - 0.45em, height: 0pt, stroke: (top: stroke), []))
        }
      },
    ))
    rows.push(grid.cell(inset: (bottom: below), {
      // Inside an item the gaps are the list's own, so a nested level does not push its neighbours away
      set block(spacing: gap)
      set par(spacing: gap)
      item.body
    }))
  }
  // The level stands the same distance from the item above it as its own items from each other
  set block(spacing: gap)
  set par(spacing: gap)
  grid(columns: (stem, 1fr), ..rows)
}

#let guided-list(it) = {
  list-depth.update(n => n + 1)
  context {
    let depth = list-depth.get()
    let style = list-guides.get().last()
    if depth < 2 or style == "none" { it } else { tree-list(it, depth, branches: style == "tree") }
  }
  list-depth.update(n => n - 1)
}

// `numbers`, `prefix`, `suffix`, `marker` ("•", "dash", or one per level: "disc,circle,dash"), `indent` and `guides`.
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
  let own-guides = opts.at("guides", default: none)
  assert(own-guides == none or own-guides in ("none", "line", "tree"), message: at-prefix(opts.at("md-at", default: none)) + "List guides must be none, line or tree, got " + repr(own-guides))
  // The rule for the whole document is set once, by the call with no options; a list with its own `guides` says so to it
  show list: it => if opts.len() == 0 { guided-list(it) } else { it }
  set enum(numbering: list-numbering(kind, suffix, prefix: prefix))
  // Every marker gets a box of the same width, so each level steps in by the same amount (a bullet, a triangle and a dash are not equally wide)
  let marker-list = if marker != none { str(marker).split(",").map(m => marker-names.at(m.trim(), default: m.trim())) } else { ("•", "‣", "–") }
  set list(marker: marker-list.map(m => box(width: 0.9em, align(start, m))))
  set enum(indent: parse-length(str(indent), attrs: opts)) if indent != none
  set list(indent: parse-length(str(indent), attrs: opts)) if indent != none
  if own-guides != none {
    list-guides.update(stack => stack + (own-guides,))
    body
    list-guides.update(stack => stack.slice(0, -1))
  } else { body }
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
  show figure: set block(breakable: true)
  captioned(
    "list", "list", "فهرست", "List", block(width: 100%, align(start, styled)),
    caption: caption, id: id,
    numbering: caption-flag(opts, "numbering"), position: opts.at("caption-position", default: none),
  )
}
