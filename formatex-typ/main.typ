#import "src/prelude.typ": *
#show: doc => conf(doc)


#import "src/lib/mitex.typ": mitex
#import "src/preprocess/pipeline.typ": preprocess
#import "src/preprocess/check.typ": check-source
#import "components/_registry.typ": html-tags, all-rules, all-schemas, scope-extras

#show: all-rules

// The text of each file is checked as it is written, so a problem is reported with its line (src/preprocess/check.typ)
#{ for (path, text) in source-files { check-source(text, path, all-schemas) } }

#cmarker.render(preprocess(source-body), math: mitex, scope: (image: (source, ..args) => image(source, ..args), make-heading-numbering: make-heading-numbering) + scope-extras, html: html-tags)
