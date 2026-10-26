#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/colors.typ": *

// <div tailwind="p-4 bg-blue rounded-lg flex gap-2 ...">: a container styled by Tailwind-like utility
// classes. Spacing is 0.25em per step, colors are theme-aware, rounding does not follow the feel (a `rounded-*` class always rounds), and the flex layout is computed here because Typst has no flexbox.

#let div-theme-colors = (
  fg: theme.fg, heading: theme.heading, muted: theme.muted, accent: theme.accent,
  secondary: theme.secondary, rule: theme.rule, code: theme.code-bg,
  page: theme.bg, white: theme.bg, black: theme.fg,
)
#let div-text-sizes = (
  xs: 0.75em, sm: 0.875em, base: 1em, lg: 1.125em, xl: 1.25em, "2xl": 1.5em, "3xl": 1.875em,
  "4xl": 2.25em, "5xl": 3em, "6xl": 3.75em, "7xl": 4.5em, "8xl": 6em, "9xl": 8em,
)
#let div-weights = (
  thin: 100, extralight: 200, light: 300, normal: 400, medium: 500,
  semibold: 600, bold: 700, extrabold: 800, black: 900,
)
#let div-leadings = ("none": 0.2em, tight: 0.4em, snug: 0.55em, normal: 0.65em, relaxed: 0.8em, loose: 1em)
#let div-trackings = (tighter: -0.05em, tight: -0.025em, normal: 0em, wide: 0.025em, wider: 0.05em, widest: 0.1em)
// Multiples of one step (6pt), independent of the feel: a `rounded-*` class always rounds, even in `formal`.
#let div-radii = ("none": 0, sm: 0.5, "": 1, md: 1.5, lg: 2, xl: 3, "2xl": 4, "3xl": 6)
#let div-radius-step = 6pt
#let div-max-widths = (
  xs: 20em, sm: 24em, md: 28em, lg: 32em, xl: 36em, "2xl": 42em, "3xl": 48em,
  "4xl": 56em, "5xl": 64em, "6xl": 72em, "7xl": 80em, prose: 40em,
)
#let div-justify-values = ("start", "end", "center", "between", "around", "evenly", "stretch", "normal")
#let div-items-values = ("start", "end", "center", "stretch", "baseline")

#let div-spec0 = (
  display: "block", col: false, reverse: false, wrap: false, wrap-reverse: false,
  justify: "start", items: "stretch", content: "start",
  gap-x: 0pt, gap-y: 0pt,
  pad-l: 0pt, pad-r: 0pt, pad-t: 0pt, pad-b: 0pt,
  mar-l: 0pt, mar-r: 0pt, mar-t: 0pt, mar-b: 0pt,
  w: none, h: none, max-w: none,
  fill: none, text-color: none,
  bw-l: 0pt, bw-r: 0pt, bw-t: 0pt, bw-b: 0pt, bstyle: "solid", bcolor: none,
  rad-tl: 0pt, rad-tr: 0pt, rad-bl: 0pt, rad-br: 0pt,
  size: none, weight: none, italic: none, underline: false, strike: false, tracking: none,
  leading: none, mono: false, text-align: none, justify-text: false, clip: false,
  grow: 0, shrink: 1, basis: auto, self-align: "auto", order: 0,
)

#let div-fail(cls, why) = assert(false, message: "<div> tailwind class " + repr(cls) + ": " + why)

// Lengths are made absolute here, while the text size is still the container's parent's: `p-4` is 1em of
// the surrounding text (like rem), not of this container's own `text-xl`. Needs `context`.
#let div-abs(x) = if type(x) == length { x.to-absolute() } else { x }

// "4" (0.25em per step), "px", "[12pt]"
#let div-length(v, cls) = {
  if v == "px" { return 0.75pt * zoom }
  if v.starts-with("[") and v.ends-with("]") { return div-abs(parse-length(v.slice(1, -1))) }
  if v.match(regex("^[0-9]*\.?[0-9]+$")) == none { div-fail(cls, "expected a number (0.25em per step), px or [length], got " + repr(v)) }
  div-abs(float(v) * 0.25em)
}

