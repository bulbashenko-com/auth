import type { Identity } from "@ory/client-fetch"
import { Panel, Shell } from "@/components/Shell"
import { GROUPS } from "@/lib/groups"
import { getT } from "@/lib/locale"

export function traitsOf(identity: Identity) {
  return identity.traits as { username?: string; email?: string; name?: string }
}

export function TextInput({
  name,
  label,
  hint,
  type = "text",
  required,
}: {
  name: string
  label: string
  hint: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="field">
      <div className="field-head">
        <label className="label" htmlFor={`a-${name}`}>
          {label}
        </label>
        <span className="hint">{hint}</span>
      </div>
      <div className="input">
        <span className="caret" aria-hidden="true">&gt;</span>
        <input id={`a-${name}`} name={name} type={type} required={required} autoComplete="off" spellCheck={false} />
      </div>
    </div>
  )
}

export function GroupChecks({ checked }: { checked: readonly string[] }) {
  return (
    <fieldset className="fields" style={{ border: "none", padding: 0, margin: 0 }}>
      <legend className="section-title" style={{ marginBottom: 12 }}>
        GROUPS
      </legend>
      {GROUPS.map((g) => (
        <label key={g} className="check">
          <input type="checkbox" name="groups" value={g} defaultChecked={checked.includes(g)} />
          <span className="mark" aria-hidden="true" />
          <span>{g}</span>
        </label>
      ))}
    </fieldset>
  )
}

export async function Denied() {
  const { t } = await getT()
  return (
    <Shell eye="error">
      <Panel path="~/admin" step="403" title={t("error.denied.title")} desc={t("error.denied.desc")} />
    </Shell>
  )
}
