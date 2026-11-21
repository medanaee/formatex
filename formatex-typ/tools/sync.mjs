import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { assemble, coreRoot } from "../../formatex-core/tools/assemble.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const build = spawnSync(process.execPath,[path.join(coreRoot,"tools/build.mjs")],{stdio:"inherit"})
if (build.status !== 0) process.exit(build.status ?? 1)
fs.copyFileSync(path.join(coreRoot,"tools/registry.mjs"),path.join(root,"tools/registry.mjs"))
const result = assemble(root, path.join(root, "../formatex-pdf"))
// The checked-in example config remains editable; --defaults explicitly refreshes it.
if (process.argv.includes("--defaults")) fs.copyFileSync(path.join(coreRoot, "config.toml"), path.join(root, "config.toml"))
console.log(`formatex-typ: synced core + pdf (${result.components} components, ${result.tags} tags)`)
