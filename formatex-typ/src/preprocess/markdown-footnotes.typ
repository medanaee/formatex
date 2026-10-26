#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token

// Compiled once here: `regex(...)` inside a per-line loop would build the pattern again on every line.
#let markdown-footnotes-re-1 = regex("^[ \t]*\[\^([a-zA-Z0-9_\-]+)\]:[ \t]*(.*)$")

#let markdown-footnotes(src) = {
  if not src.contains("[^") { return src }
  let lines = src.split("\n")
  let defs = (:)
  let clean-lines = ()
  let fence = none
  let i = 0
  while i < lines.len() {
    let line = lines.at(i)
    let f = fence-match(line)
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
    }
    if fence == none {
      let m = if line.contains("[^") { line.match(markdown-footnotes-re-1) }
      if m != none {
        let (id, text) = m.captures
        let cont = ()
        while i + 1 < lines.len() and (lines.at(i + 1).starts-with("    ") or lines.at(i + 1).starts-with("\t")) {
          i += 1
          cont.push(lines.at(i).trim())
        }
        let full-text = (text, ..cont).filter(t => t != "").join(" ")
        defs.insert(id, full-text)
        i += 1
        continue
      }
    }
    clean-lines.push(line)
    i += 1
  }
  if defs.len() == 0 { return src }
  let text = clean-lines.join("\n")
  for (id, val) in defs {
    let clean-val = val.replace("\"", "&quot;")
    text = text.replace("[^" + id + "]", "<fn text=\"" + clean-val + "\"></fn>")
  }
  text
}
