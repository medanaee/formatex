// The paged backend consumes data; it never parses the source Markdown again.
#import "/src/kit.typ": *
#import "/src/lib/vars.typ": rooted-path
#import "/components/_registry.typ": raw-tags, all-schemas, all-rules
#import "/components/_catalog.typ": html-only-tags
#import "/src/lib/local-components.typ": local-packages, local-schemas
#import "/src/lib/schema.typ": wrap-tags
#import "/src/lib/expr.typ": run-code, show-value

// The standalone bundler replaces this loader with evaluation against its embedded kit.
#let pdf-load-package(path) = {
  import "/" + path as implementation
  dictionary(implementation)
}

#let pdf-local-tags = {
  let out = (:)
  for (name, package) in local-packages {
    if package.typ == none { continue }
    for (key, value) in pdf-load-package(package.typ) {
      if key.ends-with("-tags") and type(value) == dictionary { out += value }
    }
  }
  out
}
#let pdf-tags = wrap-tags(raw-tags + pdf-local-tags, all-schemas + local-schemas)
#let pdf-html-only = html-only-tags + local-packages.values().filter(package => package.typ == none).map(package => package.schemas.keys()).flatten()

#let pdf-at(node) = "@" + node.at.file + ":" + str(node.at.line) + ":" + str(node.at.column) + " "
#let pdf-text(node) = node.at("value", default: node.at("children", default: ()).map(pdf-text).join())
#let pdf-utf16(value) = value.codepoints().map(ch => if ch.to-unicode() > 65535 { 2 } else { 1 }).sum(default: 0)
// Preview-only links carry provenance through Typst's own inline layout. Typst splits
// their rectangles at visual line/page boundaries without inserting boxes or spaces.
#let pdf-mapped-text(node) = {
  let value = node.at("value", default: "")
  if sys.inputs.at("markers", default: "0") != "1" or node.at("source", default: ()).len() == 0 { return value }
  let value-length = node.at("_source-length", default: pdf-utf16(value))
  let offset = node.at("_source-offset", default: 0)
  let pieces = value.matches(regex("\\s+|\\S+"))
  for piece in pieces {
    let end = offset + pdf-utf16(piece.text)
    let ranges = ()
    for origin in node.source {
      let a = calc.max(offset, origin.at("textStart", default: 0))
      let b = calc.min(end, origin.at("textEnd", default: value-length))
      if a >= b { continue }
      let mapped = (file: origin.file, utf16Start: origin.utf16Start, utf16End: origin.utf16End, generated: origin.generated)
      if not origin.generated and origin.utf16End - origin.utf16Start == origin.textEnd - origin.textStart {
        mapped.utf16Start = origin.utf16Start + a - origin.textStart
        mapped.utf16End = origin.utf16Start + b - origin.textStart
      }
      ranges.push(mapped)
    }
    if ranges.len() == 0 or piece.text.trim() == "" { piece.text } else {
      [#link("formatex-source:" + json.encode((source: ranges, node: node.key)), piece.text)<styled-link>]
    }
    offset = end
  }
}
#let pdf-direction-text(node) = if node.type in ("code", "inlineCode", "math", "inlineMath") { "" } else if node.type == "text" { node.at("value", default: "") } else { node.at("children", default: ()).map(pdf-direction-text).join() }
#let pdf-bool(value) = if type(value) == bool { value } else { value == "true" }
#let pdf-options(node, group: none) = {
  let local = node.at("props", default: (:))
  let shared = local.pairs().filter(((key, _)) => not key.starts-with("html.") and not key.starts-with("typ.") and key not in ("html", "typ")).to-dict()
  let overrides = local.at("typ", default: (:))
  for (key, value) in local { if key.starts-with("typ.") { overrides.insert(key.slice(4), value) } }
  let given = if group == none or group in ("html", "typ") { none } else { config.at(group, default: none) }
  let defaults = if type(given) == dictionary { given } else { (:) }
  let values = defaults + shared + overrides
  values.pairs().map(((key, value)) => (key, if type(value) == bool { if value { "true" } else { "false" } } else if type(value) in (int, float) { str(value) } else { value })).to-dict()
}
#let pdf-unfence(value) = {
  let lines = value.trim().split("\n")
  if lines.len() >= 2 and (lines.first().starts-with("```") or lines.first().starts-with("~~~")) { lines.slice(1, -1).join("\n") } else { value }
}

