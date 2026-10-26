// Builds every icon of the app from the two source images in src/assets/:
//   icon.png      the icon as it is shown: desktop (Windows .ico, macOS .icns, Linux png), iOS, favicon, touch icon.
//                 Windows, Linux and macOS draw exactly this image, so it carries its own rounded shape.
//   maskable.png  full-bleed with the logo inside the safe zone: Android only. Android masks the icon itself (circle, squircle,
//                 ...) and cuts the outer part away, so the logo needs this padding.
//
//   npm run icons
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const tauri = path.join(root, "node_modules/@tauri-apps/cli/tauri.js")
const icons = path.join(root, "src-tauri/icons")

function run(...args) {
  const result = spawnSync(process.execPath, [tauri, "icon", ...args], { cwd: root, encoding: "utf8" })
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr)
    process.exit(1)
  }
}

// 1. Everything from icon.png (the CLI also writes Android icons into src-tauri/gen when it exists: step 2 replaces them)
fs.rmSync(icons, { recursive: true, force: true })
run("src/assets/icon.png")

// 2. Android from maskable.png
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "formatex-icons-"))
run("src/assets/maskable.png", "-o", scratch)
fs.cpSync(path.join(scratch, "android"), path.join(icons, "android"), { recursive: true })
const generated = path.join(root, "src-tauri/gen/android/app/src/main/res")
if (fs.existsSync(generated)) fs.cpSync(path.join(scratch, "android"), generated, { recursive: true })
fs.rmSync(scratch, { recursive: true, force: true })

// 3. Web: favicon and touch icon from icon.png, the maskable image for the web manifest
const pub = path.join(root, "public")
fs.copyFileSync(path.join(icons, "32x32.png"), path.join(pub, "favicon-32.png"))
fs.copyFileSync(path.join(icons, "icon.png"), path.join(pub, "icon.png"))
fs.copyFileSync(path.join(icons, "ios/AppIcon-60x60@3x.png"), path.join(pub, "apple-touch-icon.png"))
fs.copyFileSync(path.join(root, "src/assets/maskable.png"), path.join(pub, "maskable.png"))
console.log("icons: desktop + iOS + favicon from icon.png, Android from maskable.png")
