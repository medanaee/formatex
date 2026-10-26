#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token

// Compiled once here: `regex(...)` inside a per-line loop would build the pattern again on every line.
#let persian-list-numbers-re-1 = regex("^(\s*)([۰-۹٠-٩]{1,9})([.)](?:\s|$))")

// "۱. item" / "۲) item" -> "1. item": Markdown only knows ASCII list numbers. Fenced code is skipped.
#let persian-list-numbers(src) = {
  let fence = none
  let out = ()
  for line in src.split("\n") {
    let f = fence-match(line)
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
    }
    let m = if fence == none and f == none { line.match(persian-list-numbers-re-1) }
    if m == none { out.push(line); continue }
    let (lead, num, rest) = m.captures
    let ascii = num.clusters().map(c => {
      let code = str.to-unicode(c)
      str(if code >= 0x06F0 { code - 0x06F0 } else { code - 0x0660 })
    }).join()
    out.push(lead + ascii + rest + line.slice(m.end))
  }
  out.join("\n")
}
