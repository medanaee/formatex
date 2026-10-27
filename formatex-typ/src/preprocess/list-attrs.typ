#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token
#import "/src/lib/lists.typ": *

// Compiled once here: `regex(...)` inside a per-line loop would build the pattern again on every line.
#let list-attrs-re-1 = regex("^\s{0,3}([-*+]|[0-9]{1,9}[.)])(\s|$)")
#let list-attrs-re-2 = regex("^\s{0,3}\{([^{}]*)\}[ \t]*\r?$")
#let list-attrs-re-3 = regex("^[0-9]{1,9}$")
#let list-attrs-re-4 = regex("^(\s{0,3})[0-9]{1,9}([.)])")
#let list-attrs-re-5 = regex("^[ \t]")

// `{numbers=abjad suffix=")" marker=dash indent=2em start=3 caption="..." #id}` alone on a line,
// right above a list -> the list wrapped in `#list-block(opts)[ ... ]`. `start` rewrites the
// first number (Markdown takes the start from it). The list ends at the first line that is
// not indented, not an item, and comes after a blank line. Fenced code is skipped.
#let list-attrs(src) = {
  let lines = src.split("\n")
  let item = list-attrs-re-1
  let token = option-token
  let fence = none
  let out = ()
  let i = 0
  while i < lines.len() {
    let line = lines.at(i)
    let f = fence-match(line)
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
    }
    let m = if fence == none and f == none and line.contains("{") { line.match(list-attrs-re-2) }
    let j = i + 1
    if m != none { while j < lines.len() and lines.at(j).trim() == "" { j += 1 } }
    if m == none or j >= lines.len() or lines.at(j).match(item) == none or m.captures.first().replace(token, "").trim() != "" {
      out.push(line)
      i += 1
      continue
    }
    let opts = (:)
    for t in m.captures.first().matches(token) {
      let (id, key, quoted, bare) = t.captures
      if id != none { opts.insert("id", id) } else { opts.insert(key, if quoted != none { quoted } else { bare }) }
    }
    let first = lines.at(j)
    if "start" in opts {
      let s = opts.remove("start")
      let where = at-prefix(opts.at("md-at", default: none))
      assert(s.match(list-attrs-re-3) != none, message: where + "List start must be a whole number, got " + repr(s))
      let n = first.match(list-attrs-re-4)
      assert(n != none, message: where + "start only works on a numbered list (1. ...)")
      first = n.captures.at(0) + s + n.captures.at(1) + first.slice(n.end)
    }
    let end = j + 1
    let after-blank = false
    while end < lines.len() {
      let l = lines.at(end)
      if l.trim() == "" { after-blank = true }
      else if l.match(list-attrs-re-5) != none or l.match(item) != none { after-blank = false }
      else if after-blank { break }
      end += 1
    }
    out.push("<!--raw-typst #list-block(" + repr(opts) + ")[ -->")
    out.push("")
    out.push(first)
    out += lines.slice(j + 1, end)
    out.push("")
    out.push("<!--raw-typst ] -->")
    out.push("")
    i = end
  }
  out.join("\n")
}
