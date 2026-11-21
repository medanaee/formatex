// Runs on the synced standalone distribution; no sibling source project is required.
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { generateRegistry } from "./registry.mjs"
export const genRegistry = generateRegistry
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log(genRegistry(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")))
}
