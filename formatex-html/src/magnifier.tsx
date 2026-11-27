import { useEffect, useRef, useState } from "react"

const LENS_SIZE = 200
const LENS_RADIUS = LENS_SIZE / 2
const INNER_SIZE = LENS_SIZE - 18 // 9px metallic bezel padding on each side (182px)
const MAP_SIZE = INNER_SIZE * 3 // 2x HiDPI optical maps (364px) for silky smooth refraction
const DEFAULT_MAG = 2.0
const MIN_MAG = 1.4
const MAX_MAG = 4.0

interface LiquidGlassMaps {
  displacementUrl: string
  specularUrl: string
  scale: number
}

/**
 * Generates iOS Liquid Glass optical maps using Snell's Law (n1=1.0 -> n2=1.5)
 * on a convex squircle surface profile: flat/clear center, smoothly refracting curved rim,
 * plus a physically-derived Fresnel specular rim highlight map.
 */
function buildLiquidGlassMaps(size: number): LiquidGlassMaps {
  try {
    const dispCanvas = document.createElement("canvas")
    dispCanvas.width = size
    dispCanvas.height = size
    const dispCtx = dispCanvas.getContext("2d")

    const specCanvas = document.createElement("canvas")
    specCanvas.width = size
    specCanvas.height = size
    const specCtx = specCanvas.getContext("2d")
    if (!dispCtx || !specCtx) return { displacementUrl: "", specularUrl: "", scale: 0 }

    const dispImg = dispCtx.createImageData(size, size)
    const specImg = specCtx.createImageData(size, size)
    const dData = dispImg.data
    const sData = specImg.data

    const half = size / 2
    const n1 = 1.0
    const n2 = 1.8 // optical crown glass IOR
    const bezelWidth = 1 // outer 34% is the curved liquid-glass bezel; center stays crisp
    const glassThickness = 1 // controls rim refraction strength
    const domeHeight = 0.4 // gentle convex dome curvature in center

    // Convex squircle height profile h(t) = (1 - (1 - t)^4)^(1/4) for t in [0, 1] from rim inward
    const surfaceHeight = (t: number) => {
      const clamped = Math.max(0, Math.min(1, t))
      return Math.pow(1 - Math.pow(1 - clamped, 4), 0.25)
    }

    // First pass: compute exact Snell's law radial displacements to find peak for normalization
    const radials = new Float32Array(size * size)
    let maxDisp = 0.0001

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x - half + 0.5) / half
        const ny = (y - half + 0.5) / half
        const r = Math.hypot(nx, ny)
        const idx = y * size + x

        if (r >= 1 || r <= 0) {
          radials[idx] = 0
          continue
        }

        // Distance inward from rim normalized to bezelWidth
        const distFromEdge = 1 - r
        const t = distFromEdge / bezelWidth

        let slope = 0
        let h = 1
        if (t < 1) {
          const eps = 0.004
          const h0 = surfaceHeight(t)
          const h1 = surfaceHeight(Math.min(1, t + eps))
          h = h0
          // dh/dr = -(dh/dt) / bezelWidth (negative since height falls toward rim)
          slope = ((h1 - h0) / eps) / bezelWidth
        }

        // Add a very subtle spherical dome slope across the lens so the center has a gentle convex feel
        const gentleDomeSlope = r * 0.22
        const totalSlope = slope * 0.62 + gentleDomeSlope

        // Incident angle relative to surface normal
        const theta1 = Math.atan(totalSlope)
        const sinTheta2 = Math.min(0.99, (n1 / n2) * Math.sin(theta1))
        const theta2 = Math.asin(sinTheta2)
        const deflect = Math.tan(theta1 - theta2)

        // Ray displacement on the underlying document plane
        const disp = (h * domeHeight + glassThickness) * deflect * (1 - r * r * 0.15)
        radials[idx] = disp
        if (disp > maxDisp) maxDisp = disp
      }
    }

    // Second pass: encode displacement (R=X, G=Y) and Fresnel specular highlight
    // Primary light from upper-left (-0.707, -0.707), secondary bounce from lower-right
    const l1x = -0.72, l1y = -0.69
    const l2x = 0.72, l2y = 0.69

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x - half + 0.5) / half
        const ny = (y - half + 0.5) / half
        const r = Math.hypot(nx, ny)
        const idx = y * size + x
        const p = idx * 4

        if (r >= 1 || r <= 0) {
          dData[p] = 128
          dData[p + 1] = 128
          dData[p + 2] = 128
          dData[p + 3] = 255
          sData[p + 3] = 0
          continue
        }

        const ux = nx / r
        const uy = ny / r
        const normDisp = Math.min(1, radials[idx] / maxDisp)

        // Negative shift samples closer to center -> convex magnification & liquid-glass rim bend
        dData[p] = Math.max(0, Math.min(255, Math.round(128 - ux * normDisp * 127)))
        dData[p + 1] = Math.max(0, Math.min(255, Math.round(128 - uy * normDisp * 127)))
        dData[p + 2] = 128
        dData[p + 3] = 255

        // Specular rim lighting along the curved bevel (Fresnel grazing reflection)
        const distFromEdge = 1 - r
        const t = distFromEdge / bezelWidth
        let specAlpha = 0
        let sr = 255, sg = 255, sb = 255
        if (t < 1) {
          // Rim falloff: sharp bright glass edge near r -> 1, smooth fade into center
          const rimFactor = Math.pow(1 - t, 2.4)
          const align1 = Math.max(0, ux * l1x + uy * l1y)
          const align2 = Math.max(0, ux * l2x + uy * l2y)
          const primary = Math.pow(align1, 2.2) * rimFactor * 0.85
          const secondary = Math.pow(align2, 3.0) * rimFactor * 0.42
          const ambientRim = Math.pow(1 - t, 4.5) * 0.28
          specAlpha = Math.min(1, primary + secondary + ambientRim)
          // Subtle cool-cyan glass tint on secondary caustic bounce
          if (secondary > primary) {
            sr = 225
            sg = 244
            sb = 255
          }
        }
        sData[p] = sr
        sData[p + 1] = sg
        sData[p + 2] = sb
        sData[p + 3] = Math.round(specAlpha * 255)
      }
    }

    dispCtx.putImageData(dispImg, 0, 0)
    specCtx.putImageData(specImg, 0, 0)

    // Physical scale in CSS pixels (~13px max shift right at the curved glass rim, ~0px in center)
    const pixelScale = Math.round(Math.min(25, Math.max(10, maxDisp * (INNER_SIZE / 2) * 0.3)))
    return {
      displacementUrl: dispCanvas.toDataURL("image/png"),
      specularUrl: specCanvas.toDataURL("image/png"),
      scale: pixelScale,
    }
  } catch {
    return { displacementUrl: "", specularUrl: "", scale: 0 }
  }
}

