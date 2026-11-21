// Standalone document chrome includes React but never app/native services.
import { build } from "vite"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const generated = path.join(root, "src/generated")
fs.mkdirSync(generated, { recursive: true })
fs.writeFileSync(path.join(generated, "style.ts"), `// Generated from the document stylesheet.\nexport default ${JSON.stringify(fs.readFileSync(path.join(root, "src/style.css"), "utf8"))}\n`)
const themeFile = fileURLToPath(import.meta.resolve("tailwindcss/theme.css"))
fs.writeFileSync(path.join(generated, "theme.ts"), `// Generated from the installed Tailwind theme (MIT).\nexport default ${JSON.stringify(fs.readFileSync(themeFile, "utf8"))}\n`)
const result = await build({
  configFile: false, root, logLevel: "error",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { write: false, minify: true, lib: { entry: path.join(root, "src/client.tsx"), name: "FormatexDocument", formats: ["iife"] } },
})
const outputs = Array.isArray(result) ? result.flatMap(r => r.output) : result.output
const code = outputs.filter(o => o.type === "chunk").map(o => o.code).join("\n")
fs.mkdirSync(path.join(root, "dist"), { recursive: true })
fs.writeFileSync(path.join(root, "dist/runtime.js"), code)
console.log(`document runtime: ${Buffer.byteLength(code)} bytes (offline React shell)`)
