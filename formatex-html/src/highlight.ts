const cache = new Map<string, string[]>()
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

/** Languages that explicitly request plain text with no syntax coloring. */
const PLAIN_LANGUAGES = new Set(["text", "txt", "plain", "plaintext", "none", "console", "output", "log", "terminal"])
const HIGHLIGHT_ALIASES: Record<string, string> = { "c#": "csharp", shell: "bash", golang: "go" }

const FALLBACK_KEYWORDS = new Set([
  "if", "else", "elif", "elsif", "elseif", "for", "foreach", "while", "do", "loop", "switch", "case", "default", "when", "match", "break", "continue",
  "return", "function", "func", "fun", "fn", "def", "proc", "sub", "class", "struct", "enum", "interface", "trait", "impl", "object", "type",
  "import", "from", "export", "as", "package", "module", "namespace", "use", "using", "include", "require", "let", "var", "val", "const",
  "static", "public", "private", "protected", "final", "abstract", "override", "new", "delete", "try", "catch", "except", "finally", "throw",
  "throws", "raise", "with", "yield", "async", "await", "in", "is", "not", "and", "or", "of", "then", "end", "begin", "where", "select",
  "insert", "update", "create", "table", "join", "group", "order", "by", "limit", "echo", "print", "println", "local", "extends", "implements",
  "show", "set", "context",
])

const FALLBACK_CONSTANTS = new Set([
  "true", "false", "null", "nil", "none", "None", "True", "False", "NULL", "self", "this", "super", "void", "undefined", "auto",
])

const FALLBACK_TOKEN = /((?:\/\/|<!--)[^\n]*|\/\*[\s\S]*?\*\/|\/\*[^\n]*|(?:^|\s)(?:#|--)(?:\s[^\n]*|$))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`)|(\b0[xX][0-9a-fA-F]+\b|\b0[bB][01]+\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)/g

/** Language-free fallback highlighting matching PDF's `code-fallback.typ`. */
function fallbackHighlight(value: string): string {
  const rawLines = value.split("\n")
  let openBlockComment = false
  return rawLines.map(line => {
    let rest = line
    let out = ""
    if (openBlockComment) {
      const closeIndex = line.indexOf("*/")
      if (closeIndex === -1) return `<span class="hljs-comment">${escape(line)}</span>`
      out += `<span class="hljs-comment">${escape(line.slice(0, closeIndex + 2))}</span>`
      rest = line.slice(closeIndex + 2)
      openBlockComment = false
    }
    let at = 0
    for (const match of rest.matchAll(FALLBACK_TOKEN)) {
      const idx = match.index ?? 0
      if (idx > at) out += escape(rest.slice(at, idx))
      const word = match[0]
      if (match[1]) {
        const leadingSpace = /^\s+/.exec(word)?.[0] ?? ""
        const body = word.slice(leadingSpace.length)
        const blockIdx = body.indexOf("/*")
        if (blockIdx !== -1 && !body.slice(blockIdx + 2).includes("*/")) openBlockComment = true
        out += `${escape(leadingSpace)}<span class="hljs-comment">${escape(body)}</span>`
      } else if (match[2]) {
        out += `<span class="hljs-string">${escape(word)}</span>`
      } else if (match[3]) {
        out += `<span class="hljs-number">${escape(word)}</span>`
      } else {
        const lower = word.toLowerCase()
        if (FALLBACK_KEYWORDS.has(lower) && (word === lower || word === word.toUpperCase())) {
          out += `<span class="hljs-keyword">${escape(word)}</span>`
        } else if (FALLBACK_CONSTANTS.has(word)) {
          out += `<span class="hljs-literal">${escape(word)}</span>`
        } else if (rest.slice(idx + word.length).startsWith("(")) {
          out += `<span class="hljs-title function_">${escape(word)}</span>`
        } else if (/^[A-Z]/.test(word)) {
          out += `<span class="hljs-type">${escape(word)}</span>`
        } else {
          out += escape(word)
        }
      }
      at = idx + word.length
    }
    if (at < rest.length) out += escape(rest.slice(at))
    return out
  }).join("\n")
}

/** Splits generated highlighting at newlines while preserving balanced spans. */
function lines(html: string): string[] {
  const out: string[] = [], stack: string[] = []
  let current = "", from = 0
  for (const match of html.matchAll(/<span\b[^>]*>|<\/span>|\n/g)) {
    current += html.slice(from, match.index)
    if (match[0] === "\n") { out.push(current + "</span>".repeat(stack.length)); current = stack.join("") }
    else { current += match[0]; if (match[0] === "</span>") stack.pop(); else stack.push(match[0]) }
    from = match.index! + match[0].length
  }
  out.push(current + html.slice(from))
  return out
}

export async function highlight(value: string, language: string): Promise<string[]> {
  const raw = String(language ?? "").trim().toLowerCase()
  const norm = HIGHLIGHT_ALIASES[raw] ?? raw
  const key = `${norm}\0${value}`
  const existing = cache.get(key)
  if (existing) return existing
  let html: string
  if (norm && PLAIN_LANGUAGES.has(norm)) {
    html = escape(value)
  } else {
    const { default: hljs } = await import("highlight.js/lib/common")
    html = norm && hljs.getLanguage(norm)
      ? hljs.highlight(value, { language: norm, ignoreIllegals: true }).value
      : fallbackHighlight(value)
  }
  const result = lines(html)
  if (cache.size >= 128) cache.delete(cache.keys().next().value!)
  cache.set(key, result)
  return result
}
