#import "/src/preprocess/protect.typ": blank, markup-only
#import "/src/lib/vars.typ": check-vars, fail, resolve-path, rooted-path
#import "/src/lib/expr.typ": check-name, deferred-comment, lint-enums, run-code, scan-expression, show-value, uses-dynamic

// Sequential Typst execution with byte-precise origins for literal and generated pieces.
#let include-line = regex("^\\s{0,3}<include\\s+src=\"([^\"]+)\"\\s*/?>(?:\\s*</include>)?\\s*\\r?$")
#let open-re = regex("(\\\\)?\\{\\{")
#let display-math-re = regex("\\$\\$[\\s\\S]*?\\$\\$")
#let typ-block-re = regex("<typ[\\s>][\\s\\S]*?</typ>")
#let open-tag-re = regex("<[A-Za-z][^>]*$")

#let resolve-include(path, from) = resolve-path(path, from: from)

#let evaluate-file(text, path, env, front-regex, chain, keep-front, includes: true, at-line: none) = {
  let place(line) = if at-line == none { "@" + path + ":" + str(line) + " " } else { at-line(line) }
  let fm = if front-regex == none { none } else { text.match(front-regex) }
  let head = if fm == none { "" } else { text.slice(0, fm.end) }
  let tail = text.slice(head.len())
  let masked = markup-only(tail).replace(display-math-re, m => blank(m.text)).replace(typ-block-re, m => blank(m.text))
  let initial = (lines: ("",), maps: ((),), files: ((path): text), env: env)
  let emit(state, chunk, mchunk, original, generated, final) = {
    let offset = 0
    let parts = chunk.split("\n")
    let masked-parts = mchunk.split("\n")
    for (i, piece) in parts.enumerate() {
      if i > 0 { state.lines.push(""); state.maps.push(()) }
      let complete = i < parts.len() - 1 or final
      let found = if includes and complete and state.lines.last().trim() == "" { masked-parts.at(i).match(include-line) } else { none }
      if found == none {
        state.lines.at(state.lines.len() - 1) += piece
        if piece != "" {
          state.maps.at(state.maps.len() - 1).push((length: piece.len(), file: path, generated: generated, original: if generated { original } else { (original.first() + offset, original.first() + offset + piece.len()) }))
        }
      } else {
        let target = resolve-include(found.captures.first(), path)
        let at = place(text.slice(0, original.first()).matches("\n").len() + 1)
        assert(target not in chain, message: at + "<include> loop: " + (chain + (target,)).join(" -> "))
        let included = evaluate-file(read(rooted-path(target)), target, state.env, front-regex, chain + (target,), false)
        state.env = included.env
        state.files += included.files
        state.lines.at(state.lines.len() - 1) = ""
        state.maps.at(state.maps.len() - 1) = ()
        state.lines += included.lines + ("",)
        state.maps += included.maps + ((),)
      }
      offset += piece.len() + 1
    }
    state
  }
  let state = initial
  if keep-front { state = emit(state, head, blank(head), (0, head.len()), false, false) }
  let line = head.matches("\n").len() + 1
  let rest = tail
  let mrest = masked
  while true {
    let source-start = text.len() - rest.len()
    let m = mrest.match(open-re)
    if m == none { state = emit(state, rest, mrest, (source-start, text.len()), false, true); break }
    let before = rest.slice(0, m.start)
    state = emit(state, before, mrest.slice(0, m.start), (source-start, source-start + m.start), false, false)
    line += before.matches("\n").len()
    if m.captures.at(0) != none {
      state = emit(state, "{{", "{{", (source-start + m.start, source-start + m.end), true, false)
      rest = rest.slice(m.end); mrest = mrest.slice(m.end)
      continue
    }
    let start = line
    let lc(p) = place(start + rest.slice(m.end, m.end + p).matches("\n").len())
    let scanned = scan-expression(mrest.slice(m.end), rest.slice(m.end), lc)
    let end = m.end + scanned.end
    let at = place(start)
    let shown = ""
    if uses-dynamic(scanned.code) {
      if state.lines.last().match(open-tag-re) != none { fail(at, "a contextual value cannot stand in a tag attribute") }
      if sys.inputs.at("target", default: "typ") == "html" and scanned.code.match(regex("\\bPAGES?\\b")) != none { fail(at, "PAGE and PAGES are only available in paged output, not continuous HTML") }
      shown = deferred-comment(scanned.code, state.env)
    } else {
      check-name(scanned.code, state.env, at)
      lint-enums(scanned.code, state.env, at)
      let (value, after) = run-code(scanned.code, state.env, from: path)
      state.env += (values: check-vars(after, state.env, at, from: path))
      shown = show-value(value, at: at)
    }
    let indent = state.lines.last()
    let alone = indent.trim() == "" and rest.slice(end).split("\n").first().trim() == ""
    if shown.contains("\n") and not alone { fail(at, "Multiline results require {{ }} alone on their lines") }
    if shown.contains("\n") {
      let apart = state.lines.len() > 1 and state.lines.at(state.lines.len() - 2).trim() != ""
      let pieces = shown.split("\n")
      shown = pieces.first() + "\n" + pieces.slice(1).map(piece => if piece == "" { "" } else { indent + piece }).join("\n")
      if apart { state.lines.at(state.lines.len() - 1) = ""; state.maps.at(state.maps.len() - 1) = (); shown = "\n" + indent + shown }
      shown += "\n"
    }
    state = emit(state, shown, if shown.contains("<include") { markup-only(shown) } else { shown }, (source-start + m.start, source-start + end), true, alone)
    line += rest.slice(0, end).matches("\n").len() - before.matches("\n").len()
    rest = rest.slice(end); mrest = mrest.slice(end)
  }
  state
}

