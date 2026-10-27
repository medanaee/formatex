# Feature: App Icons

Source images live in [`src/assets/`](../../src/assets); `npm run icons` ([`scripts/make-icons.mjs`](../../scripts/make-icons.mjs)) builds everything else from them.

| Source | Used for | Why |
| :--- | :--- | :--- |
| `icon.png` (512, rounded, transparent corners) | **Windows** (`icon.ico`), **macOS** (`icon.icns`), **Linux** (png sizes), **iOS**, the **favicon**, the touch icon | These systems draw exactly the image they are given, so it carries its own shape and has no extra padding. |
| `maskable.png` (512, full-bleed, logo inside the safe zone) | **Android** only (`src-tauri/icons/android`: adaptive icon foreground and legacy launcher icons) and the web manifest's `maskable` entry | Android masks the icon itself (circle, squircle, ...) and cuts the outer third away, so the logo needs the large padding. |
| `icon-light.svg` / `icon-dark.svg` | The glyph alone (black / white); the in-app logo ([`AppLogo`](../../src/components/common/AppLogo.tsx)) now shows the colored `icon.png` | Follows light and dark themes. |
| `icon-bg-*.png`, `maskable-bg-*.png`, `icon-light.png`, `icon-dark.png` | Reserved variants (themed backgrounds, monochrome); not used yet | |

## Outputs

- `src-tauri/icons/`: desktop and iOS icons (`tauri.conf.json` lists `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`) and `android/` (committed, because `src-tauri/gen/` is generated and git-ignored).
- `public/`: `favicon-32.png`, `icon.png`, `apple-touch-icon.png`, `maskable.png`, `manifest.webmanifest`; `index.html` links them.
- `src-tauri/gen/android/.../res` is refreshed too when it exists, so a local Android build shows the new icon at once; `tauri android init` does NOT use `icons/android` (it writes Tauri's default icon): `npm run android:patch` (and the release workflow) copies it into `gen/android` afterwards.

## Changing the icon

Replace the files in `src/assets/` (keep the roles above), run `npm run icons`, commit `src-tauri/icons/`, `public/` and `src/assets/`.
