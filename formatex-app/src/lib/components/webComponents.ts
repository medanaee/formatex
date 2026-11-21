import type { CheckOutput, ComponentInfo, ComponentSource } from "./api"

/**
 * The component library in a plain browser (`vite dev`, UI work): the built-in sources come from the synced engine, the user's
 * components live in localStorage. There is no compiler, so nothing is checked and the registry is not generated; this exists to
 * run the Components screen, not to hold real work.
 */
const builtinFiles = import.meta.glob("../../../engine/bundle/components/*/*", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>

const KEY = "formatex_web_components"
interface Stored {
  files: Record<string, string>
  disabled: string[]
}

const read = (): Stored => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Stored
  } catch {
    // Start empty
  }
  return { files: {}, disabled: [] }
}
const write = (stored: Stored) => localStorage.setItem(KEY, JSON.stringify(stored))

const builtinNames = (): string[] =>
  Object.keys(builtinFiles)
    .map((path) => path.split("/").at(-2)!)
    .filter((name) => !name.startsWith("_"))
    .sort()

const builtinSource = async (name: string, file = "typst.typ"): Promise<string | null> => {
  const loader = Object.entries(builtinFiles).find(([path]) => path.endsWith(`/${name}/${file}`))?.[1]
  return loader ? loader() : null
}

/** The tag names a component declares: the keys of its `<name>-tags` dictionary. */
export function tagsOf(name: string, source: string): string[] {
  const lines = source.split("\n")
  const start = lines.findIndex((line) => new RegExp(`^#let\\s+${name}-tags\\s*=`).test(line))
  if (start < 0 || lines[start].trimEnd().endsWith("(:)")) return []
  const tags: string[] = []
  let indent: number | null = null
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith(")")) break
    const found = /^(\s+)"?([A-Za-z][\w-]*)"?\s*:\s*\S/.exec(line)
    if (!found) continue
    indent ??= found[1].length
    if (found[1].length === indent) tags.push(found[2])
  }
  return tags
}

const ok: CheckOutput = { ok: true, diagnostics: [] }

export async function list(): Promise<ComponentInfo[]> {
  const stored = read()
  const names = [...new Set([...builtinNames(), ...Object.keys(stored.files).map(key => key.split("/")[0])])].sort()
  return Promise.all(
    names.map(async (name) => {
      const builtin = await builtinSource(name)
      const source = stored.files[`${name}/typst.typ`] ?? builtin ?? ""
      const schema = stored.files[`${name}/schema.json`] ?? await builtinSource(name, "schema.json")
      return {
        name,
        origin: builtin !== null ? "builtin" : "user",
        modified: builtin !== null && Object.keys(stored.files).some(key => key.startsWith(`${name}/`)),
        enabled: !stored.disabled.includes(name),
        tags: schema ? Object.keys(JSON.parse(schema)) : tagsOf(name, source),
        problem: null,
      } satisfies ComponentInfo
    })
  )
}

export async function source(name: string, file = "typst.typ"): Promise<ComponentSource> {
  const builtin = await builtinSource(name, file)
  return { source: read().files[`${name}/${file}`] ?? builtin ?? "", builtin }
}

export async function save(name: string, text: string, file = "typst.typ"): Promise<CheckOutput> {
  const stored = read()
  stored.files[`${name}/${file}`] = text
  write(stored)
  return ok
}

export async function remove(name: string): Promise<CheckOutput> {
  const stored = read()
  for (const key of Object.keys(stored.files)) if (key.startsWith(`${name}/`)) delete stored.files[key]
  stored.disabled = stored.disabled.filter((item) => item !== name)
  write(stored)
  return ok
}

export async function setEnabled(name: string, enabled: boolean): Promise<CheckOutput> {
  const stored = read()
  stored.disabled = enabled ? stored.disabled.filter((item) => item !== name) : [...new Set([...stored.disabled, name])]
  write(stored)
  return ok
}
