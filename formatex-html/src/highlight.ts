const cache = new Map<string, string[]>()
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

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
  const key = `${language}\0${value}`
  const existing = cache.get(key)
  if (existing) return existing
  const { default: hljs } = await import("highlight.js/lib/common")
  const html = language && hljs.getLanguage(language) ? hljs.highlight(value, { language, ignoreIllegals: true }).value : escape(value)
  const result = lines(html)
  if (cache.size >= 128) cache.delete(cache.keys().next().value!)
  cache.set(key, result)
  return result
}
