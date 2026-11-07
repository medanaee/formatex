#import "/src/preprocess/mark-lines.typ": blank, markup-only
#import "/src/lib/vars.typ": check-vars, fail, rooted-path
#import "/src/lib/expr.typ": check-name, deferred-comment, lint-enums, run-code, scan-expression, show-value, uses-dynamic

// `{{ code }}`: Typst that sees the variables of the document (src/lib/vars.typ). The text of the document goes through here before the
// Markdown is read, so what a `{{ }}` gives is Markdown again, and a part that is not chosen is not in the document at all: its headings
// take no number, its `<include>` is not read.
//
//   Term {{ year }}                                      a value, in the text or in an attribute
//   {{ if draft { "Draft" } else { "Final" } }}
//   {{
//     if audience == "teacher" [
//       ## Answer key                                    [ ... ] is Markdown, with tags and {{ }} in it
//     ] else [ Good luck! ]
//   }}
//
// An expression alone on its lines gives a block (with a blank line around it, and the indentation of its first line on the others);
// anywhere else it gives a line of text. Code (fenced and inline), math, comments, `<typ>` blocks and the front matter are left alone,
// and `\{{` prints `{{`. The variables a `{{ }}` changes (`n += 1`) are changed for the `{{ }}`s after it.
//
// `<include src="chapters/intro.md"></include>` alone on a line is replaced by that file's text, evaluated at that point with the
// variables as they are there, so headings, numbering, ids and <ref> work across files. A path starting with ./ or ../ is relative to
// the file that contains the include; any other path is relative to the project root (like images). An included file's front matter
// is dropped: only the main file's settings count. Lines inside fenced code blocks are left alone.
//
// Returns the lines of the new text, the place (`path:line`) of the source each of them comes from, for the problems found later (see
// mark-lines.typ; the lines of a text a `{{ }}` made are the line of the `{{`), and the variables as they are at the end.
#let include-line = regex("^\\s{0,3}<include\\s+src=\"([^\"]+)\"\\s*/?>(?:\\s*</include>)?\\s*\\r?$")
#let open-re = regex("(\\\\)?\\{\\{")
#let display-math-re = regex("\\$\\$[\\s\\S]*?\\$\\$")
#let typ-block-re = regex("<typ[\\s>][\\s\\S]*?</typ>")
#let open-tag-re = regex("<[A-Za-z][^>]*$")

// A path starting with ./ or ../ is relative to the file that contains the include
#let resolve-include(path, from) = {
  if not (path.starts-with("./") or path.starts-with("../")) { return path }
  let parts = from.split("/").slice(0, -1)
  for seg in path.split("/") {
    if seg == "." or seg == "" { continue }
    if seg == ".." { if parts.len() > 0 { parts = parts.slice(0, -1) } } else { parts.push(seg) }
  }
  parts.join("/")
}

