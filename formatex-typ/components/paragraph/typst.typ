#import "/src/kit.typ": *

// <p>: a paragraph (or several) with its own look: font, size, weight, color, alignment, spacing and direction. Every attribute is
// optional; what it leaves out comes from the document ([paragraph] in config.toml for the spacing).
#let paragraph-weights = ("thin", "extralight", "light", "regular", "medium", "semibold", "bold", "extrabold", "black")

// A percent as a number: "120" or "120%"
#let paragraph-percent(attrs, key) = {
  let raw = attrs.at(key, default: none)
  if raw == none or raw == "" { return none }
  let m = str(raw).trim().match(regex("^(-?[0-9]*\\.?[0-9]+)\\s*%?$"))
  assert(m != none, message: at-of(attrs) + "<p> " + key + " must be a number (a percent), got " + repr(raw))
  float(m.captures.at(0))
}

#let paragraph-tags = (
    p: (attrs, body) => {
      let above = parse-length(attrs.at("above", default: none), attrs: attrs)
      let below = parse-length(attrs.at("below", default: none), attrs: attrs)
      let indent = parse-length(attrs.at("indent", default: none), attrs: attrs)
      let size = parse-length(attrs.at("size", default: none), attrs: attrs)
      let weight = flag-attr(attrs, "weight", "regular", paragraph-weights, "p")
      let hue = if "color" in attrs { pick-hue(attrs.color, "p", none, attrs: attrs) }
      let align-key = attrs.at("align", default: none)
      assert(align-key == none or align-key in align-names, message: at-of(attrs) + "<p> align must be one of " + align-names.keys().join(", ") + ", got " + repr(align-key))
      let justified = if "justify" in attrs { flag-attr(attrs, "justify", "false", ("true", "false"), "p") == "true" }
      let line = paragraph-percent(attrs, "line-spacing")
      let letters = paragraph-percent(attrs, "letter-spacing")
      let words = paragraph-percent(attrs, "word-spacing")
      let to = attrs.at("dir", default: "auto")
      assert(to in ("auto", "rtl", "ltr"), message: at-of(attrs) + "<p> dir must be auto, rtl or ltr, got " + repr(to))
      let family = attrs.at("font", default: none)

      context {
        // A size in percent is of the size the text has here
        let resolved-size = if size == none { none } else if type(size) == ratio { text.size * size } else { size }
        let fonts = text.font
        show: it => {
          set text(font: (family,) + (if type(fonts) == array { fonts } else { (fonts,) })) if family != none and family != ""
          set text(size: resolved-size) if resolved-size != none
          set text(weight: weight) if "weight" in attrs
          set text(fill: hue) if hue != none
          set text(tracking: letters / 100 * 1em) if letters != none
          set text(spacing: words * 1%) if words != none
          set text(dir: if to == "rtl" { rtl } else { ltr }) if to != "auto"
          set par(leading: line / 100 * 0.65em) if line != none
          set par(justify: justified) if justified != none
          set par(first-line-indent: indent) if indent != none
          it
        }
        let inner = if align-key != none { align(align-names.at(align-key), body) } else { body }
        block(width: 100%, above: if above != none { above } else { auto }, below: if below != none { below } else { auto }, inner)
      }
    },
)
