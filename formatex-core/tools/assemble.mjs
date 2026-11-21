import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { generateRegistry } from "./registry.mjs"

export const coreRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const excluded = new Set(["node_modules", "target", "dist", ".git"])
function copy(from, to, extensions) {
  if (!fs.existsSync(from)) return
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue
    const source = path.join(from, entry.name), destination = path.join(to, entry.name)
    if (entry.isDirectory()) copy(source, destination, extensions)
    else if (extensions.has(path.extname(entry.name))) { fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(source, destination) }
  }
}

/** Consumers assemble the sources; core has no runtime dependency on either renderer. */
export function assemble(destination, pdfRoot) {
  const root = path.resolve(destination)
  if (root === coreRoot || root === path.dirname(coreRoot) || root === path.parse(root).root) throw new Error("Invalid assembly target")
  // Delete only known generated files from the preceding assembly; never recurse into user inputs.
  const inventory = path.join(root, ".formatex-generated.json")
  if (fs.existsSync(inventory)) for (const file of JSON.parse(fs.readFileSync(inventory, "utf8"))) {
    const target = path.resolve(root, file)
    if (!target.startsWith(root + path.sep)) throw new Error("Invalid generated inventory path")
    if (fs.existsSync(target) && fs.statSync(target).isFile()) fs.unlinkSync(target)
  }
  const extensions = new Set([".typ", ".wasm", ".json", ".tsx", ".css", ".toml"])
  copy(path.join(coreRoot, "typst"), root, extensions)
  copy(path.join(coreRoot, "components"), path.join(root, "components"), extensions)
  if (pdfRoot) {
    copy(path.join(pdfRoot, "typst"), root, extensions)
    fs.copyFileSync(path.join(pdfRoot, "code-dark.tmTheme"), path.join(root, "code-dark.tmTheme"))
  }
  const result = generateRegistry(root)
  const files = []
  const own = [...walkFiles(path.join(coreRoot, "typst"))].map(file => path.relative(path.join(coreRoot, "typst"), file))
  if (pdfRoot) own.push(...[...walkFiles(path.join(pdfRoot, "typst"))].map(file => path.relative(path.join(pdfRoot, "typst"), file)), "code-dark.tmTheme")
  own.push(...[...walkFiles(path.join(coreRoot, "components"))].map(file => path.join("components", path.relative(path.join(coreRoot, "components"), file))), "components/_catalog.typ", "components/_registry.typ")
  for (const file of own) if (fs.existsSync(path.join(root, file))) files.push(file.replaceAll(path.sep, "/"))
  fs.writeFileSync(inventory, JSON.stringify([...new Set(files)].sort(), null, 2) + "\n")
  return result
}

function* walkFiles(directory) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) yield* walkFiles(file)
    else yield file
  }
}
