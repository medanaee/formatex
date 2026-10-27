// Input and look of the whole document: config, front matter, <include> expansion, theme, feel, fonts,
// paragraph settings and text direction.
#import "/src/themes.typ": themes
#import "@preview/fontawesome:0.6.2": fa-icon
#import "/src/lib/option-schema.typ": option-schemas, option-keys
#import "/src/preprocess/comments.typ": strip-comments

// Code-block badge: lowercase fence language → display name + Font Awesome icon.
#let code-languages = (
  python: ("Python", "python"),
  javascript: ("JavaScript", "js"),
  typescript: ("TypeScript", "typescript"),
  java: ("Java", "java"),
  c: ("C", "c"),
  cpp: ("C++", "code"),
  csharp: ("C#", "code"),
  go: ("Go", "golang"),
  rust: ("Rust", "rust"),
  php: ("PHP", "php"),
  ruby: ("Ruby", "gem"),
  swift: ("Swift", "swift"),
  kotlin: ("Kotlin", "code"),
  julia: ("Julia", "julia"),
  r: ("R", "r-project"),
  matlab: ("MATLAB", "square-root-variable"),
  bash: ("Bash", "terminal"),
  powershell: ("PowerShell", "terminal"),
  sql: ("SQL", "database"),
  html: ("HTML", "html5"),
  css: ("CSS", "css3"),
  json: ("JSON", "file-code"),
  yaml: ("YAML", "file-lines"),
  toml: ("TOML", "gear"),
  xml: ("XML", "file-code"),
  markdown: ("Markdown", "markdown"),
  latex: ("LaTeX", "square-root-variable"),
  typst: ("Typst", "file-code"),
  dockerfile: ("Dockerfile", "docker"),
  nginx: ("Nginx", "server"),
)

#let code-language-aliases = (
  py: "python", js: "javascript", ts: "typescript", "c++": "cpp", cs: "csharp", "c#": "csharp",
  golang: "go", rs: "rust", rb: "ruby", kt: "kotlin", sh: "bash", shell: "bash", zsh: "bash",
  ps1: "powershell", pwsh: "powershell", yml: "yaml", md: "markdown", tex: "latex", typ: "typst",
  docker: "dockerfile",
)

// Unknown languages still get a badge with the fence name and a generic icon.
#let code-language(lang) = {
  if lang == none or lang == "" { return none }
  let key = lower(lang)
  key = code-language-aliases.at(key, default: key)
  let (name, icon) = code-languages.at(key, default: (lang, "code"))
  (name: name, icon: icon)
}

// A YAML front matter block at the very top of the Markdown (between two `---` lines)
// is merged over config.toml, so each document carries its own cover, header, theme, ...
// Typst resolves a path relative to the file that calls read()/image(); user paths are relative to the
// project root, so they are rooted here (and in components/src via root-path) to keep working from any file.
#let rooted(p) = if type(p) == str and not p.starts-with("/") and not p.contains("://") { "/" + p } else { p }
#let base-config = toml("/config.toml")
#let source-path = sys.inputs.at("source", default: base-config.at("source", default: "docs/doc_en.md"))
#let front-matter-regex = regex("^\u{FEFF}?---[ \t]*\r?\n((?:[\s\S]*?\r?\n)?)---[ \t]*(?:\r?\n|$)")
#let source-text = read(rooted(source-path))
#let front-matter-match = source-text.match(front-matter-regex)
#let front-matter = if front-matter-match == none { (:) } else {
  let data = yaml(bytes(front-matter-match.captures.first()))
  assert(
    data == none or type(data) == dictionary,
    message: "The front matter at the top of " + source-path + " must be `key: value` lines",
  )
  if data == none { (:) } else { data }
}

