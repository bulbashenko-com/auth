import type { UiNode, UiNodeInputAttributes, UiText } from "@ory/client-fetch"
import { kratosText, type Locale } from "@/lib/i18n"
import { OnloadTriggers, OtpInput, PasswordInput, TriggerButton } from "./client"

/** Helpers and building blocks for rendering Kratos UI nodes in the design's style. */

export const inputAttrs = (node: UiNode) =>
  node.attributes.node_type === "input" ? (node.attributes as UiNodeInputAttributes) : undefined

export const nodeName = (node: UiNode) => inputAttrs(node)?.name

export const inGroups = (nodes: UiNode[], ...groups: string[]) => nodes.filter((n) => groups.includes(n.group))

export const findNode = (nodes: UiNode[], name: string) => nodes.find((n) => nodeName(n) === name)

const isHidden = (node: UiNode) => inputAttrs(node)?.type === "hidden"

const stringValue = (value: unknown) => (value === null || value === undefined ? undefined : String(value))

export function Messages({ messages, locale }: { messages?: UiText[]; locale: Locale }) {
  if (!messages?.length) return null
  return (
    <>
      {messages.map((m) => (
        <p key={`${m.id}-${m.text}`} className={`msg ${m.type}`} role={m.type === "error" ? "alert" : "status"}>
          {kratosText(locale, m)}
        </p>
      ))}
    </>
  )
}

/** All hidden inputs (CSRF token, flow state, passkey challenge ...) of the given nodes. */
export function HiddenInputs({ nodes }: { nodes: UiNode[] }) {
  return (
    <>
      {nodes.filter(isHidden).map((node) => {
        const a = inputAttrs(node)!
        return <input key={a.name} type="hidden" name={a.name} defaultValue={stringValue(a.value)} />
      })}
    </>
  )
}

/** Runs the onload triggers found on any node (passkey autofill). */
export function NodeTriggers({ nodes }: { nodes: UiNode[] }) {
  const triggers = nodes.map((n) => inputAttrs(n)?.onloadTrigger).filter((t): t is NonNullable<typeof t> => !!t)
  return triggers.length ? <OnloadTriggers triggers={triggers.map(String)} /> : null
}

/** Kratos' own scripts (webauthn.js), from our origin, with this request's CSP nonce. */
export function NodeScripts({ nodes, nonce }: { nodes: UiNode[]; nonce?: string }) {
  return (
    <>
      {nodes
        .filter((n) => n.attributes.node_type === "script")
        .map((n) => {
          const a = n.attributes as { src: string; integrity?: string; crossorigin?: string; referrerpolicy?: string; id?: string }
          return (
            <script
              key={a.src}
              id={a.id}
              src={a.src}
              integrity={a.integrity || undefined}
              crossOrigin={(a.crossorigin as "anonymous") || undefined}
              referrerPolicy={(a.referrerpolicy as ReferrerPolicy) || undefined}
              nonce={nonce}
              async
            />
          )
        })}
    </>
  )
}

/** A text-like input with the design's label row and "> " prompt. */
export function Field({
  node,
  locale,
  label,
  hint,
  placeholder,
  autoFocus,
}: {
  node: UiNode
  locale: Locale
  label?: string
  hint?: string
  placeholder?: string
  autoFocus?: boolean
}) {
  const a = inputAttrs(node)!
  const props = {
    id: `f-${a.name}`,
    name: a.name,
    type: a.type,
    defaultValue: a.type === "password" ? undefined : stringValue(a.value),
    required: a.required,
    disabled: a.disabled,
    autoComplete: a.autocomplete,
    maxLength: a.maxlength,
    pattern: a.pattern,
    placeholder,
    autoFocus,
    spellCheck: false,
    autoCapitalize: "none",
  } as const
  return (
    <div className="field">
      <div className="field-head">
        <label className="label" htmlFor={props.id}>
          {label ?? kratosText(locale, node.meta.label)}
        </label>
        {hint && <span className="hint">{hint}</span>}
      </div>
      <div className="input">
        <span className="caret" aria-hidden="true">&gt;</span>
        {a.type === "password" ? <PasswordInput {...props} /> : <input {...props} />}
      </div>
      <Messages messages={node.messages} locale={locale} />
    </div>
  )
}

/** The design's six-cell code input for a TOTP node. */
export function OtpField({ node, locale, label, hint }: { node: UiNode; locale: Locale; label: string; hint: string }) {
  const a = inputAttrs(node)!
  return (
    <div className="field">
      <div className="field-head">
        <span className="label">{label}</span>
        <span className="hint">{hint}</span>
      </div>
      <OtpInput name={a.name} error={node.messages.some((m) => m.type === "error")} autoFocus />
      <Messages messages={node.messages} locale={locale} />
    </div>
  )
}

type Variant = "primary" | "secondary" | "quiet"

/** A submit button (name/value go to Kratos) or a webauthn.js trigger button. */
export function NodeButton({
  node,
  locale,
  variant = "secondary",
  label,
  arrow = true,
}: {
  node: UiNode
  locale: Locale
  variant?: Variant
  label?: string
  arrow?: boolean
}) {
  const a = inputAttrs(node)!
  const text = label ?? kratosText(locale, node.meta.label)
  const body = (
    <>
      <span>{text}</span>
      {arrow && <span className="arrow" aria-hidden="true">→</span>}
    </>
  )
  const className = `btn btn-${variant}`
  if (a.onclickTrigger) {
    return (
      <TriggerButton trigger={String(a.onclickTrigger)} className={className} disabled={a.disabled}>
        {body}
      </TriggerButton>
    )
  }
  return (
    <button type="submit" name={a.name} value={stringValue(a.value)} className={className} disabled={a.disabled}>
      {body}
    </button>
  )
}

/** Image node (the TOTP QR code, a data: URI). */
export function NodeImage({ node, locale }: { node: UiNode; locale: Locale }) {
  const a = node.attributes as { src: string; width?: number; height?: number }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="qr" src={a.src} width={a.width} height={a.height} alt={kratosText(locale, node.meta.label)} />
}

/** Text node: the TOTP secret, or the list of recovery codes. */
export function NodeText({ node, locale }: { node: UiNode; locale: Locale }) {
  const a = node.attributes as { text: UiText; id: string }
  const secrets = (a.text.context as { secrets?: UiText[] } | undefined)?.secrets
  return (
    <div className="field">
      <span className="field-head">
        <span className="hint">{kratosText(locale, node.meta.label)}</span>
      </span>
      {secrets ? (
        <div className="codes">
          {secrets.map((s) => (
            <code key={s.text} className={s.id === 1050014 ? "used" : undefined}>
              {s.id === 1050014 ? "used" : s.text}
            </code>
          ))}
        </div>
      ) : (
        <code className="secret">{a.text.text}</code>
      )}
    </div>
  )
}
