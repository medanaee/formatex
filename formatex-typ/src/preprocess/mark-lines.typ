#import "/src/preprocess/common.typ": fence-match, option-token

// The first thing that happens to a file when it is read: every piece of the user's text that can be wrong is told where it is.
//   <alert type="tip">      ->  <alert _at="main.md:5" type="tip">
//   [text](#id)             ->  <!--raw-typst #check-label("id", "main.md:5") -->[text](#id)   (after the link when it opens the line)
//   [text]{#id}             ->  [text]{#id md-at="main.md:5"}
//   ```mermaid width=80%    ->  ```mermaid width=80% md-at="main.md:5"
//   {width=full}            ->  {width=full md-at="main.md:12"}     (above a table or a list, or at the end of a heading)
// For the app's preview (`--input markers=1`) every block also gets an invisible marker that Typst finds again with its place on the page:
//   a paragraph, heading, table, quote, tag or code block   ->  <!--raw-typst #fx-mark("main.md:5") -->   on a line of its own above it
//   a list item                                              ->  `- item<!--raw-typst #fx-mark("main.md:5") --> text`   after its first word (a line between items would split the list)
// A document built without the input is byte for byte the same as before.
// The mark sits inside the tag or the braces, so the later steps (the preprocessors, cmarker) cut, add and move lines around it
// without losing it, and whoever finds the value wrong says `@main.md:5 ...` (`at-prefix` in src/core.typ). The app reads that
// mark and puts the problem on that line of that file. Only tags that have a schema are marked: the others are plain HTML.

#let tag-re = regex("<([A-Za-z][\\w-]*)((?:\"[^\"]*\"|'[^']*'|[^<>\"'])*)>")
#let heading-option-re = regex("^\\s{0,3}#{1,6}[ \\t].*?[ \\t]+\\{([^{}]*)\\}[ \\t]*\\r?$")
#let option-line-re = regex("^\\s{0,3}\\{([^{}]*)\\}[ \\t]*\\r?$")
#let link-re = regex("\[[^\[\]\n]*\]\(#([^)\s]+)\)")
#let span-option-re = regex("\[[^\]\n]+\]\{([^{}\n]*)\}")
#let mermaid-fence-re = regex("(?m)^[ \\t]{0,3}(?:`{3,}|~{3,})[ \\t]*mermaid(?:[ \\t][^\\r\\n]*)?$")
#let line-start-re = regex("^[\\s>]*(?:(?:[-*+]|[0-9]{1,9}[.)])[\\s>]+)*$")
#let list-item-re = regex("^\\s{0,3}([-*+]|[0-9]{1,9}[.)])(\\s|$)")
// The start of a list item up to its text, and a task list's box, which a comment before it would hide from Markdown
#let list-prefix-re = regex("^\\s{0,3}(?:[-*+]|[0-9]{1,9}[.)])[ \\t]+")
// The first word of a list item's text when nothing in it is markup and more text follows on the line
#let list-word-re = regex("^([^\\s`*_~\\[\\]<>$!\\\\{}|()#&]+)[ \\t]+\\S")
#let indent-re = regex("^[ \t]*")

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

  // The fence line of a mermaid block carries its options (width, height): the mark goes after them
  let fence-line = 1
  let fence-last = 0
  for m in src.matches(mermaid-fence-re) {
    fence-line += src.slice(fence-last, m.start).matches("\n").len()
    fence-last = m.start
    inserts.push((m.end, " md-at=\"" + at(fence-line) + "\""))
  }

  let offset = 0
  let lines = clean.split("\n")
  for (index, text) in lines.enumerate() {
    let start = offset
    offset += text.len() + 1
    // `[text](#id)`: the place the id is looked for is told to a check that runs where the document is complete
    for m in text.matches(link-re) {
      let before = text.slice(0, m.start)
      if before.ends-with("!") { continue }
      let check = "<!--raw-typst #check-label(" + repr(m.captures.first()) + ", " + repr(at(index + 1)) + ") -->"
      // A comment that opens a line (or a list item or quote) starts an HTML block, and the link in it is left as text:
      // there it goes after the link instead (a wrong id is then reported by Typst, without the line)
      if before.match(line-start-re) != none { inserts.push((start + m.end, check)) } else { inserts.push((start + m.start, check)) }
    }
    // `[text]{#id highlight=green}`: the options of a span (it becomes a `<span>`, which takes the mark as `_at`)
    for m in text.matches(span-option-re) {
      if text.slice(0, m.start).ends-with("!") or not only-options(m.captures.first()) { continue }
      inserts.push((start + m.end - 1, " md-at=\"" + at(index + 1) + "\""))
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

  if sys.inputs.at("markers", default: "") == "1" {
    let fm-lines = if fm == none { 0 } else { src.slice(0, fm.end).matches("\n").len() }
    let mark(line) = "<!--raw-typst #fx-mark(" + repr(at(line)) + ") -->"
    let fence = none
    let after-blank = true
    let offset = 0
    let clean-lines = clean.split("\n")
    for (index, text) in src.split("\n").enumerate() {
      let start = offset
      offset += text.len() + 1
      // The front matter is settings, not text
      if index < fm-lines { continue }
      let blank-line = text.trim() == ""
      let f = fence-match(text)
      if fence != none {
        if f != none and f.captures.first().first() == fence { fence = none }
        after-blank = false
        continue
      }
      if f != none {
        fence = f.captures.first().first()
        if after-blank and text.match(indent-re).end < 2 { inserts.push((start, mark(index + 1) + "\n")) }
        after-blank = false
        continue
      }
      let was-blank = after-blank
      after-blank = blank-line
      // A line that is nothing but a comment (or the inside of one) is not a block
      if blank-line or clean-lines.at(index).trim() == "" { continue }
      let item = text.match(list-prefix-re)
      if item != none {
        // After the first word of the item's text, so the marker is where the item starts: a comment that opens the text would make
        // the line an HTML block, and one at the end of the line would sit at the bottom of an item that wraps. Only after a plain
        // word that is followed by a space (not by markup, a task-list box or the end of the line); otherwise the item is not marked
        // and belongs to the block of the marker above it.
        let word = text.slice(item.end).match(list-word-re)
        if word != none { inserts.push((start + item.end + word.captures.first().len(), mark(index + 1))) }
      } else if was-blank and text.match(indent-re).end < 2 {
        inserts.push((start, mark(index + 1) + "\n"))
      }
    }
  }

  let out = ""
  let from = 0
  for (position, text) in inserts.sorted(key: it => it.first()) {
    out += src.slice(from, position) + text
    from = position
  }
  out + src.slice(from)
}
