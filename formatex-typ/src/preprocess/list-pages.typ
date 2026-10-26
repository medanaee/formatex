#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token

// Compiled once here: `regex(...)` inside a per-line loop would build the pattern again on every line.
#let list-pages-re-1 = regex("^\s{0,3}<(toc|lof|lot|lol)[\s>]")
#let list-pages-re-2 = regex("break=\"(true|before|after)\"")

// With several text columns, a run of <toc> / <lof> / <lot> / <lol> lines (only blank lines between)
// where any of them uses `break` is wrapped in <listpages>, which sets the run in one column
// on its own pages. Without `break` the lists flow in the columns like any other text.
#let list-pages(src) = {
  if column-count == 1 { return src }
  let lines = src.split("\n")
  let is-list(l) = l.contains("<") and l.match(list-pages-re-1) != none
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
    if fence != none or f != none or not is-list(line) {
      out.push(line)
      i += 1
      continue
    }
    let last = i
    let j = i
    while j < lines.len() and (is-list(lines.at(j)) or lines.at(j).trim() == "") {
      if is-list(lines.at(j)) { last = j }
      j += 1
    }
    let run = lines.slice(i, last + 1)
    if run.any(l => l.match(list-pages-re-2) != none) {
      // page() already breaks before and after the run; an extra break inside it adds a blank page.
      let drop(l, side) = {
        let other = if side == "before" { "after" } else { "before" }
        l.replace("break=\"true\"", "break=\"" + other + "\"").replace(regex("\s*break=\"" + side + "\""), "")
      }
      run.at(0) = drop(run.at(0), "before")
      run.at(-1) = drop(run.at(-1), "after")
      out += ("<listpages>", "", ..run, "", "</listpages>")
    } else {
      out += run
    }
    i = last + 1
  }
  out.join("\n")
}
