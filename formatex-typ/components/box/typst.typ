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

// The HTML form (optional, used by the HTML export): a `.fx-panel` (its CSS is the page's)
