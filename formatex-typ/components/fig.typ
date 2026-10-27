#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *

#let find-image(it) = {
  if type(it) == array {
    for c in it {
      let found = find-image(c)
      if found != none { return found }
    }
    return none
  }
  if type(it) != content { return none }
  if it.func() == image { return (img: it, radius: 0pt) }
  if it.func() == box and it.has("body") and type(it.body) == content and it.body.func() == image {
    return (img: it.body, radius: it.at("radius", default: 0pt))
  }
  if it.has("children") { return find-image(it.children) }
  if it.has("body") { return find-image(it.body) }
  if it.has("child") { return find-image(it.child) }
  none
}

// Like untag, but searches nested content and only returns the tags' attrs.
#let find-tagged(it, kind) = {
  if type(it) == array { return it.map(c => find-tagged(c, kind)).flatten() }
  if type(it) != content { return () }
  if it.func() == metadata and type(it.value) == dictionary and it.value.at("component-tag", default: none) == kind {
    return ((attrs: it.value.attrs),)
  }
  if it.has("children") { return find-tagged(it.children, kind) }
  if it.has("body") { return find-tagged(it.body, kind) }
  if it.has("child") { return find-tagged(it.child, kind) }
  ()
}

// mmdr writes a wrapped label as one <text> with a <tspan dy> per line; the SVG renderer
// lays such multi-line RTL text on top of itself. Each line becomes its own <text>, with
// the template's Persian or Latin font, and Persian lines are wrapped in RLMs so their
// punctuation stays at the right end.
#let mermaid-lines(svg) = svg.replace(
  regex("<text ([^>]*)>((?:<tspan [^>]*>[^<]*</tspan>)+|[^<]*)</text>"),
  m => {
    let (attrs, inner) = m.captures
    let num(s, key) = {
      let f = s.match(regex("(?:^|\s)" + key + "=\"([-0-9.]+)\""))
      if f != none { float(f.captures.first()) }
    }
    let first-font(f) = if type(f) == array { f.first() } else { f }
    let x0 = num(attrs, "x")
    let y = num(attrs, "y")
    if x0 == none or y == none { return m.text }
    let rest = attrs.replace(regex("(?:^|\s)(?:x|y|font-family)=\"[^\"]*\""), "")
    let lines = inner.matches(regex("<tspan ([^>]*)>([^<]*)</tspan>")).map(t => t.captures)
    if lines.len() == 0 { lines = (("", inner),) }
    let out = ""
    for (tspan-attrs, body) in lines {
      let dy = num(tspan-attrs, "dy")
      if dy != none { y += dy }
      let x = num(tspan-attrs, "x")
      let persian = body.match(regex("\p{Arabic}")) != none
      let font = first-font(if persian { persian-font } else { latin-font })
      let extra = tspan-attrs.replace(regex("(?:^|\s)(?:x|y|dx|dy)=\"[^\"]*\""), "")
      let body = if persian { "\u{200F}" + body + "\u{200F}" } else { body }
      out += "<text x=\"" + str(if x != none { x } else { x0 }) + "\" y=\"" + str(y) + "\" font-family=\"" + font + "\" " + rest + " " + extra + ">" + body + "</text>"
    }
    out
  },
)

// Corners follow the feel: nodes, subgraphs and actors like <box>, edge labels like badges.
// Round `(...)` and stadium `([...])` nodes are rounded on purpose and keep their shape.
#let mermaid-corners(svg) = svg.replace(regex("<rect [^>]*rx=\"([0-9.]+)\"[^>]*>"), m => {
  let rx = float(m.captures.first())
  let cluster = rx == 10 and not m.text.contains("stroke-linejoin")
  let r = if m.text.contains("data-label-kind") { feel.badge } else if rx in (3.0, 6.0) or cluster { feel.box }
  if r == none { m.text } else {
    m.text.replace(regex("(\s)(rx|ry)=\"[0-9.]+\""), k => k.captures.at(0) + k.captures.at(1) + "=\"" + str(r.pt()) + "\"")
  }
})

