#import "/src/kit.typ": *

#let badge-tags = (
    // <badge color="green" icon="check">stable</badge>
    badge: (attrs, body) => context {
      let given = attrs.at("color", default: none)
      let colors = if given != none { resolve-color(given, attrs: attrs) } else { tinted(theme.muted) }
      let icon-name = attrs.at("icon", default: none)
      let d = content-dir(body)
      // The icon font and the Persian font have their own (taller) metrics; fixed edges at the
      // Latin cap height give every badge the same height, with or without an icon.
      let size = parse-length(attrs.at("size", default: "1em"), attrs: attrs)
      let cap = measure(text(size: size, weight: "bold", "H")).height
      box(
        fill: colors.fill,
        stroke: 0.5pt * zoom + colors.border,
        radius: feel.badge,
        inset: (x: 5pt * zoom, y: 0pt),
        outset: (y: 3pt * zoom),
        text(
          size: size,
          weight: "bold",
          top-edge: cap,
          bottom-edge: 0pt,
          // Small text on a pale tint needs more contrast than an icon does.
          fill: if theme.dark { colors.icon } else { color.mix((colors.icon, 70%), (theme.fg, 30%)) },
          ..if d != none { (dir: d) },
          {
            if icon-name != none { fa-icon(icon-name) + h(2pt * zoom) }
            body
          },
        ),
      )
    },
)

// The HTML form (optional, used by the HTML export)
#let badge-html = (
    badge: (attrs, body) => {
      let given = attrs.at("color", default: none)
      let colors = if given != none { resolve-color(given, attrs: attrs) } else { tinted(theme.muted) }
      let icon-name = attrs.at("icon", default: none)
      let ink = if theme.dark { colors.icon } else { color.mix((colors.icon, 70%), (theme.fg, 30%)) }
      html.elem("span", attrs: (class: "fx-badge", style: style-of((panel-style(colors), if "hue" not in colors { "color: " + css-color(ink) }, if "size" in attrs { "font-size: " + css-len(parse-length(attrs.size, attrs: attrs)) }))), {
        if icon-name != none { html-icon(icon-name, fill: ink); [ ] }
        body
      })
    },
)
#let badge-css = `````css
.fx-badge { display: inline-block; font-size: .85em; line-height: 1.5; padding: 0 .55em; border-radius: var(--r-badge); border: 1px solid var(--panel-border); background: var(--panel-fill); color: var(--fg); white-space: nowrap; font-weight: 700; }
.fx-badge[style*="--hue"] { color: color-mix(in srgb, color-mix(in srgb, var(--hue) var(--ic-pct), var(--ic-with)) calc(100% - var(--ink-fg)), var(--fg)); }
`````.text

#let badge-schema = (
  "badge": (
    kind: "inline",
    description: (en: "Small inline label", fa: "برچسب کوچک درون‌خطی"),
    attrs: (
      "color": (type: "color", doc: (en: "Color preset or hex", fa: "نام رنگ آماده یا hex")),
      "icon": (type: "string", doc: (en: "Font Awesome icon name", fa: "نام آیکن Font Awesome")),
      "size": (type: "length", default: "1em", doc: (en: "Text size; `1em` (default) is the size of the surrounding text, `0.8em` a little smaller", fa: "اندازهٔ متن؛ `1em` (پیش‌فرض) هم‌اندازهٔ متن اطراف است، `0.8em` کمی کوچک‌تر")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let badge-docs = (
  en: (
    about: `````md
A small inline label (a pill, with an optional icon) for a status or a tag inside a sentence.

- `color`: a color preset or hex; without it the badge is neutral gray.
- `icon` adds a Font Awesome icon before the text; `size` is the text size (`1em` by default).
- It follows the theme and the feel's corner rounding.
`````.text,
  ),
  fa: (
    about: `````md
یک برچسب کوچک درون‌خطی (قرصی شکل و با آیکون اختیاری) برای وضعیت یا برچسب میان جمله.

- `color`: یک رنگ آماده یا hex؛ بدون آن برچسب خاکستری خنثی است.
- `icon` یک آیکون Font Awesome پیش از متن می‌گذارد؛ `size` اندازهٔ متن است (پیش‌فرض `1em`).
- از تم و گردی گوشه‌های حالت (feel) پیروی می‌کند.
`````.text,
  ),
  example: (
    en: `````md
<badge color="green" icon="circle-check">stable</badge> <badge color="yellow">beta</badge> <badge>neutral</badge>
`````.text,
    fa: `````md
<badge color="green" icon="circle-check">پایدار</badge> <badge color="yellow">آزمایشی</badge> <badge>خنثی</badge>
`````.text,
  ),
)
