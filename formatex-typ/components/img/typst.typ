#import "/src/kit.typ": *

#let img-tags = (
    img: ("void", attrs => {
      let w = parse-length(attrs.at("width", default: none), attrs: attrs)
      let h = parse-length(attrs.at("height", default: none), attrs: attrs)
      let relative-width = type(w) == ratio
      span-columns(attrs, "img", box(
        clip: true,
        width: if relative-width { w } else { auto },
        radius: if "radius" in attrs { parse-length(attrs.radius, attrs: attrs) } else { feel.image },
        image(
          root-path(attrs.src),
          alt: attrs.at("alt", default: none),
          width: if relative-width { 100% } else if w != none { w } else { auto },
          height: if h != none { h } else { auto },
        ),
      ))
    }),
)