// Width, height, flex-basis: a length, a fraction (1/2), full, auto, fit.
#let div-size(v, cls) = {
  if v == "full" { 100% } else if v == "auto" { auto } else if v in ("fit", "min", "max") { "fit" }
  else if v.match(regex("^[0-9]+/[0-9]+$")) != none {
    let parts = v.split("/")
    float(parts.at(0)) / float(parts.at(1)) * 100%
  } else { div-length(v, cls) }
}

// Color for the role "fill", "text" or "border". `blue` is the soft theme-aware tint <box color> uses;
// `blue-200` is exactly Tailwind's blue-200 (on a dark theme its mirror, blue-800, so light shades stay
// readable); `blue/20` mixes that percent of blue into the page color.
#let div-color(v, role, cls) = {
  if v in ("transparent", "none") { return none }
  if v.starts-with("[") and v.ends-with("]") { return rgb(v.slice(1, -1)) }
  let name = v
  let amount = none
  let slash = name.match(regex("^(.+)/([0-9]+)$"))
  if slash != none {
    name = slash.captures.at(0)
    amount = calc.min(int(slash.captures.at(1)), 100)
  }
  let shade = name.match(regex("^(.+)-([0-9]+)$"))
  if shade != none and shade.captures.at(0) in color-presets {
    let n = int(shade.captures.at(1))
    let key = shade.captures.at(0) + "-" + str(if theme.dark { if n == 50 { 950 } else if n == 950 { 50 } else { 1000 - n } } else { n })
    if key not in color-presets { div-fail(cls, "unknown shade " + str(n) + "; use " + tailwind-shades.map(str).join(", ")) }
    name = key
  }
  let base = if role == "text" { theme.fg } else { theme.bg }
  if name in color-presets {
    let hue = color-presets.at(name)
    if amount != none { return color.mix((hue, amount * 1%), (base, (100 - amount) * 1%)) }
    if name.contains("-") { return hue }
    let t = tinted(hue)
    return if role == "fill" { t.fill } else if role == "text" { t.icon } else { t.border }
  }
  if name in div-theme-colors {
    let c = div-theme-colors.at(name)
    if amount == none { return c }
    return color.mix((c, amount * 1%), (theme.bg, (100 - amount) * 1%))
  }
  div-fail(cls, "unknown color " + repr(name) + "; use a Tailwind color (" + color-names.join(", ") + ") with an optional shade (blue-300) or /percent, a theme color (" + div-theme-colors.keys().join(", ") + "), transparent or [#hex]")
}

#let div-variant-ok(name, is-rtl, token) = {
  if name == "dark" { theme.dark } else if name == "light" { not theme.dark }
  else if name == "rtl" { is-rtl } else if name == "ltr" { not is-rtl }
  else if name in feels { feel-name == name }
  else { div-fail(token, "unknown variant " + repr(name) + "; use dark, light, rtl, ltr, " + feels.keys().join(", ")); false }
}

