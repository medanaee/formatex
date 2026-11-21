import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.dirname(fileURLToPath(import.meta.resolve("katex/package.json")))
const output = path.join(root, "assets")
fs.mkdirSync(path.join(output, "fonts"), { recursive: true })
for (const file of fs.readdirSync(path.join(source, "dist/fonts")).filter(file => file.endsWith(".ttf"))) fs.copyFileSync(path.join(source, "dist/fonts", file), path.join(output, "fonts", file))
fs.copyFileSync(path.join(source, "LICENSE"), path.join(output, "KATEX-LICENSE"))
// Keep an offline WOFF2 source for hosts without a native font-subsetting service.
const css = fs.readFileSync(path.join(source, "dist/katex.min.css"), "utf8").replace(/url\(([^)]+)\) format\("woff2"\)(?:,url\([^)]+\) format\("woff"\),url\([^)]+\) format\("truetype"\))?/g, (_, relative) => {
  const bytes = fs.readFileSync(path.join(source, "dist", relative.replaceAll('"', "")))
  return `url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2")`
})
fs.writeFileSync(path.join(output, "math-css.json"), JSON.stringify({ css }) + "\n")
