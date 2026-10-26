// Copies the Typst engine (`../formatex-typ`, next to this app in the same repository) into `engine/`, which the Rust side embeds in the binary and the
// frontend reads (`engine/tags.json`). `engine/` is generated and git-ignored: run this after the engine changes.
//
//   node scripts/sync-engine.mjs                 engine = ../formatex-typ
//   FORMATEX_ENGINE=/path/to/engine node ...      engine somewhere else
//
// Produces:
//   engine/bundle/            main.typ, code-dark.tmTheme, tools/schema.typ, src/**, components/**   (what main.typ imports)
//   engine/config.toml        the default config.toml of a new project (source = "main.md")
//   engine/tags.json          every tag and `{...}` option, for autocomplete (regenerated with the typst CLI when it is installed)
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const engineRoot = path.resolve(process.env.FORMATEX_ENGINE ?? path.join(appRoot, "..", "formatex-typ"))
const out = path.join(appRoot, "engine")

const fail = (message) => {
  console.error(`engine:sync: ${message}`)
  process.exit(1)
}

if (!fs.existsSync(path.join(engineRoot, "main.typ"))) fail(`no main.typ in ${engineRoot}; set FORMATEX_ENGINE to the engine folder`)

fs.rmSync(out, { recursive: true, force: true })
const bundle = path.join(out, "bundle")
fs.mkdirSync(bundle, { recursive: true })

/** Copies a folder, keeping only the files `keep` accepts. */
function copyTree(from, to, keep) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name)
    const target = path.join(to, entry.name)
    if (entry.isDirectory()) copyTree(source, target, keep)
    else if (keep(entry.name)) {
      fs.mkdirSync(to, { recursive: true })
      fs.copyFileSync(source, target)
    }
  }
}

for (const file of ["main.typ", "code-dark.tmTheme"]) fs.copyFileSync(path.join(engineRoot, file), path.join(bundle, file))
fs.mkdirSync(path.join(bundle, "tools"), { recursive: true })
fs.copyFileSync(path.join(engineRoot, "tools/schema.typ"), path.join(bundle, "tools/schema.typ"))
for (const dir of ["src", "components"]) copyTree(path.join(engineRoot, dir), path.join(bundle, dir), (name) => name.endsWith(".typ"))

// A new project starts from the engine's own config.toml, pointing at the project's main file
const config = fs.readFileSync(path.join(engineRoot, "config.toml"), "utf8").replace(/^source\s*=.*$/m, 'source = "main.md"')
fs.writeFileSync(path.join(out, "config.toml"), config)

// The schema: regenerate when the typst CLI exists (so a new tag shows up at once), else use the engine's dist/tags.json
const query = spawnSync("typst", ["eval", "query(<schemas>).first().value", "--in", "tools/schema.typ", "--root", ".", "--format", "json"], {
  cwd: engineRoot,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
})
if (query.status === 0 && query.stdout.trim().startsWith("{")) {
  fs.writeFileSync(path.join(out, "tags.json"), query.stdout)
  console.log("engine:sync: tags.json regenerated with the typst CLI")
} else {
  const dist = path.join(engineRoot, "dist", "tags.json")
  if (!fs.existsSync(dist)) fail("typst CLI failed and dist/tags.json does not exist (run tools/export-schema.mjs in the engine)")
  fs.copyFileSync(dist, path.join(out, "tags.json"))
  console.log("engine:sync: tags.json copied from dist/ (typst CLI not available)")
}

const count = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(".typ")).length
console.log(`engine:sync: ${count(bundle)} .typ files -> engine/`)
