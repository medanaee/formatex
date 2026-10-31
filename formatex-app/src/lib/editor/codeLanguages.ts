import { StreamLanguage, type StreamParser } from "@codemirror/language"
import { cmake } from "@codemirror/legacy-modes/mode/cmake"
import { c, cpp, csharp, dart, java, kotlin, objectiveC, scala } from "@codemirror/legacy-modes/mode/clike"
import { css, less, sCSS } from "@codemirror/legacy-modes/mode/css"
import { diff } from "@codemirror/legacy-modes/mode/diff"
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile"
import { go } from "@codemirror/legacy-modes/mode/go"
import { haskell } from "@codemirror/legacy-modes/mode/haskell"
import { javascript, typescript } from "@codemirror/legacy-modes/mode/javascript"
import { julia } from "@codemirror/legacy-modes/mode/julia"
import { lua } from "@codemirror/legacy-modes/mode/lua"
import { perl } from "@codemirror/legacy-modes/mode/perl"
import { powerShell } from "@codemirror/legacy-modes/mode/powershell"
import { properties } from "@codemirror/legacy-modes/mode/properties"
import { python } from "@codemirror/legacy-modes/mode/python"
import { r } from "@codemirror/legacy-modes/mode/r"
import { ruby } from "@codemirror/legacy-modes/mode/ruby"
import { rust } from "@codemirror/legacy-modes/mode/rust"
import { shell } from "@codemirror/legacy-modes/mode/shell"
import { standardSQL } from "@codemirror/legacy-modes/mode/sql"
import { swift } from "@codemirror/legacy-modes/mode/swift"
import { html, xml } from "@codemirror/legacy-modes/mode/xml"
import { extensionOf, baseName } from "@/lib/projects/paths"

// Only the ones whose colors are worth having; every other code file is shown as plain text.
const PARSERS: Record<string, StreamParser<unknown>> = {
  py: python, pyw: python,
  js: javascript, mjs: javascript, cjs: javascript, jsx: javascript,
  ts: typescript, tsx: typescript,
  c: c, h: c, cpp: cpp, cc: cpp, cxx: cpp, hpp: cpp, hh: cpp, m: objectiveC, mm: objectiveC,
  java: java, cs: csharp, kt: kotlin, kts: kotlin, scala: scala, dart: dart, swift: swift,
  go: go, rs: rust, rb: ruby, pl: perl, pm: perl, lua: lua, r: r, jl: julia, hs: haskell,
  sql: standardSQL,
  sh: shell, bash: shell, zsh: shell, ps1: powerShell,
  css: css, scss: sCSS, less: less,
  xml: xml, html: html,
  ini: properties, cfg: properties, conf: properties, properties: properties,
  diff: diff, patch: diff,
  cmake: cmake, dockerfile: dockerFile,
}

/** The colors of a code file by its extension (or its name, for a Dockerfile), or nothing when the language is not known. */
export function codeLanguageFor(path: string) {
  const name = baseName(path).toLowerCase()
  const parser = PARSERS[name === "dockerfile" ? "dockerfile" : extensionOf(path)]
  return parser ? StreamLanguage.define(parser) : []
}
