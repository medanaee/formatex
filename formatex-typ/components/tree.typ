#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/widgets.typ": *

// <tree>: one line per file or folder, nested by indentation; `name/` is a folder and
// `name  # note` adds a note. Pasted `tree` output works too: its line-drawing prefix counts as indentation.
#let tree-file-icons = (
  png: "file-image", jpg: "file-image", jpeg: "file-image", gif: "file-image", svg: "file-image", webp: "file-image",
  pdf: "file-pdf", zip: "file-zipper", gz: "file-zipper", tar: "file-zipper", "7z": "file-zipper", rar: "file-zipper",
  csv: "file-csv", txt: "file-lines", log: "file-lines", bib: "book", lock: "lock",
  mp4: "file-video", mov: "file-video", mp3: "file-audio", wav: "file-audio",
  xlsx: "file-excel", xls: "file-excel", docx: "file-word", doc: "file-word", pptx: "file-powerpoint",
)

#let tree-icon(name, folder, open) = {
  if folder { return if open { "folder-open" } else { "folder" } }
  let lowered = lower(name)
  if lowered.starts-with(".git") or lowered.starts-with(".env") { return "gear" }
  let parts = lowered.split(".")
  let key = if parts.len() < 2 { lowered } else { parts.last() }
  if key in tree-file-icons { return tree-file-icons.at(key) }
  // code-language echoes an unknown key back as the name.
  let lang = code-language(key)
  if lang.name == key { "file" } else { lang.icon }
}

#let tree-items(source) = {
  let items = ()
  let stack = ()
  for raw-line in source.split("\n") {
    let line = raw-line.trim("\r", at: end).replace("\t", "    ")
    if line.trim() == "" { continue }
    let m = line.match(regex("^((?:[ │├└┬┼─|`+\\\\]|-{2,})*)(.*)$"))
    let indent = m.captures.at(0).codepoints().len()
    while stack.len() > 0 and stack.last() >= indent { let _ = stack.pop() }
    let depth = stack.len()
    stack.push(indent)
    let note = m.captures.at(1).match(regex("^(.*?)\s+#\s*(.*)$"))
    let (name, text-note) = if note != none { (note.captures.at(0).trim(), note.captures.at(1).trim()) } else { (m.captures.at(1).trim(), none) }
    items.push((depth: depth, name: name, note: text-note))
  }
  let n = items.len()
  range(n).map(i => {
    let it = items.at(i)
    let next = items.at(i + 1, default: none)
    let children = next != none and next.depth > it.depth
    // Whether a later sibling follows, so the connector continues below this line.
    let more = false
    for j in range(i + 1, n) {
      let dj = items.at(j).depth
      if dj <= it.depth {
        more = dj == it.depth
        break
      }
    }
    let folder = children or it.name.ends-with("/")
    it + (name: if it.name == "/" { it.name } else { it.name.trim("/", at: end) }, folder: folder, children: children, more: more)
  })
}

