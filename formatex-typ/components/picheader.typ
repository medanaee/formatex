#import "/src/kit.typ": *

#let picheader-tags = (
    picheader: ("void", attrs => {
      assert("src" in attrs, message: at-of(attrs) + "<picHeader> requires src=\"path\"")
      assert("title" in attrs, message: at-of(attrs) + "<picHeader> requires title=\"...\"")
      let flag(key, default) = {
        let v = attrs.at(key, default: default)
        assert(v in ("true", "false"), message: at-of(attrs) + "<picHeader> " + key + " must be true or false, got " + repr(v))
        v == "true"
      }
      let brk = attrs.at("break", default: "false")
      assert(brk in ("false", "before"), message: at-of(attrs) + "<picHeader> break must be false or before, got " + repr(brk))
      let mx = flag("margin-x", "true")
      let my = flag("margin-y", "true")
      let h = parse-length(attrs.at("height", default: "60mm"), attrs: attrs)
      let multi = column-count > 1
      let bleed-x = not mx and not multi
      let bleed-top = brk == "before" and not my
      let pad-x = if bleed-x { page-margins.x } else { 0pt }
      let pad-top = if bleed-top { page-margins.top } else { 0pt }
      let r = feel.image
      // Corners touching a page edge stay square; the others follow the feel.
      let radius = (top-left: if bleed-top or bleed-x { 0pt } else { r }, top-right: if bleed-top or bleed-x { 0pt } else { r }, bottom-left: if bleed-x { 0pt } else { r }, bottom-right: if bleed-x { 0pt } else { r })
      let subtitle = attrs.at("subtitle", default: none)
      let inner = {
        let img-h = h + pad-top
        block(width: 100%, height: img-h, clip: true, radius: radius, breakable: false, {
          place(image(root-path(attrs.src), width: 100%, height: img-h, fit: "cover"))
          place(rect(width: 100%, height: img-h, stroke: none, fill: gradient.linear(dir: ttb, (black.transparentize(100%), 0%), (black.transparentize(100%), 25%), (black.transparentize(10%), 100%))))
          place(bottom, block(width: 100%, inset: (x: 1.2em + pad-x, top: 1em, bottom: 2.2em), context {
            let given-dir = attrs.at("dir", default: "auto")
            set text(fill: white, dir: if given-dir != "auto" { named-dir(given-dir) } else { content-dir(attrs.title) })
            set par(spacing: 0pt, leading: 0.4em)
            text(size: 2.2em, weight: "bold", attrs.title)
            if subtitle != none {
              v(1.4em)
              text(size: 1.1em, fill: white.transparentize(15%), subtitle)
            }
          }))
        })
      }
      if brk == "before" { pagebreak(weak: true) }
      block(width: 100%, above: if brk == "before" { 0pt } else { 1em }, below: 1.2em, breakable: false,
        pad(x: -pad-x, top: -pad-top, inner))
    }),
)

