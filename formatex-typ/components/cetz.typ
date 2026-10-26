#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/mitex.typ": *
#import "/src/lib/latex-code.typ": *

#let cetz-tags = (
    cetz: (attrs, body) => {
      let code = if "src" in attrs { read(root-path(attrs.src)) } else {
        let r = find-raw(body)
        if r != none { r.text }
      }
      assert(code != none, message: "<cetz> needs a fenced code block inside it, or src=\"file.typ\"")
      // Labels are not paragraphs, so the auto-dir rules never reach them;
      // each label gets the direction of its own first letter instead.
      let directed-content(..args) = {
        let pos = args.pos()
        let body = pos.last()
        let d = if type(body) in (content, str) { text-dir(body) }
        cetz.draw.content(..pos.slice(0, -1), if d == none { body } else { text(dir: d, body) }, ..args.named())
      }
      let canvas = cetz.canvas(length: parse-length(attrs.at("unit", default: "1cm")), {
        // Default strokes follow the theme so drawings stay visible on dark pages.
        cetz.draw.set-style(stroke: theme.fg)
        eval(latex-in-code(code), mode: "code", scope: (
          ..dictionary(cetz.draw), content: directed-content, cetz: cetz, theme: theme,
          latex-math: s => mitex(s, block: false),
        ))
      })
      // Inside <fig> the canvas is taken from the metadata; on its own it is centered
      // (or follows an enclosing <align>).
      tag("drawing", (canvas: canvas), context align(align-names.at(inherited-align("center")), canvas))
    },
)

#let cetz-schema = (
  "cetz": (
    kind: "block",
    description: (en: "drawings", fa: "رسم"),
    attrs: (
      "unit": (type: "length", default: "1cm", doc: (en: "Length of one coordinate unit. Default `1cm`.", fa: "طول یک واحد مختصات. پیش‌فرض `1cm`.")),
      "src": (type: "path", doc: (en: "Load the code from a file (`src=\"diagrams/x.typ\"`) instead of the code block.", fa: "کد را به‌جای بلوک کد از یک فایل بخوان (`src=\"diagrams/x.typ\"`).")),
    ),
  ),
)