#let pdf-mark-first(nodes, at) = {
  let result = ()
  let marked = false
  for node in nodes {
    if not marked and node.type == "text" {
      let word = node.value.match(regex("^\\S+"))
      if word != none {
        // Both slices still refer to the original node's source coordinates.
        let source-length = pdf-utf16(node.value)
        result.push(node + (value: node.value.slice(0, word.end), _source-length: source-length))
        result.push((type: "sourceMarker", at: at))
        if word.end < node.value.len() { result.push(node + (value: node.value.slice(word.end), _source-offset: pdf-utf16(node.value.slice(0, word.end)), _source-length: source-length)) }
        marked = true
        continue
      }
    }
    if not marked and "children" in node {
      let nested = pdf-mark-first(node.children, at)
      node.children = nested.nodes; marked = nested.marked
      if nested.marked and node.type == "paragraph" { node.insert("_list", true) }
    }
    result.push(node)
  }
  (nodes: result, marked: marked)
}

#let render-document(document) = {
  let collect(nodes) = {
    let found = (:)
    for node in nodes {
      if node.type == "footnoteDefinition" { found.insert(node.identifier, node.children) }
      if "children" in node { found += collect(node.children) }
    }
    found
  }
  let footnotes = collect(document.children)
  let source(node, body) = {
    if sys.inputs.at("markers", default: "0") == "1" { fx-mark(node.at.file + ":" + str(node.at.line)) }
    body
  }
  let render-node(node, parent: none, scope-dir: doc-dir, map-text: true) = {
    let child-dir = if node.type == "component" and node.name == "dir" {
      let opts = pdf-options(node, group: "dir")
      let bare = opts.keys().filter(key => key in ("rtl", "ltr", "auto"))
      opts.at("to", default: if bare.len() > 0 { bare.first() } else { "auto" })
    } else { scope-dir }
    if node.type in ("paragraph", "heading") and child-dir == "auto" {
      let detected = text-dir(pdf-direction-text(node))
      if detected != none { child-dir = if detected == rtl { "rtl" } else { "ltr" } }
    }
    // Nested PDF links override the outer destination. Preserve real links and let
    // their labels use the bounded fallback instead of stealing their hit areas.
    let child-mapping = map-text and node.type != "link" and not (node.type == "component" and (node.name in ("a", "ref", "def") or node.name in pdf-local-tags))
    let render-nodes(nodes) = nodes.map(child => render-node(child, parent: node.at("name", default: node.type), scope-dir: child-dir, map-text: child-mapping)).join()
    let kind = node.type
    if kind == "sourceMarker" { return if sys.inputs.at("markers", default: "0") == "1" { fx-mark(node.at.file + ":" + str(node.at.line)) } }
    let children() = render-nodes(node.at("children", default: ()))
    if kind == "text" { return if map-text { pdf-mapped-text(node) } else { node.value } }
    if kind == "paragraph" { return if node.at("_list", default: false) { [#children()#parbreak()] } else { source(node, [#children()#parbreak()]) } }
    if kind == "strong" { return strong(children()) }
    if kind == "emphasis" { return emph(children()) }
    if kind == "delete" { return strike(children()) }
    if kind == "inlineCode" { return raw(node.value) }
    if kind == "break" { return linebreak() }
    if kind == "thematicBreak" { return source(node, divider()) }
    if kind == "heading" {
      return {
      let opts = pdf-options(node, group: "heading")
      let local = opts.pairs().map(((key, value)) => (key, if key in ("fill", "underline", "toc", "numbering") { pdf-bool(value) } else { value })).to-dict()
      heading-options.update(local)
      source(node, heading(level: node.depth, outlined: local.at("toc", default: true), numbering: if local.at("numbering", default: true) { heading-numbering } else { none }, children()))
      if "id" in opts { [#metadata((heading-id: opts.id))#label(opts.id)] }
      for id in node.at("props", default: (:)).at("_aliases", default: ()) { [#metadata((heading-id: id))#label(id)] }
      heading-options.update((:))
      }
    }
    if kind == "list" {
      let opts = pdf-options(node, group: "list")
      let items = node.children.map(item => {
        let nodes = pdf-mark-first(item.at("children", default: ()), item.at).nodes
        if "checked" in item { [#if item.checked { "☑" } else { "☐" } #render-nodes(nodes)] } else { render-nodes(nodes) }
      })
      return if opts.len() > 0 { list-block(opts, if node.at("ordered", default: false) { enum(start: node.at("start", default: 1), ..items) } else { list(..items) }) } else if node.at("ordered", default: false) { enum(start: node.at("start", default: 1), ..items) } else { list(..items) }
    }
    if kind == "listItem" or kind == "tableCell" or kind == "tableRow" or kind == "group" { return children() }
    if kind == "blockquote" { return source(node, quote(block: true, children())) }
    if kind == "code" {
      return {
      let opts = pdf-options(node, group: "code")
      code-options.update(opts)
      let language = node.at("lang", default: none)
      if language == "mermaid" { language += " " + node.at("meta", default: "") + " md-at=\"" + node.at.file + ":" + str(node.at.line) + "\"" }
      source(node, raw(node.at("value", default: ""), block: true, lang: language))
      }
    }
    if kind == "math" or kind == "inlineMath" {
      return {
      let opts = pdf-options(node)
      let id = opts.at("id", default: none)
      if id != none { equation-next.update(id) }
      source(node, mitex(node.value, block: kind == "math"))
      if id != none { [#metadata((equation-id: id))#label(id)] }
      }
    }
    if kind == "table" {
      return {
      let opts = pdf-options(node, group: "table")
      table-options.update(opts)
      let rows = node.children
      let count = rows.first().children.len()
      let alignments = node.at("align", default: ())
      let cell-align(x, y) = if x < alignments.len() and alignments.at(x) in ("left", "right", "center") { align-names.at(alignments.at(x)) + horizon } else { auto }
      let cells = rows.slice(1).map(row => row.children.map(cell => render-nodes(cell.at("children", default: ())))).flatten()
      source(node, table(columns: count, align: cell-align, table.header(..rows.first().children.map(cell => render-nodes(cell.at("children", default: ())))), ..cells))
      }
    }
    if kind == "link" { return link(node.url, children()) }
    if kind == "image" { return image(rooted-path(node.url), alt: node.at("alt", default: "")) }
    if kind == "footnoteDefinition" { return }
    if kind == "footnoteReference" { return footnote(render-nodes(footnotes.at(node.identifier, default: ()))) }
    if kind == "component" {
      if node.name in pdf-html-only { return }
      let attrs = pdf-options(node, group: node.name)
      attrs.insert("_at", node.at.file + ":" + str(node.at.line))
      // Inline labels need their own paragraph's lexical direction, not the previous
      // paragraph's state or a state update inside a measurement pass.
      if node.name in ("ref", "def") and scope-dir != "auto" { attrs.insert("_context-dir", scope-dir) }
      if "rich" in node { attrs.insert("_rich", node.rich.pairs().map(((key, nodes)) => (key, render-nodes(nodes))).to-dict()) }
      let body = if "value" in node { raw(pdf-unfence(node.value), block: true, lang: if node.name == "tree" { none } else { "typ" }) } else { children() }
      let handler = pdf-tags.at(node.name, default: none)
      assert(handler != none, message: pdf-at(node) + "No Typst implementation for <" + node.name + ">")
      let rendered = if type(handler) == array { (handler.at(1))(attrs) } else { handler(attrs, body) }
      // A figure consumes drawing metadata; a standalone drawing displays its intrinsic canvas.
      if parent != "fig" and type(rendered) == content and rendered.func() == metadata and type(rendered.value) == dictionary and rendered.value.at("component-tag", default: none) == "drawing" { rendered = rendered.value.body }
      return source(node, rendered)
    }
    if kind == "deferred" {
      return context {
        let record = json(bytes(node.value))
        let section = current-section()
        let page-values = (PAGE: counter(page).get().first(), PAGES: counter(page).final().first(), SECTION: if section == none { "" } else { plain-text(section.body) }, SECTION_NUMBER: if section == none or section.numbering == none { "" } else { counter(heading).at(section.location()).map(str).join(".") })
        let result = run-code(record.code, var-env + (values: eval(record.values, mode: "code")), extra: page-values)
        // Contextual values are text; a contextual Markdown fragment is parsed by the same core plugin.
        let value = show-value(result.first())
        let fragment = json(plugin("/src/parser.wasm").parse(bytes(json.encode((text: value, file: node.at.file, schemas: all-schemas + local-schemas)))))
        assert(fragment.ok, message: pdf-at(node) + "Invalid contextual Markdown")
        render-nodes(fragment.document.children)
      }
    }
    panic(pdf-at(node) + "Unknown document node " + kind)
  }
  document.children.map(render-node).join()
}
