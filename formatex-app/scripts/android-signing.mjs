// Makes the release build of the generated Android project (`src-tauri/gen/android`, recreated by `tauri android init`) sign its
// APKs with a keystore given by environment variables, so CI can produce installable APKs. Safe to run twice.
//
//   ANDROID_KEYSTORE_PATH       path of the .jks file
//   ANDROID_KEYSTORE_PASSWORD   store password
//   ANDROID_KEY_ALIAS           key alias
//   ANDROID_KEY_PASSWORD        key password (defaults to the store password)
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const gradle = path.join(appRoot, "src-tauri/gen/android/app/build.gradle.kts")

if (!fs.existsSync(gradle)) {
  console.error(`android-signing: ${gradle} not found; run \`npx tauri android init\` first`)
  process.exit(1)
}

let text = fs.readFileSync(gradle, "utf8")
if (text.includes("FORMATEX_SIGNING")) {
  console.log("android-signing: already patched")
  process.exit(0)
}

const signing = `
    // FORMATEX_SIGNING: the release key comes from the environment (see scripts/android-signing.mjs)
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "release.jks")
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("ANDROID_KEY_ALIAS")
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD") ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
        }
    }
`
// The block goes right before `buildTypes {`, and the release build type uses it
text = text.replace(/\n(\s*)buildTypes \{/, `${signing}\n$1buildTypes {`)
text = text.replace(/getByName\("release"\) \{/, 'getByName("release") {\n            signingConfig = signingConfigs.getByName("release")')
fs.writeFileSync(gradle, text)
console.log("android-signing: release signing configured")
