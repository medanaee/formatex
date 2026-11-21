#import "/src/core.typ": *
#import "/src/page-options.typ": page-size
#import "/src/preprocess/evaluate.typ": evaluate-document
#import "/components/_catalog.typ": all-schemas
#import "/src/lib/local-components.typ": local-schemas, local-packages
#import "/src/lib/option-schema.typ": option-schemas
#import "/src/contexts.typ": resolve-html-contexts
#let parser-plugin = plugin("/src/parser.wasm")

// No PDF component, page, show rule or HTML renderer is loaded by preparation.
#let prepared = evaluate-document(source-text, source-path, var-env, front-matter-regex)
#let shared-settings = resolve-strings(document-config, make-var-env(document-config), setting-prefix)
#let settings = shared-settings + (
  "_project": resolve-strings(base-config, var-env, setting-prefix),
  "_document": resolve-strings(front-matter, var-env, setting-prefix),
)
#let tokens = theme.pairs().map(((key, value)) => (key, if type(value) == color { value.to-hex() } else { value })).to-dict() + (
  latin: latin-font, persian: persian-font, code: code-font, zoom: zoom,
  radius: feel.box / 1pt, dark: theme.at("dark", default: false),
  "page-height": page-size.height / 1mm,
  "theme-name": theme-name, "feel-name": feel-name,
  themes: all-themes.pairs().map(((name, palette)) => (name, palette.pairs().map(((key, value)) => (key, if type(value) == color { value.to-hex() } else { value })).to-dict())).to-dict(),
  feels: feels.pairs().map(((name, value)) => (name, (radius: value.box / 1pt, latin: font-config.at("latin", default: value.latin), persian: font-config.at("persian", default: value.persian)))).to-dict(),
)
#let parser-output = parser-plugin.parse(bytes(json.encode((
  text: prepared.text, file: source-path, sources: prepared.sources,
  segments: prepared.segments, settings: settings, tokens: tokens,
  schemas: all-schemas + local-schemas, packages: local-packages,
  options: option-schemas,
), pretty: false)))
// Hosts can receive the same IR bytes directly. Typst materializes a tree when it must
// resolve contextual expressions, or when a paged/CLI consumer requests tree data.
#let byte-transport = sys.inputs.at("transport", default: "tree") == "bytes" and not prepared.text.contains("<!--fx-deferred:")
#let transport-bytes = if byte-transport { parser-output }
#let raw-parsed = if not byte-transport { json(parser-output) }
#let parsed = if raw-parsed != none and raw-parsed.ok and prepared.text.contains("<!--fx-deferred:") and sys.inputs.at("target", default: "typ") == "html" {
  (ok: true, document: resolve-html-contexts(raw-parsed.document, parser-plugin, all-schemas + local-schemas, option-schemas))
} else { raw-parsed }