#let evaluate-file(text, path, env, front-regex, chain, keep-front, includes: true, at-line: none) = {
  let ps(line) = path + ":" + str(line)
  let place(line) = if at-line == none { "@" + ps(line) + " " } else { at-line(line) }
  let fm = if front-regex == none { none } else { text.match(front-regex) }
  let head = if fm == none { "" } else { text.slice(0, fm.end) }
  let tail = text.slice(head.len())
  // Same bytes, same lines: only what is not text of the document is blanked
  let masked = markup-only(tail).replace(display-math-re, m => blank(m.text)).replace(typ-block-re, m => blank(m.text))

  // Adds a text to the lines: the first line of it continues the line that is open. An include line in it is replaced by the file.
  // `line` is the line of the source it comes from (a text an expression made is all from the line of the expression); `final` says the
  // text ends the file, so its last line is a whole line too.
  let emit(lines, places, env, chunk, mchunk, line, generated, final) = {
    let parts = chunk.split("\n")
    let mparts = mchunk.split("\n")
    for (k, piece) in parts.enumerate() {
      if k > 0 {
        lines.push("")
        places.push(ps(if generated { line } else { line + k }))
      }
      let complete = k < parts.len() - 1 or final
      let found = if includes and complete and lines.last().trim() == "" { mparts.at(k).match(include-line) } else { none }
      if found == none {
        lines.at(lines.len() - 1) = lines.last() + piece
        continue
      }
      let at = place(if generated { line } else { line + k })
      let target = resolve-include(found.captures.first(), chain.last())
      assert(target not in chain, message: at + "<include> loop: " + (chain + (target,)).join(" -> "))
      let included = evaluate-file(read(rooted-path(target)), target, env, front-regex, chain + (target,), false)
      env = included.env
      // Blank lines keep the included blocks from merging with the text around them
      lines.at(lines.len() - 1) = ""
      lines += included.lines
      places += included.places
      lines.push("")
      places.push(ps(if generated { line } else { line + k }))
    }
    (lines, places, env)
  }

  let lines = ("",)
  let first = head.matches("\n").len() + 1
  let places = (ps(if keep-front { 1 } else { first }),)
  if keep-front { (lines, places, env) = emit(lines, places, env, head, blank(head), 1, false, false) }
  // The source line the rest starts on
  let line = first
  let rest = tail
  let mrest = masked
  while true {
    let m = mrest.match(open-re)
    if m == none {
      (lines, places, env) = emit(lines, places, env, rest, mrest, line, false, true)
      break
    }
    let before = rest.slice(0, m.start)
    if m.captures.at(0) != none {
      // `\{{` is the text `{{`
      (lines, places, env) = emit(lines, places, env, before + "{{", mrest.slice(0, m.start) + "{{", line, false, false)
      line += before.matches("\n").len()
      rest = rest.slice(m.end)
      mrest = mrest.slice(m.end)
      continue
    }
    (lines, places, env) = emit(lines, places, env, before, mrest.slice(0, m.start), line, false, false)
    line += before.matches("\n").len()
    let start = line
    let lc(p) = place(start + rest.slice(m.end, m.end + p).matches("\n").len())
    let scanned = scan-expression(mrest.slice(m.end), rest.slice(m.end), lc)
    let end = m.end + scanned.end
    let at = place(start)
    let shown = ""
    if uses-dynamic(scanned.code) {
      // PAGE, PAGES...: only the pages know them, so the code runs when they are made
      if lines.last().match(open-tag-re) != none { fail(at, "a value of the page (PAGE, PAGES, SECTION, SECTION_NUMBER) cannot stand in the attribute of a tag") }
      shown = deferred-comment(scanned.code, env)
    } else {
      check-name(scanned.code, env, at)
      lint-enums(scanned.code, env, at)
      let (value, after) = run-code(scanned.code, env)
      env = env + (values: check-vars(after, env, at))
      shown = show-value(value, at: at)
    }

    // Alone on its lines: a block, with the indentation of the first line on the others
    let indent = lines.last()
    let alone = indent.trim() == "" and rest.slice(end).split("\n").first().trim() == ""
    if shown.contains("\n") and not alone {
      fail(at, "this gives several lines of text; put the {{ }} alone on its lines (nothing before it and nothing after the }}) so they can stand as a block")
    }
    if shown.contains("\n") {
      let apart = lines.len() > 1 and lines.at(lines.len() - 2).trim() != ""
      let pieces = shown.split("\n")
      shown = pieces.first() + "\n" + pieces.slice(1).map(l => if l == "" { "" } else { indent + l }).join("\n")
      if apart {
        lines.at(lines.len() - 1) = ""
        shown = "\n" + indent + shown
      }
      shown += "\n"
    }
    (lines, places, env) = emit(lines, places, env, shown, if shown.contains("<include") { markup-only(shown) } else { shown }, start, true, alone)
    line += rest.slice(0, end).matches("\n").len() - before.matches("\n").len()
    rest = rest.slice(end)
    mrest = mrest.slice(end)
  }
  (lines: lines, places: places, env: env)
}

// The document: the text of the main file with its includes in place, and what it came from
#let evaluate-document(text, path, env, front-regex) = {
  let done = evaluate-file(text, path, env, front-regex, (path,), true)
  (text: done.lines.join("\n"), places: done.places, env: done.env)
}

// The `{{ }}` of one text (a setting that is a text: `title: "{{ course }}"`): what it gives
#let evaluate-string(text, env, at) = {
  if not text.contains("{{") { return text }
  evaluate-file(text, "", env, none, (), false, includes: false, at-line: line => at).lines.join("\n")
}

// The texts among the settings (`cover.title: "{{ course }}"`) with their `{{ }}` put in place. `vars` is left as it is.
#let resolve-strings(value, env, locate, path: ()) = {
  if type(value) == str {
    if value.contains("{{") { evaluate-string(value, env, locate(..path)) } else { value }
  } else if type(value) == dictionary {
    let out = (:)
    for (key, item) in value {
      out.insert(key, if path.len() == 0 and key in ("vars", "var-types") { item } else { resolve-strings(item, env, locate, path: path + (key,)) })
    }
    out
  } else if type(value) == array {
    value.map(item => resolve-strings(item, env, locate, path: path))
  } else { value }
}
