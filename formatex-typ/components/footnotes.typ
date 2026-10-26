#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *

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



