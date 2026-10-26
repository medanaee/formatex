import type { CheckOutput, ComponentInfo, ComponentSource } from "./api"

/**
 * The component library in a plain browser (`vite dev`, UI work): the built-in sources come from the synced engine, the user's
 * components live in localStorage. There is no compiler, so nothing is checked and the registry is not generated; this exists to
 * run the Components screen, not to hold real work.
 */
const builtinFiles = import.meta.glob("../../../engine/bundle/components/*.typ", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>

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
    .map((path) => path.slice(path.lastIndexOf("/") + 1, -4))
    .filter((name) => !name.startsWith("_"))
    .sort()

const builtinSource = async (name: string): Promise<string | null> => {
  const loader = Object.entries(builtinFiles).find(([path]) => path.endsWith(`/${name}.typ`))?.[1]
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
  const names = [...new Set([...builtinNames(), ...Object.keys(stored.files)])].sort()
  return Promise.all(
    names.map(async (name) => {
      const builtin = await builtinSource(name)
      const source = stored.files[name] ?? builtin ?? ""
      return {
        name,
        origin: builtin !== null ? "builtin" : "user",
        modified: builtin !== null && name in stored.files,
        enabled: !stored.disabled.includes(name),
        tags: tagsOf(name, source),
        problem: null,
      } satisfies ComponentInfo
    })
  )
}

export async function source(name: string): Promise<ComponentSource> {
  const builtin = await builtinSource(name)
  return { source: read().files[name] ?? builtin ?? "", builtin }
}

export async function save(name: string, text: string): Promise<CheckOutput> {
  const stored = read()
  stored.files[name] = text
  write(stored)
  return ok
}

export async function remove(name: string): Promise<CheckOutput> {
  const stored = read()
  delete stored.files[name]
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
