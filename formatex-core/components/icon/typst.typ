#import "/src/kit.typ": *

#let icon-tags = (
    // <icon name="check" color="green" size="1.2em" />: a Font Awesome icon in the middle of a sentence.
    icon: ("void", attrs => context {
      let given = attrs.at("color", default: none)
      let size = parse-length(attrs.at("size", default: "1em"), attrs: attrs)
      let solid = attrs.at("solid", default: "false") == "true"
      // The icon font has its own (taller) metrics; fixed edges at the Latin cap height keep the line height.
      let cap = measure(text("H")).height
      box(text(
        size: size,
        top-edge: cap,
        bottom-edge: 0pt,
        ..if given != none { (fill: resolve-color(given, attrs: attrs).icon) },
        fa-icon(attrs.name, solid: solid),
      ))
    }),
)

// The HTML form (optional, used by the HTML export): a small picture, so the page needs no icon font