#let tree-block(attrs, source) = {
  let items = tree-items(source)
  assert(items.len() > 0, message: "<tree> needs at least one line")
  let icons = attrs.at("icons", default: "true")
  assert(icons in ("true", "false"), message: "<tree> icons must be true or false, got " + repr(icons))
  block(
    width: 100%,
    fill: theme.code-bg,
    stroke: 0.5pt * zoom + theme.code-stroke,
    radius: feel.code,
    inset: (x: 10pt * zoom, y: 7pt * zoom),
    {
      set text(dir: ltr, size: 8.5pt * zoom, font: (code-font, persian-font), tracking: 0pt)
      set align(left)
      set par(justify: false)
      let unit = 1.7em
      let row-h = 1.75em
      let connector = 0.6pt * zoom + color.mix((theme.muted, 55%), (theme.code-bg, 45%))
      let bend = calc.min(feel.box, 3.5pt * zoom)
      let open = ()
      let rows = ()
      for it in items {
        let d = it.depth
        let marks = ()
        // Depth-0 lines are roots: no connector of their own.
        for k in range(1, d) {
          if open.at(k) {
            let x = (k - 1) * unit + 0.5em
            marks.push(place(line(start: (x, 0pt), end: (x, row-h), stroke: connector)))
          }
        }
        if d >= 1 {
          let x = (d - 1) * unit + 0.5em
          let mid = row-h / 2
          marks.push(place(curve(
            stroke: connector,
            curve.move((x, 0pt)),
            curve.line((x, mid - bend)),
            curve.quad((x, mid), (x + bend, mid)),
            curve.line((d * unit - 0.3em, mid)),
          )))
          if it.more { marks.push(place(line(start: (x, mid), end: (x, row-h), stroke: connector))) }
        }
        open = open.slice(0, d) + (it.more,)
        let icon = if icons == "true" {
          box(width: 1.1em, align(center, text(
            fill: if it.folder { theme.accent } else { theme.muted },
            size: 0.95em,
            fa-icon(tree-icon(it.name, it.folder, it.children)),
          )))
          h(0.45em)
        }
        let name-text = text(
          fill: theme.fg,
          weight: if it.folder { "bold" } else { "regular" },
          it.name + if it.folder and icons == "false" and not it.name.ends-with("/") { "/" } else { "" },
        )
        let note = if it.note != none and it.note != "" {
          h(1.4em)
          text(fill: theme.muted, font: (latin-font, persian-font), size: 0.95em, it.note)
        }
        rows.push(block(width: 100%, height: row-h, spacing: 0pt, {
          marks.join()
          place(horizon + left, dx: d * unit, [#icon#name-text#note])
        }))
      }
      stack(..rows)
    },
  )
}

#let tree-tags = (
    tree: (attrs, body) => {
      let source = if "src" in attrs { read(root-path(attrs.src)) } else {
        let r = find-raw(body)
        assert(r != none, message: "<tree> needs a fenced code block with one file or folder per line, or src=\"file\"")
        r.text
      }
      caption-figure(attrs, "tree", tree-block(attrs, source))
    },
)

#let tree-schema = (
  "tree": (
    kind: "block",
    description: (en: "file and folder tree", fa: "درخت فایل‌ها و پوشه‌ها"),
    attrs: (
      "src": (type: "path", doc: (en: "Read the listing from a file (`src=\"layout.txt\"`, relative to the project root) instead of the code block.", fa: "فهرست را به‌جای بلوک کد از یک فایل بخوان (`src=\"layout.txt\"`، نسبت به پوشهٔ ریشهٔ پروژه).")),
      "icons": (type: "bool", default: "true", doc: (en: "`true` (default) or `false`. Without icons, folders show a trailing `/`.", fa: "`true` (پیش‌فرض) یا `false`. بدون آیکون، پوشه‌ها با `/` انتهایی نشان داده می‌شوند.")),
      "caption": (type: "string", doc: (en: "Numbered caption below the tree: «شکل ۱: ...» / \"Figure 1: ...\", by the caption's language. Listed in `<lof>`. Not parsed as Markdown.", fa: "عنوان شماره‌دار زیر درخت: «شکل ۱: ...» / \"Figure 1: ...\"، بر اساس زبان عنوان. در `<lof>` می‌آید. Markdown داخلش پردازش نمی‌شود.")),
      "id": (type: "string", doc: (en: "Target for `<ref>`. Gives a number even without a caption.", fa: "هدف `<ref>`. حتی بدون عنوان هم شماره می‌دهد.")),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: (en: "`column` (default) or `all`. In a multi-column document, `all` puts the tree across all columns, at the top or bottom of a page. No effect with one column.", fa: "`column` (پیش‌فرض) یا `all`. در سند چندستونه، `all` درخت را روی همهٔ ستون‌ها، در بالا یا پایین صفحه، می‌گذارد. در سند تک‌ستونه اثری ندارد.")),
    ),
  ),
)



