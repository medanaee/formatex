import { describe, expect, it } from "vitest"
import { fromConditional, isConditional, isVariableName, readTomlVariables, readVariables, ruleLiteral, toConditional, valueLiteral } from "./variables"

describe("readVariables", () => {
  it("reads the values of vars with the rule of each from var-types", () => {
    const text = [
      "---",
      "theme: zinc",
      "vars:",
      '  course: "Calculus 1"',
      "  year: 1405   # the term",
      "  draft: true",
      "  audience: teacher",
      "  level: 2",
      "  width: 12em",
      "  exam: data/exam.json",
      "  extra: { a: 1 }",
      "var-types:",
      "  audience: [student, teacher, parent]",
      "  level: { min: 1, max: 3 }",
      "  width: length",
      "  exam: json",
      "  mode:",
      "    - a",
      "    - 'b c'",
      "header:",
      "  start: x",
      "---",
      "text",
    ].join("\n")
    expect(readVariables(text)).toEqual([
      { name: "course", value: "Calculus 1", quoted: true, rule: undefined },
      { name: "year", value: "1405", quoted: false, rule: undefined },
      { name: "draft", value: "true", quoted: false, rule: undefined },
      { name: "audience", value: "teacher", quoted: false, rule: { kind: "enum", options: ["student", "teacher", "parent"] } },
      { name: "level", value: "2", quoted: false, rule: { kind: "range", min: "1", max: "3" } },
      { name: "width", value: "12em", quoted: false, rule: { kind: "type", name: "length" } },
      { name: "exam", value: "data/exam.json", quoted: false, rule: { kind: "type", name: "json" } },
      { name: "extra", value: "{ a: 1 }", block: true, rule: undefined },
      { name: "mode", rule: { kind: "enum", options: ["a", "b c"] } },
    ])
  })

  it("is empty without a front matter or a vars block", () => {
    expect(readVariables("# Title")).toEqual([])
    expect(readVariables("---\ntheme: zinc\n---\n")).toEqual([])
  })

  it("stops at the next top-level key", () => {
    const text = "---\nvars:\n  a: 1\nheader:\n  start: x\n---\n"
    expect(readVariables(text).map((v) => v.name)).toEqual(["a"])
  })
})

describe("readTomlVariables", () => {
  it("reads [vars] and [var-types]", () => {
    const text = ['theme = "zinc"', "[vars]", "year = 1405", 'audience = "student"', "[var-types]", 'audience = ["student", "teacher"]', 'width = "length"', "level = { min = 1, max = 3 }", "[header]", 'start = "x"'].join("\n")
    expect(readTomlVariables(text)).toEqual([
      { name: "year", value: "1405", quoted: false, block: undefined, rule: undefined },
      { name: "audience", value: "student", quoted: true, block: undefined, rule: { kind: "enum", options: ["student", "teacher"] } },
      { name: "width", rule: { kind: "type", name: "length" } },
      { name: "level", rule: { kind: "range", min: "1", max: "3" } },
    ])
  })
})

describe("literals", () => {
  const string = (text: string) => JSON.stringify(text)
  it("writes a value, bare for numbers and booleans", () => {
    expect(valueLiteral("1405", false, string)).toBe("1405")
    expect(valueLiteral("1405", true, string)).toBe('"1405"')
    expect(valueLiteral("x y", false, string)).toBe('"x y"')
    expect(valueLiteral("true", false, string)).toBe("true")
  })
  it("writes a rule for both formats", () => {
    expect(ruleLiteral({ kind: "enum", options: ["a", "b c", "3"] }, false, string)).toBe('["a", "b c", 3]')
    expect(ruleLiteral({ kind: "range", min: "1", max: "3" }, false, string)).toBe("{ min: 1, max: 3 }")
    expect(ruleLiteral({ kind: "range", min: "1" }, true, string)).toBe("{ min = 1 }")
    expect(ruleLiteral({ kind: "type", name: "length" }, true, string)).toBe('"length"')
  })
})

describe("names", () => {
  it("accepts what the engine accepts", () => {
    expect(isVariableName("exercise-toc")).toBe(true)
    expect(isVariableName("year")).toBe(true)
    expect(isVariableName("if")).toBe(false)
    expect(isVariableName("setting")).toBe(false)
    expect(isVariableName("PAGE")).toBe(false)
    expect(isVariableName("2a")).toBe(false)
  })
})

describe("conditional values", () => {
  it("turns a fixed value into a choice and back", () => {
    expect(toConditional("info", "draft")).toBe("{{ if draft { 'info' } else { 'info' } }}")
    expect(toConditional("two words", "draft")).toBe("{{ if draft { 'two words' } else { 'two words' } }}")
    expect(fromConditional("{{ if draft { 'warning' } else { 'info' } }}")).toBe("warning")
    expect(fromConditional('{{ if a == "x" { "two words" } else { "y" } }}')).toBe("two words")
    expect(fromConditional("{{ year }}")).toBe("")
    expect(fromConditional("plain")).toBe("plain")
    expect(isConditional("{{ a }}")).toBe(true)
    expect(isConditional("a")).toBe(false)
  })
})
