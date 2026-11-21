// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest"
import { trackReading } from "../../../../formatex-html/src/reading"

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML="" })

it("keeps the clicked heading through intermediate and bottom-clamped scroll, then follows manual reading", () => {
  document.body.innerHTML='<main class="fx-doc"><h2 id="one">One</h2><h3 id="two">Two</h3><h3 id="three">Three</h3></main><aside class="fx-outline">Contents</aside>'
  let y=0
  const tops={one:100,two:130,three:900}
  for(const [id,top] of Object.entries(tops)) vi.spyOn(document.getElementById(id)!,"getBoundingClientRect").mockImplementation(()=>({top:top-y} as DOMRect))
  vi.stubGlobal("scrollY",0); vi.stubGlobal("innerHeight",600)
  vi.spyOn(document.documentElement,"scrollHeight","get").mockReturnValue(1000)
  let frame:FrameRequestCallback|undefined
  vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{frame=callback;return 1})
  vi.stubGlobal("cancelAnimationFrame",()=>{frame=undefined})
  const flush=()=>{const callback=frame;frame=undefined;callback?.(0)}
  const changed=vi.fn()
  const tracker=trackReading(Object.keys(tops).map(id=>({id})),44,changed)
  const scroll=(next:number)=>{y=next;vi.stubGlobal("scrollY",next);window.dispatchEvent(new Event("scroll"));flush()}
  try {
    flush()
    tracker.select("one"); scroll(110)
    expect(changed.mock.lastCall?.[0].heading).toBe("one")
    expect(changed.mock.lastCall?.[0].progress).toBeCloseTo(27.5)
    scroll(400)
    expect(changed.mock.lastCall?.[0]).toEqual({heading:"one",progress:100})
    tracker.select("three");flush()
    expect(changed.mock.lastCall?.[0].heading).toBe("three")
    document.querySelector(".fx-outline")!.dispatchEvent(new WheelEvent("wheel",{bubbles:true}));flush()
    expect(changed.mock.lastCall?.[0].heading).toBe("three")
    window.dispatchEvent(new WheelEvent("wheel"));flush()
    expect(changed.mock.lastCall?.[0].heading).toBe("two")
    tracker.select("one");flush()
    const toolbar=document.createElement("nav");toolbar.className="fx-toolbar";document.body.append(toolbar)
    toolbar.dispatchEvent(new KeyboardEvent("keydown",{key:"PageDown",bubbles:true}));flush()
    expect(changed.mock.lastCall?.[0].heading).toBe("two")
    tracker.select("one");flush();tracker.resume();flush()
    expect(changed.mock.lastCall?.[0].heading).toBe("two")
    scroll(50)
    expect(changed.mock.lastCall?.[0].heading).toBe("one")
    scroll(65)
    expect(changed.mock.lastCall?.[0].heading).toBe("two")
    // A preview patch changes layout without changing the list of headings.
    tops.two=300
    vi.spyOn(document.getElementById("two")!,"getBoundingClientRect").mockImplementation(()=>({top:tops.two-y} as DOMRect))
    document.dispatchEvent(new Event("fx-content-updated"));flush()
    expect(changed.mock.lastCall?.[0].heading).toBe("one")
  } finally { tracker.destroy() }
})
