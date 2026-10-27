#import "/src/kit.typ": *

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
  let id = attrs.at("id", default: attrs.at("name", default: none))
  let marked = attrs.at("highlight", default: none)
  let shown = if marked == none or marked == "false" { body } else {
    highlight(fill: highlight-fill(marked, attrs: attrs), extent: 1.5pt * zoom, radius: 0pt, body)
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
    // cmarker was written inside a paragraph or list, where it cannot be expanded.
    // <a href="https://...">text</a> for web links; <a href="#id">text</a> for a place in the document.
    // <a id="id">text</a> acts as an anchor target for references and definitions.
    a: (attrs, body) => {
      let href = attrs.at("href", default: "")
      let id = attrs.at("id", default: attrs.at("name", default: none))
      if href == "" and id != none {
        let has-text = plain-text(body).trim() != ""
        let val = (span-text: if has-text { body } else { none }, text-target: true)
        return [#metadata(val)#label(id)#body]
      }
      assert(href != "", message: at-of(attrs) + "<a> needs href=\"https://...\" or href=\"#id\"")
      let shown = if plain-text(body).trim() == "" { href } else { body }
      if not href.starts-with("#") { return link(href, shown) }
      // Headings also carry cmarker's own slug label, so an id can match more than one element.
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

#let links-schema = (
  "a": (
    kind: "inline",
    // Checked where the tag is read from the text, so the problem has its line (src/preprocess/check.typ)
    needs: (keys: ("href", "id", "name"), message: "<a> needs href=\"https://...\" or href=\"#id\""),
    description: (en: "Link to a URL (href=\"https://...\") or a place in the document (href=\"#id\"); with id/name it is an anchor", fa: "پیوند به نشانی وب (href=\"https://...\") یا جایی از سند (href=\"#id\")؛ با id/name یک لنگر است"),
    attrs: (
      "href": (type: "string", doc: (en: "`https://...` for a web link or `#id` for a place in the document", fa: "`https://...` برای پیوند وب یا `#id` برای جایی از سند")),
      "id": (type: "string", doc: (en: "Makes the tag an anchor with this id", fa: "تگ را به یک لنگر با این id تبدیل می‌کند")),
      "name": (type: "string", doc: (en: "Same as `id`", fa: "مثل `id`")),
    ),
  ),
  "span": (
    kind: "inline",
    description: (en: "Marks a piece of text as a reference target and/or highlights it", fa: "علامت‌گذاری یک تکه متن به‌عنوان هدف ارجاع و/یا هایلایت آن"),
    attrs: (
      "id": (type: "string", doc: (en: "Reference target id", fa: "شناسهٔ هدف ارجاع")),
      "name": (type: "string", doc: (en: "Same as `id`", fa: "مثل `id`")),
      "highlight": (type: "color", doc: (en: "Highlighter band behind the text: `true` (yellow), a color preset, Tailwind name or hex. Works with or without an `id`.", fa: "نوار هایلایت پشت متن: `true` (زرد)، رنگ آماده، نام Tailwind یا hex. با `id` یا بدون آن کار می‌کند.")),
    ),
  ),
  "anchor": (
    kind: "inline",
    description: (en: "Alias of <span>", fa: "نام دیگر <span>"),
    attrs: (
      "id": (type: "string", doc: (en: "Reference target id", fa: "شناسهٔ هدف ارجاع")),
      "name": (type: "string", doc: (en: "Same as `id`", fa: "مثل `id`")),
      "highlight": (type: "color", doc: (en: "Highlighter band behind the text: `true` (yellow), a color preset, Tailwind name or hex. Works with or without an `id`.", fa: "نوار هایلایت پشت متن: `true` (زرد)، رنگ آماده، نام Tailwind یا hex. با `id` یا بدون آن کار می‌کند.")),
    ),
  ),
)




// rules-order: 20
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
