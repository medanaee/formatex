#import "/src/kit.typ": *

#let lists-tags = (:)

// rules-order: 10
#let lists-rules(doc) = {
  show: list-style.with((:))
  doc
}

#let lists-scope = (list-block: list-block)