// The class string -> a dictionary of resolved settings. Later classes win. Needs `context`.
#let div-parse(classes, is-rtl) = {
  let s = div-spec0
  let side-keys(k) = {
    if k == "" { ("l", "r", "t", "b") } else if k == "x" { ("l", "r") } else if k == "y" { ("t", "b") }
    else if k == "s" { if is-rtl { ("r",) } else { ("l",) } }
    else if k == "e" { if is-rtl { ("l",) } else { ("r",) } }
    else { (k,) }
  }
  let corner-keys(k) = {
    let (start-top, end-top, end-bottom, start-bottom) = if is-rtl { ("tr", "tl", "bl", "br") } else { ("tl", "tr", "br", "bl") }
    if k == "" { ("tl", "tr", "bl", "br") } else if k in ("t", "b", "l", "r") {
      ("t": ("tl", "tr"), "b": ("bl", "br"), "l": ("tl", "bl"), "r": ("tr", "br")).at(k)
    }
    else if k == "s" { (start-top, start-bottom) } else if k == "e" { (end-top, end-bottom) }
    else if k == "ss" { (start-top,) } else if k == "se" { (end-top,) }
    else if k == "ee" { (end-bottom,) } else if k == "es" { (start-bottom,) }
    else { (k,) }
  }

  for token in classes.split(regex("\s+")).filter(t => t != "") {
    let parts = token.split(":")
    if not parts.slice(0, -1).all(v => div-variant-ok(v, is-rtl, token)) { continue }
    let cls = parts.last()
    let neg = cls.starts-with("-")
    let c = if neg { cls.slice(1) } else { cls }
    let rx(p) = c.match(regex("^" + p + "$"))

    let m-pad = rx("p([xytblrse]?)-(.+)")
    let m-mar = rx("m([xytblrse]?)-(.+)")
    let m-gap = rx("(?:gap|space)-([xy]?)-?(.+)")
    let m-w = rx("(w|h|max-w|basis)-(.+)")
    let m-text = rx("text-(.+)")
    let m-bg = rx("bg-(.+)")
    let m-border = rx("border(?:-([xytblrse]))?(?:-([0-9]+|\[[^#].*\]))?")
    let m-border-color = rx("border(?:-([xytblrse]))?-(.+)")
    let m-rounded = rx("rounded(?:-(ss|se|ee|es|tl|tr|bl|br|t|b|l|r|s|e))?(?:-(none|sm|md|lg|xl|2xl|3xl|full|\[.+\]))?")
    let m-font = rx("font-(.+)")
    let m-grow = rx("(grow|shrink)(?:-([0-9.]+))?")
    let m-flex-align = rx("(justify|items|content|self)-(.+)")
    let m-order = rx("order-(.+)")

    if neg and m-mar == none and m-order == none { div-fail(cls, "a leading - is only allowed on margins and order") }

    if c == "flex" or c == "block" or c == "inline-flex" or c == "inline-block" or c == "hidden" {
      s.display = c
    } else if c == "flex-row" { s.col = false; s.reverse = false }
    else if c == "flex-row-reverse" { s.col = false; s.reverse = true }
    else if c == "flex-col" { s.col = true; s.reverse = false }
    else if c == "flex-col-reverse" { s.col = true; s.reverse = true }
    else if c == "flex-wrap" { s.wrap = true }
    else if c == "flex-wrap-reverse" { s.wrap = true; s.wrap-reverse = true }
    else if c == "flex-nowrap" { s.wrap = false }
    else if rx("flex-([0-9]+\.?[0-9]*)") != none { s.grow = float(rx("flex-([0-9]+\.?[0-9]*)").captures.first()); s.shrink = 1; s.basis = 0pt }
    else if c == "flex-auto" { s.grow = 1; s.shrink = 1; s.basis = auto }
    else if c == "flex-initial" { s.grow = 0; s.shrink = 1; s.basis = auto }
    else if c == "flex-none" { s.grow = 0; s.shrink = 0; s.basis = auto }
    else if m-grow != none {
      let n = if m-grow.captures.at(1) == none { 1 } else { float(m-grow.captures.at(1)) }
      s.insert(m-grow.captures.at(0), n)
    } else if m-flex-align != none {
      let (kind, v) = m-flex-align.captures
      if kind == "justify" {
        if v not in div-justify-values { div-fail(cls, "justify must be one of " + div-justify-values.join(", ")) }
        s.justify = v
      } else if kind == "items" {
        if v not in div-items-values { div-fail(cls, "items must be one of " + div-items-values.join(", ")) }
        s.items = v
      } else if kind == "content" {
        if v not in div-justify-values { div-fail(cls, "content must be one of " + div-justify-values.join(", ")) }
        s.content = v
      } else {
        if v not in ("auto",) + div-items-values { div-fail(cls, "self must be one of auto, " + div-items-values.join(", ")) }
        s.self-align = v
      }
    } else if m-order != none {
      let v = m-order.captures.at(0)
      let n = if v == "first" { -9999 } else if v == "last" { 9999 } else if v == "none" { 0 } else {
        if v.match(regex("^[0-9]+$")) == none { div-fail(cls, "order must be a number, first, last or none") }
        int(v)
      }
      s.order = if neg { -n } else { n }
    } else if m-gap != none {
      let (axis, v) = m-gap.captures
      let len = div-length(v, cls)
      if axis != "y" { s.gap-x = len }
      if axis != "x" { s.gap-y = len }
      if c.starts-with("space-") and s.display == "block" { s.display = "flex"; s.col = axis == "y" }
    } else if m-pad != none {
      let len = div-length(m-pad.captures.at(1), cls)
      for k in side-keys(m-pad.captures.at(0)) { s.insert("pad-" + k, len) }
    } else if m-mar != none {
      let v = m-mar.captures.at(1)
      let len = if v == "auto" { "auto" } else { let l = div-length(v, cls); if neg { -l } else { l } }
      for k in side-keys(m-mar.captures.at(0)) { s.insert("mar-" + k, len) }
    } else if m-w != none {
      let (kind, v) = m-w.captures
      let size = if kind == "max-w" { none } else { div-size(v, cls) }
      if kind == "w" { s.w = size }
      else if kind == "h" { s.h = size }
      else if kind == "basis" { s.basis = if size == "fit" { auto } else { size } }
      else {
        s.max-w = if v in div-max-widths { div-abs(div-max-widths.at(v)) } else if v == "full" { none } else { div-length(v, cls) }
      }
    } else if c == "overflow-hidden" { s.clip = true }
    else if c == "overflow-visible" { s.clip = false }
    else if c == "italic" { s.italic = true }
    else if c == "not-italic" { s.italic = false }
    else if c == "underline" { s.underline = true }
    else if c == "line-through" { s.strike = true }
    else if c == "no-underline" { s.underline = false; s.strike = false }
    else if m-font != none {
      let v = m-font.captures.at(0)
      if v == "mono" { s.mono = true } else if v == "sans" { s.mono = false }
      else if v in div-weights { s.weight = div-weights.at(v) }
      else { div-fail(cls, "font must be mono, sans or a weight: " + div-weights.keys().join(", ")) }
    } else if c.starts-with("leading-") {
      let v = c.slice(8)
      s.leading = if v in div-leadings { div-leadings.at(v) } else if v.starts-with("[") { div-length(v, cls) } else {
        div-fail(cls, "leading must be one of " + div-leadings.keys().join(", ") + " or [length]")
      }
    } else if c.starts-with("tracking-") {
      let v = c.slice(9)
      s.tracking = if v in div-trackings { div-trackings.at(v) } else if v.starts-with("[") { div-length(v, cls) } else {
        div-fail(cls, "tracking must be one of " + div-trackings.keys().join(", ") + " or [length]")
      }
    } else if m-text != none {
      let v = m-text.captures.at(0)
      if v in div-text-sizes { s.size = div-text-sizes.at(v) }
      else if v in align-names { s.text-align = align-names.at(v) }
      else if v == "justify" { s.justify-text = true }
      else if v.starts-with("[") and not v.starts-with("[#") { s.size = div-length(v, cls) }
      else { s.text-color = div-color(v, "text", cls) }
    } else if m-bg != none {
      s.fill = div-color(m-bg.captures.at(0), "fill", cls)
    } else if c in ("border-solid", "border-dashed", "border-dotted") {
      s.bstyle = c.slice(7)
    } else if c == "border-none" {
      for k in ("l", "r", "t", "b") { s.insert("bw-" + k, 0pt) }
    } else if m-border != none {
      let (side, v) = m-border.captures
      let width = if v == none { 0.6pt * zoom } else if v.starts-with("[") { div-length(v, cls) } else { int(v) * 0.6pt * zoom }
      for k in side-keys(if side == none { "" } else { side }) { s.insert("bw-" + k, width) }
    } else if m-border-color != none {
      s.bcolor = div-color(m-border-color.captures.at(1), "border", cls)
    } else if m-rounded != none {
      let (side, size) = m-rounded.captures
      let r = if size == none { div-radii.at("") * div-radius-step * zoom }
        else if size == "full" { 50% }
        else if size.starts-with("[") { div-length(size, cls) }
        else { div-radii.at(size) * div-radius-step * zoom }
      for k in corner-keys(if side == none { "" } else { side }) { s.insert("rad-" + k, r) }
    } else {
      div-fail(cls, "not supported. See the <div> section of the guide for the class list")
    }
  }
  s
}

