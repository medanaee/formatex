#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token
#import "/src/lib/lists.typ": *

// Compiled once here: `regex(...)` inside a per-line loop would build the pattern again on every line.
#let list-attrs-re-1 = regex("^\s{0,3}([-*+]|[0-9]{1,9}[.)])(\s|$)")
#let list-attrs-re-2 = regex("^\s{0,3}\{([^{}]*)\}[ \t]*\r?$")
#let list-attrs-re-3 = regex("^[0-9]{1,9}$")
#let list-attrs-re-4 = regex("^(\s{0,3})[0-9]{1,9}([.)])")
#let list-attrs-re-5 = regex("^[ \t]")
#let list-attrs-re-restart = regex("^\s{0,3}(1[.)]|0[.)]|[۱١][.)])(\s|$)")

// `{numbers=abjad suffix=")" marker=dash indent=2em start=3 caption="..." #id}` alone on a line,
// right above a list -> the list wrapped in `#list-block(opts)[ ... ]`. `start` rewrites the
// first number (Markdown takes the start from it). The list ends at the first line that is
// not indented, not an item, and comes after a blank line, or at an item of the list's own depth that
// comes after two blank lines or more (that is a list of its own), or at an item that restarts numbering
// (e.g. 1. / 0.) after one blank line. Consecutive lists without options are separated so CommonMark
// treats them as distinct lists rather than continuing the first. Fenced code is skipped.
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
      out.push(line)
      i += 1
      continue
    }
    if fence != none {
      out.push(line)
      i += 1
      continue
    }
    let m = if line.contains("{") { line.match(list-attrs-re-2) }
    let j = i + 1
    if m != none { while j < lines.len() and lines.at(j).trim() == "" { j += 1 } }
    let has-opts = m != none and j < lines.len() and lines.at(j).match(item) != none and m.captures.first().replace(token, "").trim() == ""
    let is-item = line.match(item) != none
    if not has-opts and not is-item {
      out.push(line)
      i += 1
      continue
    }

    let start-line = if has-opts { j } else { i }
    let first = lines.at(start-line)
    let opts = (:)
    if has-opts {
      for t in m.captures.first().matches(token) {
        let (id, key, quoted, bare) = t.captures
        if id != none { opts.insert("id", id) } else { opts.insert(key, if quoted != none { quoted } else { bare }) }
      }
      if "start" in opts {
        let s = opts.remove("start")
        let where = at-prefix(opts.at("md-at", default: none))
        assert(s.match(list-attrs-re-3) != none, message: where + "List start must be a whole number, got " + repr(s))
        let n = first.match(list-attrs-re-4)
        assert(n != none, message: where + "start only works on a numbered list (1. ...)")
        first = n.captures.at(0) + s + n.captures.at(1) + first.slice(n.end)
      }
    }

    let end = start-line + 1
    let after-blank = false
    let blanks = 0
    let margin = first.len() - first.trim(at: start).len()
    let split-next = false
    while end < lines.len() {
      let l = lines.at(end)
      if fence-match(l) != none { break }
      if l.trim() == "" {
        after-blank = true
        blanks += 1
      } else {
        let is-l-item = l.match(item) != none
        let l-margin = l.len() - l.trim(at: start).len()
        // Two blank lines or more, then an item that is not indented deeper than the list: a list of its own
        if blanks >= 2 and is-l-item and l-margin <= margin {
          split-next = true
          break
        }
        // One blank line or more, then a numbering restart (1., 0.) that is not indented deeper: a list of its own
        if blanks >= 1 and l.match(list-attrs-re-restart) != none and l-margin <= margin {
          split-next = true
          break
        }
        // One blank line or more, then an option block {...} for a list: a list of its own
        if blanks >= 1 and l.contains("{") and l.match(list-attrs-re-2) != none {
          let k = end + 1
          while k < lines.len() and lines.at(k).trim() == "" { k += 1 }
          if k < lines.len() and lines.at(k).match(item) != none {
            split-next = true
            break
          }
        }
        blanks = 0
        if l.match(list-attrs-re-5) != none or is-l-item { after-blank = false }
        else if after-blank { break }
      }
      end += 1
    }

    if has-opts {
      out.push("<!--raw-typst #list-block(" + repr(opts) + ")[ -->")
      out.push("")
      out.push(first)
      out += lines.slice(start-line + 1, end)
      out.push("")
      out.push("<!--raw-typst ] -->")
      out.push("")
    } else {
      out.push(first)
      out += lines.slice(start-line + 1, end)
      if split-next {
        out.push("<!--raw-typst #none -->")
        out.push("")
      }
    }
    i = end
  }
  out.join("\n")
}
