import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.join(root, "parser/target/wasm32-unknown-unknown/release/formatex_parser.wasm")
const result = spawnSync("cargo", ["build", "--manifest-path", path.join(root, "parser/Cargo.toml"), "--target", "wasm32-unknown-unknown", "--release"], { stdio: "inherit" })
if (result.status !== 0) process.exit(result.status ?? 1)
const destination = path.join(root, "typst/src/parser.wasm")
fs.mkdirSync(path.dirname(destination), { recursive: true })
fs.copyFileSync(source, destination)
console.log(`core parser: ${fs.statSync(destination).size} bytes`)
