// Shared by the preprocessors. Regexes are built once here: `regex(...)` inside a per-line loop compiles the
// pattern again on every line, which dominated the time of the whole pipeline.
#let fence-re = regex("^\s{0,3}(`{3,}|~{3,})")
#let option-token = regex("#([\p{L}\p{N}_\-.:]+)|([a-z-]+)=(?:\"([^\"]*)\"|([^\s\"]+))")

// Same bytes, same lines: every character but the line breaks becomes a space (what a pass must not read is blanked, not removed).
#let blank(text) = text.replace(regex("[^\\n]+"), m => " " * m.text.len())

// The opening or closing fence of a code block, or none. The `contains` test keeps the regex off ordinary lines.
#let fence-match(line) = if line.contains("```") or line.contains("~~~") { line.match(fence-re) }
