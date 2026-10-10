"use client"

import { useEffect, useRef, useState, type FormHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react"
import { setEyeMode } from "../visual/Visuals"

/** A form that makes the eye "scan" while the browser submits it to Kratos. */
export function EyeForm({ children, ...props }: FormHTMLAttributes<HTMLFormElement> & { children: ReactNode }) {
  return (
    <form {...props} onSubmit={() => setEyeMode("scan")}>
      {children}
    </form>
  )
}

/** Password inputs close the eye while they have focus. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} onFocus={() => setEyeMode("closed")} onBlur={() => setEyeMode("idle")} />
}

/**
 * Calls a function that Kratos' webauthn.js puts on `window` (oryPasskeyLogin, oryPasskeyRegistration, ...).
 * The script fills the hidden passkey fields and submits the form itself.
 */
export function TriggerButton({
  trigger,
  className,
  children,
  disabled,
}: {
  trigger: string
  className: string
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => {
        setEyeMode("scan")
        const fn = window[trigger as `ory${string}`]
        if (typeof fn === "function") fn()
      }}
    >
      {children}
    </button>
  )
}

/** Runs Kratos' onload triggers (e.g. passkey autofill) once webauthn.js has loaded. */
export function OnloadTriggers({ triggers }: { triggers: string[] }) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current || triggers.length === 0) return
    let tries = 0
    const timer = setInterval(() => {
      const ready = triggers.every((name) => typeof window[name as `ory${string}`] === "function")
      if (ready || ++tries > 100) {
        clearInterval(timer)
        if (!ready) return
        done.current = true
        for (const name of triggers) window[name as `ory${string}`]?.()
      }
    }, 50)
    return () => clearInterval(timer)
  }, [triggers])
  return null
}

/** Six cells over one invisible input; submits the form when the sixth digit arrives. */
export function OtpInput({ name, error, autoFocus }: { name: string; error?: boolean; autoFocus?: boolean }) {
  const [value, setValue] = useState("")
  const [focused, setFocused] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className={`otp${error ? " error" : ""}`}>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`cell${value[i] ? " filled" : ""}${focused && i === Math.min(5, value.length) ? " cursor" : ""}`}
        >
          {value[i] ?? ""}
        </div>
      ))}
      <input
        ref={input}
        name={name}
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus={autoFocus}
        aria-label="TOTP"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 6)
          setValue(digits)
          if (digits.length === 6) {
            setEyeMode("scan")
            setTimeout(() => input.current?.form?.requestSubmit(), 150)
          }
        }}
      />
    </div>
  )
}