// The HTML form (optional, used by the HTML export): the picture covers a band with a gradient rising from the bottom and the white title on
// it; `margin-x="false"` lets the band bleed to the edges of the window. A page break means nothing on a web page, so `break` is ignored.
#let picheader-html = (
    picheader: ("void", attrs => {
      assert("src" in attrs, message: at-of(attrs) + "<picHeader> requires src=\"path\"")
      assert("title" in attrs, message: at-of(attrs) + "<picHeader> requires title=\"...\"")
      let bleed = attrs.at("margin-x", default: "true") == "false"
      let h = parse-length(attrs.at("height", default: "60mm"), attrs: attrs)
      let subtitle = attrs.at("subtitle", default: none)
      html.elem("div", attrs: (class: "fx-pic" + if bleed { " fx-pic-bleed" } else { "" }, style: "height: " + css-len(h)), {
        image(root-path(attrs.src), width: 100%, height: 100%, fit: "cover")
        html.elem("div", attrs: (class: "fx-pic-text", dir: attrs.at("dir", default: "auto")), {
          html.elem("div", attrs: (class: "fx-pic-title"), attrs.title)
          if subtitle != none { html.elem("div", attrs: (class: "fx-pic-sub"), subtitle) }
        })
      })
    }),
)
#let picheader-css = `````css
.fx-pic { position: relative; overflow: hidden; margin: 1.1em 0; border-radius: var(--r-image); color: #fff; background: #000; }
.fx-pic img { position: absolute; inset: 0; width: 100% !important; height: 100% !important; max-width: none; object-fit: cover; }
.fx-pic::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 25%, rgba(0, 0, 0, .9)); }
.fx-pic-text { position: absolute; z-index: 1; inset-inline: 0; bottom: 0; padding: 1em 1.2em 1.1em; unicode-bidi: plaintext; }
.fx-pic-title { font-size: 2.2em; font-weight: 700; line-height: 1.3; color: #fff; }
.fx-pic-sub { margin-top: .5em; font-size: 1.1em; color: rgba(255, 255, 255, .85); }
.fx-pic-bleed { border-radius: 0; width: 100vw; margin-inline: calc(50% - 50vw); }
`````.text

#let picheader-schema = (
  "picheader": (
    display: "picHeader",
    kind: "void",
    description: (en: "picture header", fa: "سربرگ تصویری"),
    attrs: (
      "src": (type: "path", required: true, doc: (en: "Image path (required)", fa: "مسیر تصویر (الزامی)")),
      "title": (type: "string", required: true, doc: (en: "Large white title (required)", fa: "عنوان بزرگ سفید (الزامی)")),
      "subtitle": (type: "string", doc: (en: "Optional smaller line under the title", fa: "زیرعنوان کوچک‌تر زیر عنوان")),
      "height": (type: "length", default: "60mm", doc: (en: "Height of the picture (`mm`, `cm`, `pt`, ...)", fa: "ارتفاع تصویر (`mm`، `cm`، `pt`، ...)")),
      "break": (type: "enum", values: ("false", "before"), default: "false", doc: (en: "`false`: placed where it is written. `before`: starts a new page", fa: "`false`: همان‌جا درج می‌شود. `before`: ابتدای صفحهٔ بعد")),
      "margin-x": (type: "bool", default: "true", doc: (en: "`true`: spans the text width. `false`: bleeds across the page margins, corners become square", fa: "`true`: عرض متن را می‌گیرد. `false`: حاشیه‌های سند را هم می‌پوشاند و گوشه‌ها تیز می‌شوند")),
      "margin-y": (type: "bool", default: "true", doc: (en: "Only with `break=\"before\"`. `true`: sits at the top margin. `false`: sticks to the top edge of the page, top corners become square", fa: "فقط با `break=\"before\"`. `true`: در حاشیهٔ بالا می‌نشیند. `false`: به لبهٔ بالای صفحه می‌چسبد و گوشه‌های بالا تیز می‌شوند")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Direction of the title and subtitle (default: from the document or the title)", fa: "جهت عنوان و زیرعنوان (پیش‌فرض: از سند یا عنوان)")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let picheader-docs = (
  en: (
    about: `````md
A full-width picture header: an image with a gradient rising from the bottom, a large white title and an optional subtitle. Self-closing.

- It is self-closing. `src` is the image, `title` and optional `subtitle` are set in white over a gradient rising from the bottom; `height` sets the band (for example `60mm`).
- Title and subtitle follow the direction of the title's first letter. `margin-x="false"` / `margin-y="false"` let it bleed past the page margins (the header then covers the page header).
`````.text,
  ),
  fa: (
    about: `````md
سربرگ تصویریِ تمام‌عرض: یک تصویر با گرادیان از پایین، عنوان سفید بزرگ و زیرعنوان اختیاری. بدون بدنه (خودبسته).

- خودبسته است. `src` تصویر است، `title` و `subtitle` اختیاری با رنگ سفید روی گرادیانی از پایین چیده می‌شوند؛ `height` ارتفاع نوار را تعیین می‌کند (مثلاً `60mm`).
- عنوان و زیرعنوان جهت اولین حرف عنوان را می‌گیرند. `margin-x="false"` / `margin-y="false"` اجازه می‌دهد از حاشیهٔ صفحه بیرون بزند (آن‌وقت سربرگ صفحه را می‌پوشاند).
`````.text,
  ),
  example: (
    en: `````md
<picHeader src="images/ocean.svg" title="Title" subtitle="Optional subtitle" height="60mm" />
`````.text,
    fa: `````md
<picHeader src="images/ocean.svg" title="عنوان" subtitle="زیرعنوان اختیاری" height="60mm" />
`````.text,
  ),
)
