// The Tailwind classes the template understands, as data: which groups there are, which tags take which group, and what each group
// holds. Three readers: the editor (autocomplete of `tailwind="..."`, from the schema export), the tags that take only some groups (<span>
// rejects a class of a group it does not take), and the guide. The parser itself is `div-parse` in components/div.typ; this file only
// says what it knows, so a class added there is added here too (the tests of the app compile the examples of the guide).
#import "/src/kit.typ": *

#let tailwind-theme-colors = ("fg", "heading", "muted", "accent", "secondary", "rule", "code", "page", "white", "black", "transparent")
#let tailwind-values = (
  // `blue` (the theme's soft tint of it), `blue-200` (Tailwind's own shade) and the theme's own names
  colors: color-names + color-presets.keys().filter(k => k not in color-names) + tailwind-theme-colors,
  spacing: ("0", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "16", "20", "24", "28", "32", "36", "40", "44", "48", "52", "56", "60", "64", "72", "80", "96", "px"),
  sizes: ("xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"),
  weights: ("thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"),
  leadings: ("none", "tight", "snug", "normal", "relaxed", "loose"),
  trackings: ("tighter", "tight", "normal", "wide", "wider", "widest"),
  radii: ("none", "sm", "md", "lg", "xl", "2xl", "3xl", "full"),
  widths: ("0", "2", "4", "8"),
  lengths: ("full", "auto", "fit", "1/2", "1/3", "2/3", "1/4", "3/4"),
  max-widths: ("xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "prose", "full"),
  aligns: ("left", "center", "right", "start", "end", "justify"),
  justify: ("start", "end", "center", "between", "around", "evenly", "stretch", "normal"),
  items: ("start", "end", "center", "stretch", "baseline"),
  numbers: ("1", "2", "3", "first", "last", "none"),
)

#let sides = ("x", "y", "t", "b", "l", "r", "s", "e")
#let side-prefixes(letter) = (letter + "-",) + sides.map(s => letter + s + "-")

// `prefixes` + a value of `values` (a key of `tailwind-values`); `arbitrary`: `[...]` is taken too (`p-[10pt]`); `opacity`: `/50` is taken
#let tailwind-groups = (
  (id: "display", tags: ("div",), label: (en: "Display", fa: "نمایش"), static: ("flex", "block", "inline-flex", "inline-block", "hidden"), families: ()),
  (id: "flex", tags: ("div",), label: (en: "Flex", fa: "Flex"),
    static: ("flex-row", "flex-row-reverse", "flex-col", "flex-col-reverse", "flex-wrap", "flex-wrap-reverse", "flex-nowrap", "flex-auto", "flex-initial", "flex-none", "grow", "grow-0", "shrink", "shrink-0"),
    families: ((prefixes: ("flex-", "order-"), values: "numbers"), (prefixes: ("justify-",), values: "justify"), (prefixes: ("content-",), values: "justify"), (prefixes: ("items-", "self-"), values: "items"))),
  (id: "gap", tags: ("div",), label: (en: "Gap", fa: "فاصلهٔ بین آیتم‌ها"), static: (), families: ((prefixes: ("gap-", "gap-x-", "gap-y-", "space-x-", "space-y-"), values: "spacing", arbitrary: true),)),
  (id: "padding", tags: ("div", "span"), label: (en: "Padding", fa: "پدینگ"), static: (), families: ((prefixes: side-prefixes("p"), values: "spacing", arbitrary: true),)),
  (id: "margin", tags: ("div",), label: (en: "Margin", fa: "مارجین"), static: ("mx-auto", "ml-auto", "mr-auto", "ms-auto", "me-auto"), families: ((prefixes: side-prefixes("m"), values: "spacing", arbitrary: true),)),
  (id: "size", tags: ("div",), label: (en: "Size", fa: "اندازه"), static: (),
    families: ((prefixes: ("w-", "h-", "basis-"), values: "spacing", arbitrary: true), (prefixes: ("w-", "h-", "basis-"), values: "lengths"), (prefixes: ("max-w-",), values: "max-widths", arbitrary: true))),
  (id: "background", tags: ("div", "span"), label: (en: "Background", fa: "پس‌زمینه"), static: (), families: ((prefixes: ("bg-",), values: "colors", arbitrary: true, opacity: true),)),
  (id: "text-color", tags: ("div", "span"), label: (en: "Text color", fa: "رنگ متن"), static: (), families: ((prefixes: ("text-",), values: "colors", arbitrary: true, opacity: true),)),
  (id: "text", tags: ("div", "span"), label: (en: "Text", fa: "متن"), static: ("italic", "not-italic", "underline", "line-through", "no-underline", "font-mono", "font-sans"),
    families: ((prefixes: ("text-",), values: "sizes", arbitrary: true), (prefixes: ("font-",), values: "weights"), (prefixes: ("leading-",), values: "leadings", arbitrary: true), (prefixes: ("tracking-",), values: "trackings", arbitrary: true))),
  (id: "text-align", tags: ("div",), label: (en: "Text alignment", fa: "تراز متن"), static: ("text-justify",), families: ((prefixes: ("text-",), values: "aligns"),)),
  (id: "border", tags: ("div", "span"), label: (en: "Border", fa: "بوردر"),
    static: ("border", "border-solid", "border-dashed", "border-dotted", "border-none") + side-prefixes("border").map(p => p.slice(0, -1)),
    families: ((prefixes: side-prefixes("border"), values: "widths", arbitrary: true), (prefixes: ("border-",), values: "colors", arbitrary: true, opacity: true))),
  (id: "rounding", tags: ("div", "span"), label: (en: "Rounding", fa: "گردی گوشه"), static: ("rounded",),
    families: ((prefixes: ("rounded-", "rounded-t-", "rounded-b-", "rounded-l-", "rounded-r-", "rounded-s-", "rounded-e-", "rounded-tl-", "rounded-tr-", "rounded-bl-", "rounded-br-"), values: "radii", arbitrary: true),)),
  (id: "other", tags: ("div",), label: (en: "Other", fa: "سایر"), static: ("overflow-hidden", "overflow-visible"), families: ()),
)