// ```mermaid code -> SVG image (mmdr) in the theme's colors. width/height size it like an
// image (text included); with both, it fits inside the box they form.
#let mermaid-diagram(code, width: auto, height: auto) = {
  let hex(c) = c.to-hex()
  let tint(c, p) = hex(color.mix((c, p), (theme.bg, 100% - p)))
  let soft = if theme.at("dark", default: false) { 18% } else { 10% }
  let node = tint(theme.accent, soft)
  let border = tint(theme.accent, 70%)
  let note = tint(theme.secondary, soft)
  let svg = mermaid-svg(code, theme: (
    font_family: if type(persian-font) == array { persian-font.first() } else { persian-font },
    font_size: 12 * zoom,
    background: hex(theme.bg),
    text_color: hex(theme.fg),
    primary_color: node,
    primary_text_color: hex(theme.fg),
    primary_border_color: border,
    line_color: hex(theme.muted),
    secondary_color: note,
    tertiary_color: hex(theme.code-bg),
    edge_label_background: hex(theme.bg),
    cluster_background: hex(theme.code-bg),
    cluster_border: hex(theme.rule),
    sequence_actor_fill: node,
    sequence_actor_border: border,
    sequence_actor_line: hex(theme.muted),
    sequence_note_fill: note,
    sequence_note_border: tint(theme.secondary, 60%),
    sequence_activation_fill: hex(theme.code-bg),
    sequence_activation_border: hex(theme.rule),
    // mmdr wants exactly 12.
    pie_colors: (60%, 55%, 45%, 40%, 32%, 28%, 22%, 18%, 14%, 11%, 8%, 6%).enumerate().map(((i, p)) => tint(if calc.even(i) { theme.accent } else { theme.secondary }, p)),
    pie_title_text_size: 15 * zoom,
    pie_section_text_size: 12 * zoom,
    pie_legend_text_size: 12 * zoom,
    pie_title_text_color: hex(theme.fg),
    pie_section_text_color: hex(theme.fg),
    pie_legend_text_color: hex(theme.fg),
    pie_stroke_color: hex(theme.bg),
    pie_outer_stroke_color: hex(theme.rule),
  ))
  image(bytes(mermaid-corners(mermaid-lines(svg))), format: "svg", width: width, height: height, fit: "contain")
}

// Never wider than the line.
#let fit-width(it) = layout(region => {
  let size = measure(it)
  if size.width > region.width { scale(region.width / size.width * 100%, reflow: true, it) } else { it }
})

// "16/9", "16:9" or "1.5"
#let parse-ratio(s) = {
  if s == none { return none }
  let parts = s.split(regex("[/:]"))
  if parts.len() == 2 { float(parts.at(0).trim()) / float(parts.at(1).trim()) } else { float(s.trim()) }
}

// cmarker passes the whole fence line as lang: "mermaid width=80% height=5cm" -> (width: 80%, height: 5cm).
// none: not a mermaid block.
#let mermaid-options(r) = {
  if r == none or type(r.lang) != str or r.lang.match(regex("^mermaid(\s|$)")) == none { return none }
  let token = regex("([a-z-]+)=(?:\"([^\"]*)\"|(\S+))")
  let rest = r.lang.slice("mermaid".len())
  // `md-at` is where the fence line is (src/preprocess/mark-lines.typ): not an option, but every problem here says it
  let at-found = rest.match(regex("md-at=\"([^\"]*)\""))
  let at = if at-found == none { none } else { at-found.captures.first() }
  let rest = rest.replace(regex("\\s*md-at=\"[^\"]*\""), "")
  assert(rest.replace(token, "").trim() == "", message: at-prefix(at) + "```mermaid only takes key=value options, got " + repr(rest.trim()))
  let opts = (:)
  for t in rest.matches(token) {
    let (key, quoted, bare) = t.captures
    assert(key in ("width", "height"), message: at-prefix(at) + "```mermaid options are width and height, got " + repr(key))
    opts.insert(key, parse-length(if quoted != none { quoted } else { bare }, attrs: (_at: at)))
  }
  opts
}

// Without a size the diagram keeps its natural size, shrunk to the line if wider.
#let mermaid-block(r, ..sizes) = {
  let opts = mermaid-options(r) + sizes.named()
  if opts.len() > 0 { mermaid-diagram(r.text, ..opts) } else { fit-width(mermaid-diagram(r.text)) }
}

