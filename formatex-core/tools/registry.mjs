// Shared generator copied into the standalone consumer during sync.
import fs from "node:fs"
import path from "node:path"
import { parse as parseToml } from "smol-toml"

export function generateRegistry(root) {
  const groups = fs.readdirSync(path.join(root, "components"), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
  const catalog = ["// Generated from core component package data. No renderer is evaluated here."]
  const imports = []
  const tags = [], schemas = [], docs = [], rules = [], scopes = [], htmlOnly = []
  const names = new Set()
  for (const name of groups) {
    const folder = path.join(root, "components", name)
    const manifest = parseToml(fs.readFileSync(path.join(folder, "manifest.toml"), "utf8"))
    const schema = JSON.parse(fs.readFileSync(path.join(folder, "schema.json"), "utf8"))
    for (const tag of Object.keys(schema)) { if (names.has(tag)) throw new Error(`Duplicate component tag ${tag}`); names.add(tag) }
    catalog.push(`#let ${name}-schema = json("/components/${name}/schema.json")`, `#let ${name}-docs = json("/components/${name}/docs.json")`)
    schemas.push(`${name}-schema`); docs.push(`${name}: ${name}-docs`)
    const file = path.join(folder, "typst.typ")
    if (manifest.typ === false || !fs.existsSync(file)) { htmlOnly.push(...Object.keys(schema)); continue }
    const source = fs.readFileSync(file, "utf8")
    const exports = [`${name}-tags`]
    if (new RegExp(`^#let ${name}-rules\\b`, "m").test(source)) { exports.push(`${name}-rules`); rules.push({ name, order: Number(/^\/\/\s*rules-order:\s*(-?\d+)/m.exec(source)?.[1] ?? 100) }) }
    if (new RegExp(`^#let ${name}-scope\\b`, "m").test(source)) { exports.push(`${name}-scope`); scopes.push(`${name}-scope`) }
    imports.push(`#import "/components/${name}/typst.typ": ${exports.join(", ")}`); tags.push(`${name}-tags`)
  }
  const sum = values => ["(:)", ...values].join(" + ")
  catalog.push(`#let all-schemas = ${sum(schemas)}`, `#let component-docs = (${docs.join(", ")})`, `#let component-tags = (${groups.map(name => `${name}: ${name}-schema.keys()`).join(", ")})`)
  catalog.push(`#let html-only-tags = (${htmlOnly.map(name => JSON.stringify(name)).join(",")}${htmlOnly.length ? "," : ""})`)
  fs.writeFileSync(path.join(root, "components/_catalog.typ"), catalog.join("\n") + "\n")
  const registry = [`#import "/components/_catalog.typ": *`, ...imports, '#import "/src/lib/schema.typ": wrap-tags', `#let raw-tags = ${sum(tags)}`, '#let html-tags = wrap-tags(raw-tags, all-schemas)', `#let scope-extras = ${sum(scopes)}`, "#let all-rules(doc) = {", ...rules.sort((a,b) => a.order-b.order || a.name.localeCompare(b.name)).map(rule => `  show: ${rule.name}-rules`), "  doc", "}"]
  fs.writeFileSync(path.join(root, "components/_registry.typ"), registry.join("\n") + "\n")
  return { components: groups.length, tags: names.size }
}
