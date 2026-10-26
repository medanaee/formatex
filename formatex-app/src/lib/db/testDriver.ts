/// <reference types="node" />
import { DatabaseSync } from "node:sqlite"
import type { SqlDriver } from "./types"

/** Real SQLite in memory (Node's built-in `node:sqlite`) behind the app's `SqlDriver`; used by tests only. */
export function createMemoryDriver(): SqlDriver & { raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:")
  return {
    raw,
    async execute(sql, params = []) {
      raw.prepare(sql).run(...(params as never[]))
    },
    async select<T>(sql: string, params: unknown[] = []) {
      return raw.prepare(sql).all(...(params as never[])) as unknown as T[]
    },
  }
}
