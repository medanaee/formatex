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
