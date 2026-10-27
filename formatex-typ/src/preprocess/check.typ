#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token
#import "/src/lib/schema.typ": at-prefix, check-attrs, check-values
#import "/src/lib/option-schema.typ": option-schemas

// What the text of the user asks for is checked here, while it is still the text the user wrote: every line is where the editor
// shows it, so a problem is reported as `@path:line message` (see `at-prefix`) and the app marks that line. The later steps
// (the preprocessors, cmarker, the handlers) cut, add and move lines, so they cannot tell the line. They keep their own checks:
// a problem that is only found there still stops the build, just without a line.
//
// Checked: the attributes of every tag that has a schema (types, required ones, `needs`), and the `{...}` option lines of
// tables, lists and headings, against the same schemas the editor completes from.

#let tag-re = regex("<([A-Za-z][\\w-]*)((?:\"[^\"]*\"|'[^']*'|[^<>\"'])*)>")
#let attr-re = regex("([A-Za-z_][\\w:.-]*)(?:\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+)))?")
#let heading-option-re = regex("^\\s{0,3}#{1,6}[ \\t].*?[ \\t]+\\{([^{}]*)\\}[ \\t]*\\r?$")
#let option-line-re = regex("^\\s{0,3}\\{([^{}]*)\\}[ \\t]*\\r?$")
#let list-item-re = regex("^\\s{0,3}([-*+]|[0-9]{1,9}[.)])(\\s|$)")

// Same length, same lines: only the characters change.
#let blank(text) = text.replace(regex("[^\\n]"), " ")

// The text with everything that is not markup blanked out: comments, fenced code, inline code and inline math. The tags and the
// option lines are looked for in what is left.
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

// `{width=full #id}` -> (width: "full", id: "id"); `none` when the braces hold something else than option tokens.
#let parse-options(content) = {
  if content.replace(option-token, "").trim() != "" { return none }
  let opts = (:)
  for t in content.matches(option-token) {
    let (id, key, quoted, bare) = t.captures
    if id != none { opts.insert("id", id) } else { opts.insert(key, if quoted != none { quoted } else { bare }) }
  }
  opts
}

#let check-options(group, opts, at) = {
  let specs = option-schemas.at(group).attrs
  for key in opts.keys() {
    assert(key in specs, message: at-prefix(at) + "Unknown " + group + " option " + repr(key) + "; available: " + specs.keys().join(", "))
  }
  check-values(group + " option", specs, opts, at: at)
}

// `src` is the whole file as it is on disk, `path` its project path.
#let check-source(src, path, schemas) = {
  // The front matter is settings, not text: its lines stay (the numbering) but are blanked
  let fm = src.match(front-matter-regex)
  let clean = markup-only(if fm == none { src } else { blank(src.slice(0, fm.end)) + src.slice(fm.end) })
  let where(line) = path + ":" + str(line)

  // A build stops at the first problem: the checks are collected and run in the order of the lines
  let jobs = ()

  // Tags
  let line = 1
  let last = 0
  for m in clean.matches(tag-re) {
    line += clean.slice(last, m.start).matches("\n").len()
    last = m.start
    let spec = schemas.at(m.captures.at(0), default: none)
    if spec == none { continue }
    let attrs = (:)
    for a in m.captures.at(1).matches(attr-re) {
      let (key, double, single, bare) = a.captures
      attrs.insert(key, if double != none { double } else if single != none { single } else if bare != none { bare } else { "" })
    }
    let here = line
    jobs.push((here, () => check-attrs(spec.at("display", default: m.captures.at(0)), spec.at("attrs"), attrs, at: where(here), needs: spec.at("needs", default: none))))
  }

  // Option lines: at the end of a heading, or alone above a table or a list (a blank line between is fine)
  let lines = clean.split("\n")
  for (index, text) in lines.enumerate() {
    if not text.contains("{") { continue }
    let heading = text.match(heading-option-re)
    if heading != none {
      let opts = parse-options(heading.captures.first())
      if opts != none and opts.len() > 0 { jobs.push((index + 1, () => check-options("heading", opts, where(index + 1)))) }
      continue
    }
    let alone = text.match(option-line-re)
    if alone == none { continue }
    let opts = parse-options(alone.captures.first())
    if opts == none or opts.len() == 0 { continue }
    let next = lines.slice(index + 1).find(l => l.trim() != "")
    if next == none { continue }
    if next.contains("|") { jobs.push((index + 1, () => check-options("table", opts, where(index + 1)))) } else if next.match(list-item-re) != none { jobs.push((index + 1, () => check-options("list", opts, where(index + 1)))) }
  }

  for job in jobs.sorted(key: job => job.first()) { (job.last())() }
}
