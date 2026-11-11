# Feature: Fonts for Documents

Code: [`src-tauri/src/fonts.rs`](../../src-tauri/src/fonts.rs), [`src/lib/files/fonts.ts`](../../src/lib/files/fonts.ts), [`FontsSettings.tsx`](../../src/components/settings/FontsSettings.tsx). Not to be confused with the *interface* fonts (Inter, Vazirmatn), which are bundled through `@fontsource`.

The compiler needs the fonts a document names (`[font]` in `config.toml`; the engine's `formal`, `standard` and `friendly` feels use New Computer Modern / XB Niloofar, Inter / IRANSans and Lexend / Pelak).

## Where fonts come from (in this priority)

1. **Imported fonts**: `.ttf`, `.otf`, `.ttc` files the user adds in **Settings → Fonts**, stored in `$APPDATA/fonts`.
2. **System fonts**: scanned on **Windows, macOS and Linux** (fontdb, plus Adobe fonts on Windows and macOS). On Android the system folder `/system/fonts` is scanned as a fallback.
3. **Bundled fonts**: `formatex-app/fonts/`, compiled into the app (`include_dir!`), so a document looks right with nothing installed, Android included: Vazirmatn, Lexend, Pelak, IRANSansX, XB Niloofar, Anonymous Pro and the Font Awesome 7 Pro (solid, regular) and Brands icon fonts, in the weights the engine uses (about 9 MB). Add a file there to bundle another; mind its licence (Font Awesome Pro and the Persian fonts are not all free to redistribute).
4. **Built-in fonts**: the few Typst embeds (Libertinus Serif, New Computer Modern, DejaVu Sans Mono).

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

Fonts have separate licenses; the presence of a font in the engine does not grant a common redistribution license to the whole font collection. The HTML-only NewCM derivatives in `src-tauri/web-fonts/` carry the upstream Typst-assets NOTICE, including the applicable GUST and GPL3 font/distribution exception notices. Other bundled or imported fonts retain their own license terms.

## HTML font family resolution

HTML preview and export prefer the exact requested font family before alias fallbacks. If `CMU Serif` is installed or imported, its faces are used rather than replacing it with New Computer Modern. When the requested family is missing and a fallback alias is used, the embedded `@font-face` retains the requested CSS family name so the browser can resolve the document's font stack. The formal feel still defaults to New Computer Modern; unrelated pages do not embed CMU Serif automatically or duplicate the same New Computer Modern bytes under an unconditional CMU alias.

Regular/bold faces are selected independently by nearest weight per required style, so a real CMU Serif regular face at weight 500 is included. Stock NewCM CFF outlines rejected by the tested browser are replaced only for HTML embedding by four quadratic-outline assets in `src-tauri/web-fonts/`, generated with fontTools by `scripts/prepare-html-serif.py`. Metrics and shaping tables are preserved, curve error is bounded at one font unit (about 0.001 em), and the internal family is renamed `Formatex NewCM Web` while CSS retains the requested family. Original PDF fonts are unchanged. See [the measured HTML update](../html-export-improvements-2026-11-11.md).

## Performance

System fonts are scanned in a background thread at startup (a second or two with many fonts), so the first preview does not wait for it unless it is very early. The font list is cached until `fonts_reload`.
