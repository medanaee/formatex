#import "/src/kit.typ": *

#let footnotes-tags = (
    fn: (attrs, body) => {
      let en-text = attrs.at("en", default: none)
      let fa-text = attrs.at("fa", default: none)
      let note-text = attrs.at("text", default: none)
      let dir-attr = attrs.at("dir", default: "auto")

      if en-text != none {
        let note = text(dir: ltr, font: (latin-font, persian-font), en-text)
        if body != none and body != [] [#body#footnote(note)] else [#footnote(note)]
      } else if fa-text != none {
        let note = text(dir: rtl, font: (persian-font, latin-font), fa-text)
        if body != none and body != [] [#body#footnote(note)] else [#footnote(note)]
      } else if note-text != none {
        context {
          let d = resolve-dir(dir-attr, note-text)
          let note = text(dir: d, note-text)
          if body != none and body != [] [#body#footnote(note)] else [#footnote(note)]
        }
      } else {
        context {
          let d = resolve-dir(dir-attr, body)
          footnote(text(dir: d, body))
        }
      }
    },
    footnote: (attrs, body) => {
      let en-text = attrs.at("en", default: none)
      let fa-text = attrs.at("fa", default: none)
      let note-text = attrs.at("text", default: none)
      let dir-attr = attrs.at("dir", default: "auto")

      if en-text != none {
        let note = text(dir: ltr, font: (latin-font, persian-font), en-text)
        if body != none and body != [] [#body#footnote(note)] else [#footnote(note)]
      } else if fa-text != none {
        let note = text(dir: rtl, font: (persian-font, latin-font), fa-text)
        if body != none and body != [] [#body#footnote(note)] else [#footnote(note)]
      } else if note-text != none {
        context {
          let d = resolve-dir(dir-attr, note-text)
          let note = text(dir: d, note-text)
          if body != none and body != [] [#body#footnote(note)] else [#footnote(note)]
        }
      } else {
        context {
          let d = resolve-dir(dir-attr, body)
          footnote(text(dir: d, body))
        }
      }
    },
)

#let footnotes-schema = (
  "fn": (
    kind: "inline",
    description: (en: "Footnote written in place; `en` / `fa` give a text per language", fa: "پاورقی درون‌متنی؛ `en` و `fa` متن هر زبان را می‌دهند"),
    attrs: (
      "en": (type: "string", doc: (en: "Note text for English text", fa: "متن پاورقی برای متن انگلیسی")),
      "fa": (type: "string", doc: (en: "Note text for Persian text", fa: "متن پاورقی برای متن فارسی")),
      "text": (type: "string", doc: (en: "Note text for any language", fa: "متن پاورقی برای هر زبان")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Direction of the note", fa: "جهت پاورقی")),
    ),
  ),
  "footnote": (
    kind: "inline",
    description: (en: "Footnote written in place (same as <fn>)", fa: "پاورقی درون‌متنی (مثل <fn>)"),
    attrs: (
      "en": (type: "string", doc: (en: "Note text for English text", fa: "متن پاورقی برای متن انگلیسی")),
      "fa": (type: "string", doc: (en: "Note text for Persian text", fa: "متن پاورقی برای متن فارسی")),
      "text": (type: "string", doc: (en: "Note text for any language", fa: "متن پاورقی برای هر زبان")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Direction of the note", fa: "جهت پاورقی")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let footnotes-docs = (
  en: (
    about: `````md
Footnotes: standard Markdown (`[^label]` and `[^label]: text`) or inline `<fn>` tags. Markers and entries pick their own direction and digits.

- Standard Markdown: `[^label]` in the text and `[^label]: text` anywhere (continuation lines indented by 4 spaces). Inline: `<fn>note</fn>`, or on a word `<fn en="..."></fn>` / `<fn fa="..."></fn>` / `<fn text="...">word</fn>`.
- Markers use Persian digits in RTL text and Latin in LTR; each note takes its own direction. `dir` (`rtl`, `ltr`, `auto`) forces one.
`````.text,
  ),
  fa: (
    about: `````md
پاورقی: Markdown استاندارد (`[^label]` و `[^label]: text`) یا تگ درون‌متنی `<fn>`. نشانه و متن هر پاورقی جهت و ارقام خودش را می‌گیرد.

- Markdown استاندارد: `[^label]` در متن و `[^label]: text` هر جا (خط‌های ادامه با ۴ فاصله تورفته). درون‌خطی: `<fn>متن</fn>`، یا روی یک واژه `<fn en="..."></fn>` / `<fn fa="..."></fn>` / `<fn text="...">واژه</fn>`.
- نشانه‌ها در متن RTL ارقام فارسی و در LTR لاتین‌اند؛ هر پاورقی جهت خودش را می‌گیرد. `dir` (‏`rtl`، `ltr`، `auto`) یکی را اجبار می‌کند.
`````.text,
  ),
  example: (
    en: `````md
A standard footnote[^a] and an inline one<fn>Written in place.</fn>.

[^a]: The text of the footnote.

A term with its translation: <fn en="Artificial Intelligence">هوش مصنوعی</fn>.
`````.text,
    fa: `````md
یک پاورقی استاندارد[^a] و یک پاورقی درون‌متنی<fn>همان‌جا نوشته شده.</fn>.

[^a]: متن پاورقی.

اصطلاحی با ترجمه‌اش: <fn en="Artificial Intelligence">هوش مصنوعی</fn>.
`````.text,
  ),
)