#let fig-tags = (
    caption: (attrs, body) => tag("caption", attrs, body),
    fig: (attrs, body) => {
      let (tagged: captions, rest) = untag(body, "caption")
      let drawings = find-tagged(rest, "drawing")
      let mermaid = if drawings.len() == 0 {
        let r = find-raw(rest)
        if mermaid-options(r) != none { r }
      }
      let found = find-image(rest)
      assert(found != none or drawings.len() > 0 or mermaid != none, message: at-of(attrs) + "<fig> needs an <img>, <cetz>, <lilaq> or ```mermaid block inside it")

      let h = parse-length(attrs.at("height", default: none), attrs: attrs)
      let w = parse-length(attrs.at("width", default: none), attrs: attrs)
      let aspect = parse-ratio(attrs.at("ratio", default: none))
      let a = attrs.at("align", default: none)
      assert(a == none or a in align-names, message: at-of(attrs) + "<fig> align must be one of " + align-names.keys().join(", "))
      let caption = if captions.len() > 0 { captions.at(0).body } else { none }

      let (img, radius) = if drawings.len() > 0 or mermaid != none { (none, 0pt) } else { found }
      let alt = if img != none { img.at("alt", default: none) }
      let rounded(it) = box(clip: true, radius: radius, it)
      let picture = if mermaid != none {
        // Sized like an image; the <fig>'s width/height win over the fence's.
        let sizes = (width: w, height: h).pairs().filter(((k, v)) => v != none).to-dict()
        mermaid-block(mermaid, ..sizes)
      } else if drawings.len() > 0 {
        // A drawing has no pixels to crop: height/width scale it, ratio is ignored.
        // With both, it fits inside the box they form.
        let canvas = drawings.first().attrs.canvas
        layout(region => {
          let size = measure(canvas)
          let target-w = if type(w) == ratio { w * region.width } else if w != none { w.to-absolute() }
          let factors = (region.width / size.width,)
          if h != none { factors.push(h.to-absolute() / size.height) }
          if target-w != none { factors.push(target-w / size.width) }
          // Only ever shrink: enlarging would blow up the labels' text size too.
          let factor = calc.min(1, ..factors)
          scale(factor * 100%, reflow: true, canvas)
        })
      } else if aspect != none and h != none {
        image(root-path(img.source), alt: alt, height: h, width: h * aspect, fit: "cover")
      } else if aspect != none {
        layout(size => {
          let full = if w == none { size.width } else if type(w) == ratio { w * size.width } else { w.to-absolute() }
          image(root-path(img.source), alt: alt, width: full, height: full / aspect, fit: "cover")
        })
      } else {
        image(
          root-path(img.source),
          alt: alt,
          width: if w != none { w } else { img.at("width", default: auto) },
          height: if h != none { h } else { img.at("height", default: auto) },
        )
      }

      span-columns(attrs, "fig", context {
        let d = if caption == none { last-dir.get() } else { resolve-dir("auto", caption) }
        set text(dir: d)
        let fig = figure(
          rounded(picture),
          kind: image,
          caption: caption,
          supplement: if d == rtl [شکل] else [Figure],
          numbering: n => numbering(if d == rtl { "۱" } else { "1" }, n),
        )
        let id = attrs.at("id", default: none)
        let a = if a != none { a } else { inherited-align("center") }
        align(align-names.at(a), block(width: auto, if id != none [#fig#label(id)] else { fig }))
      })
    },
)

#let fig-schema = (
  "fig": (
    kind: "block",
    description: (en: "numbered figure", fa: "شکل شماره‌دار"),
    attrs: (
      "id": (type: "string", doc: (en: "Target for `<ref>`.", fa: "هدف `<ref>`.")),
      "align": (type: "enum", values: ("center", "left", "right", "start", "end"), default: "center", doc: (en: "`center` (default, or the enclosing `<align>`), `left`, `right`, `start`, `end`.", fa: "`center` (پیش‌فرض، یا `<align>` دربرگیرنده)، `left`، `right`، `start`، `end`.")),
      "height": (type: "length", doc: (en: "Size of the image or drawing.", fa: "اندازهٔ تصویر یا رسم.")),
      "width": (type: "length", doc: (en: "Size of the image or drawing. A `%` width is relative to the text width.", fa: "اندازهٔ تصویر یا رسم. پهنای `%` نسبت به پهنای متن است.")),
      "ratio": (type: "string", doc: (en: "`16/9`, `16:9` or `1.5`. Crops the image to that ratio. With `height`, the width becomes height × ratio; otherwise `width` (or the full width) is used. Images only.", fa: "`16/9`، `16:9` یا `1.5`. تصویر را به آن نسبت برش می‌دهد. با `height`، پهنا برابر ارتفاع × نسبت می‌شود؛ وگرنه `width` (یا تمام پهنا) استفاده می‌شود. فقط برای تصویر.")),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: (en: "`column` (default) or `all`. In a multi-column document, `all` puts the figure across all columns, at the top or bottom of a page (like wide tables); a `%` width is then relative to the full text width. No effect with one column.", fa: "`column` (پیش‌فرض) یا `all`. در سند چندستونه، `all` شکل را مثل جدول‌های پهن روی همهٔ ستون‌ها، در بالا یا پایین صفحه، می‌گذارد؛ آن‌وقت پهنای `%` نسبت به کل پهنای متن است. در سند تک‌ستونه اثری ندارد.")),
    ),
    children: ("caption", "img", "cetz", "lilaq"),
  ),
  "caption": (
    kind: "block",
    description: (en: "Numbered caption of the enclosing <fig>", fa: "عنوان شمارهٔ‌دار <fig> بیرونی"),
    attrs: (:),
  ),
)




// rules-order: 40
#let fig-rules(doc) = {
  show raw.where(block: true): it => {
    if mermaid-options(it) == none { return it }
    context align(align-names.at(inherited-align("center")), mermaid-block(it))
  }
  doc
}
