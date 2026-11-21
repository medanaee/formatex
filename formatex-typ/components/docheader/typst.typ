#import "/src/kit.typ": *
#import "/src/page.typ": is-phone

// <docheader> > <main> (<l-img>, <r-img>, <title size="1|2|3">) + <info>. <main> is optional: its children
// may sit directly in <docheader>. The old title / subtitle / subtitle2 attributes still work: they are
// the first <title>s, in sizes 1, 2 and 3.
#let docheader-levels = (
  "1": (size: 2.0em, weight: "bold"),
  "2": (size: 1.4em, weight: "regular"),
  "3": (size: 1.1em, weight: "regular"),
)

// Bigger = stronger: the title takes the heading color, each smaller size is more muted.
#let docheader-level-color(level) = {
  if level == "1" { theme.heading } else if level == "2" { theme.muted }
  else { color.mix((theme.muted, 70%), (theme.bg, 30%)) }
}

#let docheader-image(attrs) = {
  let w = parse-length(attrs.at("width", default: none), attrs: attrs)
  let h = parse-length(attrs.at("height", default: none), attrs: attrs)
  box(
    clip: true,
    radius: if "radius" in attrs { parse-length(attrs.radius, attrs: attrs) } else { feel.image },
    image(root-path(attrs.src), width: if w != none { w } else { auto }, height: if h != none { h } else if w == none { 4em } else { auto }),
  )
}

// Titles in the middle, the left image at the physical left and the right one at the physical right (the
// same in Persian and English). Both sides get the wider image's width so the titles stay centered.
#let docheader-main(titles, left-img, right-img) = {
  let title-block = block(width: 100%, align(center, {
    for (i, t) in titles.enumerate() {
      let level = t.attrs.at("size", default: "1")
      let style = docheader-levels.at(level)
      let tint = if "color" in t.attrs { resolve-heading-color(t.attrs.color) } else { docheader-level-color(level) }
      block(width: 100%, above: if i == 0 { 0pt } else { 0.6em }, below: 0pt, text(size: style.size, weight: style.weight, fill: tint, t.body))
    }
  }))
  if left-img == none and right-img == none { return title-block }
  // On the phone page the images go in a row of their own above the titles.
  if is-phone {
    return layout(size => {
      let fit(img) = if img == none { none } else {
        let w = measure(img).width
        if w > size.width * 45% { scale(size.width * 45% / w * 100%, reflow: true, img) } else { img }
      }
      stack(
        dir: ttb,
        spacing: 0.8em,
        stack(dir: ltr, fit(left-img), h(1fr), fit(right-img)),
        title-block,
      )
    })
  }
  layout(size => {
    // An image wider than 30% of the line shrinks so the titles keep room (small pages).
    let fit(img) = if img == none { none } else {
      let w = measure(img).width
      if w > size.width * 30% { scale(size.width * 30% / w * 100%, reflow: true, img) } else { img }
    }
    let (left-img, right-img) = (fit(left-img), fit(right-img))
    let side = calc.max(if left-img != none { measure(left-img).width } else { 0pt }, if right-img != none { measure(right-img).width } else { 0pt })
    let gap = 1em.to-absolute()
    let mid = size.width - 2 * side - 2 * gap
    let row-h = calc.max(
      measure(block(width: mid, title-block)).height,
      if left-img != none { measure(left-img).height } else { 0pt },
      if right-img != none { measure(right-img).height } else { 0pt },
    )
    stack(
      dir: ltr,
      box(width: side, height: row-h, align(left + horizon, if left-img != none { left-img })),
      h(gap),
      box(width: mid, height: row-h, align(horizon, block(width: mid, title-block))),
      h(gap),
      box(width: side, height: row-h, align(right + horizon, if right-img != none { right-img })),
    )
  })
}

#let docheader-tags = (
    "l-img": ("void", attrs => tag("l-img", attrs, h(0pt))),
    "r-img": ("void", attrs => tag("r-img", attrs, h(0pt))),
    title: (attrs, body) => tag("title", attrs, body),
    info: (attrs, body) => tag("info", attrs, body),
    main: (attrs, body) => tag("main", attrs, body),
    docheader: (attrs, body) => {
      let mains = untag(body, "main").tagged.map(m => m.body)
      let scopes = (body,) + mains
      let collect(kind) = scopes.map(s => untag(s, kind).tagged).flatten()

      let titles = ()
      for (key, level) in (("title", "1"), ("subtitle", "2"), ("subtitle2", "3")) {
        if key in attrs { titles.push((attrs: (size: level), body: attrs.at("_rich", default: (:)).at(key, default: attrs.at(key)))) }
      }
      titles += collect("title")
      let pick(kind) = {
        let found = collect(kind)
        if found.len() > 0 { docheader-image(found.last().attrs) }
      }
      let infos = collect("info")

      // `color` only picks colors (both, unless border-color / fill-color say otherwise); `border` and `fill` turn the parts on.
      let both = attrs.at("color", default: none)
      let border-given = attrs.at("border-color", default: both)
      let fill-given = attrs.at("fill-color", default: both)
      let border-colors = if border-given != none { resolve-color(border-given, attrs: attrs) }
      let fill-colors = if fill-given != none { resolve-color(fill-given, attrs: attrs) }
      // border = the sides that get a line, as letters of "lrtb" (left, right, top, bottom).
      let sides = attrs.at("border", default: "")
      if sides == "true" { sides = "lrtb" } else if sides == "false" { sides = "" }
      assert(sides.clusters().all(c => c in ("l", "r", "t", "b")), message: at-of(attrs) + "<docheader> border must be made of the letters l, r, t, b (for example lrtb or tb), got " + repr(sides))
      let framed-border = sides != ""
      let framed-fill = attrs.at("fill", default: "false") == "true"
      let framed = framed-border or framed-fill
      let all-sides = sides.clusters().dedup().len() == 4
      let line = 0.8pt * zoom + if border-colors != none { border-colors.border } else { theme.rule }
      let side(k) = if k in sides { line }
      let pad-attr = parse-length(attrs.at("padding", default: "1em"), attrs: attrs)

      let content = {
        docheader-main(titles, pick("l-img"), pick("r-img"))
        for info in infos { block(width: 100%, above: 0.9em, below: 0pt, info.body) }
      }
      let title-block = block(
        width: 100%,
        above: 1.5em,
        below: 3em,
        fill: if framed-fill { if fill-colors != none { fill-colors.fill } else { theme.code-bg } },
        stroke: if all-sides { line } else if framed-border { (left: side("l"), right: side("r"), top: side("t"), bottom: side("b")) },
        // A corner is rounded where two drawn sides meet; the open ends of a line stay square.
        radius: {
          let r = if "radius" in attrs { parse-length(attrs.radius, attrs: attrs) } else { feel.box }
          if framed-border {
            let corner(a, b) = if a in sides and b in sides { r } else { 0pt }
            (top-left: corner("t", "l"), top-right: corner("t", "r"), bottom-left: corner("b", "l"), bottom-right: corner("b", "r"))
          } else if framed-fill { r } else { 0pt }
        },
        inset: if framed { pad-attr } else { 0pt },
        content,
      )
      // With several text columns the title spans all of them.
      if column-count > 1 { place(top, scope: "parent", float: true, clearance: 2em, title-block) } else { title-block }
    },
)