// Settings of a class string that the container passes down to its text.
#let div-styled(spec, text-direction, inner) = {
  set text(dir: text-direction)
  set text(size: spec.size) if spec.size != none
  set text(fill: spec.text-color) if spec.text-color != none
  set text(weight: spec.weight) if spec.weight != none
  set text(style: if spec.italic { "italic" } else { "normal" }) if spec.italic != none
  set text(tracking: spec.tracking) if spec.tracking != none
  set text(font: (code-font, persian-font)) if spec.mono
  set par(leading: spec.leading) if spec.leading != none
  set par(justify: true) if spec.justify-text
  set align(spec.text-align) if spec.text-align != none
  let body = if spec.underline { underline(inner) } else if spec.strike { strike(inner) } else { inner }
  // Lines measured from the cap height to the baseline leave descenders (and Persian's dips) poking into the
  // bottom padding, so the text looks too low. Measuring a bit below the baseline instead gives them room; the
  // lines' distance stays the same because the leading shrinks by what the bottom edge grew.
  context {
    let height(top, bottom) = measure(text(top-edge: top, bottom-edge: bottom)[Hxgص]).height
    // Only part of the descender depth: the text sits centered without the card growing as much.
    let grown = (height("cap-height", "descender") - height("cap-height", "baseline")) * 45%
    set text(bottom-edge: -grown)
    set par(leading: calc.max(par.leading.to-absolute() - grown, 0pt))
    body
  }
}

