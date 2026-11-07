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

#let hr-schema = (
  "hr": (
    kind: "void",
    description: (en: "A line across the text, in one of several styles and colors", fa: "یک خط در عرض متن با چند سبک و رنگ"),
    attrs: (
      "style": (type: "enum", values: hr-styles, default: "solid", doc: (en: "Look of the line: `solid`, `dashed`, `dotted`, `dash-dot`, `double` or `wavy`.", fa: "ظاهر خط: `solid`، `dashed`، `dotted`، `dash-dot`، `double` یا `wavy`.")),
      "color": (type: "color", doc: (en: "Color of the line: a preset (`blue`, `red`...), `accent` or a hex color. Default: the theme's rule color.", fa: "رنگ خط: یک رنگ آماده (`blue`، `red`...)، `accent` یا رنگ hex. پیش‌فرض: رنگ خط‌های تم.")),
      "width": (type: "length", default: "100%", doc: (en: "Length of the line: `60%`, `5cm`...", fa: "طول خط: `60%`، `5cm`...")),
      "thickness": (type: "length", default: "1pt", doc: (en: "How thick the line is: `0.5pt`, `2pt`...", fa: "ضخامت خط: `0.5pt`، `2pt`...")),
      "gap": (type: "length", default: "0.8em", doc: (en: "Space above and below the line", fa: "فاصلهٔ بالا و پایین خط")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let hr-docs = (
  en: (
    about: `````md
A line across the text, in a style and color of your choice: `<hr />`, or `<hr style="dashed" color="red" />`.

- `style`: `solid` (default), `dashed`, `dotted`, `dash-dot`, `double` or `wavy`.
- `color`: a preset (`blue`, `red`...), `accent` or a hex color; by default the theme's rule color.
- `width` of the line (`60%`, `5cm`; default `100%`), `thickness` (default `1pt`) and `gap`, the space above and below it (default `0.8em`).
`````.text,
  ),
  fa: (
    about: `````md
یک خط در عرض متن، با سبک و رنگ دلخواه: `<hr />` یا `<hr style="dashed" color="red" />`.

- `style`: `solid` (پیش‌فرض)، `dashed`، `dotted`، `dash-dot`، `double` یا `wavy`.
- `color`: یک رنگ آماده (`blue`، `red`...)، `accent` یا رنگ hex؛ به‌طور پیش‌فرض رنگ خط‌های تم.
- `width` طول خط (`60%`، `5cm`؛ پیش‌فرض `100%`)، `thickness` ضخامت (پیش‌فرض `1pt`) و `gap` فاصلهٔ بالا و پایین آن (پیش‌فرض `0.8em`).
`````.text,
  ),
  example: (
    en: `````md
<hr style="dashed" color="red" />

<hr style="double" width="50%" color="#1d4ed8" thickness="1.5pt" />

<hr style="wavy" color="teal" />
`````.text,
    fa: `````md
<hr style="dashed" color="red" />

<hr style="double" width="50%" color="#1d4ed8" thickness="1.5pt" />

<hr style="wavy" color="teal" />
`````.text,
  ),
)
