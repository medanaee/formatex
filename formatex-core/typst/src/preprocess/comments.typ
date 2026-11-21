#import "/src/preprocess/common.typ": blank, fence-match

// `<!-- ... -->` is removed before any other preprocessor runs, so the content of a commented-out
// section (headings with `{#id}`, option lines, tables, equations) is never turned into markup. It may
// span lines and may sit in the middle of a line. A line that holds only comment text is dropped
// whole, so a comment between two lines of a paragraph doesn't split it. Left alone: fenced code,
// inline code, and `<!--raw-typst ... -->`, which the other preprocessors inject and cmarker reads.
#let strip-comments(src) = {
  if not src.contains("<!--") { return src }
  let fence = none
  let open = false
  // A fenced block inside a comment: its `-->` (a mermaid arrow, HTML in an example) is code, and does not end the comment
  let comment-fence = none
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
    } else {
      let f = fence-match(line)
      if comment-fence != none {
        if f != none and f.captures.first().first() == comment-fence { comment-fence = none }
        continue
      }
      if f != none {
        comment-fence = f.captures.first().first()
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

// The text with its comments blanked out (same bytes, same lines), by the rule of `strip-comments`: the passes that look for tags and
// `{{ }}` in the text must not read what a comment holds, however long it is and whatever code blocks it has inside.
#let blank-comments(src) = {
  if not src.contains("<!--") { return src }
  let fence = none
  let open = false
  let comment-fence = none
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
    } else {
      let f = fence-match(line)
      if comment-fence != none {
        if f != none and f.captures.first().first() == comment-fence { comment-fence = none }
        out.push(blank(line))
        continue
      }
      if f != none {
        comment-fence = f.captures.first().first()
        out.push(blank(line))
        continue
      }
    }
    let result = ""
    let rest = line
    while rest != "" {
      if open {
        let end = rest.position("-->")
        if end == none {
          result += blank(rest)
          rest = ""
        } else {
          result += blank(rest.slice(0, end + 3))
          rest = rest.slice(end + 3)
          open = false
        }
      } else {
        let p = rest.position("<!--")
        if p == none {
          result += rest
          rest = ""
        } else {
          // Not a comment inside inline code
          let before = line.slice(0, line.len() - rest.len() + p)
          if calc.odd(before.matches("`").len()) {
            result += rest.slice(0, p + 4)
            rest = rest.slice(p + 4)
          } else {
            result += rest.slice(0, p)
            rest = rest.slice(p)
            open = true
          }
        }
      }
    }
    out.push(result)
  }
  out.join("\n")
}
