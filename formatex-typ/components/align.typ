#import "/src/kit.typ": *


#let align-tags = (
    // <align to="left">: everything inside follows the alignment; `<align right>` works too.
    // start/end follow each paragraph's own direction.
    align: (attrs, body) => {
      let bare = attrs.keys().filter(k => k in align-names)
      let to = attrs.at("to", default: if bare.len() > 0 { bare.first() } else { "center" })
      assert(to in align-names, message: at-of(attrs) + "<align> to must be one of " + align-names.keys().join(", ") + ", got " + repr(to))
      align-stack.update(s => s + (to,))
      {
        set align(align-names.at(to))
        body
      }
      align-stack.update(s => s.slice(0, -1))
    },
)

#let align-schema = (
  "align": (
    kind: "block",
    description: (en: "horizontal alignment", fa: "تراز افقی"),
    attrs: (
      "to": (type: "enum", values: ("center", "left", "right", "start", "end"), default: "center", bare: true, doc: (en: "Alignment: `center`, `left`, `right`, `start` or `end`. May be written bare: `<align center>`", fa: "تراز: `center`، `left`، `right`، `start` یا `end`. می‌توان بی‌نام نوشت: `<align center>`")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let align-docs = (
  en: (
    about: `````md
Aligns everything inside it horizontally; with no attribute it centers. Use it to center a figure, a table or a paragraph. An enclosing `<align>` also sets the default alignment of the figures inside it.

- `to`: `center` (default), `left` / `right` (the physical side, whatever the language), `start` / `end` (follow each paragraph's own direction).
- It affects paragraphs, headings, lists, images, grid cells and the text inside alerts, boxes and theorem blocks; auto-width tables, `<fig>`, standalone `<cetz>` drawings and Mermaid diagrams sit on its side too, unless their own setting says otherwise. Code blocks stay left.
- Tags nest; the innermost wins. It never changes the text direction: use `<dir>` for that.
`````.text,
  ),
  fa: (
    about: `````md
هر چیز داخلش را افقی تراز می‌کند؛ بدون ویژگی وسط‌چین می‌کند. برای وسط‌چین کردن شکل، جدول یا پاراگراف به کار می‌رود. `<align>` بیرونی تراز پیش‌فرض شکل‌های داخلش را هم تعیین می‌کند.

- `to`: ‏`center` (پیش‌فرض)، `left` / `right` (سمت فیزیکی، فارغ از زبان)، `start` / `end` (جهت هر پاراگراف را دنبال می‌کنند).
- روی پاراگراف، تیتر، فهرست، تصویر، خانهٔ grid و متن داخل هشدار، جعبه و قضیه اثر دارد؛ جدول‌های با عرض خودکار، `<fig>`، رسم‌های `<cetz>` مستقل و نمودارهای Mermaid هم کنار همان سمت می‌نشینند، مگر تنظیم خودشان چیز دیگری بگوید. بلوک کد چپ می‌ماند.
- تگ‌ها تودرتو می‌شوند و درونی‌ترین برنده است. جهت متن را عوض نمی‌کند؛ برای آن `<dir>` را به کار ببرید.
`````.text,
  ),
  example: (
    en: `````md
<align>

This paragraph is centered.

</align>

<align to="left">

Left-aligned, even if it is Persian.

</align>

<align right>

The value can also be written as a bare attribute.

</align>
`````.text,
    fa: `````md
<align>

این پاراگراف وسط‌چین است.

</align>

<align to="left">

چپ‌چین، حتی اگر فارسی باشد.

</align>

<align right>

مقدار را می‌شود به شکل ویژگی تنها هم نوشت.

</align>
`````.text,
  ),
)