#let evaluate-document(text, path, env, front-regex) = {
  // Ordinary Markdown needs no per-line evaluator state. Keep one exact linear origin.
  if not text.contains("{{") and not text.contains("<include") {
    let front = if front-regex == none { none } else { text.match(front-regex) }
    let start = if front == none { 0 } else { front.end }
    let body = text.slice(start)
    return (text: body, sources: ((path): text), env: env, segments: if body == "" { () } else { ((start: 0, end: body.len(), file: path, original: (start, text.len()), generated: false),) })
  }
  let done = evaluate-file(text, path, env, front-regex, (path,), false)
  let segments = ()
  let offset = 0
  for (i, pieces) in done.maps.enumerate() {
    for piece in pieces {
      segments.push((start: offset, end: offset + piece.length, file: piece.file, original: piece.original, generated: piece.generated))
      offset += piece.length
    }
    if i < done.maps.len() - 1 {
      let prior = if pieces.len() > 0 { pieces.last() } else { none }
      if prior != none {
        let stop = prior.original.last()
        let file-text = done.files.at(prior.file)
        let actual = not prior.generated and stop < file-text.len() and file-text.slice(stop).starts-with("\n")
        segments.push((start: offset, end: offset + 1, file: prior.file, original: if actual { (stop, stop + 1) } else { prior.original }, generated: not actual))
      }
      offset += 1
    }
  }
  (text: done.lines.join("\n"), segments: segments, sources: done.files, env: done.env)
}

#let evaluate-string(text, env, at) = {
  if not text.contains("{{") { return text }
  let origin = if type(at) == str and at.starts-with("@") {
    let body = at.slice(1).trim()
    let parts = body.split(":")
    if parts.len() > 1 { parts.slice(0, -1).join(":") } else { "" }
  } else { "" }
  evaluate-file(text, origin, env, none, (), false, includes: false, at-line: line => at).lines.join("\n")
}

#let resolve-strings(value, env, locate, path: ()) = {
  if type(value) == str { evaluate-string(value, env, locate(..path)) }
  else if type(value) == dictionary { value.pairs().map(((key, child)) => (key, resolve-strings(child, env, locate, path: path + (key,)))).to-dict() }
  else if type(value) == array { value.map(child => resolve-strings(child, env, locate, path: path)) }
  else { value }
}
