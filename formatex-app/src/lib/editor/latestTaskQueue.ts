/** One running task and one replaceable pending task, including across preview remounts. */
export class LatestTaskQueue {
  private running = false
  private pending: { id: number; due: number; run: () => Promise<void> } | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private serial = 0

  schedule(run: () => Promise<void>, delay: number): () => void {
    const id = ++this.serial
    this.pending = { id, due: Date.now() + delay, run }
    this.pump()
    return () => {
      if (this.pending?.id === id) {
        this.pending = null
        clearTimeout(this.timer)
      }
    }
  }

  private pump(): void {
    clearTimeout(this.timer)
    if (this.running || !this.pending) return
    const wait = this.pending.due - Date.now()
    if (wait > 0) {
      this.timer = setTimeout(() => this.pump(), wait)
      return
    }
    const task = this.pending
    this.pending = null
    this.running = true
    void Promise.resolve().then(task.run).catch((error: unknown) => console.error("[formatex] preview task failed", error)).finally(() => {
      this.running = false
      this.pump()
    })
  }
}

export const htmlPreviewQueue = new LatestTaskQueue()
export const previewDelay = (elapsed: number): number => Math.min(250, Math.max(120, elapsed / 4))
