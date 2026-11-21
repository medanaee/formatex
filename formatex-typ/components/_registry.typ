#import "/components/_catalog.typ": *
#import "/components/alert/typst.typ": alert-tags
#import "/components/align/typst.typ": align-tags
#import "/components/badge/typst.typ": badge-tags
#import "/components/box/typst.typ": box-tags
#import "/components/cetz/typst.typ": cetz-tags
#import "/components/chart/typst.typ": chart-tags
#import "/components/chat/typst.typ": chat-tags
#import "/components/citations/typst.typ": citations-tags, citations-rules
#import "/components/code/typst.typ": code-tags
#import "/components/compare/typst.typ": compare-tags
#import "/components/counter/typst.typ": counter-tags
#import "/components/cover/typst.typ": cover-tags
#import "/components/def/typst.typ": def-tags
#import "/components/diff/typst.typ": diff-tags
#import "/components/digit/typst.typ": digit-tags
#import "/components/dir/typst.typ": dir-tags
#import "/components/div/typst.typ": div-tags, div-rules
#import "/components/docheader/typst.typ": docheader-tags
#import "/components/exercise/typst.typ": exercise-tags
#import "/components/fig/typst.typ": fig-tags, fig-rules
#import "/components/figure-lists/typst.typ": figure-lists-tags
#import "/components/footnotes/typst.typ": footnotes-tags
#import "/components/grid/typst.typ": grid-tags
#import "/components/hr/typst.typ": hr-tags
#import "/components/icon/typst.typ": icon-tags
#import "/components/img/typst.typ": img-tags
#import "/components/internal/typst.typ": internal-tags
#import "/components/kbd/typst.typ": kbd-tags
#import "/components/letter/typst.typ": letter-tags
#import "/components/lilaq/typst.typ": lilaq-tags
#import "/components/links/typst.typ": links-tags, links-rules
#import "/components/lists/typst.typ": lists-tags, lists-rules, lists-scope
#import "/components/paragraph/typst.typ": paragraph-tags
#import "/components/picheader/typst.typ": picheader-tags
#import "/components/progress/typst.typ": progress-tags
#import "/components/ref/typst.typ": ref-tags
#import "/components/space/typst.typ": space-tags
#import "/components/steps/typst.typ": steps-tags
#import "/components/theorem/typst.typ": theorem-tags
#import "/components/toc/typst.typ": toc-tags
#import "/components/todo/typst.typ": todo-tags
#import "/components/tree/typst.typ": tree-tags
#import "/components/typ/typst.typ": typ-tags
#import "/src/lib/schema.typ": wrap-tags
#let raw-tags = (:) + alert-tags + align-tags + badge-tags + box-tags + cetz-tags + chart-tags + chat-tags + citations-tags + code-tags + compare-tags + counter-tags + cover-tags + def-tags + diff-tags + digit-tags + dir-tags + div-tags + docheader-tags + exercise-tags + fig-tags + figure-lists-tags + footnotes-tags + grid-tags + hr-tags + icon-tags + img-tags + internal-tags + kbd-tags + letter-tags + lilaq-tags + links-tags + lists-tags + paragraph-tags + picheader-tags + progress-tags + ref-tags + space-tags + steps-tags + theorem-tags + toc-tags + todo-tags + tree-tags + typ-tags
#let html-tags = wrap-tags(raw-tags, all-schemas)
#let scope-extras = (:) + lists-scope
#let all-rules(doc) = {
  show: lists-rules
  show: citations-rules
  show: div-rules
  show: fig-rules
  show: links-rules
  doc
}
