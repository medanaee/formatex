#!/usr/bin/env node
// Writes dist/tags.json: `tags` = every tag with its kind, description, attributes, allowed values, defaults, children and
// parents (from the `<name>-schema` of each components/*.typ); `options` = the `{...}` lines of tables, headings, lists,
// equations and spans (src/lib/option-schema.typ); `config` = the keys of config.toml and the front matter;
// `issues` = disagreements, printed as warnings.
// Editor tooling (autocomplete, hover, validation) reads it. Needs the `typst` CLI on the PATH.
//
//   node tools/export-schema.mjs                  # dist/tags.json
//   node tools/export-schema.mjs --out my.json
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { genRegistry } from "./gen-registry.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outIndex = process.argv.indexOf("--out")
const out = path.resolve(root, outIndex >= 0 ? process.argv[outIndex + 1] : "dist/tags.json")

genRegistry(root)
const query = spawnSync("typst", ["eval", "query(<schemas>).first().value", "--in", "tools/schema.typ", "--root", ".", "--format", "json"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
})
if (query.error) {
  console.error(`export-schema: cannot run typst (${query.error.message}). Install the Typst CLI: https://typst.app`)
  process.exit(1)
}
if (query.status !== 0) {
  console.error(query.stderr)
  console.error("export-schema: typst query failed")
  process.exit(1)
}
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, query.stdout)
const data = JSON.parse(query.stdout)
console.log(`schema: ${Object.keys(data.tags).length} tags, ${Object.keys(data.options).length} option groups -> ${path.relative(process.cwd(), out)}`)
for (const issue of data.issues ?? []) console.warn(`warning: ${issue}`)