#let div-stroke(spec) = {
  let paint = if spec.bcolor != none { spec.bcolor } else { theme.rule }
  let sides = ("l", "r", "t", "b").map(k => spec.at("bw-" + k))
  let one(width) = if width == 0pt { none } else { stroke(paint: paint, thickness: width, dash: spec.bstyle) }
  if sides.all(w => w == sides.first()) { one(sides.first()) }
  else { (left: one(sides.at(0)), right: one(sides.at(1)), top: one(sides.at(2)), bottom: one(sides.at(3))) }
}

#let div-radius(spec) = (
  top-left: spec.rad-tl, top-right: spec.rad-tr, bottom-left: spec.rad-bl, bottom-right: spec.rad-br,
)

// w: auto shrinks to the content (a box); anything else is a block of that width.
#let div-frame(spec, w, h, inner) = {
  let args = (
    width: w, height: h,
    inset: (left: spec.pad-l, right: spec.pad-r, top: spec.pad-t, bottom: spec.pad-b),
    fill: spec.fill, stroke: div-stroke(spec), radius: div-radius(spec), clip: spec.clip,
  )
  if w == auto { box(..args, inner) } else { block(..args, inner) }
}

// `auto` margins push the block to that side; they only act on a block narrower than its parent.
#let div-margin(spec, inner) = {
  let (l, r) = (spec.mar-l, spec.mar-r)
  let placed = if l == "auto" and r == "auto" { align(center, inner) }
    else if l == "auto" { align(right, inner) } else if r == "auto" { align(left, inner) } else { inner }
  let len(v) = if v == "auto" { 0pt } else { v }
  pad(left: len(l), right: len(r), top: len(spec.mar-t), bottom: len(spec.mar-b), placed)
}

// ---- children of a flex container ----

// A <div> is `[marker, context]`: the context is opaque to its parent, so the marker carries the raw
// attributes and body for the parent to build the child itself (it needs the child's size and flex settings).
#let div-marker(k) = {
  if type(k) != content or k.func() != [].func() or not k.has("children") or k.children.len() != 2 { return none }
  let first = k.children.first()
  if first.func() == metadata and type(first.value) == dictionary and "div-child" in first.value { first.value.div-child }
}

#let div-flat(kids) = {
  let out = ()
  for k in kids {
    if type(k) == content and div-marker(k) == none and k.func() == [].func() and k.has("children") {
      out += div-flat(k.children)
    } else { out.push(k) }
  }
  out
}

