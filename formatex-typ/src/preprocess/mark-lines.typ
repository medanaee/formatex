#import "/src/preprocess/common.typ": fence-match, option-token

// The first thing that happens to a file when it is read: every piece of the user's text that can be wrong is told where it is.
//   <alert type="tip">      ->  <alert _at="main.md:5" type="tip">
//   [text](#id)             ->  <!--raw-typst #check-label("id", "main.md:5") -->[text](#id)
//   {width=full}            ->  {width=full md-at="main.md:12"}     (above a table or a list, or at the end of a heading)
// The mark sits inside the tag or the braces, so the later steps (the preprocessors, cmarker) cut, add and move lines around it
// without losing it, and whoever finds the value wrong says `@main.md:5 ...` (`at-prefix` in src/core.typ). The app reads that
// mark and puts the problem on that line of that file. Only tags that have a schema are marked: the others are plain HTML.

#let tag-re = regex("<([A-Za-z][\\w-]*)((?:\"[^\"]*\"|'[^']*'|[^<>\"'])*)>")
#let heading-option-re = regex("^\\s{0,3}#{1,6}[ \\t].*?[ \\t]+\\{([^{}]*)\\}[ \\t]*\\r?$")
#let option-line-re = regex("^\\s{0,3}\\{([^{}]*)\\}[ \\t]*\\r?$")
#let link-re = regex("\[[^\[\]\n]*\]\(#([^)\s]+)\)")
#let list-item-re = regex("^\\s{0,3}([-*+]|[0-9]{1,9}[.)])(\\s|$)")

// Same bytes, same lines: only the characters change.
#let blank(text) = text.replace(regex("[^\\n]+"), m => " " * m.text.len())

// The text with everything that is not markup blanked out: comments, fenced code, inline code and inline math.
#let markup-only(src) = {
  let text = src.replace(regex("<!--[\\s\\S]*?-->"), m => blank(m.text))
  let fence = none
  let lines = ()
  for line in text.split("\n") {
    let f = fence-match(line)
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
      lines.push(blank(line))
    } else if fence != none {
      lines.push(blank(line))
    } else {
      lines.push(line.replace(regex("`[^`\\n]*`"), m => blank(m.text)).replace(regex("\\$[^$\\n]+\\$"), m => blank(m.text)))
    }
  }
  lines.join("\n")
}

// True when the braces hold nothing but option tokens (`width=full #id`), so they are options and not text.
#let only-options(content) = content.trim() != "" and content.replace(option-token, "").trim() == ""

// `src` is the whole file as it is on disk, `path` its project path.
#let mark-lines(src, path, schemas, front-matter-regex) = {
  let fm = src.match(front-matter-regex)
  // The front matter is settings, not text: its lines count but nothing in it is marked
  let clean = markup-only(if fm == none { src } else { blank(src.slice(0, fm.end)) + src.slice(fm.end) })
  let at(line) = path + ":" + str(line)
  // (position in the file, text to put there)
  let inserts = ()

  let line = 1
  let last = 0
  for m in clean.matches(tag-re) {
    line += clean.slice(last, m.start).matches("\n").len()
    last = m.start
    let name = m.captures.at(0)
    if name not in schemas { continue }
    inserts.push((m.start + 1 + name.len(), " _at=\"" + at(line) + "\""))
  }

  let offset = 0
  let lines = clean.split("\n")
  for (index, text) in lines.enumerate() {
    let start = offset
    offset += text.len() + 1
    // `[text](#id)`: the place the id is looked for is told to a check that runs where the document is complete
    for m in text.matches(link-re) {
      if m.start > 0 and text.slice(m.start - 1, m.start) == "!" { continue }
      inserts.push((start + m.start, "<!--raw-typst #check-label(" + repr(m.captures.first()) + ", " + repr(at(index + 1)) + ") -->"))
    }
    if not text.contains("}") { continue }
    let options = none
    let heading = text.match(heading-option-re)
    if heading != none {
      options = heading.captures.first()
    } else {
      let alone = text.match(option-line-re)
      if alone != none {
        let next = lines.slice(index + 1).find(l => l.trim() != "")
        if next != none and (next.contains("|") or next.match(list-item-re) != none) { options = alone.captures.first() }
      }
    }
    if options == none or not only-options(options) { continue }
    inserts.push((start + text.matches("}").last().start, " md-at=\"" + at(index + 1) + "\""))
  }

  let out = ""
  let from = 0
  for (position, text) in inserts.sorted(key: it => it.first()) {
    out += src.slice(from, position) + text
    from = position
  }
  out + src.slice(from)
}
