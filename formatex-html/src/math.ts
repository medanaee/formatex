import type { Node } from "@formatex/core"

export interface MathResult { html: Record<string, string>; css: string; families: string[] }

const formulaCache = new Map<string, string>()

/** TeX is rendered in the worker. Standalone HTML never ships the KaTeX JS runtime. */
export async function prepareMath(nodes: Node[], htmlMode: boolean, nativeFonts: boolean): Promise<MathResult> {
  const formulas: Node[] = []
  const walk = (nodes: Node[]) => { for (const node of nodes) { if (node.type === "math" || node.type === "inlineMath") formulas.push(node); if (node.children) walk(node.children); if (node.rich) for (const rich of Object.values(node.rich)) walk(rich) } }
  walk(nodes)
  if (!formulas.length) return { html: {}, css: "", families: [] }
  const { default: katex } = await import("katex")
  const html: Record<string, string> = {}
  for (const node of formulas) {
    const key = JSON.stringify([node.value, node.type, htmlMode])
    let rendered = formulaCache.get(key)
    if (rendered === undefined) {
      rendered = katex.renderToString(node.value ?? "", { displayMode: node.type === "math", throwOnError: false, trust: false, output: htmlMode ? "htmlAndMathml" : "mathml" })
      if (formulaCache.size >= 512) formulaCache.delete(formulaCache.keys().next().value!)
      formulaCache.set(key, rendered)
    }
    html[node.key] = rendered
  }
  if (!htmlMode) return { html, css: "", families: [] }
  const content = Object.values(html).join("")
  const families = new Set(["KaTeX_Main"])
  for (const [test, name] of [[/mathnormal|mathit/, "Math"], [/amsrm|mathbb|textbb/, "AMS"], [/mathcal|textcal|caligraphic/, "Caligraphic"], [/mathfrak|textfrak/, "Fraktur"], [/mathsf|textsf|sansserif/, "SansSerif"], [/mathscr|textscr/, "Script"], [/mathtt|texttt|typewriter/, "Typewriter"]] as const) if (test.test(content)) families.add(`KaTeX_${name}`)
  for (let size = 1; size <= 4; size++) if (new RegExp(`delimsizing[^\"]*\\bsize${size}\\b|delim-size${size}\\b${size <= 2 ? `|op-symbol[^\"]*${size === 1 ? "small" : "large"}-op` : ""}`).test(content)) families.add(`KaTeX_Size${size}`)
  const source = (await import("../assets/math-css.json")).css
  const css = source.replace(/@font-face\{[^}]*\}/g, block => {
    const family = /font-family:([^;]+)/.exec(block)?.[1]
    return !nativeFonts && family && families.has(family.replaceAll('"', "")) ? block : ""
  })
  return { html, css, families: [...families] }
}
