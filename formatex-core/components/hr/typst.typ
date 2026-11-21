#import "/src/kit.typ": *

// <hr />: a line across the text, in one of several styles and any color.
#let hr-styles = ("solid", "dashed", "dotted", "dash-dot", "double", "wavy")

#let hr-line(style, hue, thickness, width) = {
  let stroke(dash: none, cap: "butt") = (paint: hue, thickness: thickness, dash: dash, cap: cap)
  if style == "double" {
    block(width: width, stack(spacing: thickness * 1.6, line(length: 100%, stroke: stroke()), line(length: 100%, stroke: stroke())))
  } else if style == "wavy" {
    // A run of small bumps up and down, as many as fit in the width
    block(width: width, layout(size => {
      let amp = thickness * 2.2
      let n = calc.max(1, calc.floor(size.width / (amp * 3.2)))
      let step = size.width / n
      block(height: amp * 2, width: size.width, curve(
        stroke: stroke(cap: "round"),
        curve.move((0pt, amp)),
        ..range(n).map(i => curve.quad((step * (i + 0.5), if calc.even(i) { 0pt } else { amp * 2 }), (step * (i + 1), amp))),
      ))
    }))
  } else {
    let dash = if style == "dashed" { "dashed" } else if style == "dotted" { "dotted" } else if style == "dash-dot" { "dash-dotted" } else { none }
    block(width: width, line(length: 100%, stroke: stroke(dash: dash, cap: if style == "dotted" { "round" } else { "butt" })))
  }
}

#let hr-tags = (
    hr: ("void", attrs => {
      let style = flag-attr(attrs, "style", "solid", hr-styles, "hr")
      let hue = pick-hue(attrs.at("color", default: none), "hr", theme.rule, attrs: attrs)
      let thickness = parse-length(attrs.at("thickness", default: "1pt"), attrs: attrs)
      let width = parse-length(attrs.at("width", default: "100%"), attrs: attrs)
      let gap = parse-length(attrs.at("gap", default: "0.8em"), attrs: attrs)
      block(width: 100%, above: gap, below: gap, align(center, hr-line(style, hue, thickness, width)))
    }),
)

// The HTML form (optional, used by the HTML export): an `<hr>` with the border of the style (dash-dot becomes dashed, wavy solid)
