#import "/src/kit.typ": *

// <typ>: Typst written straight into the document. The tag holds a fenced code block of Typst markup, or `src="file.typ"` names a
// Typst file; either way the result is set in place, as if the text of that file stood here.
//
// A file given as `src` is included by Typst itself, so the `#include "..."` / `#import "..."` lines inside it resolve the way
// they do in any Typst project (relative to the file that holds them), however deeply the files are nested. The code block has no
// file of its own, so its relative paths are read as paths from the project root, like `src` and `<include>`.

// The paths of `#include "..."` and `#import "..."` in a code block are written from the project root; Typst resolves a path
// from the file that runs `eval` (a component file), so they are rooted here. Absolute paths, packages (`@preview/...`) and
// URLs are left as they are.
#let typ-root-paths(code, attrs: none) = code.replace(
  regex("\\b(include|import)(\\s+)\"([^\"@/:][^\"]*)\""),
  m => m.captures.at(0) + m.captures.at(1) + "\"" + root-path(m.captures.at(2), attrs: attrs) + "\"",
)

#let typ-tags = (
    typ: (attrs, body) => {
      let given = attrs.at("dir", default: "auto")
      assert(given in ("auto", "rtl", "ltr"), message: at-of(attrs) + "<typ> dir must be auto, rtl or ltr, got " + repr(given))
      let inside = if "src" in attrs {
        // A file: Typst includes it, nested includes and all
        include root-path(attrs.src, attrs: attrs)
      } else {
        let r = find-raw(body)
        assert(r != none, message: at-of(attrs) + "<typ> needs a fenced code block of Typst inside it, or src=\"file.typ\"")
        // Without a file of its own the code sees the theme, the zoom, the feel, `vars` (the variables as they are written) and `setting`; anything else it imports itself
        // (`#import "/src/kit.typ": *` brings the whole kit of the engine).
        eval(typ-root-paths(r.text, attrs: attrs), mode: "markup", scope: (theme: theme, zoom: zoom, feel: feel, vars: var-env.values, setting: var-env.settings))
      }
      if given == "auto" { inside } else { text(dir: if given == "rtl" { rtl } else { ltr }, inside) }
    },
)
