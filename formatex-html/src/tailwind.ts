import { compile } from "tailwindcss"
import theme from "./generated/theme"

const cache = new Map<string, string>()
const tokens = `
@custom-variant dark (&:where(.dark, .dark *));
@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--fg);
  --color-primary: var(--accent);
  --color-primary-foreground: var(--bg);
  --color-secondary: var(--secondary);
  --color-muted: var(--code-bg);
  --color-muted-foreground: var(--muted);
  --color-border: var(--rule);
  --font-sans: var(--font-body);
  --font-mono: var(--font-code);
}
@tailwind utilities;
`

/** Compiles real utilities in the isolated renderer, shipping only static CSS. */
export async function utilityCss(html: string): Promise<string> {
  const candidates = [...new Set(Array.from(html.matchAll(/\bclass="([^"]*)"/g)).flatMap(m => m[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&").split(/\s+/)).filter(Boolean))].sort()
  const key = candidates.join("\n")
  const previous = cache.get(key)
  if (previous !== undefined) return previous
  const compiler = await compile(theme + tokens)
  const css = compiler.build(candidates)
  if (cache.size >= 16) cache.delete(cache.keys().next().value!)
  cache.set(key, css)
  return css
}
