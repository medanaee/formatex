// Puts the app's own launcher icons (`src-tauri/icons/android`, made by `npm run icons` from src/assets/maskable.png) into the generated
// Android project (`src-tauri/gen/android`). `tauri android init` fills that project with Tauri's default icon, so without this step
// the APK shows the Tauri logo. Run it after init; CI does (`npm run android:patch`). Safe to run twice.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.join(appRoot, "src-tauri/icons/android")
const target = path.join(appRoot, "src-tauri/gen/android/app/src/main/res")

if (!fs.existsSync(source)) {
  console.error(`android-icons: ${source} not found; run \`npm run icons\` first`)
  process.exit(1)
}
if (!fs.existsSync(target)) {
  console.error(`android-icons: ${target} not found; run \`npx tauri android init\` first`)
  process.exit(1)
}

fs.cpSync(source, target, { recursive: true, force: true })
console.log("android-icons: launcher icons copied")