// `<include src="chapters/intro.md"></include>` alone on a line is replaced by that file's
// text before rendering, so headings, numbering, ids and <ref> work across files.
// A path starting with ./ or ../ is relative to the file that contains the include; any other path is
// relative to the project root (like images). An included file's front matter is dropped:
// only the main file's settings count. Lines inside fenced code blocks are left alone.
#let include-line = regex("^\s{0,3}<include\s+src=\"([^\"]+)\"\s*/?>(?:\s*</include>)?\s*\r?$")
#let resolve-include(path, from) = {
  if not (path.starts-with("./") or path.starts-with("../")) { return path }
  let parts = from.split("/").slice(0, -1)
  for seg in path.split("/") {
    if seg == "." or seg == "" { continue }
    if seg == ".." { if parts.len() > 0 { parts = parts.slice(0, -1) } } else { parts.push(seg) }
  }
  parts.join("/")
}
// Returns the expanded text and, for the checks that report a line of the user's own file, every file read on the way as
// `(path, text)` (an included file with its front matter, as it is on disk).
#let expand-includes(text, chain) = {
  let fence = none
  let out = ()
  let files = ()
  // Comments go first, so a commented-out `<include>` line is not followed.
  for line in strip-comments(text).split("\n") {
    let f = line.match(regex("^\s{0,3}(`{3,}|~{3,})"))
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
      out.push(line)
      continue
    }
    let m = if fence == none { line.match(include-line) }
    if m == none {
      out.push(line)
      continue
    }
    let path = resolve-include(m.captures.first(), chain.last())
    assert(path not in chain, message: "<include> loop: " + (chain + (path,)).join(" -> "))
    let included = read(rooted(path))
    files.push((path, included))
    let fm = included.match(front-matter-regex)
    if fm != none { included = included.slice(fm.end) }
    // Blank lines keep the included blocks from merging with the surrounding paragraphs.
    let inner = expand-includes(included, chain + (path,))
    files += inner.files
    out.push("")
    out.push(inner.text)
    out.push("")
  }
  (text: out.join("\n"), files: files)
}

#let expanded-source = expand-includes(
  if front-matter-match == none { source-text } else { source-text.slice(front-matter-match.end) },
  (source-path,),
)
#let source-body = expanded-source.text
// The main file and the files it includes, each as `(path, text)`: what the checks of `src/preprocess/check.typ` read.
#let source-files = ((source-path, source-text),) + expanded-source.files

#let merge-config(base, over) = {
  let out = base
  for (key, value) in over {
    let old = out.at(key, default: none)
    out.insert(key, if type(old) == dictionary and type(value) == dictionary { merge-config(old, value) } else { value })
  }
  out
}
#let config = merge-config(base-config, front-matter)
// Themes of the user: `[themes.<name>]` in config.toml, with hex colors (`bg = "#ffffff"`). `base` names the theme to start from;
// a color left out comes from it (paper, or midnight when `dark = true`).
#let theme-color-keys = ("bg", "fg", "heading", "muted", "accent", "secondary", "rule", "code-bg", "code-stroke")
#let custom-themes = {
  let out = (:)
  for (name, def) in config.at("themes", default: (:)) {
    let base-name = def.at("base", default: none)
    let base-given = base-name != none and base-name in themes
    let dark = def.at("dark", default: if base-given { themes.at(base-name).dark } else { false })
    let base = themes.at(if base-given { base-name } else if dark { "midnight" } else { "paper" })
    let made = (dark: dark)
    for key in theme-color-keys {
      let value = def.at(key, default: none)
      made.insert(key, if value == none { base.at(key) } else { rgb(value) })
    }
    out.insert(name, made)
  }
  out
}
#let all-themes = themes + custom-themes
#let theme-name = sys.inputs.at("theme", default: config.at("theme", default: "paper"))
#assert(theme-name in all-themes, message: "Unknown theme \"" + theme-name + "\"; available: " + all-themes.keys().join(", "))
#let theme = all-themes.at(theme-name)

// `scale` (percent) enlarges or shrinks everything on the page (text, code, paddings, corners,
// rules) without touching the page size or margins. Fixed lengths are written as `Npt * zoom`.
#let zoom = {
  let s = sys.inputs.at("scale", default: config.at("scale", default: 100))
  let v = if type(s) == str { float(s.trim().trim("%")) } else { float(s) }
  assert(v > 0, message: "scale must be a positive percentage, got " + repr(s))
  v / 100
}

