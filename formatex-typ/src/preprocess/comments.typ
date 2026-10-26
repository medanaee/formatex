#import "/src/preprocess/common.typ": fence-match

// `<!-- ... -->` is removed before any other preprocessor runs, so the content of a commented-out
// section (headings with `{#id}`, option lines, tables, equations) is never turned into markup. It may
// span lines and may sit in the middle of a line. A line that holds only comment text is dropped
// whole, so a comment between two lines of a paragraph doesn't split it. Left alone: fenced code,
// inline code, and `<!--raw-typst ... -->`, which the other preprocessors inject and cmarker reads.
#let strip-comments(src) = {
  if not src.contains("<!--") { return src }
  let fence = none
  let open = false
  let out = ()
  for line in src.split("\n") {
    if not open {
      let f = fence-match(line)
      if f != none {
        let mark = f.captures.first().first()
        if fence == none { fence = mark } else if mark == fence { fence = none }
        out.push(line)
        continue
      }
      if fence != none {
        out.push(line)
        continue
      }
    }
    let rest = line
    let kept = ""
    let hit = open
    while rest != "" {
      if open {
        let end = rest.position("-->")
        if end == none { rest = ""; break }
        rest = rest.slice(end + 3)
        open = false
      } else {
        let at = 0
        let found = false
        while true {
          let p = rest.slice(at).position("<!--")
          if p == none { break }
          let idx = at + p
          let in-code = calc.odd(kept.matches("`").len() + rest.slice(0, idx).matches("`").len())
          if in-code or rest.slice(idx).starts-with("<!--raw-typst") {
            at = idx + 4
            continue
          }
          found = true
          hit = true
          kept += rest.slice(0, idx)
          rest = rest.slice(idx + 4)
          open = true
          break
        }
        if not found {
          kept += rest
          rest = ""
        }
      }
    }
    if hit and kept.trim() == "" { continue }
    out.push(kept)
  }
  out.join("\n")
}
