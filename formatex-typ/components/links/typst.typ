#import "/src/kit.typ": *
#import "/components/div/typst.typ": div-parse, div-radius, div-stroke
#import "/src/lib/tailwind.typ": tailwind-check, tailwind-groups-of

// The highlighter color: a preset's hue (or a hex) at marker strength, stronger than the pale tint of <alert>.
// `true` means the default, yellow.
#let highlight-fill(name, attrs: none) = {
  let name = if name == "true" { "yellow" } else { name }
  let hue = if name in color-presets { color-presets.at(name) } else {
    assert(name.starts-with("#"), message: at-of(attrs) + "Unknown highlight color " + repr(name) + "; use true, a hex color or one of: " + color-names.join(", ") + " (optionally with a shade, like blue-200)")
    rgb(name)
  }
  if theme.dark { color.mix((hue, 38%), (theme.bg, 62%)) } else { color.mix((hue, 42%), (theme.bg, 58%)) }
}

// Shared by <span> and <anchor>: an optional reference target (`id`) and an optional highlighter band (`highlight`).
// The band follows line breaks; a reference to the span prints the text without it.
#let span-text(attrs, body) = {
  let id = attrs.at("id", default: none)
  let marked = attrs.at("highlight", default: none)
  let shown = if marked == none or marked == "false" { body } else {
    highlight(fill: highlight-fill(marked, attrs: attrs), extent: 1.5pt * zoom, radius: 0pt, top-edge: 0.8em, bottom-edge: -0.28em, body)
  }
  // `tailwind="border border-red-500 rounded px-1 text-lg text-red-700"`: the classes of <div> (same parser) on a piece of text. Borders,
  // rounding, a background and sideways padding make a box that stays on one line; the text classes (size, color, weight, italic,
  // underline, tracking, mono) go to the text itself.
  if "tailwind" in attrs {
    // Only the groups a span takes: a layout class on text is a mistake worth saying
    tailwind-check("span", attrs.tailwind, at: attrs.at("_at", default: none))
    let inner = shown
    shown = context {
      let spec = div-parse(attrs.tailwind, text.dir == rtl, at: attrs.at("_at", default: none))
      let styled = {
        set text(size: spec.size) if spec.size != none
        set text(fill: spec.text-color) if spec.text-color != none
        set text(weight: spec.weight) if spec.weight != none
        set text(style: if spec.italic { "italic" } else { "normal" }) if spec.italic != none
        set text(tracking: spec.tracking) if spec.tracking != none
        set text(font: (code-font, code-persian-font, persian-font)) if spec.mono
        if spec.underline { underline(inner) } else if spec.strike { strike(inner) } else { inner }
      }
      let boxed = spec.fill != none or div-stroke(spec) != none or spec.pad-l != 0pt or spec.pad-r != 0pt or spec.pad-t != 0pt or spec.pad-b != 0pt
      if boxed {
        // Vertical padding grows the box past the line without pushing the lines apart
        box(fill: spec.fill, stroke: div-stroke(spec), radius: div-radius(spec), inset: (left: spec.pad-l, right: spec.pad-r), outset: (top: spec.pad-t, bottom: spec.pad-b), styled)
      } else { styled }
    }
  }
  if id != none {
    let has-text = plain-text(body).trim() != ""
    let val = (span-text: if has-text { body } else { none }, text-target: true)
    [#metadata(val)#label(id)#shown]
  } else {
    shown
  }
}

#let links-tags = (
    // A real <include> line is replaced before rendering (src/core.typ); one that reaches
    // the parser was written inside a paragraph or list, where it cannot be expanded.
    // <a href="https://...">text</a> for web links; <a href="#id">text</a> for a place in the document.
    // <a id="id">text</a> acts as an anchor target for references and definitions.
    a: (attrs, body) => {
      let href = attrs.at("href", default: "")
      let id = attrs.at("id", default: none)
      if href == "" and id != none {
        let has-text = plain-text(body).trim() != ""
        let val = (span-text: if has-text { body } else { none }, text-target: true)
        return [#metadata(val)#label(id)#body]
      }
      assert(href != "", message: at-of(attrs) + "<a> needs href=\"https://...\" or href=\"#id\"")
      let shown = if plain-text(body).trim() == "" { href } else { body }
      if not href.starts-with("#") { return link(href, shown) }
      // Headings also carry the automatically generated slug label, so an id can match more than one element.
      context {
        let found = query(label(href.slice(1)))
        assert(found.len() > 0, message: at-of(attrs) + "<a>: no element with id " + repr(href.slice(1)))
        link(found.first().location(), reference-style(shown))
      }
    },
    // <span id="term">text</span> marks a piece of text inside a paragraph as a reference target;
    // <span highlight="yellow">text</span> puts a highlighter band behind it (with or without an id).
    span: (attrs, body) => span-text(attrs, body),
    // <anchor id="term">text</anchor> semantic alias for <span id="term">.
    anchor: (attrs, body) => span-text(attrs, body),
)

// The HTML form (optional, used by the HTML export): a real link, an anchor, a `<mark>` and a styled `<span>`
#let links-rules(doc) = {
  // External links ([text](url), <url>, <a href>): reference look with a link icon at the start.
  // The rebuilt link carries <styled-link> so this rule doesn't apply to it again.
  show link: it => {
    if type(it.dest) != str or it.at("label", default: none) == <styled-link> { return it }
    let icon = box(text(size: 0.9em, fill: theme.accent, fa-icon("link")))
    [#link(it.dest, [#icon#h(3pt * zoom)#reference-style(it.body)])<styled-link>]
  }
  doc
}

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
