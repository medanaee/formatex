#import "src/prelude.typ": *
#show: doc => conf(doc)


#import "src/lib/mitex.typ": mitex
#import "src/preprocess/pipeline.typ": preprocess
#import "src/preprocess/mark-lines.typ": mark-lines
#import "src/preprocess/evaluate.typ": evaluate-document
#import "src/lib/expr.typ": run-code, show-value
#import "components/_registry.typ": html-tags as built-in-html-tags, all-rules, all-schemas as built-in-all-schemas, scope-extras
#import "src/lib/local-components.typ": local-tags, local-all-schemas
#import "src/lib/schema.typ": wrap-tags
#let all-schemas = built-in-all-schemas + local-all-schemas
#let html-tags = built-in-html-tags + wrap-tags(local-tags, local-all-schemas)

#show: all-rules

// The text of the document is Typst code and its includes put in place (src/preprocess/evaluate.typ), then every tag and option line is told
// its place (src/preprocess/mark-lines.typ), so a problem found anywhere later can say which line of which file it is about
#let evaluated = evaluate-document(source-text, source-path, var-env, front-matter-regex)
#let marked-source = mark-lines(evaluated.text, source-path, all-schemas, front-matter-regex, places: evaluated.places)
#let marked-front = marked-source.match(front-matter-regex)
#let source-body = if marked-front == none { marked-source } else { marked-source.slice(marked-front.end) }

#let render-scope = (image: (source, ..args) => image(source, ..args), make-heading-numbering: make-heading-numbering, check-label: check-label, fx-mark: fx-mark) + scope-extras
#let render-markdown(text) = cmarker.render(preprocess(text), math: mitex, scope: render-scope, html: html-tags)

// A `{{ }}` that names a value of the page (PAGE, PAGES, SECTION, SECTION_NUMBER) runs here, when the pages are made, and its text is
// read as Markdown then (src/preprocess/evaluate.typ left a comment that calls this)
#let plain-text(c) = if c == none { "" } else if type(c) == str { c } else if c.has("text") { c.text } else if c.has("children") { c.children.map(plain-text).join() } else if c.has("body") { plain-text(c.body) } else if c.func() == [ ].func() { " " } else { "" }
#let fx-deferred(code, values) = context {
  let section = current-section()
  let page-values = (
    PAGE: counter(page).get().first(),
    PAGES: counter(page).final().first(),
    SECTION: if section == none { "" } else { plain-text(section.body) },
    SECTION_NUMBER: if section == none or section.numbering == none { "" } else { counter(heading).at(section.location()).map(str).join(".") },
  )
  let ran = run-code(code, var-env + (values: values), extra: page-values)
  render-markdown(show-value(ran.first()))
}

#cmarker.render(preprocess(source-body), math: mitex, scope: render-scope + (fx-deferred: fx-deferred), html: html-tags)
