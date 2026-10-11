"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

export type EyeMode = "idle" | "closed" | "scan" | "ok" | "error"

const EVENT = "eye:mode"

/** Lets any form control steer the eye (password focus closes it, submitting makes it scan). */
export function setEyeMode(mode: EyeMode) {
  window.dispatchEvent(new CustomEvent<EyeMode>(EVENT, { detail: mode }))
}

const REDUCED = "(prefers-reduced-motion: reduce)"
// Must match the breakpoint that hides .right in globals.css: below it the eye's code is not even downloaded.
const WIDE = "(min-width: 1100px)"
// Set when WebGL failed or frames were too slow; kept for the tab session so later pages don't try again.
const DOWNGRADED = "visual:off"

const listeners = new Set<() => void>()
let downgraded: boolean | undefined

function isDowngraded() {
  if (downgraded === undefined) {
    try {
      downgraded = sessionStorage.getItem(DOWNGRADED) === "1"
    } catch {
      downgraded = false
    }
  }
  return downgraded
}

function downgrade() {
  if (isDowngraded()) return
  downgraded = true
  try {
    sessionStorage.setItem(DOWNGRADED, "1")
  } catch {}
  listeners.forEach((l) => l())
}

function subscribe(onChange: () => void) {
  const queries = [REDUCED, WIDE].map((q) => window.matchMedia(q))
  queries.forEach((m) => m.addEventListener("change", onChange))
  // The custom elements report a missing or lost WebGL2 context with this event.
  if (listeners.size === 0) window.addEventListener("visual:fail", downgrade)
  listeners.add(onChange)
  return () => {
    queries.forEach((m) => m.removeEventListener("change", onChange))
    listeners.delete(onChange)
    if (listeners.size === 0) window.removeEventListener("visual:fail", downgrade)
  }
}

/** Animations run unless the person asks for reduced motion or Save-Data, WebGL2 is missing, or frames are too slow. */
function isLive() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  return !(isDowngraded() || saveData || window.matchMedia(REDUCED).matches)
}

const useLive = () => useSyncExternalStore(subscribe, isLive, () => false)
const useWide = () => useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false)

/**
 * Turns the animations off when the page can't hold its frame rate: the mean interval between animation frames
 * stays above 35 ms (under ~28 fps) over a 3 s window. The first second after load and hidden tabs don't count.
 */
function useFrameWatchdog(active: boolean) {
  useEffect(() => {
    if (!active) return
    let raf = 0, prev = 0, sum = 0, count = 0
    const start = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = now - prev
      prev = now
      // Gaps over 250 ms are a backgrounded tab or a one-off hitch, not a slow device.
      if (now - start < 1000 || document.hidden || dt > 250) return
      sum += dt
      count++
      if (sum < 3000) return
      if (sum / count > 35) downgrade()
      sum = count = 0
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])
}

/** The 3D eye drone rendered as ASCII (three.js, bundled). Wide screens only, like the panel that holds it. */
export function Eye({ initial = "idle" }: { initial?: EyeMode }) {
  const live = useLive()
  const wide = useWide()
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<EyeMode>(initial)

  useEffect(() => {
    if (!live || !wide) return
    let alive = true
    import("./eye-ascii.js").then(() => alive && setReady(true))
    const onMode = (event: Event) => setMode((event as CustomEvent<EyeMode>).detail)
    window.addEventListener(EVENT, onMode)
    // A page that opens with an error flashes once, then settles.
    let timer: ReturnType<typeof setTimeout> | undefined
    if (initial === "error") timer = setTimeout(() => setMode("idle"), 900)
    return () => {
      alive = false
      window.removeEventListener(EVENT, onMode)
      if (timer) clearTimeout(timer)
    }
  }, [initial, live, wide])

  if (!live || !wide || !ready) return null
  return <eye-ascii mode={mode} color="mono" framing="full" ramp="block" glitch="on" />
}

/** Dim drifting ASCII field behind everything. Also runs the frame-rate watchdog for the page. */
export function AsciiBackground() {
  const live = useLive()
  const [ready, setReady] = useState(false)
  useFrameWatchdog(live)

  useEffect(() => {
    if (!live) return
    let alive = true
    import("./ascii-bg.js").then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [live])

  return live && ready ? <ascii-bg dim="0.4" /> : null
}
