import { Panel, Shell } from "@/components/Shell"
import { requireAdmin, Forbidden } from "@/lib/admin"
import { groupsOf } from "@/lib/groups"
import { getT } from "@/lib/locale"
import { identities } from "@/lib/ory"
import { createUser } from "./actions"
import { ActionForm } from "./ActionForm"
import { Denied, GroupChecks, TextInput, traitsOf } from "./parts"

export default async function AdminPage() {
  const { t } = await getT()
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof Forbidden) return <Denied />
    throw error
  }
  const people = await identities().listIdentities({ pageSize: 250 })
  const rows = await Promise.all(people.map(async (p) => ({ p, groups: await groupsOf(p.id) })))

  return (
    <Shell wide>
      <Panel path="~/admin/users" step={t("admin.label")} title={t("admin.title")} desc={t("admin.desc")}>
        <table className="table">
          <thead>
            <tr>
              <th>USERNAME</th>
              <th>EMAIL</th>
              <th>GROUPS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, groups }) => (
              <tr key={p.id}>
                <td>
                  <a href={`/admin/users/${p.id}`}>{traitsOf(p).username}</a>
                  {p.state !== "active" && <span className="msg error"> ({t("admin.inactive")})</span>}
                </td>
                <td>{traitsOf(p).email}</td>
                <td>
                  {groups.map((g) => (
                    <span key={g} className="tag">
                      {g}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="section-title">{t("admin.new").toUpperCase()}</h2>
        <ActionForm action={createUser}>
          <div className="fields">
            <TextInput name="username" label={t("field.username")} hint="USERNAME" required />
            <TextInput name="email" label={t("field.email")} hint="EMAIL" type="email" required />
            <TextInput name="name" label={t("field.name")} hint="NAME" />
            <GroupChecks checked={["mail-users"]} />
          </div>
          <button type="submit" className="btn btn-primary">
            <span>{t("admin.create")}</span>
            <span className="arrow" aria-hidden="true">→</span>
          </button>
        </ActionForm>
      </Panel>
    </Shell>
  )
}
