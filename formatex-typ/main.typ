#import "src/prelude.typ": *
#show: doc => conf(doc)


#import "src/lib/mitex.typ": mitex
#import "src/preprocess/pipeline.typ": preprocess
#import "components/_registry.typ": html-tags, all-rules, scope-extras

#show: all-rules

#cmarker.render(preprocess(source-body), math: mitex, scope: (image: (source, ..args) => image(source, ..args), make-heading-numbering: make-heading-numbering) + scope-extras, html: html-tags)
