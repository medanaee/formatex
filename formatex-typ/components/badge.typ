#import "/src/prelude.typ": *
#import "/src/lib/colors.typ": *
#import "/src/lib/basics.typ": *

#let badge-tags = (
    // <badge color="green" icon="check">stable</badge>
    badge: (attrs, body) => context {
      let given = attrs.at("color", default: none)
      let colors = if given != none { resolve-color(given) } else { tinted(theme.muted) }
      let icon-name = attrs.at("icon", default: none)
      let d = content-dir(body)
      // The icon font and the Persian font have their own (taller) metrics; fixed edges at the
      // Latin cap height give every badge the same height, with or without an icon.
      let size = parse-length(attrs.at("size", default: "1em"))
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
            if icon-name != none { fa-icon(icon-name) + h(3pt * zoom) }
            body
          },
        ),
      )
    },
)

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



