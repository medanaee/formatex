// Makes the Android app full screen: the status bar (notifications) and the navigation bar (the buttons at the bottom) are hidden,
// and come back for a moment when the user swipes from the edge. The content also uses the area around a camera cut-out.
// It patches the generated Android project (`src-tauri/gen/android`, recreated by `tauri android init`), so run it after init;
// CI does (`npm run android:patch`). Safe to run twice.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const main = path.join(appRoot, "src-tauri/gen/android/app/src/main")
const MARK = "FORMATEX_IMMERSIVE"

function find(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = find(full, name)
      if (found) return found
    } else if (entry.name === name) return full
  }
  return null
}

if (!fs.existsSync(main)) {
  console.error(`android-immersive: ${main} not found; run \`npx tauri android init\` first`)
  process.exit(1)
}

// 1. MainActivity: hide the system bars whenever the window has focus
const activity = find(path.join(main, "java"), "MainActivity.kt")
if (!activity) {
  console.error("android-immersive: MainActivity.kt not found")
  process.exit(1)
}
let kotlin = fs.readFileSync(activity, "utf8")
if (!kotlin.includes(MARK)) {
  const packageLine = /^package .*$/m.exec(kotlin)?.[0] ?? ""
  kotlin = `${packageLine}

// ${MARK}: full screen, the system bars only show for a moment after a swipe from the edge (scripts/android-immersive.mjs)
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    hideSystemBars()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) hideSystemBars()
  }

  private fun hideSystemBars() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    controller.hide(WindowInsetsCompat.Type.systemBars())
  }
}
`
  fs.writeFileSync(activity, kotlin)
  console.log("android-immersive: MainActivity patched")
}

// 2. Theme: draw into the cut-out area too, so there is no black strip at the top of a phone with a notch
const themes = path.join(main, "res/values/themes.xml")
let xml = fs.readFileSync(themes, "utf8")
if (!xml.includes("windowLayoutInDisplayCutoutMode")) {
  xml = xml.replace(/(<style name="Theme\.[^"]+"[^>]*>)/, `$1\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>`)
  fs.writeFileSync(themes, xml)
  console.log("android-immersive: theme patched")
}