// The flex items of a container's body: nested <div>s and every other run of content between paragraph breaks.
#let div-items(body, build) = {
  let groups = ()
  let cur = ()
  for k in div-flat(if type(body) == array { body } else { (body,) }) {
    let marker = div-marker(k)
    if marker != none {
      if cur.len() > 0 { groups.push(cur); cur = () }
      groups.push(build(marker.attrs, marker.body))
    } else if k.func() == parbreak {
      if cur.len() > 0 { groups.push(cur); cur = () }
    } else { cur.push(k) }
  }
  if cur.len() > 0 { groups.push(cur) }
  let plain(group) = {
    let space = [ ].func()
    while group.len() > 0 and group.first().func() == space { group = group.slice(1) }
    while group.len() > 0 and group.last().func() == space { group = group.slice(0, -1) }
    if group.len() == 0 { return none }
    let raw = group.join()
    (
      raw: raw, make: (w, h) => box(width: w, height: h, raw), hidden: false,
      grow: 0, shrink: 1, basis: auto, self-align: "auto", order: 0,
      mar: (l: 0pt, r: 0pt, t: 0pt, b: 0pt), w: none, h: none,
    )
  }
  groups.map(g => if type(g) == dictionary { g } else { plain(g) }).filter(g => g != none and not g.hidden)
}

// (lead, between): how the free space is spread by justify-* / content-*.
#let div-distribute(mode, free, n) = {
  if n == 0 or free <= 0pt { (0pt, 0pt) }
  else if mode == "center" { (free / 2, 0pt) } else if mode == "end" { (free, 0pt) }
  else if mode == "between" { (0pt, if n > 1 { free / (n - 1) } else { 0pt }) }
  else if mode == "around" { (free / (2 * n), free / n) }
  else if mode == "evenly" { (free / (n + 1), free / (n + 1)) }
  else { (0pt, 0pt) }
}

#let div-cross(mode) = if mode == "end" { bottom } else if mode == "center" { horizon } else { top }
#let div-cross-x(mode) = if mode == "end" { end } else if mode == "center" { center } else { start }

// Resolves a width / basis against the container; none when it depends on the content.
#let div-resolve(x, total, unbounded) = {
  if x == none or x == auto or x == "fit" { none }
  else if type(x) == ratio { if unbounded { none } else { x * total } }
  else { x }
}

