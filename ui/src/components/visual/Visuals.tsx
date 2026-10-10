"use client"

import { useEffect, useState } from "react"

export type EyeMode = "idle" | "closed" | "scan" | "ok" | "error"

const EVENT = "eye:mode"

/** Lets any form control steer the eye (password focus closes it, submitting makes it scan). */
export function setEyeMode(mode: EyeMode) {
  window.dispatchEvent(new CustomEvent<EyeMode>(EVENT, { detail: mode }))
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** The 3D eye drone rendered as ASCII (three.js, bundled). Skipped for people who ask for reduced motion. */
export function Eye({ initial = "idle" }: { initial?: EyeMode }) {
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<EyeMode>(initial)

  useEffect(() => {
    if (reducedMotion()) return
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
  }, [initial])

  if (!ready) return null
  return <eye-ascii mode={mode} color="mono" framing="full" ramp="block" glitch="on" />
}

/** Dim drifting ASCII field behind everything. */
export function AsciiBackground() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (reducedMotion()) return
    let alive = true
    import("./ascii-bg.js").then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])
  return ready ? <ascii-bg dim="0.4" /> : null
}
