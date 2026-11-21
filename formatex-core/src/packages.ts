import { parse } from "smol-toml"
import type { TagSpec } from "./index"
import type { Properties } from "./settings"

export interface ComponentPackage {
  folder: string
  typ: string | null
  html: string | null
  css: string | null
  schemas: Record<string, TagSpec>
  docs: unknown
}
export interface ComponentCatalog {
  components: Record<string, string>
  schemas: Record<string, TagSpec>
  properties: Record<string, Properties>
  htmlOnly: string[]
  typOnly: string[]
  css: string
}

/** Both consumers load package data; the core parser remains the sole Markdown parser. */
export function componentCatalog(packages: Record<string, Record<string, string>>): ComponentCatalog {
  const result: ComponentCatalog = { components: {}, schemas: {}, properties: {}, htmlOnly: [], typOnly: [], css: "" }
  for (const [name, files] of Object.entries(packages)) {
    const manifest = files["manifest.toml"] ? parse(files["manifest.toml"]) : {}
    const schemas = JSON.parse(files[String(manifest.schema ?? "schema.json")] ?? "{}") as Record<string, TagSpec>
    const html = manifest.html === false ? undefined : files[String(manifest.html ?? "html.tsx")]
    const typ = manifest.typ === false ? undefined : files[String(manifest.typ ?? "typst.typ")]
    if (!html && !typ) throw new Error(`Component ${name} needs an HTML or Typst implementation`)
    for (const [tag, schema] of Object.entries(schemas)) {
      result.schemas[tag] = schema; result.properties[tag] = schema.attrs
      if (html) result.components[tag] = html
      else delete result.components[tag]
      result.htmlOnly = result.htmlOnly.filter(value => value !== tag)
      result.typOnly = result.typOnly.filter(value => value !== tag)
      if (!typ) result.htmlOnly.push(tag)
      if (!html) result.typOnly.push(tag)
    }
    if (html && files[String(manifest.css ?? "html.css")]) result.css += `\n${files[String(manifest.css ?? "html.css")]}`
  }
  return result
}