#let div-flex(spec, items, fixed-h) = layout(size => {
  let W = size.width
  let unbounded = W.pt() > 1e5
  let H = size.height
  let (gx, gy) = (spec.gap-x, spec.gap-y)
  let sorted = items.enumerate().sorted(key: p => (p.at(1).order, p.at(0))).map(p => p.at(1))
  let side(it, key) = { let v = it.mar.at(key); if v == "auto" { 0pt } else { v } }
  let measured(it, w) = measure((it.make)(w, auto))
  let item-align(it) = if it.self-align == "auto" { spec.items } else { it.self-align }

  if not spec.col {
    // ---- row: widths along the line ----
    let prepared = sorted.map(it => {
      let nat = measured(it, auto).width
      let base = div-resolve(it.basis, W, unbounded)
      if base == none { base = div-resolve(it.w, W, unbounded) }
      if base == none { base = nat }
      (item: it, base: base)
    })
    let lines = ()
    if spec.wrap and not unbounded {
      let cur = ()
      let used = 0pt
      for p in prepared {
        let outer = p.base + side(p.item, "l") + side(p.item, "r")
        if cur.len() > 0 and used + gx + outer > W { lines.push(cur); cur = (); used = 0pt }
        used += if cur.len() > 0 { gx } else { 0pt }
        used += outer
        cur.push(p)
      }
      if cur.len() > 0 { lines.push(cur) }
    } else { lines = (prepared,) }
    if spec.wrap-reverse { lines = lines.rev() }

    let flipped = (text.dir == rtl) != spec.reverse
    let sdir = if flipped { rtl } else { ltr }
    let lead-side = if flipped { right } else { left }

    let built = lines.map(line => {
      let n = line.len()
      let widths = line.map(p => p.base)
      let total = line.map(p => p.base + side(p.item, "l") + side(p.item, "r")).sum(default: 0pt) + gx * (n - 1)
      let free = if unbounded { 0pt } else { W - total }
      if free > 0pt {
        let g = line.map(p => p.item.grow).sum()
        if g > 0 {
          widths = line.zip(widths).map(((p, w)) => w + free * (p.item.grow / g))
          free = 0pt
        }
      } else if free < 0pt {
        let scaled = line.map(p => p.item.shrink * p.base)
        let sum = scaled.sum(default: 0pt)
        if sum > 0pt {
          widths = line.zip(widths).zip(scaled).map((((p, w), sc)) => calc.max(0pt, w + free * (sc / sum)))
        }
        free = 0pt
      }
      let autos = line.map(p => (if p.item.mar.l == "auto" { 1 } else { 0 }) + (if p.item.mar.r == "auto" { 1 } else { 0 })).sum()
      let auto-w = if autos > 0 and free > 0pt { free / autos } else { 0pt }
      if autos > 0 and free > 0pt { free = 0pt }
      let (lead, between) = div-distribute(spec.justify, free, n)

      let heights = line.zip(widths).map(((p, w)) => measured(p.item, w).height + side(p.item, "t") + side(p.item, "b"))
      let line-h = if fixed-h and lines.len() == 1 { H } else { heights.fold(0pt, (a, b) => calc.max(a, b)) }
      let cells = line.zip(widths).map(((p, w)) => {
        let it = p.item
        let a = item-align(it)
        let cell-h = line-h - side(it, "t") - side(it, "b")
        let body = if a == "stretch" and it.h == none { (it.make)(w, cell-h) } else { (it.make)(w, auto) }
        let pl = if it.mar.l == "auto" { auto-w } else { it.mar.l }
        let pr = if it.mar.r == "auto" { auto-w } else { it.mar.r }
        box(height: line-h, align(div-cross(a), pad(left: pl, right: pr, top: side(it, "t"), bottom: side(it, "b"), body)))
      })
      let children = (lead,)
      for (i, cell) in cells.enumerate() {
        if i > 0 { children.push(gx + between) }
        children.push(cell)
      }
      (h: line-h, body: box(width: if unbounded { auto } else { W }, height: line-h, align(lead-side + top, stack(dir: sdir, ..children))))
    })
    let used-h = built.map(b => b.h).sum(default: 0pt) + gy * (built.len() - 1)
    let (vlead, vbetween) = div-distribute(spec.content, if fixed-h and lines.len() > 1 { H - used-h } else { 0pt }, built.len())
    let rows = (vlead,)
    for (i, b) in built.enumerate() {
      if i > 0 { rows.push(gy + vbetween) }
      rows.push(b.body)
    }
    stack(dir: ttb, ..rows)
  } else {
    // ---- column: heights down the container (a fixed height, or a shrink-to-fit measurement) ----
    let cross-w = if unbounded { sorted.map(it => measured(it, auto).width).fold(0pt, (a, b) => calc.max(a, b)) } else { W }
    let prepared = sorted.map(it => {
      let a = item-align(it)
      let own = div-resolve(it.w, cross-w, unbounded)
      let cw = if own != none { own } else if a == "stretch" { cross-w - side(it, "l") - side(it, "r") } else { measured(it, auto).width }
      let base = div-resolve(it.basis, H, not fixed-h)
      if base == none { base = measured(it, cw).height }
      (item: it, base: base, w: cw, a: a)
    })
    let n = prepared.len()
    let heights = prepared.map(p => p.base)
    let total = prepared.map(p => p.base + side(p.item, "t") + side(p.item, "b")).sum(default: 0pt) + gy * (n - 1)
    let free = if fixed-h { H - total } else { 0pt }
    if free > 0pt {
      let g = prepared.map(p => p.item.grow).sum()
      if g > 0 {
        heights = prepared.zip(heights).map(((p, h)) => h + free * (p.item.grow / g))
        free = 0pt
      }
    } else if free < 0pt {
      let scaled = prepared.map(p => p.item.shrink * p.base)
      let sum = scaled.sum(default: 0pt)
      if sum > 0pt {
        heights = prepared.zip(heights).zip(scaled).map((((p, h), sc)) => calc.max(0pt, h + free * (sc / sum)))
      }
      free = 0pt
    }
    let (lead, between) = div-distribute(spec.justify, free, n)
    let flipped = spec.reverse
    let cells = prepared.zip(heights).map(((p, h)) => {
      let it = p.item
      let body = (it.make)(p.w, h)
      let pl = if it.mar.l == "auto" { 0pt } else { it.mar.l }
      let pr = if it.mar.r == "auto" { 0pt } else { it.mar.r }
      box(width: cross-w, align(div-cross-x(p.a) + top, pad(left: pl, right: pr, top: side(it, "t"), bottom: side(it, "b"), body)))
    })
    let children = (lead,)
    for (i, cell) in cells.enumerate() {
      if i > 0 { children.push(gy + between) }
      children.push(cell)
    }
    box(width: cross-w, height: if fixed-h { H } else { auto }, align(if flipped { bottom } else { top }, stack(dir: if flipped { btt } else { ttb }, ..children)))
  }
})

