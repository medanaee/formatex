#import "/src/kit.typ": *
#import "/components/div.typ": div-parse, div-radius, div-stroke
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
        set text(font: (code-font, persian-font)) if spec.mono
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
    // cmarker was written inside a paragraph or list, where it cannot be expanded.
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

// The HTML form (optional, used by the HTML export): a real link, an anchor, a `<mark>` and a styled `<span>`
#let html-span(attrs, body) = {
  let id = attrs.at("id", default: none)
  let marked = attrs.at("highlight", default: none)
  let shown = if marked == none or marked == "false" { body } else {
    html.elem("mark", attrs: (style: "background: " + css-color(highlight-fill(marked, attrs: attrs))), body)
  }
  if "tailwind" in attrs {
    let inner = shown
    shown = context {
      tailwind-check("span", attrs.tailwind, at: attrs.at("_at", default: none))
      let spec = div-parse(attrs.tailwind, html-lang == "fa", at: attrs.at("_at", default: none))
      let sides = ("t", "r", "b", "l").map(k => spec.at("bw-" + k))
      let border = if sides.all(w => w == 0pt) { none } else {
        let paint = if spec.bcolor != none { spec.bcolor } else { theme.rule }
        let line = if spec.bstyle in ("dashed", "dotted") { spec.bstyle } else { "solid" }
        "border-style: " + line + "; border-color: " + css-color(paint) + "; border-width: " + sides.map(css-len).join(" ")
      }
      let pads = (spec.pad-t, spec.pad-r, spec.pad-b, spec.pad-l)
      let style = style-of((
        if spec.size != none { "font-size: " + css-len(spec.size) },
        if spec.text-color != none { "color: " + css-color(spec.text-color) },
        if spec.weight != none { "font-weight: " + str(spec.weight) },
        if spec.italic != none { "font-style: " + if spec.italic { "italic" } else { "normal" } },
        if spec.tracking != none { "letter-spacing: " + css-len(spec.tracking) },
        if spec.mono { "font-family: var(--font-code)" },
        if spec.underline { "text-decoration: underline" } else if spec.strike { "text-decoration: line-through" },
        if spec.fill != none { "background: " + css-color(spec.fill) },
        border,
        if pads.any(p => p != 0pt) { "padding: " + pads.map(css-len).join(" ") },
        "border-radius: " + (spec.rad-tl, spec.rad-tr, spec.rad-br, spec.rad-bl).map(css-len).join(" "),
        "box-decoration-break: clone",
      ))
      html.elem("span", attrs: (style: style), inner)
    }
  }
  if id != none {
    let has-text = plain-text(body).trim() != ""
    [#metadata((span-text: if has-text { body } else { none }, text-target: true))#label(id)#shown]
  } else { shown }
}

