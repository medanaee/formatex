#import "/src/kit.typ": *

#let picheader-tags = (
    picheader: ("void", attrs => {
      assert("src" in attrs, message: at-of(attrs) + "<picHeader> requires src=\"path\"")
      assert("title" in attrs, message: at-of(attrs) + "<picHeader> requires title=\"...\"")
      let flag(key, default) = {
        let v = attrs.at(key, default: default)
        assert(v in ("true", "false"), message: at-of(attrs) + "<picHeader> " + key + " must be true or false, got " + repr(v))
        v == "true"
      }
      let brk = attrs.at("break", default: "false")
      assert(brk in ("false", "before"), message: at-of(attrs) + "<picHeader> break must be false or before, got " + repr(brk))
      let mx = flag("margin-x", "true")
      let my = flag("margin-y", "true")
      let h = parse-length(attrs.at("height", default: "60mm"), attrs: attrs)
      let multi = column-count > 1
      let bleed-x = not mx and not multi
      let bleed-top = brk == "before" and not my
      let pad-x = if bleed-x { page-margins.x } else { 0pt }
      let pad-top = if bleed-top { page-margins.top } else { 0pt }
      let r = feel.image
      // Corners touching a page edge stay square; the others follow the feel.
      let radius = (top-left: if bleed-top or bleed-x { 0pt } else { r }, top-right: if bleed-top or bleed-x { 0pt } else { r }, bottom-left: if bleed-x { 0pt } else { r }, bottom-right: if bleed-x { 0pt } else { r })
      let subtitle = attrs.at("subtitle", default: none)
      let inner = {
        let img-h = h + pad-top
        block(width: 100%, height: img-h, clip: true, radius: radius, breakable: false, {
          place(image(root-path(attrs.src), width: 100%, height: img-h, fit: "cover"))
          place(rect(width: 100%, height: img-h, stroke: none, fill: gradient.linear(dir: ttb, (black.transparentize(100%), 0%), (black.transparentize(100%), 25%), (black.transparentize(10%), 100%))))
          place(bottom, block(width: 100%, inset: (x: 1.2em + pad-x, top: 1em, bottom: 2.2em), context {
            let given-dir = attrs.at("dir", default: "auto")
            set text(fill: white, dir: if given-dir != "auto" { named-dir(given-dir) } else { content-dir(attrs.title) })
            set par(spacing: 0pt, leading: 0.4em)
            text(size: 2.2em, weight: "bold", attrs.title)
            if subtitle != none {
              v(1.4em)
              text(size: 1.1em, fill: white.transparentize(15%), subtitle)
            }
          }))
        })
      }
      if brk == "before" { pagebreak(weak: true) }
      block(width: 100%, above: if brk == "before" { 0pt } else { 1em }, below: 1.2em, breakable: false,
        pad(x: -pad-x, top: -pad-top, inner))
    }),
)

// The HTML form (optional, used by the HTML export): the picture covers a band with a gradient rising from the bottom and the white title on
// it; `margin-x="false"` lets the band bleed to the edges of the window. A page break means nothing on a web page, so `break` is ignored.
