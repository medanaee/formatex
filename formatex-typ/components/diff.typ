#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/colors.typ": *

// <diff>: line lists, edit operations and the two layouts (unified / split).
// An op is (kind: "eq" | "del" | "add", oi, ni, on, nn): indices into the old / new
// lines and the line numbers shown.
#let diff-lines(text) = {
  let lines = text.split("\n").map(l => l.trim("\r", at: end))
  while lines.len() > 0 and lines.last().trim() == "" { lines = lines.slice(0, -1) }
  lines
}

// Longest common subsequence of lines (trailing spaces ignored); removals come before additions.
#let diff-ops(old, new) = {
  let a = old.map(l => l.trim(at: end))
  let b = new.map(l => l.trim(at: end))
  let (n, m) = (a.len(), b.len())
  let pre = 0
  while pre < n and pre < m and a.at(pre) == b.at(pre) { pre += 1 }
  let suf = 0
  while suf < n - pre and suf < m - pre and a.at(n - 1 - suf) == b.at(m - 1 - suf) { suf += 1 }
  let (p, q) = (n - pre - suf, m - pre - suf)
  // rows.at(i).at(j): LCS length of a[pre + i ..] and b[pre + j ..] inside the changed middle.
  let next = (0,) * (q + 1)
  let rows = (next,)
  for i in range(p - 1, -1, step: -1) {
    let row = (0,) * (q + 1)
    for j in range(q - 1, -1, step: -1) {
      row.at(j) = if a.at(pre + i) == b.at(pre + j) { next.at(j + 1) + 1 } else { calc.max(next.at(j), row.at(j + 1)) }
    }
    rows.push(row)
    next = row
  }
  rows = rows.rev()
  let eq(i, j) = (kind: "eq", oi: i, ni: j, on: i + 1, nn: j + 1)
  let ops = range(pre).map(k => eq(k, k))
  let (i, j) = (0, 0)
  while i < p or j < q {
    if i < p and j < q and a.at(pre + i) == b.at(pre + j) {
      ops.push(eq(pre + i, pre + j))
      i += 1
      j += 1
    } else if i < p and (j == q or rows.at(i + 1).at(j) >= rows.at(i).at(j + 1)) {
      ops.push((kind: "del", oi: pre + i, ni: none, on: pre + i + 1, nn: none))
      i += 1
    } else {
      ops.push((kind: "add", oi: none, ni: pre + j, on: none, nn: pre + j + 1))
      j += 1
    }
  }
  ops + range(suf).map(k => eq(n - suf + k, m - suf + k))
}

// Highlights both versions with the code-block theme and hands their lines to `layout`.
// The inner show rule is newer than the outer one, so it takes the second raw first.
#let diff-highlighted(old, new, lang, layout) = {
  show raw.where(block: true): o => {
    show raw.where(block: true): n => layout(o.lines.map(l => l.body), n.lines.map(l => l.body))
    raw(new.join("\n"), lang: lang, block: true)
  }
  raw(old.join("\n"), lang: lang, block: true)
}

// Light pages need a stronger tint than `tinted` gives: its 10% vanishes on a pale code background.
#let diff-style = {
  let shade(hue) = (
    fill: color.mix((hue, if theme.dark { 20% } else { 17% }), (theme.code-bg, if theme.dark { 80% } else { 83% })),
    head: color.mix((hue, if theme.dark { 14% } else { 10% }), (theme.code-bg, if theme.dark { 86% } else { 90% })),
    fg: if theme.dark { hue.lighten(30%) } else { color.mix((hue.darken(25%), 85%), (theme.fg, 15%)) },
  )
  let red = shade(color-presets.red)
  let green = shade(color-presets.green)
  (
    del: red + (sign: "−"),
    add: green + (sign: "+"),
    eq: (fill: none, fg: theme.muted, sign: ""),
    empty: tiling(size: (5pt * zoom, 5pt * zoom), place(line(
      start: (0%, 100%),
      end: (100%, 0%),
      stroke: 0.4pt * zoom + theme.code-stroke.transparentize(if theme.dark { 40% } else { 50% }),
    ))),
  )
}

