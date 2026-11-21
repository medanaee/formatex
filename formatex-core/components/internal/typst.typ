#import "/src/kit.typ": *


#let internal-tags = (
    // Added by `list-pages` around lists in multi-column documents.
    listpages: (attrs, body) => page(columns: 1, body),
    "include": (attrs, body) => panic("<include src=\"" + attrs.at("src", default: "") + "\"> must stand alone on its own line, with blank lines around it"),
)
