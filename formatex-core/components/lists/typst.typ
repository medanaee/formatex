#import "/src/kit.typ": *

#let lists-tags = (:)

// rules-order: 10
#let lists-rules(doc) = {
  show: list-style.with((:))
  doc
}

#let lists-scope = (list-block: list-block)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