// Overall feel = corner rounding of every container plus default fonts.
// Explicit `radius` attributes and [font] settings still win.
// Every component takes its corners and marker shapes from here, never from literals:
// formal is square everywhere, standard slightly rounded, friendly clearly rounded.
#let feels = (
  formal: (
    code: 0pt, inline: 0pt, badge: 0pt, alert: 0pt, theorem: 0pt, box: 0pt, image: 0pt, frame: 0pt, band: 0pt, heading: 0pt,
    table: "rules",
    // Forces the header style; none = the document's `header.style`.
    header: "line",
    // <steps> markers: "square" outlined squares, "soft" tinted rounded squares, "solid" the same tinted look as circles.
    steps: "square",
    latin: "New Computer Modern", persian: "XB Niloofar",
  ),
  standard: (
    code: 6pt * zoom, inline: 2pt * zoom, badge: 4pt * zoom, alert: 8pt * zoom, theorem: 6pt * zoom, box: 6pt * zoom, image: 6pt * zoom, frame: 10pt * zoom, band: 6pt * zoom, heading: 5pt * zoom,
    table: "lined",
    header: none,
    steps: "soft",
    latin: "Inter", persian: "IRANSansX",
  ),
  friendly: (
    code: 14pt * zoom, inline: 4pt * zoom, badge: 9pt * zoom, alert: 16pt * zoom, theorem: 14pt * zoom, box: 14pt * zoom, image: 16pt * zoom, frame: 24pt * zoom, band: 14pt * zoom, heading: 10pt * zoom,
    table: "card",
    header: none,
    steps: "solid",
    latin: "Lexend", persian: "Pelak",
  ),
)
// Color presets for <alert type>, <box color>, [heading] color and the like: the Tailwind palette.
// The Tailwind CSS color palette (shades 50 to 950). Every name works as a color preset, with or without a
// shade: `blue` is blue-500, which is then never used as-is but mixed toward the page color, so it fits light
// and dark themes alike. `blue-200` etc. name that exact shade (see `tinted` / `div-color`).
#let tailwind-shades = (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950)
#let tailwind-palette = (
  slate: ("f8fafc", "f1f5f9", "e2e8f0", "cbd5e1", "94a3b8", "64748b", "475569", "334155", "1e293b", "0f172a", "020617"),
  gray: ("f9fafb", "f3f4f6", "e5e7eb", "d1d5db", "9ca3af", "6b7280", "4b5563", "374151", "1f2937", "111827", "030712"),
  zinc: ("fafafa", "f4f4f5", "e4e4e7", "d4d4d8", "a1a1aa", "71717a", "52525b", "3f3f46", "27272a", "18181b", "09090b"),
  neutral: ("fafafa", "f5f5f5", "e5e5e5", "d4d4d4", "a3a3a3", "737373", "525252", "404040", "262626", "171717", "0a0a0a"),
  stone: ("fafaf9", "f5f5f4", "e7e5e4", "d6d3d1", "a8a29e", "78716c", "57534e", "44403c", "292524", "1c1917", "0c0a09"),
  red: ("fef2f2", "fee2e2", "fecaca", "fca5a5", "f87171", "ef4444", "dc2626", "b91c1c", "991b1b", "7f1d1d", "450a0a"),
  orange: ("fff7ed", "ffedd5", "fed7aa", "fdba74", "fb923c", "f97316", "ea580c", "c2410c", "9a3412", "7c2d12", "431407"),
  amber: ("fffbeb", "fef3c7", "fde68a", "fcd34d", "fbbf24", "f59e0b", "d97706", "b45309", "92400e", "78350f", "451a03"),
  yellow: ("fefce8", "fef9c3", "fef08a", "fde047", "facc15", "eab308", "ca8a04", "a16207", "854d0e", "713f12", "422006"),
  lime: ("f7fee7", "ecfccb", "d9f99d", "bef264", "a3e635", "84cc16", "65a30d", "4d7c0f", "3f6212", "365314", "1a2e05"),
  green: ("f0fdf4", "dcfce7", "bbf7d0", "86efac", "4ade80", "22c55e", "16a34a", "15803d", "166534", "14532d", "052e16"),
  emerald: ("ecfdf5", "d1fae5", "a7f3d0", "6ee7b7", "34d399", "10b981", "059669", "047857", "065f46", "064e3b", "022c22"),
  teal: ("f0fdfa", "ccfbf1", "99f6e4", "5eead4", "2dd4bf", "14b8a6", "0d9488", "0f766e", "115e59", "134e4a", "042f2e"),
  cyan: ("ecfeff", "cffafe", "a5f3fc", "67e8f9", "22d3ee", "06b6d4", "0891b2", "0e7490", "155e75", "164e63", "083344"),
  sky: ("f0f9ff", "e0f2fe", "bae6fd", "7dd3fc", "38bdf8", "0ea5e9", "0284c7", "0369a1", "075985", "0c4a6e", "082f49"),
  blue: ("eff6ff", "dbeafe", "bfdbfe", "93c5fd", "60a5fa", "3b82f6", "2563eb", "1d4ed8", "1e40af", "1e3a8a", "172554"),
  indigo: ("eef2ff", "e0e7ff", "c7d2fe", "a5b4fc", "818cf8", "6366f1", "4f46e5", "4338ca", "3730a3", "312e81", "1e1b4b"),
  violet: ("f5f3ff", "ede9fe", "ddd6fe", "c4b5fd", "a78bfa", "8b5cf6", "7c3aed", "6d28d9", "5b21b6", "4c1d95", "2e1065"),
  purple: ("faf5ff", "f3e8ff", "e9d5ff", "d8b4fe", "c084fc", "a855f7", "9333ea", "7e22ce", "6b21a8", "581c87", "3b0764"),
  fuchsia: ("fdf4ff", "fae8ff", "f5d0fe", "f0abfc", "e879f9", "d946ef", "c026d3", "a21caf", "86198f", "701a75", "4a044e"),
  pink: ("fdf2f8", "fce7f3", "fbcfe8", "f9a8d4", "f472b6", "ec4899", "db2777", "be185d", "9d174d", "831843", "500724"),
  rose: ("fff1f2", "ffe4e6", "fecdd3", "fda4af", "fb7185", "f43f5e", "e11d48", "be123c", "9f1239", "881337", "4c0519"),
)
// Shade names ("blue-200") are keys too, so every site that reads `color-presets` accepts them.
#let color-names = tailwind-palette.keys()
#let color-presets = {
  let out = (:)
  for (name, hexes) in tailwind-palette {
    out.insert(name, rgb("#" + hexes.at(5)))
    for (shade, hex) in tailwind-shades.zip(hexes) { out.insert(name + "-" + str(shade), rgb("#" + hex)) }
  }
  out
}

