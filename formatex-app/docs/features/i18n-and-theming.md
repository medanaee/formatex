# Feature: Internationalization and Theming

Code: [`src/i18n/`](../../src/i18n), [`src/lib/theme.ts`](../../src/lib/theme.ts), [`useSettingsStore.ts`](../../src/stores/useSettingsStore.ts).

## Languages

`fa` (default, RTL) and `en` (LTR). The table is [`languages.ts`](../../src/i18n/languages.ts): each language has a label (shown in its own script) and a `dir`.

Initial language: saved choice → browser language if supported → `fa`.

### Adding a language
1. Add it to `LANGUAGES` (label, direction).
2. Create `locales/<code>.json` with the **same keys** as `en.json`.
3. Register the resource in `i18n/index.ts`.
4. Run `npm test` (the locale test checks keys, placeholders and non-empty values).
5. If the script needs a font, add its `@fontsource` import in `index.css` and extend `--font-sans`.

### Adding a string
Add the key to **both** JSON files, then use `t("group.key")`. `t` is type-checked against `en.json`. Interpolation: `t("library.updatedAt", { date })` with `{{date}}` in both languages.

## Direction

`applyLanguageSettings(language)` sets `<html dir>` and `<html lang>` on boot, on rehydrate and on every language change, so in Persian the whole page mirrors. Use logical CSS properties so the layout mirrors itself ([guidelines](../design-roles/guidelines.md)). A component whose own content must never flip (the PDF viewer) sets `dir="ltr"`.

## Theme

`ThemePreference = "light" | "dark" | "system"`, stored in `formatex_app_settings`.

- `initTheme()` runs in `main.tsx` before React renders and reads the saved preference directly from localStorage, so there is no light flash in dark mode.
- `applyTheme()` toggles the `dark` class on `<html>`; tokens in `index.css` switch with it (`color-scheme` too).
- `watchSystemTheme()` follows the operating system live while the preference is `system`.

## Phone / tablet / desktop

Same behavior on all three. The Settings page shows the controls as segmented buttons (touch-sized, `h-9`); the settings column is centered at `max-w-xl` on larger screens.
