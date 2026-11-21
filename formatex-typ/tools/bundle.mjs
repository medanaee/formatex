// Generates one Typst engine file, embedding its WASM parser, JSON contracts and syntax theme.
// Project Markdown/config/images/fonts and @preview dependencies remain external inputs.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { genRegistry } from "./gen-registry.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
genRegistry(root)
const outputIndex = process.argv.indexOf("--out")
const output = path.resolve(root, outputIndex < 0 ? "dist/formatex.typ" : process.argv[outputIndex + 1])
const visited = new Set(), ordered = [], externals = new Set(), definitions = new Map()
const localImport = /^\s*#import\s+"(?!@)([^"]+)"[^\n]*$/gm
const source = file => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n")
const dependency = (parent, given) => given.startsWith("/") ? given.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(parent), given))
function visit(file, trail = []) {
  if (visited.has(file)) return
  if (trail.includes(file)) throw new Error(`Import cycle: ${[...trail, file].join(" -> ")}`)
  for (const match of source(file).matchAll(localImport)) visit(dependency(file, match[1]), [...trail, file])
  visited.add(file); ordered.push(file)
}
visit("main.typ")
const wasm = fs.readFileSync(path.join(root, "src/parser.wasm"))
const bytes = buffer => `bytes((${[...buffer].join(",")},))`
const chunks = []
const kitFiles = new Set()
function kit(file) { if (kitFiles.has(file)) return; kitFiles.add(file); for (const match of source(file).matchAll(localImport)) kit(dependency(file,match[1])) }
kit("src/kit.typ")
const kitNames = [...new Set([...kitFiles].flatMap(file => [...source(file).matchAll(/^#let\s+([\w-]+)/gm)].map(match=>match[1])))].sort()
const kitExternal = [...new Set([...kitFiles].flatMap(file => [...source(file).matchAll(/^\s*#import\s+"(@[^"]+)"/gm)].map(match=>match[1])))].sort()
const packageLoader = fs.readFileSync(path.join(root,"tools/package-loader.typ"),"utf8")

for (const file of ordered) {
  let text = source(file).replace(localImport, "").replace(/^\s*#import\s+"@[^\n]+$/gm, line => { externals.add(line.trim()); return "" })
  text = text.replace(/json\("(\/components\/[^\"]+\.json)"\)/g, (_, asset) => `json(bytes(${JSON.stringify(fs.readFileSync(path.join(root, asset.slice(1)), "utf8"))}))`)
  text = text.replaceAll('plugin("/src/parser.wasm")', "plugin(formatex-parser-bytes)")
  text = text.replaceAll('"/code-dark.tmTheme"', `bytes(${JSON.stringify(fs.readFileSync(path.join(root, "code-dark.tmTheme"), "utf8"))})`)
  for (const match of text.matchAll(/^#let\s+([\w-]+)/gm)) {
    if (definitions.has(match[1])) throw new Error(`Duplicate binding ${match[1]} in ${definitions.get(match[1])} and ${file}`)
    definitions.set(match[1], file)
  }
  if (file === "src/render.typ") {
    const scope = kitNames.map(name=>`${JSON.stringify(name)}: ${name}`).join(",")
    const external = kitExternal.map((pkg,i)=>`#import ${JSON.stringify(pkg)} as formatex-kit-external-${i}\n`).join("")
    const additions = kitExternal.map((_,i)=>` + dictionary(formatex-kit-external-${i})`).join("")
    text = text.replace(/#let pdf-load-package\(path\) = \{[\s\S]*?\n\}/,packageLoader.trim())
    text = `${external}#let formatex-package-scope = (:)${additions} + (${scope})\n${text}`
  }
  chunks.push(`// ===== ${file} =====\n${text}`)
}
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, `// Generated from formatex-core + formatex-pdf. Do not edit.\n${[...externals].join("\n")}\n#let formatex-parser-bytes = ${bytes(wasm)}\n${chunks.join("\n\n")}\n`)
console.log(`bundle: ${ordered.length} modules, ${wasm.length} WASM bytes -> ${path.relative(root, output)} (${fs.statSync(output).size} bytes)`)
