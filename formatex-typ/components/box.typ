#import "/src/kit.typ": *

#let box-tags = (
    box: (attrs, body) => {
      let given = attrs.at("color", default: none)
      let colors = if given != none { resolve-color(given, attrs: attrs) }
      let is-preset = given != none and given in color-presets
      // Presets come with a thin border in their own hue; hex colors keep the old borderless default.
      let border = parse-length(attrs.at("border", default: if is-preset { "0.6" } else { "0" }), attrs: attrs)
      let border-color = if "border-color" in attrs { resolve-color(attrs.at("border-color"), attrs: attrs).border }
        else if is-preset { colors.border } else { theme.rule }
      panel((
        fill: if colors != none { colors.fill },
        stroke: if border != 0pt { border + border-color },
        radius: if "radius" in attrs { parse-length(attrs.radius, attrs: attrs) } else { feel.box },
        inset: parse-length(attrs.at("padding", default: "8pt"), attrs: attrs),
      ), body)
    },
)

#let box-schema = (
  "box": (
    kind: "block",
    description: (en: "styled container", fa: "ظرف قالب‌دار"),
    attrs: (
      "color": (type: "color", doc: (en: "A color preset name or a hex color. Default: transparent.", fa: "نام یک رنگ آماده یا یک رنگ hex. پیش‌فرض: شفاف.")),
      "border": (type: "length", doc: (en: "`0.6` with a preset, otherwise `0` (no border)", fa: "با رنگ آماده `0.6`، وگرنه `0` (بدون حاشیه)")),
      "border-color": (type: "color", doc: (en: "A preset name or hex. Default: the preset's hue, otherwise the theme's rule color.", fa: "نام رنگ آماده یا hex. پیش‌فرض: رنگ همان رنگ آماده، وگرنه رنگ خط تم.")),
      "radius": (type: "length", doc: (en: "The feel's value", fa: "مقدار حالت")),
      "padding": (type: "length", default: "8pt", doc: (en: "`8pt`", fa: "`8pt`")),
    ),
  ),
)



