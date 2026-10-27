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



