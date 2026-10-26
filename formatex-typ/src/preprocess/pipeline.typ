// The source text goes through these steps, innermost first, before cmarker sees it.
#import "/src/preprocess/comments.typ": strip-comments
#import "/src/preprocess/heading-ids.typ": heading-ids
#import "/src/preprocess/table-attrs.typ": table-attrs
#import "/src/preprocess/persian-list-numbers.typ": persian-list-numbers
#import "/src/preprocess/list-attrs.typ": list-attrs
#import "/src/preprocess/equation-ids.typ": equation-ids
#import "/src/preprocess/span-ids.typ": span-ids
#import "/src/preprocess/list-pages.typ": list-pages
#import "/src/preprocess/markdown-footnotes.typ": markdown-footnotes

#let preprocess(src) = markdown-footnotes(span-ids(list-pages(list-attrs(equation-ids(table-attrs(persian-list-numbers(heading-ids(strip-comments(src)))))))))
