// What a component needs, in one import: `#import "/src/kit.typ": *`.
//
// `prelude.typ` has the template (config, theme, page, styling) and the @preview packages. The libraries below stand on top of
// it (they import the prelude themselves, so the prelude cannot re-export them: that would be a cycle), which is why a component
// used to list them one by one. All their names are different, so importing everything is safe; keep it so: a name defined in
// two of these files would silently be the one imported last.
//
//   basics      lengths (`parse-length`), `plain-text`, `span-columns`, ...
//   colors      `resolve-color`, `tinted`, `panel`
//   widgets     `chart-number`, `pick-hue`, `flag-attr`, ...
//   refs        references, figure lists, page breaks, `list-pages-on`
//   lists       `list-block`, `list-style`, numbering
//   mitex       LaTeX math
//   latex-code  LaTeX code blocks for `<cetz>` / `<lilaq>`
//
// A problem a component finds in the text is reported with its line: start the message of an `assert` with `at-of(attrs)` (it
// is in the prelude), and give the shared helpers `attrs: attrs`.
#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/colors.typ": *
#import "/src/lib/widgets.typ": *
#import "/src/lib/refs.typ": *
#import "/src/lib/lists.typ": *
#import "/src/lib/mitex.typ": *
#import "/src/lib/latex-code.typ": *