#let diff-number-width(ops) = {
  let nums = ops.map(o => (o.on, o.nn)).flatten().filter(n => n != none)
  str(calc.max(1, ..nums)).len() * 0.6em
}

// The outer frame shared by both layouts: a code block without its own inset.
#let diff-frame(lang, pad-top, body) = block(
  width: 100%,
  fill: theme.code-bg,
  stroke: 0.5pt * zoom + theme.code-stroke,
  radius: feel.code,
  clip: true,
  inset: (top: pad-top, bottom: if pad-top > 0pt { 6pt * zoom } else { 0pt }),
  {
    set text(dir: ltr, size: 8pt * zoom, font: (code-font, persian-font), tracking: 0pt)
    set align(left)
    set par(justify: false)
    let badge = code-language(lang)
    if badge != none and pad-top > 0pt { place(top + right, dy: -pad-top, code-badge(badge)) }
    body
  },
)

// One code listing: old and new line numbers, a sign, the code; changed rows in red / green.
#let diff-unified(ops, old, new, lang) = {
  let fills = ()
  let cells = ()
  for op in ops {
    let s = diff-style.at(op.kind)
    let num(n) = align(right, text(fill: s.fg, size: 0.85em, if n == none { [] } else { str(n) }))
    fills.push(s.fill)
    cells.push(num(op.on))
    cells.push(num(op.nn))
    cells.push(text(fill: s.fg, weight: "bold", s.sign))
    cells.push(if op.ni != none { new.at(op.ni, default: []) } else { old.at(op.oi, default: []) })
  }
  let w = diff-number-width(ops)
  diff-frame(lang, if code-language(lang) != none { 20pt * zoom } else { 6pt * zoom }, grid(
    columns: (w + 10pt * zoom, w + 6pt * zoom, 1.4em, 1fr),
    inset: (x, y) => (left: if x == 0 { 8pt * zoom } else { 0pt }, right: if x == 3 { 8pt * zoom } else { 6pt * zoom }, y: 0.3em),
    fill: (x, y) => fills.at(y),
    ..cells,
  ))
}