#let feel-name = sys.inputs.at("feel", default: config.at("feel", default: "formal"))
#assert(feel-name in feels, message: "Unknown feel " + repr(feel-name) + "; available: " + feels.keys().join(", "))
#let feel = feels.at(feel-name)

// [heading]: rule below and / or tinted background for headings up to `max-level`.
// Text, rule and tint all derive from `color` (preset name or hex; "" = the theme's heading color).
// Every key can be overridden in front matter; an empty YAML value (`color:`) means the default.
#let heading-config = {
  let h = config.at("heading", default: none)
  if h == none { (:) } else {
    assert(type(h) == dictionary, message: "`heading` must be a table of settings (numbering, underline, fill, ...), got " + repr(h))
    h
  }
}
#let heading-key(key, default) = {
  let v = heading-config.at(key, default: none)
  if v == none { default } else { v }
}
#let heading-flag(key, default) = {
  let v = heading-key(key, default)
  assert(type(v) == bool, message: "heading " + key + " must be true or false, got " + repr(v))
  v
}
#let heading-underline = heading-flag("underline", false)
#let heading-fill = heading-flag("fill", false)
#let heading-max-level = int(heading-key("max-level", 2))
// The old top-level `heading-numbering` key still works.
#let heading-numbered = heading-flag("numbering", config.at("heading-numbering", default: false))
// Text right after the number: "" gives "۱ مقدمه", "." gives "۱. مقدمه", " -" gives "۱ - مقدمه".
#let heading-suffix = str(heading-key("number-suffix", ""))
// Text right before the number: "(" with suffix ")" gives "(۱) مقدمه".
#let heading-prefix = str(heading-key("number-prefix", ""))
#let resolve-heading-color(c) = {
  let c = str(c)
  if c == "" { theme.heading } else if c in color-presets {
    let hue = color-presets.at(c)
    if theme.dark { hue.lighten(30%) } else { hue.darken(15%) }
  } else {
    assert(c.starts-with("#"), message: "heading color must be a hex color or one of: " + color-names.join(", ") + " (optionally with a shade, like blue-200)" + ", got " + repr(c))
    rgb(c)
  }
}
#let heading-color = resolve-heading-color(heading-key("color", ""))

// `## Title {#id fill=true color=red numbering=false}`: per-heading overrides of [heading]
// (see `heading-ids` in main.typ). Numbering is set on the heading itself; the look keys
// reach the show rule through this state, which is cleared right after the heading.
#let heading-options = state("heading-options", (:))
#let heading-option-keys = option-keys("heading", without: ("id",))

// Typst takes each character from the first font that has it: Latin text gets
// the Latin font, Persian falls through to the Persian one.
#let font-config = config.at("font", default: (:))
#let latin-font = font-config.at("latin", default: feel.latin)
#let persian-font = font-config.at("persian", default: feel.persian)
#let code-font = font-config.at("code", default: "Anonymous Pro")

