import type { UiContainer, UiNode } from "@ory/client-fetch"
import type { Locale } from "@/lib/i18n"
import { EyeForm } from "./client"
import {
  Field,
  HiddenInputs,
  inGroups,
  inputAttrs,
  Messages,
  NodeButton,
  NodeImage,
  NodeText,
  NodeTriggers,
} from "./nodes"

const TEXT_TYPES = ["text", "email", "password", "number", "tel", "url", "datetime-local", "date"]

/**
 * One Kratos method (a node group) as a form posting straight to Kratos: its hidden fields plus the flow's
 * defaults (CSRF token), visible inputs in Kratos' order, and its buttons. The main submit (name="method") is
 * the primary button; the rest (resend, remove, unlink ...) are quieter.
 */
export function GroupForm({
  ui,
  group,
  locale,
  labels = {},
  primaryLabel,
  showFlowMessages = false,
}: {
  ui: UiContainer
  group: string
  locale: Locale
  /** Label overrides by node name. */
  labels?: Record<string, { label?: string; hint?: string; placeholder?: string }>
  primaryLabel?: string
  showFlowMessages?: boolean
}) {
  const own = inGroups(ui.nodes, group)
  if (own.length === 0) return null
  const hidden = inGroups(ui.nodes, "default", group)
  const hasMethod = own.some((n) => inputAttrs(n)?.name === "method")

  return (
    <EyeForm action={ui.action} method={ui.method} className="stack">
      <HiddenInputs nodes={hidden} />
      {!hasMethod && <input type="hidden" name="method" value={group} />}
      {showFlowMessages && <Messages messages={ui.messages} locale={locale} />}
      <div className="fields">
        {own.map((node) => (
          <Node key={key(node)} node={node} locale={locale} labels={labels} />
        ))}
      </div>
      {own.filter(isButton).map((node) => {
        const a = inputAttrs(node)!
        const primary = a.name === "method" || !!a.onclickTrigger
        return (
          <NodeButton
            key={key(node)}
            node={node}
            locale={locale}
            variant={primary ? "primary" : "quiet"}
            label={primary ? primaryLabel : undefined}
            arrow={primary}
          />
        )
      })}
      <NodeTriggers nodes={own} />
    </EyeForm>
  )
}

const isButton = (node: UiNode) => {
  const t = inputAttrs(node)?.type
  return t === "submit" || t === "button"
}

function key(node: UiNode) {
  const a = node.attributes as { name?: string; id?: string; value?: unknown }
  return `${node.group}-${node.type}-${a.name ?? a.id ?? ""}-${String(a.value ?? "")}`
}

function Node({
  node,
  locale,
  labels,
}: {
  node: UiNode
  locale: Locale
  labels: Record<string, { label?: string; hint?: string; placeholder?: string }>
}) {
  switch (node.attributes.node_type) {
    case "img":
      return <NodeImage node={node} locale={locale} />
    case "text":
      return <NodeText node={node} locale={locale} />
    case "input": {
      const a = inputAttrs(node)!
      if (!TEXT_TYPES.includes(a.type)) return null
      const o = labels[a.name] ?? {}
      return <Field node={node} locale={locale} label={o.label} hint={o.hint} placeholder={o.placeholder} />
    }
    default:
      return null
  }
}
