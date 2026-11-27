// HTML has logical sections but no page counter. PAGE/PAGES are rejected during evaluation.
#import "/src/core.typ": config, var-env
#import "/src/lib/expr.typ": run-code, show-value

#let context-text(node) = if "value" in node { node.value } else { node.at("children", default: ()).map(context-text).join() }
#let context-heading-options(node) = {
  let local = node.at("props", default: (:))
  let output = local.pairs().filter(((key, _)) => key.starts-with("html.")).map(((key, value)) => (key.slice(5), value)).to-dict()
  config.at("heading", default: (:)) + local + output
}
#let context-numbered(node) = {
  let value = context-heading-options(node).at("numbering", default: false)
  value == true or value == "true"
}
#let resolve-html-contexts(document, parser-plugin, schemas, options) = {
  let headings(nodes) = nodes.map(node => (if node.type == "heading" { (node,) } else { () }) + headings(node.at("children", default: ()))).flatten()
  let all = headings(document.children)
  let numbered = all.filter(context-numbered)
  if numbered.len() > 0 { all = numbered }
  let section-depth = if all.len() > 0 { calc.min(..all.map(node => node.depth)) } else { 1 }
  let walk(nodes, state) = {
    let result = ()
    for node in nodes {
      if node.type == "heading" {
        let depth = node.depth
        while state.counts.len() < depth { state.counts.push(0) }
        if context-numbered(node) { state.counts.at(depth - 1) += 1 }
        state.counts = state.counts.slice(0, depth)
        let numbers = state.counts
        while numbers.len() > 1 and numbers.first() == 0 { numbers = numbers.slice(1) }
        if depth == section-depth { state.section = context-text(node); state.number = if context-numbered(node) { numbers.map(str).join(".") } else { "" } }
      }
      if node.type == "deferred" {
        let record = json(bytes(node.value))
        let ran = run-code(record.code, var-env + (values: eval(record.values, mode: "code")), extra: (SECTION: state.section, SECTION_NUMBER: state.number), from: node.at.file)
        let text = show-value(ran.first())
        let origin = node.source.first()
        let prepared = (text: text, file: origin.file, sources: document.sources, segments: ((start: 0, end: text.len(), file: origin.file, original: (origin.start, origin.end), generated: true),), schemas: schemas, options: options)
        let fragment = json(parser-plugin.parse(bytes(json.encode(prepared))))
        assert(fragment.ok, message: "@" + node.at.file + ":" + str(node.at.line) + ":" + str(node.at.column) + " Invalid contextual Markdown")
        let replacement = fragment.document.children
        if replacement.len() == 1 and replacement.first().type == "paragraph" { replacement = replacement.first().at("children", default: ()) }
        let resolved = walk(replacement, state)
        result += resolved.nodes; state = resolved.state
      } else {
        if "children" in node { let nested = walk(node.children, state); node.children = nested.nodes; state = nested.state }
        result.push(node)
      }
    }
    (nodes: result, state: state)
  }
  document.children = walk(document.children, (section: "", number: "", counts: ())).nodes
  document
}