// A column with no fixed height is ordinary flow, so it still breaks across pages.
#let div-column-flow(spec, items) = {
  let sorted = items.enumerate().sorted(key: p => (p.at(1).order, p.at(0))).map(p => p.at(1))
  if spec.reverse { sorted = sorted.rev() }
  for (i, it) in sorted.enumerate() {
    let a = if it.self-align == "auto" { spec.items } else { it.self-align }
    if i > 0 and spec.gap-y != 0pt { v(spec.gap-y) }
    let cell = if a == "stretch" {
      if it.raw != none { it.raw } else { (it.make)(100%, auto) }
    } else { align(div-cross-x(a), (it.make)(auto, auto)) }
    let len(v) = if v == "auto" { 0pt } else { v }
    block(spacing: 0pt, width: 100%, pad(left: len(it.mar.l), right: len(it.mar.r), top: len(it.mar.t), bottom: len(it.mar.b), cell))
  }
}

// Everything a <div> needs, resolved; the dictionary doubles as the flex item the parent lays out.
// Needs `context`.
#let div-build(attrs, body) = {
  let text-direction = resolve-dir(attrs.at("dir", default: "auto"), body)
  let spec = div-parse(attrs.at("tailwind", default: ""), text-direction == rtl)
  let flexy = spec.display in ("flex", "inline-flex")
  let items = if flexy { div-items(body, div-build) }
  let own-h = if spec.h == none or spec.h == "fit" { auto } else { spec.h }
  let make(w, h) = {
    let hh = if h == auto { own-h } else { h }
    let inner = if flexy and spec.col and hh == auto and w != auto { div-column-flow(spec, items) }
      else if flexy { div-flex(spec, items, hh != auto) } else { body }
    div-frame(spec, w, hh, div-styled(spec, text-direction, inner))
  }
  let w0 = if spec.w == none or spec.w == auto { if spec.display.starts-with("inline") { auto } else { 100% } }
    else if spec.w == "fit" { auto } else { spec.w }
  let core = if spec.max-w != none and w0 == 100% {
    layout(size => make(calc.min(size.width, spec.max-w), auto))
  } else { make(w0, auto) }
  (
    spec: spec, standalone: div-margin(spec, core), hidden: spec.display == "hidden", raw: none, make: make,
    grow: spec.grow, shrink: spec.shrink, basis: spec.basis, self-align: spec.self-align, order: spec.order,
    mar: (l: spec.mar-l, r: spec.mar-r, t: spec.mar-t, b: spec.mar-b), w: spec.w, h: spec.h,
  )
}

#let div-tags = (
    div: (attrs, body) => [#metadata((div-child: (attrs: attrs, body: body)))#context {
      let built = div-build(attrs, body)
      if built.hidden { none } else { built.standalone }
    }],
)

#let div-schema = (
  "div": (
    kind: "block",
    description: (en: "container styled with Tailwind-like classes", fa: "ظرف با کلاس‌هایی شبیه Tailwind"),
    attrs: (
      "tailwind": (type: "string", doc: (en: "Space-separated utility classes: padding `p-4 px-2`, margin `mt-2 mx-auto`, colors `bg-blue text-red-600 border-teal`, size `text-lg font-bold`, `rounded-lg`, `border`, `w-1/2`, and flex: `flex flex-col flex-wrap justify-between items-center gap-4 flex-1`. Spacing is 0.25em per step.", fa: "کلاس‌های جداشده با فاصله: پدینگ `p-4 px-2`، مارجین `mt-2 mx-auto`، رنگ `bg-blue text-red-600 border-teal`، اندازه `text-lg font-bold`، `rounded-lg`، `border`، `w-1/2` و flex: `flex flex-col flex-wrap justify-between items-center gap-4 flex-1`. فاصله‌ها ۰٫۲۵em در هر گام.")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Direction of the content; flex rows start from its start side", fa: "جهت محتوا؛ ردیف‌های flex از سمت شروع آن آغاز می‌شوند")),
    ),
  ),
)