// Two halves in one grid, so a row is equally tall on both sides; a change's removed and
// added lines share rows, the shorter side padded with empty cells.
#let diff-split(ops, old, new, lang, titles, d) = {
  let rows = ()
  let k = 0
  while k < ops.len() {
    let op = ops.at(k)
    if op.kind == "eq" {
      rows.push((left: op, right: op))
      k += 1
      continue
    }
    let (dels, adds) = ((), ())
    while k < ops.len() and ops.at(k).kind in ("del", "add") {
      if ops.at(k).kind == "del" { dels.push(ops.at(k)) } else { adds.push(ops.at(k)) }
      k += 1
    }
    for r in range(calc.max(dels.len(), adds.len())) {
      rows.push((left: dels.at(r, default: none), right: adds.at(r, default: none)))
    }
  }

  let w = diff-number-width(ops)
  let side(op, is-old) = {
    if op == none { return (grid.cell(fill: diff-style.empty, []), grid.cell(fill: diff-style.empty, [])) }
    let s = diff-style.at(op.kind)
    let n = if is-old { op.on } else { op.nn }
    let line = if is-old { old.at(op.oi, default: []) } else { new.at(op.ni, default: []) }
    (
      grid.cell(fill: s.fill, align(right, text(fill: s.fg, size: 0.85em, str(n)))),
      grid.cell(fill: s.fill, line),
    )
  }
  let head(title, s) = grid.cell(colspan: 2, fill: s.head, inset: (x: 12pt * zoom, y: 7pt * zoom), {
    set text(dir: d, font: (latin-font, persian-font), size: 9pt * zoom, weight: "bold", fill: s.fg)
    align(start, [#text(font: code-font, s.sign)#h(5pt * zoom)#title])
  })
  // In RTL the old version is on the right, read first.
  let order(a, b) = if d == rtl { b + a } else { a + b }
  let cells = order((head(titles.at(0), diff-style.del),), (head(titles.at(1), diff-style.add),))
  for row in rows {
    cells += order(side(row.left, true), side(row.right, false))
  }
  // The first and last code rows get extra room against the header and the frame.
  let pad-y(y) = (
    top: if y == 1 { 0.9em } else { 0.45em },
    bottom: if y == rows.len() { 0.9em } else { 0.45em },
  )
  diff-frame(lang, 0pt, grid(
    columns: (w + 20pt * zoom, 1fr, w + 20pt * zoom, 1fr),
    inset: (x, y) => (left: if calc.even(x) { 12pt * zoom } else { 0pt }, right: if calc.even(x) { 8pt * zoom } else { 12pt * zoom }) + pad-y(y),
    grid.vline(x: 2, stroke: 0.5pt * zoom + theme.code-stroke),
    grid.hline(y: 1, stroke: 0.5pt * zoom + theme.code-stroke),
    ..cells,
  ))
}

#let diff-tags = (
    del: (attrs, body) => context {
      let c = tinted(color-presets.red)
      box(
        fill: c.fill,
        stroke: 0.5pt * zoom + c.border,
        radius: feel.badge,
        inset: (x: 4pt * zoom, y: 1pt * zoom),
        outset: (y: 1pt * zoom),
        text(fill: if theme.dark { c.icon } else { color.mix((c.icon, 70%), (theme.fg, 30%)) }, strike(body))
      )
    },
    ins: (attrs, body) => context {
      let c = tinted(color-presets.green)
      box(
        fill: c.fill,
        stroke: 0.5pt * zoom + c.border,
        radius: feel.badge,
        inset: (x: 4pt * zoom, y: 1pt * zoom),
        outset: (y: 1pt * zoom),
        text(fill: if theme.dark { c.icon } else { color.mix((c.icon, 70%), (theme.fg, 30%)) }, underline(body))
      )
    },
    before: (attrs, body) => tag("diff-before", attrs, body),
    old: (attrs, body) => tag("diff-before", attrs, body),
    after: (attrs, body) => tag("diff-after", attrs, body),
    new: (attrs, body) => tag("diff-after", attrs, body),
    diff: (attrs, body) => {
      let befores = untag(body, "diff-before").tagged
      let afters = untag(body, "diff-after").tagged
      let caption = attrs.at("caption", default: none)
      let id = attrs.at("id", default: none)
      assert(
        befores.len() == 1 and afters.len() == 1,
        message: at-of(attrs) + "<diff> needs one <before> and one <after>, each with a fenced code block or src=\"file\"",
      )
      // (text, fence language) of a <before> / <after>: its src file or its fenced code block.
      let version(item) = {
        if "src" in item.attrs { return (read(root-path(item.attrs.src)), item.attrs.src.split(".").last()) }
        let r = find-raw(item.body)
        if r == none { ("", none) } else { (r.text, r.at("lang", default: none)) }
      }
      let (old-text, old-lang) = version(befores.first())
      let (new-text, new-lang) = version(afters.first())
      let old-lines = diff-lines(old-text)
      let new-lines = diff-lines(new-text)
      let ops = diff-ops(old-lines, new-lines)
      let lang = attrs.at("lang", default: if old-lang != none { old-lang } else { new-lang })
      let mode = attrs.at("mode", default: "split")
      assert(mode in ("split", "unified"), message: at-of(attrs) + "<diff> mode must be split or unified, got " + repr(mode))
      let title(item, fa, en, d) = {
        let t = item.attrs.at("title", default: none)
        if t != none { t } else if d == rtl { fa } else { en }
      }

      let content = context {
        let d = resolve-dir(attrs.at("dir", default: "auto"), if caption != none { caption } else { body })
        diff-highlighted(old-lines, new-lines, lang, (old, new) => if mode == "unified" {
          diff-unified(ops, old, new, lang)
        } else {
          let titles = (title(befores.first(), [نسخه قبل], [Before], d), title(afters.first(), [نسخه بعد], [After], d))
          diff-split(ops, old, new, lang, titles, d)
        })
      }

      span-columns(attrs, "diff", if caption == none and id == none { content } else {
        context {
          let detected = if caption != none { content-dir(caption) }
          let d = if detected == none { last-dir.get() } else { detected }
          set text(dir: d)
          let fig = figure(
            content,
            kind: "diff",
            caption: caption,
            supplement: if d == rtl [تغییرات] else [Diff],
            numbering: n => numbering(if d == rtl { "۱" } else { "1" }, n),
          )
          if id != none [#fig#label(id)] else { fig }
        }
      })
    },
)

#let diff-schema = (
  "diff": (
    kind: "block",
    description: (en: "Comparison of two versions of code or text", fa: "مقایسهٔ دو نسخه از کد یا متن"),
    attrs: (
      "mode": (type: "enum", values: ("split", "unified"), default: "split", doc: (en: "`split` (default) or `unified`. Any other value is a compile error.", fa: "`split` (پیش‌فرض) یا `unified`. هر مقدار دیگر خطای کامپایل است.")),
      "lang": (type: "string", doc: (en: "Highlighting language. Default: the fence language of `<before>` (else `<after>`), or the file extension with `src`.", fa: "زبان رنگ‌آمیزی. پیش‌فرض: زبان بلوک کد `<before>` (وگرنه `<after>`)، یا پسوند فایل با `src`.")),
      "caption": (type: "string", doc: (en: "Numbered caption: «تغییرات ۱: ...» / \"Diff 1: ...\".", fa: "عنوان شماره‌دار: «تغییرات ۱: ...» / \"Diff 1: ...\".")),
      "id": (type: "string", doc: (en: "Target for `<ref>`: «تغییرات ۱» / \"Diff 1\".", fa: "هدف `<ref>`: «تغییرات ۱» / \"Diff 1\".")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`rtl`, `ltr` or `auto` (default). Decides the side order and the default titles.", fa: "`rtl`، `ltr` یا `auto` (پیش‌فرض). ترتیب دو طرف و عنوان‌های پیش‌فرض را تعیین می‌کند.")),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: (en: "`column` (default) or `all`. In a multi-column document, `all` puts the comparison across all columns.", fa: "`column` (پیش‌فرض) یا `all`. در سند چندستونه، `all` مقایسه را روی همهٔ ستون‌ها می‌گذارد.")),
    ),
    children: ("before", "after"),
  ),
  "before": (
    kind: "block",
    scoped: true,
    description: (en: "Old version of a <diff>", fa: "نسخهٔ قبلی در <diff>"),
    attrs: (
      "title": (type: "string", doc: (en: "Header title in split mode", fa: "عنوان سربرگ در حالت split")),
      "src": (type: "path", doc: (en: "File to load instead of the code block", fa: "فایلی که به‌جای بلوک کد بارگذاری می‌شود")),
    ),
  ),
  "old": (
    kind: "block",
    description: (en: "Old version of a <diff> (alias of <before>)", fa: "نسخهٔ قبلی در <diff> (نام دیگر <before>)"),
    attrs: (
      "title": (type: "string", doc: (en: "Header title in split mode", fa: "عنوان سربرگ در حالت split")),
      "src": (type: "path", doc: (en: "File to load instead of the code block", fa: "فایلی که به‌جای بلوک کد بارگذاری می‌شود")),
    ),
  ),
  "after": (
    kind: "block",
    scoped: true,
    description: (en: "New version of a <diff>", fa: "نسخهٔ جدید در <diff>"),
    attrs: (
      "title": (type: "string", doc: (en: "Header title in split mode", fa: "عنوان سربرگ در حالت split")),
      "src": (type: "path", doc: (en: "File to load instead of the code block", fa: "فایلی که به‌جای بلوک کد بارگذاری می‌شود")),
    ),
  ),
  "new": (
    kind: "block",
    description: (en: "New version of a <diff> (alias of <after>)", fa: "نسخهٔ جدید در <diff> (نام دیگر <after>)"),
    attrs: (
      "title": (type: "string", doc: (en: "Header title in split mode", fa: "عنوان سربرگ در حالت split")),
      "src": (type: "path", doc: (en: "File to load instead of the code block", fa: "فایلی که به‌جای بلوک کد بارگذاری می‌شود")),
    ),
  ),
  "del": (
    kind: "inline",
    description: (en: "Inline deletion mark", fa: "علامت حذف درون‌خطی"),
    attrs: (:),
  ),
  "ins": (
    kind: "inline",
    description: (en: "Inline insertion mark", fa: "علامت درج درون‌خطی"),
    attrs: (:),
  ),
)



