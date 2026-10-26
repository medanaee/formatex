#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/colors.typ": *

#let icon-tags = (
    // <icon name="check" color="green" size="1.2em" />: a Font Awesome icon in the middle of a sentence.
    icon: ("void", attrs => context {
      let given = attrs.at("color", default: none)
      let size = parse-length(attrs.at("size", default: "1em"))
      let solid = attrs.at("solid", default: "false") == "true"
      // The icon font has its own (taller) metrics; fixed edges at the Latin cap height keep the line height.
      let cap = measure(text("H")).height
      box(text(
        size: size,
        top-edge: cap,
        bottom-edge: 0pt,
        ..if given != none { (fill: resolve-color(given).icon) },
        fa-icon(attrs.name, solid: solid),
      ))
    }),
)

#let icon-schema = (
  "icon": (
    kind: "void",
    description: (en: "Font Awesome icon inside a sentence", fa: "آیکن Font Awesome وسط جمله"),
    attrs: (
      "name": (type: "string", required: true, doc: (en: "Font Awesome icon name, for example `check`, `triangle-exclamation`, `github`", fa: "نام آیکن Font Awesome، مثلاً `check`، `triangle-exclamation`، `github`")),
      "color": (type: "color", doc: (en: "Color preset, Tailwind name or hex. Default: the surrounding text color.", fa: "رنگ آماده، نام Tailwind یا hex. پیش‌فرض: رنگ متن اطراف.")),
      "size": (type: "length", default: "1em", doc: (en: "Icon size; `1em` matches the text", fa: "اندازهٔ آیکن؛ `1em` هم‌اندازهٔ متن")),
      "solid": (type: "bool", default: "false", doc: (en: "Use the solid style instead of the regular one (not every icon has both)", fa: "سبک توپر به‌جای معمولی (همهٔ آیکن‌ها هر دو را ندارند)")),
    ),
  ),
)
