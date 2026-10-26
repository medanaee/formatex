// Everything a component file needs from the template and the packages. Typst re-exports
// what a file imports, so each file starts with just `#import "/src/prelude.typ": *`.
#import "/src/core.typ": *
#import "/src/page.typ": *
#import "/src/conf.typ": *
#import "@preview/cmarker:0.1.10"
#import "@preview/mitex:0.2.7": mitex as mitex-base
#import "@preview/lucide:0.1.0": *
#import "@preview/fontawesome:0.6.2": *
#import "@preview/cetz:0.5.2"
#import "@preview/lilaq:0.6.0"
#import "@preview/tiptoe:0.4.0"
#import "@preview/mmdr:0.2.2": mermaid-svg
