import type { Diagnostic } from "@/lib/compiler"

/** Files of the engine and of its packages: a problem there is a message about the user's text, not about that file. */
const isEngineFile = (path: string | null): boolean => path === null || path === "main.typ" || /^(src|tools|engine)\//.test(path) || path.startsWith("@")

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** The values and tags a message talks about: `got "abc"`, `Unknown color "x"`, `<alert> requires ...`. */
function mentions(diagnostic: Diagnostic): { values: string[]; tags: string[] } {
  const text = [diagnostic.message, ...diagnostic.hints].join("\n")
  const values = new Set<string>()
  for (const match of text.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const value = match[1].replace(/\\(.)/g, "$1").trim()
    if (value.length >= 2) values.add(value)
  }
  const tags = new Set<string>()
  for (const match of text.matchAll(/<([A-Za-z][\w-]*)>/g)) tags.add(match[1])
  return { values: [...values], tags: [...tags] }
}

/** The line of `text` that the words of the message point at most, with how sure that is (0 = no line). */
function bestLine(text: string, values: string[], tags: string[]): { line: number; score: number } {
  let best = { line: 0, score: 0 }
  const lines = text.split("\n")
  lines.forEach((line, index) => {
    let score = 0
    for (const value of values) if (line.includes(value)) score += 2
    for (const tag of tags) if (new RegExp(`</?${escapeRegex(tag)}(?![\\w-])`).test(line)) score += 1.5
    // A line that names both the tag and the value is the one
    if (score > best.score) best = { line: index + 1, score }
  })
  return best
}

/**
 * A problem raised inside the engine (an unknown color, a table option that is not allowed, a tag without its attribute) has no
 * place in the user's text, but its message quotes what was wrong. This looks for that text in the Markdown (then in the other open
 * files) and gives the problem that line, so it can be shown, marked and jumped to. Problems that already have a place in a
 * project file, or that no line of the text matches, are left as they are.
 */
export function locateDiagnostics(diagnostics: Diagnostic[], texts: Record<string, string>, mainFile: string): Diagnostic[] {
  // The Markdown first, then the rest in the order they are open
  const paths = [mainFile, ...Object.keys(texts).filter((path) => path !== mainFile)].filter((path) => texts[path] !== undefined)
  return diagnostics.map((diagnostic) => {
    if (!isEngineFile(diagnostic.path)) return diagnostic
    const { values, tags } = mentions(diagnostic)
    if (values.length === 0 && tags.length === 0) return diagnostic
    let found: { path: string; line: number; score: number } | null = null
    for (const path of paths) {
      const { line, score } = bestLine(texts[path], values, tags)
      if (score > 0 && (!found || score > found.score)) found = { path, line, score }
    }
    return found ? { ...diagnostic, path: found.path, line: found.line, column: 1 } : diagnostic
  })
}
