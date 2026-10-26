# Feature: Fonts for Documents

Code: [`src-tauri/src/fonts.rs`](../../src-tauri/src/fonts.rs), [`src/lib/files/fonts.ts`](../../src/lib/files/fonts.ts), [`FontsSettings.tsx`](../../src/components/settings/FontsSettings.tsx). Not to be confused with the *interface* fonts (Inter, Vazirmatn), which are bundled through `@fontsource`.

The compiler needs the fonts a document names (`[font]` in `config.toml`; the engine's `formal`, `standard` and `friendly` feels use New Computer Modern / XB Niloofar, Inter / IRANSans and Lexend / Pelak).

## Where fonts come from (in this priority)

1. **Imported fonts**: `.ttf`, `.otf`, `.ttc` files the user adds in **Settings → Fonts**, stored in `$APPDATA/fonts`.
2. **System fonts**: scanned on **Windows, macOS and Linux** (fontdb, plus Adobe fonts on Windows and macOS). On Android the system folder `/system/fonts` is scanned as a fallback.
3. **Built-in fonts**: the few Typst embeds (Libertinus Serif, New Computer Modern, DejaVu Sans Mono).

An imported font wins over a system font of the same name, so a user can override it.

## Settings → Fonts

- **Import fonts** opens the file picker (multiple files) and copies them into the app; the compiler rescans at once (`fonts_reload`).
- The imported files are listed with a remove button.
- All families are listed with where they come from (imported / system / built-in) and a count per origin.
- A one-line note: on Android "import the fonts your documents use"; on desktop "system fonts are used automatically".

### Phone / tablet / desktop
The same section in the centered settings column; the family list scrolls inside a `max-h-48` box.

## The editor's own font

The text editor uses a monospace Latin font and falls back to **Vazir Code** for Persian and any glyph that font lacks (see [editor](editor.md)). It is bundled with the app (`src/assets/fonts/Vazir-Code.woff2`, public domain licence next to it), unlike the document fonts above, which the user provides.

## Licensing

The engine's repository contains font files (Font Awesome Pro, IRANSansX, ...). **They are not bundled in the app**: redistributing them needs a license. Users install or import their own; the app only reads them.

## Performance

System fonts are scanned in a background thread at startup (a second or two with many fonts), so the first preview does not wait for it unless it is very early. The font list is cached until `fonts_reload`.
