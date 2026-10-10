"use client"

import { useActionState, type ReactNode } from "react"
import type { ActionState } from "./actions"

/** A form bound to an admin server action; shows its result, and a one-time recovery link when there is one. */
export function ActionForm({
  action,
  children,
  className = "stack",
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>
  children: ReactNode
  className?: string
}) {
  const [state, run, pending] = useActionState(action, {})
  return (
    <form action={run} className={className} aria-busy={pending}>
      {children}
      {state.error && (
        <p className="msg error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && !state.recovery && (
        <p className="msg success" role="status">
          OK: {state.ok}
        </p>
      )}
      {state.recovery && (
        <div className="box" role="status">
          <div className="box-row">
            <span className="key">link</span>
            <a className="val" href={state.recovery.link} style={{ overflowWrap: "anywhere" }}>
              {state.recovery.link}
            </a>
          </div>
          <div className="box-row">
            <span className="key">code</span>
            <code className="val secret">{state.recovery.code}</code>
          </div>
          {state.recovery.expires && (
            <div className="box-row">
              <span className="key">expires</span>
              <span className="val">{state.recovery.expires}</span>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
