// `{{ ... }}`: reads one expression out of a text and runs it as Typst code (src/preprocess/evaluate.typ puts the result in the text).
//
// The code is plain Typst. What this file adds is the Markdown: a `[ ... ]` in the code is a text of Markdown, a string, and a `{{ ... }}`
// inside it is code again (its result goes into the text). A text in single quotes is accepted too (Typst has only double ones), so an
// attribute written in double quotes can hold one: `title="{{ draft ? 'a' : 'b' }}"` is written `{{ if draft { 'a' } else { 'b' } }}`.
//
// `masked` is the text with code, math and comments blanked out (same length), so the brackets and quotes of those are not read as ours;
// `orig` is the text itself. Both start where the code starts, right after the `{{`.
#import "/src/lib/vars.typ": check-vars, fail, norm, rooted-path

#let token-re = regex("\"|'|//|/\\*|\\[|\\]|\\{|\\}|\\(|\\)|\\\\[\\s\\S]")
#let double-quoted-re = regex("^(?:[^\"\\\\]|\\\\[\\s\\S])*\"")
#let single-quoted-re = regex("^(?:[^'\\\\]|\\\\[\\s\\S])*'")
#let line-comment-re = regex("^//[^\\n]*")
#let block-comment-re = regex("^/\\*[\\s\\S]*?\\*/")
#let marker = "\u{E000}"

#let string-literal(s) = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "").replace("\t", "\\t") + "\""

// The text of a `[ ... ]`: the line breaks right after the `[` and before the `]` are not part of it, and the indentation the lines
// share is taken off, so a block can be indented with the code around it
#let tidy-markdown(text) = {
  let lines = text.split("\n")
  if lines.len() == 1 { return text.trim() }
  let first = lines.first()
  let on-bracket = first.trim() != ""
  lines = lines.slice(1)
  if lines.len() > 0 and lines.last().trim() == "" { lines = lines.slice(0, -1) }
  let indents = lines.filter(line => line.trim() != "").map(line => line.len() - line.trim(at: start).len())
  let strip = if indents.len() == 0 { 0 } else { calc.min(..indents) }
  let body = lines.map(line => if line.trim() == "" { "" } else { line.slice(strip) })
  (if on-bracket { (first.trim(at: start),) } else { () } + body).join("\n")
}

// The Typst for a text of Markdown with code pieces in it: the literal parts and `__s(code)` joined with `+`
#let markdown-expression(pieces) = {
  let joined = pieces.map(piece => if piece.kind == "lit" { piece.text } else { marker }).join()
  let text = tidy-markdown(joined)
  let codes = pieces.filter(piece => piece.kind == "code").map(piece => piece.text)
  let parts = text.split(marker)
  let out = ()
  for (k, part) in parts.enumerate() {
    if part != "" { out.push(string-literal(part)) }
    if k < codes.len() { out.push("__s({\n" + codes.at(k) + "\n})") }
  }
  // A block, so it stands where a `[ ... ]` does: after `if condition` and `else`
  if out.len() == 0 { "{ \"\" }" } else { "{ " + out.join(" + ") + " }" }
}

// Where a quoted text, a comment ends: the position after it, or none
#let skip-quoted(rest, p, quote) = {
  let m = rest.slice(p + 1).match(if quote == "\"" { double-quoted-re } else { single-quoted-re })
  if m == none { none } else { p + 1 + m.end }
}

// The tokens that start at or after `end`, as an index
#let advance(ms, i, end) = {
  let j = i
  while j < ms.len() and ms.at(j).start < end { j += 1 }
  j
}

