#import "/src/kit.typ": *

#let kbd-tags = (
    // <kbd>Ctrl+Shift+P</kbd>: one key cap per `+`-separated key.
    kbd: (attrs, body) => context {
      let keys = plain-text(body).split("+").map(k => k.trim()).filter(k => k != "")
      let cap = measure(text(size: 0.82em, "H")).height
      let key(k) = box(
        fill: theme.code-bg,
        stroke: (rest: 0.6pt * zoom + theme.code-stroke, bottom: 1.5pt * zoom + theme.code-stroke),
        radius: calc.min(feel.badge, 4pt * zoom),
        inset: (x: 4pt * zoom, y: 0pt),
        outset: (top: 2.5pt * zoom, bottom: 3pt * zoom),
        // Fixed edges: Persian and Latin keys get the same height.
        text(size: 0.82em, top-edge: cap, bottom-edge: 0pt, fill: theme.fg, dir: if text-dir(k) == rtl { rtl } else { ltr }, k),
      )
      // One left-to-right unit, so "Ctrl+C" doesn't become "C+Ctrl" in a Persian sentence.
      box(text(dir: ltr, keys.map(key).join(text(fill: theme.muted, size: 0.8em)[#h(1.5pt * zoom)+#h(1.5pt * zoom)])))
    },
)

// The HTML form (optional, used by the HTML export): a `<kbd>` for each key
#let kbd-html = (
    kbd: (attrs, body) => {
      let keys = plain-text(body).split("+").map(k => k.trim()).filter(k => k != "")
      html.elem("span", attrs: (class: "fx-keys"), keys.map(k => html.elem("kbd", attrs: (class: "fx-kbd"), k)).join([+]))
    },
)
#let kbd-css = `````css
.fx-keys { direction: ltr; unicode-bidi: isolate; white-space: nowrap; }
.fx-kbd { display: inline-block; font-family: var(--font-code); font-size: .82em; line-height: 1.4; padding: 0 .35em; background: var(--code-bg); color: var(--fg); border: 1px solid var(--code-stroke); border-bottom-width: 2px; border-radius: min(var(--r-badge), 4px); }
`````.text

#let kbd-schema = (
  "kbd": (
    kind: "inline",
    description: (en: "Keyboard key cap", fa: "کلید صفحه‌کلید"),
    attrs: (:),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let kbd-docs = (
  en: (
    about: `````md
A key cap for keyboard shortcuts. Write the keys joined by `+`: `<kbd>Ctrl+S</kbd>`.

- Each `+`-separated key is drawn as a key cap.
- The whole shortcut stays left to right, so it reads "Ctrl + S" in a Persian sentence too.
- It follows the theme and the feel's corner rounding.
`````.text,
  ),
  fa: (
    about: `````md
کلید صفحه‌کلید برای میان‌بُرها. کلیدها را با `+` به هم بچسبانید: `<kbd>Ctrl+S</kbd>`.

- هر کلیدِ جداشده با `+` به شکل یک کلید صفحه‌کلید کشیده می‌شود.
- کل میان‌بُر چپ‌به‌راست می‌ماند، پس در جملهٔ فارسی هم «Ctrl + S» خوانده می‌شود.
- از تم و گردی گوشه‌های حالت (feel) پیروی می‌کند.
`````.text,
  ),
  example: (
    en: `````md
Press <kbd>Ctrl+Shift+P</kbd> to open the palette.
`````.text,
    fa: `````md
برای باز کردن پالت <kbd>Ctrl+Shift+P</kbd> را بزنید.
`````.text,
  ),
)
