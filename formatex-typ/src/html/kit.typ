// What a component needs to give its tags an HTML form (the HTML output, see src/html/ and "Extending the template" in the guide).
// `#import "/src/kit.typ": *` brings these in. Every one of them is a function, so nothing here runs for the PDF: `html` only exists when
// the HTML export is on, and a component's `<name>-html` is called only then.
#import "/src/prelude.typ": *

/// A color as CSS (`#rrggbb`)
#let css-color(c) = rgb(c).to-hex()
/// A length in pixels (`8pt` is 8px)
#let css-px(len) = str(calc.round(len / 1pt, digits: 2)) + "px"
/// A length as CSS: points as px, `1.2em` stays em
#let css-len(len) = if len == 0pt { "0" } else if len.em == 0 { css-px(len) } else if len.abs == 0pt { str(calc.round(len.em, digits: 3)) + "em" } else { "calc(" + css-px(len.abs) + " + " + str(len.em) + "em)" }
/// The parts of a `style="..."` attribute, left to right; a part that is `none` is left out
#let style-of(parts) = parts.filter(p => p != none).join("; ")
/// The CSS variables of a tinted panel (`resolve-color` / `tinted` of src/lib/colors.typ): `.fx-panel` and `.fx-badge` read them
#let panel-style(colors) = if "hue" in colors { "--hue: " + css-color(colors.hue) } else if "hex" in colors { "--hexc: " + css-color(colors.hex) } else { "--panel-fill: " + css-color(colors.fill) + "; --panel-border: " + css-color(colors.border) }

/// The width a picture of a block is laid out in: a column of the PDF
#let frame-width = 15cm
/// `body` as it looks in the PDF, put in the page as a picture (`html.frame`): a block as wide as a column, or an inline run of text.
/// This is what a tag without an HTML form gets automatically.
#let in-frame(kind, body) = if kind == "block" {
  html.elem("div", attrs: (class: "fx-frame"), html.frame(block(width: frame-width, body)))
} else {
  html.elem("span", attrs: (class: "fx-frame-inline"), html.frame(box(body)))
}

/// A Font Awesome icon as a small inline picture: no icon font in the file
#let html-icon(name, fill: none, size: 1em) = html.elem("span", attrs: (class: "fx-icon"), html.frame(box(text(
  size: size, top-edge: "bounds", bottom-edge: "bounds", ..if fill != none { (fill: fill) }, fa-icon(name),
))))

/// The element a `<ref>` or `<a href="#id">` points at: the one with that id, or the heading of that slug. Call it inside `context`.
#let find-target(id, attrs, tag-name) = {
  // Heading labels are GitHub-style slugs, which drop ZWNJ and punctuation, so the heading text can be given as written
  let slug = lower(id.trim()).replace(regex("[^\p{L}\p{M}\p{N}_\- ]"), "").replace(" ", "-")
  let found = query(label(id))
  if found.len() == 0 { found = query(label(slug)) }
  assert(found.len() > 0, message: at-of(attrs) + "<" + tag-name + ">: no element with id " + repr(id))
  let el = found.first()
  if el.func() == metadata and type(el.value) == dictionary and "heading-id" in el.value {
    el = query(selector(heading).before(el.location())).last()
  }
  if el.func() == metadata and type(el.value) == dictionary and "equation-id" in el.value {
    el = query(selector(math.equation).before(el.location())).last()
  }
  el
}

/// A list of links with a title (a table of contents, the list of figures): `entries` are `(indent: em, target: location, text: content)`
#let html-link-list(title, entries, dir-name) = html.elem("nav", attrs: (class: "fx-toc", dir: dir-name), {
  html.elem("p", attrs: (class: "fx-toc-title"), title)
  for entry in entries { html.elem("div", attrs: (class: "fx-toc-item", style: "padding-inline-start: " + str(entry.indent) + "em"), link(entry.target, entry.text)) }
})
