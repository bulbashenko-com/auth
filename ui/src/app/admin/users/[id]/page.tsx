import { ResponseError } from "@ory/client-fetch"
import { notFound } from "next/navigation"
import { Panel, Shell } from "@/components/Shell"
import { Forbidden, requireAdmin } from "@/lib/admin"
import { groupsOf } from "@/lib/groups"
import { getT } from "@/lib/locale"
import { identities } from "@/lib/ory"
import { deleteUser, revokeSessions, saveGroups, sendRecovery, setActive } from "../../actions"
import { ActionForm } from "../../ActionForm"
import { Denied, GroupChecks, traitsOf } from "../../parts"

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { t } = await getT()
  let me
  try {
    me = await requireAdmin(`/admin/users/${id}`)
  } catch (error) {
    if (error instanceof Forbidden) return <Denied />
    throw error
  }
  let person
  try {
    person = await identities().getIdentity({ id, includeCredential: ["passkey", "password", "totp", "lookup_secret"] })
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) notFound()
    throw error
  }
  const traits = traitsOf(person)
  const groups = await groupsOf(id)
  const sessions = await identities().listIdentitySessions({ id, active: true }).catch(() => [])
  const methods = Object.entries(person.credentials ?? {})
    .filter(([, c]) => (c.identifiers?.length ?? 0) > 0 || c.type === "totp" || c.type === "lookup_secret")
    .map(([type]) => type)
  const self = me.identity?.id === id
  const active = person.state === "active"

  return (
    <Shell wide>
      <Panel
        path={`~/admin/users/${traits.username}`}
        step={t("admin.label")}
        title={traits.username ?? id}
        desc={`${traits.name ?? ""}\n${traits.email ?? ""}`}
      >
        <div className="box">
          <Row k="id" v={id} />
          <Row k="state" v={active ? "active" : t("admin.inactive")} />
          <Row k="methods" v={methods.join(", ") || "—"} />
          <Row k="sessions" v={String(sessions.length)} />
          <Row k="created" v={person.created_at?.toISOString() ?? ""} />
        </div>

        <ActionForm action={saveGroups}>
          <input type="hidden" name="id" value={id} />
          <GroupChecks checked={groups} />
          <button type="submit" className="btn btn-primary">
            <span>{t("admin.save-groups")}</span>
            <span className="arrow" aria-hidden="true">→</span>
          </button>
        </ActionForm>

        <ActionForm action={sendRecovery}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn btn-secondary">
            <span>{t("admin.send-recovery")}</span>
          </button>
        </ActionForm>

        <ActionForm action={revokeSessions}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn btn-secondary">
            <span>{t("admin.revoke")}</span>
          </button>
        </ActionForm>

        {!self && (
          <ActionForm action={setActive}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="active" value={active ? "false" : "true"} />
            <button type="submit" className="btn btn-quiet">
              <span>{active ? t("admin.disable") : t("admin.enable")}</span>
            </button>
          </ActionForm>
        )}

        {!self && (
          <details>
            <summary className="link">{t("admin.delete")}</summary>
            <ActionForm action={deleteUser}>
              <input type="hidden" name="id" value={id} />
              <div className="input">
                <span className="caret" aria-hidden="true">&gt;</span>
                <input name="confirm" placeholder={id} autoComplete="off" aria-label="confirm id" />
              </div>
              <button type="submit" className="btn btn-quiet" style={{ color: "var(--err)" }}>
                <span>{t("admin.delete")}</span>
              </button>
            </ActionForm>
          </details>
        )}

        <a className="link" href="/admin">
          [ ← {t("admin.title")} ]
        </a>
      </Panel>
    </Shell>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="box-row">
      <span className="key">{k}</span>
      <span className="val" style={{ overflowWrap: "anywhere" }}>
        {v}
      </span>
    </div>
  )
}
