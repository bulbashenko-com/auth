import { redirect } from "next/navigation"
import { Panel, Shell } from "@/components/Shell"
import { currentSession, logoutUrl } from "@/lib/flows"
import { getT } from "@/lib/locale"

/** Landing page after a plain sign-in (no app waiting): links to settings and sign-out. */
export default async function Home() {
  const session = await currentSession()
  if (!session) redirect("/login")
  const { t } = await getT()
  const traits = session.identity?.traits as { username?: string; name?: string }
  const signOut = await logoutUrl()
  return (
    <Shell eye="ok">
      <Panel
        path="~/identity"
        step="IDENTITY CONFIRMED"
        title={t("home.title")}
        desc={`${t("home.desc")}\n${t("settings.signed-in-as", { name: traits?.name || traits?.username || "" })}`}
      >
        <div className="stack">
          <a className="btn btn-primary" href="/settings">
            <span>{t("home.settings")}</span>
            <span className="arrow" aria-hidden="true">→</span>
          </a>
          {signOut && (
            <a className="btn btn-quiet" href={signOut}>
              <span>{t("home.logout")}</span>
            </a>
          )}
        </div>
      </Panel>
    </Shell>
  )
}
