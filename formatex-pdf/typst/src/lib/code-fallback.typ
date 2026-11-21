// A fenced block in a language Typst has no highlighting for (or with no language) would be one flat color. This colors it with a
// rough, language-free reading: comments, strings, numbers, keywords that most languages share, constants, type-like names (`Name`) and
// calls (`name(`). It is a hint of structure, not a parser, and it works a line at a time (a `/* ... */` carries over its lines).
// Palettes follow the dark theme (`code-dark.tmTheme`) and Typst's own light one.

#let fallback-palette(dark) = if dark {
  (comment: rgb("#7F848E"), string: rgb("#98C379"), number: rgb("#D19A66"), keyword: rgb("#C678DD"), function: rgb("#61AFEF"), type: rgb("#E5C07B"), constant: rgb("#D19A66"))
} else {
  (comment: rgb("#6a737d"), string: rgb("#22863a"), number: rgb("#c2410c"), keyword: rgb("#a626a4"), function: rgb("#4b69c6"), type: rgb("#b8860b"), constant: rgb("#c2410c"))
}

// Languages whose name says "no colors, please".
#let plain-languages = ("text", "txt", "plain", "plaintext", "none", "console", "output", "log", "terminal")

#let keywords = (
  "if", "else", "elif", "elsif", "elseif", "for", "foreach", "while", "do", "loop", "switch", "case", "default", "when", "match", "break", "continue",
  "return", "function", "func", "fun", "fn", "def", "proc", "sub", "class", "struct", "enum", "interface", "trait", "impl", "object", "type",
  "import", "from", "export", "as", "package", "module", "namespace", "use", "using", "include", "require", "let", "var", "val", "const",
  "static", "public", "private", "protected", "final", "abstract", "override", "new", "delete", "try", "catch", "except", "finally", "throw",
  "throws", "raise", "with", "yield", "async", "await", "in", "is", "not", "and", "or", "of", "then", "end", "begin", "where", "select",
  "insert", "update", "create", "table", "join", "group", "order", "by", "limit", "echo", "print", "println", "local", "extends", "implements",
)
#let constants = ("true", "false", "null", "nil", "none", "None", "True", "False", "NULL", "self", "this", "super", "void", "undefined")

// One pattern, one group per kind: 1 comment, 2 string, 3 number, 4 word (a keyword, a constant, a type or a call), 5 a call.
#let token = regex(
  "(//.*|/\\*.*?\\*/|/\\*.*|<!--.*?-->|(?:^|\\s)#(?:\\s.*|$)|(?:^|\\s)--(?:\\s.*|$))"
    + "|(\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'|`[^`]*`)"
    + "|(\\b0[xX][0-9a-fA-F]+\\b|\\b0[bB][01]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)"
    + "|(\\b[A-Za-z_][A-Za-z0-9_]*\\b)",
)

/// The colored lines of `lines` (an array of strings), as an array of content.
#let fallback-lines(lines, dark) = {
  let palette = fallback-palette(dark)
  let open = false
  let out = ()
  for line in lines {
    let parts = ()
    let rest = line
    // Inside a block comment from a line above, up to its end
    if open {
      let end = line.position("*/")
      if end == none {
        out.push(text(fill: palette.comment, line))
        continue
      }
      parts.push(text(fill: palette.comment, line.slice(0, end + 2)))
      rest = line.slice(end + 2)
      open = false
    }
    let at = 0
    for m in rest.matches(token) {
      if m.start > at { parts.push(rest.slice(at, m.start)) }
      let word = m.text
      let colored = if m.captures.at(0) != none {
        if word.contains("/*") and not word.slice(word.position("/*") + 2).contains("*/") { open = true }
        text(fill: palette.comment, word)
      } else if m.captures.at(1) != none { text(fill: palette.string, word) }
      else if m.captures.at(2) != none { text(fill: palette.number, word) }
      else if lower(word) in keywords and (word == lower(word) or word == upper(word)) { text(fill: palette.keyword, word) }
      else if word in constants { text(fill: palette.constant, word) }
      else if rest.slice(m.end).starts-with("(") { text(fill: palette.function, word) }
      else if word.first().match(regex("[A-Z]")) != none { text(fill: palette.type, word) }
      else { word }
      parts.push(colored)
      at = m.end
    }
    if at < rest.len() { parts.push(rest.slice(at)) }
    out.push(parts.join())
  }
  out
}

/// Whether a raw block has no highlighting of its own: no language, or one Typst does not know (every line is a single plain text),
/// and its language is not one that asked for no colors.
#let needs-fallback(it) = {
  let lang = if it.lang == none { "" } else { lower(it.lang) }
  if lang in plain-languages { return false }
  it.lines.all(l => l.text == "" or l.body.func() == text)
}