// [paragraph]: spacing and alignment of the text. An empty front matter value means the default.
#let paragraph-config = config.at("paragraph", default: (:))
#let paragraph-number(key, default) = {
  let v = paragraph-config.at(key, default: none)
  if v == none { return default }
  assert(type(v) in (int, float), message: "[paragraph] " + key + " must be a number, got " + repr(v))
  v
}
// Percent of the font's normal space: 100 = unchanged.
#let word-spacing = paragraph-number("word-spacing", 100) * 1%
// Extra space between letters, percent of the font size: 0 = unchanged.
#let letter-spacing = paragraph-number("letter-spacing", 0) / 100 * 1em
// Gap between lines, percent of Typst's normal gap (0.65em): 100 = unchanged.
#let line-spacing = {
  let v = paragraph-number("line-spacing", 100)
  assert(v >= 0, message: "[paragraph] line-spacing must be 0 or more, got " + repr(v))
  v / 100 * 0.65em
}
#let justify = {
  let v = paragraph-config.at("justify", default: none)
  if v == none { false } else {
    assert(type(v) == bool, message: "[paragraph] justify must be true or false, got " + repr(v))
    v
  }
}

// Code and math are direction-neutral, so they are skipped.
// Directional marks count as strong characters: RLM (U+200F) / ALM (U+061C) force RTL, LRM (U+200E) forces LTR.
#let first-letter(it) = {
  if type(it) == str {
    let m = it.match(regex("[\p{L}\u{200E}\u{200F}\u{061C}]"))
    return if m != none { m.text } else { none }
  }
  if type(it) != content { return none }
  if it.func() in (raw, math.equation) { return none }
  if it.has("text") { return first-letter(it.text) }
  if it.has("children") {
    for child in it.children {
      let ch = first-letter(child)
      if ch != none { return ch }
    }
    return none
  }
  if it.has("body") { return first-letter(it.body) }
  if it.has("child") { return first-letter(it.child) }
  none
}

#let text-dir(body) = {
  let ch = first-letter(body)
  if ch == none { none } else if ch.match(regex("[\p{Arabic}\u{200F}\u{061C}]")) != none { rtl } else { ltr }
}

#let is-rtl(body) = text-dir(body) != ltr

// Text direction: "auto" = every block from its first letter; "rtl" / "ltr" force it on everything.
#let doc-dir = sys.inputs.at("dir", default: config.at("dir", default: "auto"))
#assert(doc-dir in ("auto", "rtl", "ltr"), message: "dir must be auto, rtl or ltr, got " + repr(doc-dir))
#let named-dir(d) = if d == "rtl" { rtl } else if d == "ltr" { ltr } else { none }
// Nested <dir to="..."> blocks; the innermost one wins over doc-dir.
#let dir-stack = state("dir-stack", ())
// Direction of `body` under the current mode: the forced one, or its first letter (none: no letters).
// Must be called inside `context`.
#let content-dir(body) = {
  let s = dir-stack.get()
  let forced = named-dir(if s.len() > 0 { s.last() } else { doc-dir })
  if forced != none { forced } else { text-dir(body) }
}
// Same for page furniture (header, footer, cover), which only follows the document setting.
#let doc-text-dir(body) = {
  let forced = named-dir(doc-dir)
  if forced != none { forced } else { text-dir(body) }
}

#let last-dir = state("last-dir", ltr)

// <align> pushes its value here while its content is laid out, so tables, figures and
// drawings (which align themselves explicitly) follow the enclosing alignment too.
#let align-names = (center: center, left: left, right: right, start: start, end: end)
#let align-stack = state("align-stack", ())

// The enclosing <align>, or `fallback` outside any. Must be called inside `context`.
#let inherited-align(fallback) = {
  let s = align-stack.get()
  if s.len() > 0 { s.last() } else { fallback }
}

// Content without any letters inherits the direction of the previous block.
#let auto-dir(it) = context {
  let d = content-dir(it)
  if d == none {
    set text(dir: last-dir.get())
    it
  } else {
    last-dir.update(d)
    set text(dir: d)
    it
  }
}

// Leading zeros are dropped so documents starting at `==` aren't numbered "0.1".
#let heading-number(nums, rtl-digits) = {
  let n = nums
  while n.len() > 1 and n.first() == 0 { n = n.slice(1) }
  numbering(if rtl-digits { "۱.۱" } else { "1.1" }, ..n)
}

#let make-heading-numbering(suffix, prefix: "") = (..nums) => context prefix + heading-number(nums.pos(), text.dir == rtl) + suffix
#let heading-numbering = make-heading-numbering(heading-suffix, prefix: heading-prefix)
