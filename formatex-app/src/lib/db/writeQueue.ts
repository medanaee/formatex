/**
 * Coalescing, serial write queue. Every entity has one key (`doc:<id>`, `ink:<doc>/<page>`, ...): scheduling a key again
 * replaces what was pending for it (the latest state / operation wins, e.g. a delete after a save), and its timer restarts.
 * Writes run one after another so the database never sees two of them at once; `flush` runs everything immediately.
 */
export class WriteQueue {
  private pending = new Map<string, { run: () => Promise<void>; timer: ReturnType<typeof setTimeout> }>()
  private chain: Promise<void> = Promise.resolve()

  private readonly onError: (error: unknown) => void

  constructor(onError: (error: unknown) => void = () => {}) {
    this.onError = onError
  }

  schedule(key: string, delayMs: number, run: () => Promise<void>): void {
    const existing = this.pending.get(key)
    if (existing) clearTimeout(existing.timer)
    const timer = setTimeout(() => this.start(key), delayMs)
    this.pending.set(key, { run, timer })
  }

  /** Drops a pending write (the entity is gone or is about to be handled by something else). */
  cancel(key: string): void {
    const existing = this.pending.get(key)
    if (!existing) return
    clearTimeout(existing.timer)
    this.pending.delete(key)
  }

  cancelPrefix(prefix: string): void {
    for (const key of [...this.pending.keys()]) if (key.startsWith(prefix)) this.cancel(key)
  }

  hasPending(prefix = ""): boolean {
    return [...this.pending.keys()].some((key) => key.startsWith(prefix))
  }

  /** Runs every pending write (optionally only the keys under `prefix`) now and resolves when the queue is empty. */
  async flush(prefix = ""): Promise<void> {
    for (const key of [...this.pending.keys()]) if (key.startsWith(prefix)) this.start(key)
    await this.chain
  }

  private start(key: string): void {
    const entry = this.pending.get(key)
    if (!entry) return
    clearTimeout(entry.timer)
    this.pending.delete(key)
    this.chain = this.chain.then(() => entry.run()).catch((error) => this.onError(error))
  }
}
