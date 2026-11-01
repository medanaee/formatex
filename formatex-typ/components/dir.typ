#import "/src/kit.typ": *


#let dir-tags = (
    // <dir to="rtl">: everything inside is right-to-left ("ltr": left-to-right), whatever its
    // language; "auto" brings back the per-block detection inside a forced document. `<dir rtl>` works too.
    dir: (attrs, body) => {
      let bare = attrs.keys().filter(k => k in ("rtl", "ltr", "auto"))
      let to = attrs.at("to", default: if bare.len() > 0 { bare.first() } else { "auto" })
      assert(to in ("rtl", "ltr", "auto"), message: at-of(attrs) + "<dir> to must be rtl, ltr or auto, got " + repr(to))
      dir-stack.update(s => s + (to,))
      {
        set text(dir: if to == "rtl" { rtl } else { ltr }) if to != "auto"
        body
      }
      dir-stack.update(s => s.slice(0, -1))
    },
)

#let dir-schema = (
  "dir": (
    kind: "block",
    description: (en: "text direction of a part", fa: "جهت متن یک بخش"),
    attrs: (
      "to": (type: "enum", values: ("auto", "rtl", "ltr"), bare: true, doc: (en: "`rtl`, `ltr` or `auto`. May be written bare: `<dir rtl>`", fa: "`rtl`، `ltr` یا `auto`. می‌توان بی‌نام نوشت: `<dir rtl>`")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let dir-docs = (
  en: (
    about: `````md
Sets the text direction of a part of the document (`rtl`, `ltr` or `auto`); everything inside takes it. Use it for a block that must stay left to right (code, a quotation) in a Persian page, or the reverse.

- `to`: `rtl`, `ltr` or `auto` (default: each block follows its own first letter again, even in a document with `dir: rtl`). The bare form `<dir rtl>` works.
- Write it like `<align>`: the tag on its own line, a blank line, the content, a blank line, the closing tag. Tags nest; the innermost wins.
- Code stays left to right; `<cetz>` labels, Mermaid diagrams and `<kbd>` keep their own direction. The page header, footer and cover follow only the document's `dir`.
`````.text,
  ),
  fa: (
    about: `````md
جهت متن یک بخش از سند را تعیین می‌کند (`rtl`، `ltr` یا `auto`) و هر چیز داخلش آن را می‌گیرد. برای بلوکی که باید در صفحهٔ فارسی چپ‌به‌راست بماند (کد، نقل‌قول) یا برعکس.

- `to`: ‏`rtl`، `ltr` یا `auto` (پیش‌فرض: هر بلوک دوباره جهت اولین حرف خودش را می‌گیرد، حتی در سندی با `dir: rtl`). شکل ساده `<dir rtl>` هم کار می‌کند.
- مثل `<align>` بنویسید: تگ در یک خط، خط خالی، محتوا، خط خالی، تگ بسته‌کننده. تگ‌ها تودرتو می‌شوند و درونی‌ترین برنده است.
- کد چپ‌به‌راست می‌ماند؛ برچسب‌های `<cetz>`، نمودار Mermaid و کلیدهای `<kbd>` جهت خودشان را نگه می‌دارند. سربرگ، پابرگ و جلد فقط از `dir` سند پیروی می‌کنند.
`````.text,
  ),
  example: (
    en: `````md
<dir to="ltr">

این پاراگراف فارسی از چپ به راست چیده می‌شود.

</dir>

<dir rtl>

This English paragraph is laid out right to left.

</dir>
`````.text,
    fa: `````md
<dir to="ltr">

این پاراگراف فارسی از چپ به راست چیده می‌شود.

</dir>

<dir rtl>

This English paragraph is laid out right to left.

</dir>
`````.text,
  ),
)
