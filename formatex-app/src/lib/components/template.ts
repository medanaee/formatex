export type ComponentKind = "inline" | "block"

export function newComponentFiles(name: string, kind: ComponentKind): Record<string, string> {
  return {
    "manifest.toml": `name = "${name}"\ntyp = "typst.typ"\nhtml = "html.tsx"\ncss = "html.css"\nschema = "schema.json"\ndocs = "docs.json"\n`,
    "schema.json": JSON.stringify({ [name]: { kind, description: { en: "Custom component", fa: "کامپوننت اختصاصی" }, attrs: {} } }, null, 2) + "\n",
    "docs.json": JSON.stringify({ en: { about: `The <${name}> component.` }, fa: { about: `کامپوننت <${name}>.` }, example: { en: `<${name}>Content</${name}>`, fa: `<${name}>متن</${name}>` } }, null, 2) + "\n",
    "typst.typ": `#import "/src/kit.typ": *\n\n#let ${name}-tags = (\n  ${name}: (attrs, body) => ${kind === "block" ? "block(width:100%, body)" : "strong(body)"},\n)\n`,
    "html.tsx": `import { Panel } from "formatex/ui"\n\nexport default function Component({ node, context }) {\n  return <${kind === "block" ? "Panel" : "span"} className="${kind === "block" ? "p-3" : "font-semibold"}">{context.children(node)}</${kind === "block" ? "Panel" : "span"}>\n}\n`,
    "html.css": "",
  }
}

/** Same rule as the Rust side: lowercase letters, digits and `-`, starting with a letter. */
export const COMPONENT_NAME = /^[a-z][a-z0-9-]{0,39}$/

export type ComponentNameProblem = "empty" | "invalid" | "exists"

export function componentNameProblem(name: string, existing: ReadonlySet<string>): ComponentNameProblem | null {
  if (!name) return "empty"
  if (!COMPONENT_NAME.test(name)) return "invalid"
  if (existing.has(name)) return "exists"
  return null
}
