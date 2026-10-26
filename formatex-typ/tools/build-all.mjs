#!/usr/bin/env node
// Builds main.typ for every theme/feel combination into out/<source>-<theme>-<feel>.pdf
// (<source> = --source, otherwise `source` in config.toml, otherwise doc_en.md). Needs the `typst` CLI on the PATH.
//
//   node tools/build-all.mjs                                  # all 24
//   node tools/build-all.mjs --themes paper                   # paper in all 3 feels
//   node tools/build-all.mjs --themes paper,nord --feels formal
//   node tools/build-all.mjs --no-cover --source examples/demo.md
//   node tools/build-all.mjs --out-dir pdfs
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { genRegistry } from "./gen-registry.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}
const list = (value) => value.split(",").map((item) => item.trim()).filter(Boolean)

const themes = list(option("themes", "paper,sepia,ocean,sage,midnight,nord,zinc,dracula"))
const feels = list(option("feels", "formal,standard,friendly"))
const outDir = path.resolve(root, option("out-dir", "out"))
const noCover = process.argv.includes("--no-cover")

genRegistry(root)
// Fonts: the engine's own folder, and the app's bundled ones when the app sits next to the engine (so a clean checkout has them)
const fontPaths = [path.join(root, "fonts"), path.join(root, "..", "formatex-app", "fonts")].filter((dir) => fs.existsSync(dir))
fs.mkdirSync(outDir, { recursive: true })

let source = option("source", "")
if (!source) {
  const config = fs.readFileSync(path.join(root, "config.toml"), "utf8")
  source = /^\s*source\s*=\s*"([^"]+)"/m.exec(config)?.[1] ?? "doc_en.md"
}
const name = path.basename(source, path.extname(source))
const failed = []

for (const theme of themes) {
  for (const feel of feels) {
    const out = path.join(outDir, `${name}-${theme}-${feel}.pdf`)
    const args = ["compile", "main.typ", out, "--input", `theme=${theme}`, "--input", `feel=${feel}`, "--input", `source=${source}`]
    if (noCover) args.push("--input", "cover=false")
    for (const dir of fontPaths) args.push("--font-path", dir)
    process.stdout.write(`building ${path.relative(process.cwd(), out)} ... `)
    const result = spawnSync("typst", args, { cwd: root, encoding: "utf8" })
    if (result.error) {
      console.error(`\nbuild-all: cannot run typst (${result.error.message}). Install the Typst CLI: https://typst.app`)
      process.exit(1)
    }
    if (result.status === 0) console.log("ok")
    else {
      console.log("FAILED")
      console.error(result.stderr)
      failed.push(`${theme}-${feel}`)
    }
  }
}

if (failed.length > 0) {
  console.error(`failed: ${failed.join(", ")}`)
  process.exit(1)
}
console.log(`done: ${themes.length * feels.length} PDFs in ${path.relative(process.cwd(), outDir)}`)
