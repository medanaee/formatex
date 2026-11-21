#import "/src/evaluation.typ": *
#let document-ir = if parsed.ok { parsed.document } else {
  let error = parsed.diagnostics.first()
  panic("@" + error.path + ":" + str(error.line) + ":" + str(error.column) + " " + error.message)
}