export interface MagnifierProps {
  content: string
  zoom: number
  theme: string
  feel: string
  width: string
}

export function Magnifier({ content, zoom, theme, feel, width }: MagnifierProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<HTMLDivElement>(null)
  const posRef = useRef<{ x: number; y: number }>({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 300,
    y: typeof window !== "undefined" ? Math.max(180, window.innerHeight / 2) : 300,
  })
  const magRef = useRef(DEFAULT_MAG)
  const hiddenRef = useRef(false)
  const [maps, setMaps] = useState<LiquidGlassMaps>({ displacementUrl: "", specularUrl: "", scale: 0 })

  useEffect(() => {
    setMaps(buildLiquidGlassMaps(MAP_SIZE))
  }, [])

  // Sync cloned document markup (without duplicate IDs or preview hooks) and match live width.
  useEffect(() => {
    const mirror = docRef.current
    const main = document.querySelector("main.fx-doc") as HTMLElement | null
    if (!mirror || !main) return

    mirror.innerHTML = main.innerHTML
    mirror.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"))
    mirror.querySelectorAll("[data-fx-node]").forEach(el => el.removeAttribute("data-fx-node"))
    mirror.querySelectorAll("[tabindex]").forEach(el => el.removeAttribute("tabindex"))

    const syncMetrics = () => {
      const rect = main.getBoundingClientRect()
      mirror.style.width = `${rect.width}px`
      mirror.style.maxWidth = "none"
      mirror.style.margin = "0"
      mirror.style.fontSize = `${zoom}%`
    }
    syncMetrics()

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncMetrics) : null
    observer?.observe(main)
    return () => observer?.disconnect()
  }, [content, zoom, theme, feel, width])

  // Follow pointer, scroll, resize, and Shift/Alt+wheel zoom at 60fps via direct transform updates.
  useEffect(() => {
    let raf = 0

    const update = () => {
      raf = 0
      const root = rootRef.current
      const stage = stageRef.current
      const main = document.querySelector("main.fx-doc") as HTMLElement | null
      if (!root || !stage || !main) return

      const { x, y } = posRef.current
      const mag = magRef.current
      const rect = main.getBoundingClientRect()

      root.style.opacity = hiddenRef.current ? "0" : "1"
      root.style.transform = `translate3d(${x - LENS_RADIUS}px, ${y - LENS_RADIUS}px, 0)`

      const dx = x - rect.left
      const dy = y - rect.top
      const tx = LENS_RADIUS - dx * mag
      const ty = LENS_RADIUS - dy * mag
      stage.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${mag})`
    }

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update)
    }

    const setCursorHidden = (hide: boolean) => {
      if (hide) document.documentElement.dataset.fxLoupe = "1"
      else delete document.documentElement.dataset.fxLoupe
    }

    const isOverChrome = (target: EventTarget | null, clientY: number) => {
      if (clientY < 46) return true
      if (target instanceof Element && target.closest(".fx-toolbar, .fx-outline, .fx-search, .fx-popover, .fx-lightbox")) return true
      return false
    }

    const onPointerMove = (e: PointerEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY }
      const overChrome = isOverChrome(e.target, e.clientY)
      hiddenRef.current = overChrome
      setCursorHidden(!overChrome)
      schedule()
    }

    const onPointerLeave = () => {
      hiddenRef.current = true
      setCursorHidden(false)
      schedule()
    }

    const onScrollOrResize = () => schedule()

    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey && !e.altKey) return
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.2 : -0.2
      magRef.current = Math.max(MIN_MAG, Math.min(MAX_MAG, Math.round((magRef.current + delta) * 10) / 10))
      schedule()
    }

    setCursorHidden(true)
    update()

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerdown", onPointerMove, { passive: true })
    document.addEventListener("pointerleave", onPointerLeave)
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true })
    window.addEventListener("resize", onScrollOrResize, { passive: true })
    window.addEventListener("wheel", onWheel, { passive: false })

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      delete document.documentElement.dataset.fxLoupe
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerMove)
      document.removeEventListener("pointerleave", onPointerLeave)
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
      window.removeEventListener("wheel", onWheel)
    }
  }, [])

  const scaleG = maps.scale
  const scaleR = Math.round((scaleG + 3) * 10) / 10
  const scaleB = Math.round(Math.max(0, scaleG - 2.5) * 10) / 10

  return (
    <div ref={rootRef} className="fx-loupe" aria-hidden="true">
      {maps.displacementUrl && (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <filter
              id="fx-loupe-distort"
              x="0"
              y="0"
              width={INNER_SIZE}
              height={INNER_SIZE}
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feImage href={maps.displacementUrl} x="0" y="0" width={INNER_SIZE} height={INNER_SIZE} preserveAspectRatio="none" result="map" />
              {/* Radial chromatic dispersion on the curved Liquid Glass rim */}
              <feDisplacementMap in="SourceGraphic" in2="map" scale={scaleR} xChannelSelector="R" yChannelSelector="G" result="dispR" />
              <feColorMatrix in="dispR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="chanR" />
              <feDisplacementMap in="SourceGraphic" in2="map" scale={scaleG} xChannelSelector="R" yChannelSelector="G" result="dispG" />
              <feColorMatrix in="dispG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="chanG" />
              <feDisplacementMap in="SourceGraphic" in2="map" scale={scaleB} xChannelSelector="R" yChannelSelector="G" result="dispB" />
              <feColorMatrix in="dispB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="chanB" />
              <feBlend in="chanR" in2="chanG" mode="screen" result="chanRG" />
              <feBlend in="chanRG" in2="chanB" mode="screen" />
            </filter>
          </defs>
        </svg>
      )}
      <div className="fx-loupe-ring">
        <div className="fx-loupe-lens">
          <div className="fx-loupe-lens-inner" style={maps.displacementUrl ? { filter: "url(#fx-loupe-distort)" } : undefined}>
            <div ref={stageRef} className="fx-loupe-stage">
              <div ref={docRef} className="fx-doc fx-loupe-doc" />
            </div>
          </div>
          {maps.specularUrl && <img className="fx-loupe-specular" src={maps.specularUrl} alt="" />}
          <div className="fx-loupe-glass" />
        </div>
      </div>
      <svg className="fx-loupe-handle" viewBox="0 0 110 110" aria-hidden="true">
        <defs>
          <linearGradient id="fx-loupe-ferrule" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8dde4" />
            <stop offset="30%" stopColor="#ffffff" />
            <stop offset="68%" stopColor="#7a808a" />
            <stop offset="100%" stopColor="#42474f" />
          </linearGradient>
          <linearGradient id="fx-loupe-grip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#454950" />
            <stop offset="22%" stopColor="#26292e" />
            <stop offset="55%" stopColor="#0f1114" />
            <stop offset="85%" stopColor="#1c1f24" />
            <stop offset="100%" stopColor="#08090b" />
          </linearGradient>
          <filter id="fx-loupe-shadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="2" dy="6" stdDeviation="4" floodColor="#000" floodOpacity="0.34" />
          </filter>
        </defs>
        <g transform="translate(10 10) rotate(45)" filter="url(#fx-loupe-shadow)">
          {/* Metallic collar connecting rim to handle */}
          <rect x="0" y="-8.5" width="17" height="17" rx="2" fill="url(#fx-loupe-ferrule)" stroke="#4b5058" strokeWidth="0.7" />
          <line x1="5" y1="-8" x2="5" y2="8" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
          <line x1="12" y1="-8" x2="12" y2="8" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          {/* Glossy black handle */}
          <rect x="16" y="-11" width="76" height="22" rx="10.5" fill="url(#fx-loupe-grip)" stroke="#090a0c" strokeWidth="0.8" />
          {/* Subtle top specular highlight on the handle */}
          <rect x="22" y="-7.5" width="62" height="3.2" rx="1.6" fill="rgba(255,255,255,0.16)" />
          {/* Playful tiny golden badge near the collar */}
          <text
            x="24"
            y="2.5"
            fill="#eab308"
            opacity="0.85"
            fontSize="6.2"
            fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
            letterSpacing="0.4"
          >
            FX
          </text>
        </g>
      </svg>
    </div>
  )
}
