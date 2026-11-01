#import "/src/kit.typ": *

#let img-tags = (
    img: ("void", attrs => {
      let w = parse-length(attrs.at("width", default: none), attrs: attrs)
      let h = parse-length(attrs.at("height", default: none), attrs: attrs)
      let relative-width = type(w) == ratio
      span-columns(attrs, "img", box(
        clip: true,
        width: if relative-width { w } else { auto },
        radius: if "radius" in attrs { parse-length(attrs.radius, attrs: attrs) } else { feel.image },
        image(
          root-path(attrs.src),
          alt: attrs.at("alt", default: none),
          width: if relative-width { 100% } else if w != none { w } else { auto },
          height: if h != none { h } else { auto },
        ),
      ))
    }),
)

#let img-schema = (
  "img": (
    kind: "void",
    description: (en: "image", fa: "تصویر"),
    attrs: (
      "src": (type: "path", required: true, doc: (en: "Required. Path relative to the project root. URLs don't work, so download the image first.", fa: "الزامی. مسیر نسبت به پوشهٔ ریشهٔ پروژه. نشانی اینترنتی کار نمی‌کند، پس اول تصویر را دانلود کنید.")),
      "alt": (type: "string", doc: (en: "Alternative text.", fa: "متن جایگزین.")),
      "width": (type: "length", doc: (en: "Size.", fa: "اندازه.")),
      "height": (type: "length", doc: (en: "Size.", fa: "اندازه.")),
      "radius": (type: "length", doc: (en: "Corner rounding (defaults to the feel's value). `50%` on a square image gives a circle.", fa: "گردی گوشه (پیش‌فرض: مقدار حالت). مقدار `50%` روی تصویر مربعی دایره می‌سازد.")),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: (en: "`column` (default) or `all`. In a multi-column document, `all` puts the image across all columns, at the top or bottom of a page. Inside a `<fig>`, put it on the `<fig>` instead.", fa: "`column` (پیش‌فرض) یا `all`. در سند چندستونه، `all` تصویر را روی همهٔ ستون‌ها، در بالا یا پایین صفحه، می‌گذارد. داخل `<fig>` آن را روی خود `<fig>` بگذارید.")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let img-docs = (
  en: (
    about: `````md
An image from a project file (`src`), with `alt`, `width`, `height` and `radius`. Use it on its own or inside `<fig>` to give it a caption and a number.

- `src` is a path from the project root (an `images/` folder is the habit); SVG and raster images work. `alt` is the description, `width` / `height` are lengths or percentages, `radius` rounds the corners (default: the feel's).
- Inside `<fig>` the image takes `align`, `ratio` and a caption.
`````.text,
  ),
  fa: (
    about: `````md
یک تصویر از فایل‌های پروژه (`src`) با `alt`، `width`، `height` و `radius`. تنها یا داخل `<fig>` به کار می‌رود تا عنوان و شماره بگیرد.

- `src` مسیری از ریشهٔ پروژه است (معمولاً پوشهٔ `images/`)؛ SVG و تصویرهای نقطه‌ای کار می‌کنند. `alt` توضیح تصویر است، `width` / `height` طول یا درصدند و `radius` گوشه‌ها را گرد می‌کند (پیش‌فرض: مقدار حالت).
- داخل `<fig>` تصویر `align`، `ratio` و عنوان می‌گیرد.
`````.text,
  ),
  example: (
    en: `````md
<img src="images/ocean.svg" alt="Ocean" width="60%" radius="8">
`````.text,
    fa: `````md
<img src="images/ocean.svg" alt="Ocean" width="60%" radius="8">
`````.text,
  ),
)
