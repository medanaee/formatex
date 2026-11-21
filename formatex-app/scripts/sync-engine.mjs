// The app consumes core, PDF and HTML directly; formatex-typ is a separate consumer.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { assemble, coreRoot } from "../../formatex-core/tools/assemble.mjs"

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const output = path.join(app, "engine")
const pdf = path.join(app, "../formatex-pdf")
const build = spawnSync(process.execPath, [path.join(coreRoot, "tools/build.mjs")], { stdio: "inherit" })
if (build.status !== 0) process.exit(build.status ?? 1)
// engine/ is generated, and this literal resolved path is restricted to this app's directory.
if (path.resolve(output) !== path.join(app, "engine")) throw new Error("Invalid engine destination")
fs.rmSync(output, { recursive: true, force: true })
fs.mkdirSync(path.join(output, "bundle"), { recursive: true })
const result = assemble(path.join(output, "bundle"), pdf)
const config = fs.readFileSync(path.join(coreRoot, "config.toml"), "utf8").replace(/^source\s*=.*$/m, 'source = "main.md"')
fs.writeFileSync(path.join(output, "config.toml"), config)
fs.writeFileSync(path.join(output, "bundle/config.toml"), config)
fs.writeFileSync(path.join(output, "bundle/main.md"), "# Schema probe\n")
const query = spawnSync("typst", ["eval", 'query(<schemas>).first().value', "--in", "tools/schema.typ", "--root", ".", "--format", "json"], { cwd: path.join(output, "bundle"), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
if (query.status !== 0) throw new Error(query.stderr || "Could not export the core schema")
fs.unlinkSync(path.join(output, "bundle/config.toml"))
fs.unlinkSync(path.join(output, "bundle/main.md"))
fs.writeFileSync(path.join(output, "tags.json"), query.stdout)
await import("../../formatex-html/scripts/build.mjs")
console.log(`engine:sync: core + pdf + html (${result.components} packages, ${result.tags} tags)`)
