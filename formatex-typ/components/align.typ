#import "/src/prelude.typ": *


#let align-tags = (
    // <align to="left">: everything inside follows the alignment; `<align right>` works too.
    // start/end follow each paragraph's own direction.
    align: (attrs, body) => {
      let bare = attrs.keys().filter(k => k in align-names)
      let to = attrs.at("to", default: if bare.len() > 0 { bare.first() } else { "center" })
      assert(to in align-names, message: "<align> to must be one of " + align-names.keys().join(", ") + ", got " + repr(to))
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