// What comes before the class: `dark:`, `rtl:`, a feel (`friendly:`)
#let tailwind-variants = ("dark", "light", "rtl", "ltr") + feels.keys()

/// The groups a tag takes, as data for the schema export: the ids, and the definitions the editor completes from.
#let tailwind-catalog = (values: tailwind-values, variants: tailwind-variants, groups: tailwind-groups.map(g => (id: g.id, tags: g.tags, label: g.label, static: g.static, families: g.families)))
#let tailwind-groups-of(tag) = tailwind-groups.filter(g => tag in g.tags).map(g => g.id)

/// The group of a class (without its variants): `none` for a class no group knows. The same reading as `div-parse`.
#let tailwind-group(cls) = {
  let c = if cls.starts-with("-") { cls.slice(1) } else { cls }
  let rx(p) = c.match(regex("^" + p + "$")) != none
  if c in ("flex", "block", "inline-flex", "inline-block", "hidden") { "display" }
  else if rx("flex-.+") or rx("(grow|shrink)(-[0-9.]+)?") or rx("(justify|items|content|self|order)-.+") { "flex" }
  else if rx("(gap|space)-.+") { "gap" }
  else if rx("p[xytblrse]?-.+") { "padding" }
  else if rx("m[xytblrse]?-.+") { "margin" }
  else if rx("(w|h|max-w|basis)-.+") { "size" }
  else if rx("bg-.+") { "background" }
  else if c in ("italic", "not-italic", "underline", "line-through", "no-underline") or rx("(font|leading|tracking)-.+") { "text" }
  else if rx("text-.+") {
    let v = c.slice(5)
    if v in tailwind-values.sizes or (v.starts-with("[") and not v.starts-with("[#")) { "text" }
    else if v in tailwind-values.aligns { "text-align" } else { "text-color" }
  }
  else if rx("border.*") { "border" }
  else if rx("rounded.*") { "rounding" }
  else if rx("overflow-.+") { "other" }
  else { none }
}

/// Fails (with the position) when a class belongs to a group the tag does not take; the classes of the tags that take them all are not looked at.
#let tailwind-check(tag, classes, at: none) = {
  let allowed = tailwind-groups-of(tag)
  for token in classes.split(regex("\s+")).filter(t => t != "") {
    let cls = token.split(":").last()
    let group = tailwind-group(cls)
    if group != none and group not in allowed {
      assert(false, message: at-prefix(at) + "<" + tag + "> tailwind class " + repr(cls) + " is a " + tailwind-groups.find(g => g.id == group).label.en + " class, which <" + tag + "> does not take; it takes: " + allowed.join(", "))
    }
  }
}