// Code, from `base` to the `}}` that ends it. Returns the Typst, the position after the `}}` and the next token.
// Functions of this file call each other, and a function cannot call a later one, so the two readers are one.
#let scan(ms, i, base, rest, orig, lc, markdown) = {
  let out = ""
  let from = base
  let depth = 0
  let pieces = ()
  let at = i
  // markdown mode: the text goes into pieces; code mode: into `out`
  while at < ms.len() {
    let t = ms.at(at)
    let k = t.text
    if markdown {
      if k == "[" {
        depth += 1
      } else if k == "]" {
        if depth == 0 {
          pieces.push((kind: "lit", text: orig.slice(from, t.start)))
          return (code: markdown-expression(pieces), end: t.end, i: at + 1)
        }
        depth -= 1
      } else if k == "{" {
        let next = if at + 1 < ms.len() { ms.at(at + 1) } else { none }
        if next != none and next.text == "{" and next.start == t.end {
          pieces.push((kind: "lit", text: orig.slice(from, t.start)))
          let inner = scan(ms, at + 2, next.end, rest, orig, lc, false)
          pieces.push((kind: "code", text: inner.code))
          from = inner.end
          at = inner.i
          continue
        }
      }
      at += 1
      continue
    }
    if k == "\"" or k == "'" {
      let end = skip-quoted(rest, t.start, k)
      if end == none { fail(lc(t.start), "a text in quotes is not closed") }
      if k == "'" {
        let inner = orig.slice(t.start + 1, end - 1).replace("\\'", "'").replace("\"", "\\\"")
        out += orig.slice(from, t.start) + "\"" + inner + "\""
        from = end
      }
      at = advance(ms, at + 1, end)
    } else if k == "//" {
      at = advance(ms, at + 1, t.start + rest.slice(t.start).match(line-comment-re).end)
    } else if k == "/*" {
      let m = rest.slice(t.start).match(block-comment-re)
      if m == none { fail(lc(t.start), "a /* comment is not closed with */") }
      at = advance(ms, at + 1, t.start + m.end)
    } else if k == "(" or k == "{" {
      depth += 1
      at += 1
    } else if k == ")" {
      depth -= 1
      at += 1
    } else if k == "}" {
      if depth > 0 {
        depth -= 1
        at += 1
        continue
      }
      // the end of the expression: this brace and the one right after it
      let next = if at + 1 < ms.len() { ms.at(at + 1) } else { none }
      if next != none and next.text == "}" and next.start == t.end {
        return (code: out + orig.slice(from, t.start), end: next.end, i: at + 2)
      }
      fail(lc(t.start), "a `}` closes nothing: the expression ends with `}}`")
    } else if k == "[" {
      let md = scan(ms, at + 1, t.end, rest, orig, lc, true)
      out += orig.slice(from, t.start) + md.code
      from = md.end
      at = md.i
    } else if k == "]" {
      fail(lc(t.start), "a `]` closes no `[`; in a text of Markdown write \\] for a bracket that belongs to the text")
    } else {
      at += 1
    }
  }
  fail(lc(base), if markdown { "this [ is never closed with ]" } else { "this {{ is never closed with }}" })
}

// One expression: its Typst and where it ends (positions are in `orig`)
#let scan-expression(masked, orig, lc) = {
  let ms = masked.matches(token-re)
  let found = scan(ms, 0, 0, masked, orig, lc, false)
  (code: found.code, end: found.end)
}

// ---- running the code
// The text of a value that is printed
#let show-value(v, at: "") = {
  let t = type(v)
  if v == none { "" } else if t == str { v } else if t == bool {
    if v { "true" } else { "false" }
  } else if t in (int, float) { str(v) } else if t in (length, ratio, relative, angle, fraction, color) { repr(v) } else if t == array {
    fail(at, "a list cannot be printed; join it into a text: items.join(\", \")")
  } else if t == dictionary {
    fail(at, "a table cannot be printed; print one of its values")
  } else {
    fail(at, "this value (" + repr(t) + ") cannot be printed; a text of Markdown is written [ ... ]")
  }
}

