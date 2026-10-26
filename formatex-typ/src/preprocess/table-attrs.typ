#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token

// Compiled once here: `regex(...)` inside a per-line loop would build the pattern again on every line.
#let table-attrs-re-1 = regex("^\s{0,3}\{([^{}]*)\}[ \t]*\r?$")

// `{width=full align=left head-align=right body-align=right caption="..." #id}` alone on a line, right above a table ->
// an invisible update of the state the next table reads (src/conf.typ). The line is
// left alone inside fenced code blocks or when no table follows.
#let table-attrs(src) = {
  let lines = src.split("\n")
  let fence = none
  let out = ()
  for (i, line) in lines.enumerate() {
    let f = fence-match(line)
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
      out.push(line)
      continue
    }
    let m = if fence == none and line.contains("{") { line.match(table-attrs-re-1) }
    let next = lines.slice(i + 1).find(l => l.trim() != "")
    if m == none or next == none or not next.contains("|") {
      out.push(line)
      continue
    }
    let opts = (:)
    let token = option-token
    for t in m.captures.first().matches(token) {
      let (id, key, quoted, bare) = t.captures
      if id != none { opts.insert("id", id) } else { opts.insert(key, if quoted != none { quoted } else { bare }) }
    }
    out.push("<!--raw-typst #state(\"table-options\").update(" + repr(opts) + ") -->")
    out.push("")
  }
  out.join("\n")
}
