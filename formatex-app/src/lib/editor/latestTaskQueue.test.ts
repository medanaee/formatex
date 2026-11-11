import { afterEach, describe, expect, it, vi } from "vitest"
import { LatestTaskQueue, previewDelay } from "./latestTaskQueue"

afterEach(() => vi.useRealTimers())

describe("latest preview queue", () => {
  it("runs only the latest queued snapshot after an active compile, never in parallel", async () => {
    vi.useFakeTimers()
    const queue = new LatestTaskQueue()
    const calls: number[] = []
    let release!: () => void
    queue.schedule(async () => { calls.push(1); await new Promise<void>((resolve) => { release = resolve }) }, 0)
    await vi.advanceTimersByTimeAsync(0)
    queue.schedule(async () => { calls.push(2) }, 120)
    queue.schedule(async () => { calls.push(3) }, 120)
    await vi.advanceTimersByTimeAsync(500)
    expect(calls).toEqual([1])
    release()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toEqual([1, 3])
  })

  it("cancels an unmounted request without cancelling its replacement", async () => {
    vi.useFakeTimers()
    const queue = new LatestTaskQueue()
    const first = vi.fn(async () => {})
    const second = vi.fn(async () => {})
    const cancel = queue.schedule(first, 120)
    queue.schedule(second, 120)
    cancel()
    await vi.advanceTimersByTimeAsync(120)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  it("releases the queue after a failed compile", async () => {
    vi.useFakeTimers()
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const queue = new LatestTaskQueue()
      queue.schedule(async () => { throw new Error("failed") }, 0)
      await vi.advanceTimersByTimeAsync(0)
      const next = vi.fn(async () => {})
      queue.schedule(next, 120)
      await vi.advanceTimersByTimeAsync(120)
      expect(next).toHaveBeenCalledOnce()
    } finally { error.mockRestore() }
  })

  it("bounds debounce without introducing another long delay", () => {
    expect(previewDelay(80)).toBe(120)
    expect(previewDelay(800)).toBe(200)
    expect(previewDelay(8000)).toBe(250)
  })
})