#let links-html = (
    a: (attrs, body) => {
      let href = attrs.at("href", default: "")
      let id = attrs.at("id", default: none)
      if href == "" and id != none {
        let has-text = plain-text(body).trim() != ""
        return [#metadata((span-text: if has-text { body } else { none }, text-target: true))#label(id)#body]
      }
      assert(href != "", message: at-of(attrs) + "<a> needs href=\"https://...\" or href=\"#id\"")
      let shown = if plain-text(body).trim() == "" { href } else { body }
      if not href.starts-with("#") { return link(href, shown) }
      context link(find-target(href.slice(1), attrs, "a").location(), shown)
    },
    span: html-span,
    anchor: html-span,
)
#let links-css = `````css
.fx-doc mark { background: color-mix(in srgb, #facc15 40%, var(--bg)); color: inherit; padding: 0 .15em; border-radius: 2px; }
`````.text

#let links-schema = (
  "a": (
    kind: "inline",
    // Checked where the tag is read from the text, so the problem has its line (src/preprocess/check.typ)
    needs: (keys: ("href", "id"), message: "<a> needs href=\"https://...\" or href=\"#id\""),
    description: (en: "Link to a URL (href=\"https://...\") or a place in the document (href=\"#id\"); with id it is an anchor", fa: "پیوند به نشانی وب (href=\"https://...\") یا جایی از سند (href=\"#id\")؛ با id یک لنگر است"),
    attrs: (
      "href": (type: "string", doc: (en: "`https://...` for a web link or `#id` for a place in the document", fa: "`https://...` برای پیوند وب یا `#id` برای جایی از سند")),
      "id": (type: "string", doc: (en: "Makes the tag an anchor with this id", fa: "تگ را به یک لنگر با این id تبدیل می‌کند")),
    ),
  ),
  "span": (
    kind: "inline",
    description: (en: "Marks a piece of text as a reference target and/or highlights it", fa: "علامت‌گذاری یک تکه متن به‌عنوان هدف ارجاع و/یا هایلایت آن"),
    attrs: (
      "id": (type: "string", doc: (en: "Reference target id", fa: "شناسهٔ هدف ارجاع")),
      "highlight": (type: "color", doc: (en: "Highlighter band behind the text: `true` (yellow), a color preset, Tailwind name or hex. Works with or without an `id`.", fa: "نوار هایلایت پشت متن: `true` (زرد)، رنگ آماده، نام Tailwind یا hex. با `id` یا بدون آن کار می‌کند.")),
      "tailwind": (type: "string", doc: (en: "Tailwind classes, the same as on `<div>`: `border border-red-500 rounded-lg bg-yellow-100 px-2`, and for the text `text-lg text-red-600 font-bold italic underline`. A box stays on one line. Only the groups listed in `classes` are taken.", fa: "کلاس‌های Tailwind، همان‌های `<div>`: `border border-red-500 rounded-lg bg-yellow-100 px-2` و برای متن `text-lg text-red-600 font-bold italic underline`. قاب در یک خط می‌ماند. فقط گروه‌های فهرست‌شده در `classes` پذیرفته می‌شوند."), classes: tailwind-groups-of("span")),
    ),
  ),
  "anchor": (
    kind: "inline",
    description: (en: "Alias of <span>", fa: "نام دیگر <span>"),
    attrs: (
      "id": (type: "string", doc: (en: "Reference target id", fa: "شناسهٔ هدف ارجاع")),
      "highlight": (type: "color", doc: (en: "Highlighter band behind the text: `true` (yellow), a color preset, Tailwind name or hex. Works with or without an `id`.", fa: "نوار هایلایت پشت متن: `true` (زرد)، رنگ آماده، نام Tailwind یا hex. با `id` یا بدون آن کار می‌کند.")),
      "tailwind": (type: "string", doc: (en: "Tailwind classes, the same as on `<div>`: `border border-red-500 rounded-lg bg-yellow-100 px-2`, and for the text `text-lg text-red-600 font-bold italic underline`. A box stays on one line. Only the groups listed in `classes` are taken.", fa: "کلاس‌های Tailwind، همان‌های `<div>`: `border border-red-500 rounded-lg bg-yellow-100 px-2` و برای متن `text-lg text-red-600 font-bold italic underline`. قاب در یک خط می‌ماند. فقط گروه‌های فهرست‌شده در `classes` پذیرفته می‌شوند."), classes: tailwind-groups-of("span")),
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

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let links-docs = (
  en: (
    about: `````md
Links and anchors: Markdown links and bare URLs open the web; `<a href="#id">` goes to a place in the document; `<span id>` and `<anchor id>` mark a target inside a paragraph.

- Markdown links, bare `<https://...>` URLs and `<a href="https://...">` open the web (accent color, underlined, with a link icon). An empty `<a href="..."></a>` shows the address.
- `<a href="#id">` goes to a place in the document (a heading `{#id}`, a figure, table, listing or equation id) like `<ref>`, without the icon.
- `<span id="term">text</span>` (alias `<anchor>`, or `[text]{#term}`) marks a fragment as a target; `highlight="true|color"` adds a highlighter band.
`````.text,
  ),
  fa: (
    about: `````md
پیوند و لنگر: پیوندهای Markdown و نشانی‌های خام وب را باز می‌کنند؛ `<a href="#id">` به جایی از سند می‌رود؛ `<span id>` و `<anchor id>` هدفی را میان پاراگراف علامت می‌زنند.

- پیوندهای Markdown، نشانی‌های خام `<https://...>` و `<a href="https://...">` وب را باز می‌کنند (رنگ تأکید، زیرخط‌دار و با آیکون پیوند). `<a href="..."></a>` خالی خود نشانی را نشان می‌دهد.
- `<a href="#id">` مثل `<ref>` به جایی از سند می‌رود (تیتر با `{#id}`، یا شناسهٔ شکل، جدول، کد یا معادله)، بدون آیکون.
- ‏`<span id="term">متن</span>` (نام دیگر `<anchor>` یا `[متن]{#term}`) یک تکه را هدف می‌کند؛ `highlight="true|رنگ"` نوار هایلایت پشتش می‌گذارد.
`````.text,
  ),
  example: (
    en: `````md
## Introduction {#intro}

[Typst documentation](https://typst.app/docs) or <https://typst.app>
<a href="https://github.com/typst/typst">The Typst repository</a>
<a href="#intro">Back to the introduction</a>
`````.text,
    fa: `````md
## مقدمه {#intro}

[مستندات Typst](https://typst.app/docs) یا <https://typst.app>
<a href="https://github.com/typst/typst">مخزن Typst</a>
<a href="#intro">بازگشت به مقدمه</a>
`````.text,
  ),
)
