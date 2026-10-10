import type { SettingsFlow } from "@ory/client-fetch"
import { headers } from "next/headers"
import { Panel, Shell } from "@/components/Shell"
import { GroupForm } from "@/components/kratos/GroupForm"
import { findNode, Messages, NodeScripts } from "@/components/kratos/nodes"
import { loadFlow, logoutUrl, type SearchParams } from "@/lib/flows"
import { getT } from "@/lib/locale"
import type { Key } from "@/lib/i18n"

const SECTIONS = ["passkey", "totp", "lookup_secret", "password"] as const

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const flow = await loadFlow<SettingsFlow>("settings", await searchParams)
  const { locale, t } = await getT()
  const nonce = (await headers()).get("x-nonce") ?? undefined
  const traits = flow.identity.traits as { username?: string; name?: string }
  const signOut = await logoutUrl()
  // A totp_code input means no authenticator app is linked yet.
  const totpMissing = !!findNode(flow.ui.nodes, "totp_code")

  return (
    <Shell eye={flow.state === "success" ? "ok" : "idle"}>
      <Panel
        path="~/identity/settings"
        rd={flow.return_to}
        step={t("settings.label")}
        title={t("settings.title")}
        desc={`${t("settings.signed-in-as", { name: traits.name || traits.username || "" })}\n${t("settings.desc")}`}
      >
        <Messages messages={flow.ui.messages} locale={locale} />
        {totpMissing && <p className="msg error">{t("settings.no-totp")}</p>}
        {SECTIONS.map((group) => (
          <section key={group} className="stack" aria-labelledby={`s-${group}`}>
            <h2 id={`s-${group}`} className="section-title">
              {t(`settings.section.${group}` as Key)}
            </h2>
            <GroupForm
              ui={flow.ui}
              group={group}
              locale={locale}
              labels={{ password: { label: t("settings.password.new"), hint: t("field.password-hint") } }}
            />
          </section>
        ))}
        <NodeScripts nodes={flow.ui.nodes} nonce={nonce} />
        <div className="links">
          {flow.return_to ? <a href={flow.return_to}>[ ← {hostOf(flow.return_to)} ]</a> : <span />}
          {signOut && <a href={signOut}>{t("login.logout")}</a>}
        </div>
      </Panel>
    </Shell>
  )
}

function hostOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
