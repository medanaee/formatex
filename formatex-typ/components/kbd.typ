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

#let kbd-schema = (
  "kbd": (
    kind: "inline",
    description: (en: "Keyboard key cap", fa: "کلید صفحه‌کلید"),
    attrs: (:),
  ),
)