// What the code can read: the variables (as `let`s, so the code can change them), `setting`, the keys of the cover, and the readers of
// files with their paths taken from the project root
// `extra` is what only the page knows (PAGE, PAGES...), for the code that runs when the pages are made
#let run-code(code, env, extra: (:)) = {
  let names = env.values.keys()
  let prelude = names.map(name => "let " + name + " = __v." + name + "\n").join()
  let after = if names.len() == 0 { "(:)" } else { "(" + names.map(name => name + ": " + name).join(", ") + ",)" }
  let full = (if prelude == none { "" } else { prelude }) + "let __r = {\n" + code + "\n}\n(__r, " + after + ")"
  let scope = env.scope + extra + (
    __v: env.values,
    __s: v => show-value(v),
    json: p => json(rooted-path(p)),
    yaml: p => yaml(rooted-path(p)),
    toml: p => toml(rooted-path(p)),
    csv: p => csv(rooted-path(p)),
    read: p => read(rooted-path(p)),
  )
  eval(full, mode: "code", scope: scope)
}

// Values only the pages know: a `{{ }}` that names one of them runs when the pages are made, not when the text is read
#let dynamic-re = regex("\\b(?:PAGES|PAGE|SECTION_NUMBER|SECTION)\\b")
#let uses-dynamic(code) = code.match(dynamic-re) != none

// The Typst a `{{ }}` that needs the pages is replaced by: it runs the code then (`fx-deferred` in main.typ) with the variables the code
// names, as they are now. Written as a comment, so nothing between the text and the Typst reads it (`-->` inside is escaped).
#let deferred-comment(code, env) = {
  let used = (:)
  for (name, value) in env.values {
    if code.contains(name) { used.insert(name, value) }
  }
  let body = (string-literal(code) + ", " + repr(used)).replace("-->", "--\\u{3e}")
  "<!--raw-typst #fx-deferred(" + body + ") -->"
}

// A name, or a name and some keys after it (`audience`, `setting.chat.frame`), and nothing else
#let plain-name-re = regex("^([\\p{L}_][\\p{L}\\p{N}_-]*)((?:\\.[\\p{L}\\p{N}_-]+)*)$")

// A mistyped name is told with the line, which Typst cannot do for code it runs from a text: checked here for what is only a name
#let check-name(code, env, at) = {
  let m = code.trim().match(plain-name-re)
  if m == none { return }
  let name = m.captures.at(0)
  let keys = m.captures.at(1).split(".").filter(k => k != "")
  let current = if name in env.values { env.values.at(name) } else if name in env.scope { env.scope.at(name) } else { fail(at, "unknown variable " + repr(name) + if env.values.len() > 0 { " (the variables are " + env.values.keys().join(", ") + ")" } else { "" }) }
  let path = name
  for key in keys {
    if type(current) != dictionary { return }
    if key not in current { fail(at, repr(path) + " has no " + repr(key) + " (it has " + current.keys().join(", ") + ")") }
    current = current.at(key)
    path += "." + key
  }
}

// The text a variable that lists its values is compared with has to be one of them: `mode == "teachr"` is a mistake
#let lint-enums(code, env, at) = {
  let allowed(name) = {
    let rule = env.rules.at(name, default: none)
    if rule == none or code.contains("let " + name) { return none }
    if type(rule) == array { rule } else if type(rule) == dictionary { rule.at("options", default: none) } else { none }
  }
  let name-part = "([\\p{L}_][\\p{L}\\p{N}_-]*)"
  let text-part = "\"((?:[^\"\\\\]|\\\\.)*)\""
  let check(name, value) = {
    let options = allowed(name)
    if options != none { assert(options.map(norm).contains(value), message: at + repr(value) + " is not a value of " + name + " (" + options.map(norm).join(", ") + ")") }
  }
  for m in code.matches(regex(name-part + "\\s*(?:==|!=)\\s*" + text-part)) { check(m.captures.at(0), m.captures.at(1)) }
  for m in code.matches(regex(text-part + "\\s*(?:==|!=)\\s*" + name-part)) { check(m.captures.at(1), m.captures.at(0)) }
  for m in code.matches(regex(name-part + "\\s+in\\s+\\(([^)]*)\\)")) {
    for item in m.captures.at(1).matches(regex(text-part)) { check(m.captures.at(0), item.captures.at(0)) }
  }
}
