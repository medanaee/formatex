#import "src/prelude.typ": *
#show: doc => conf(doc)


#import "src/lib/mitex.typ": mitex
#import "src/preprocess/pipeline.typ": preprocess
#import "src/preprocess/mark-lines.typ": mark-lines
#import "components/_registry.typ": html-tags, all-rules, all-schemas, scope-extras

#show: all-rules

// Every tag and option line of every file is told its place when the file is read (src/preprocess/mark-lines.typ), so a problem
// found anywhere later can say which line of which file it is about
#let mark(text, path) = mark-lines(text, path, all-schemas, front-matter-regex)
#let marked-source = mark(source-text, source-path)
#let marked-front = marked-source.match(front-matter-regex)
#let source-body = expand-includes(if marked-front == none { marked-source } else { marked-source.slice(marked-front.end) }, (source-path,), mark: mark)

#cmarker.render(preprocess(source-body), math: mitex, scope: (image: (source, ..args) => image(source, ..args), make-heading-numbering: make-heading-numbering, check-label: check-label, fx-mark: fx-mark) + scope-extras, html: html-tags)
