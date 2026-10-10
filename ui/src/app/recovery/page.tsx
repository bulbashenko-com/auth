import type { RecoveryFlow } from "@ory/client-fetch"
import { Panel, Shell } from "@/components/Shell"
import { GroupForm } from "@/components/kratos/GroupForm"
import { loadFlow, type SearchParams } from "@/lib/flows"
import { getT } from "@/lib/locale"

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const flow = await loadFlow<RecoveryFlow>("recovery", await searchParams)
  const { locale, t } = await getT()
  const sent = flow.state === "sent_email"
  const hasError = flow.ui.messages?.some((m) => m.type === "error")
  return (
    <Shell eye={hasError ? "error" : sent ? "ok" : "idle"}>
      <Panel
        path="~/identity/recovery"
        step={sent ? t("recovery.sent.label") : t("recovery.label")}
        title={sent ? t("recovery.sent.title") : t("recovery.title")}
        desc={sent ? t("recovery.sent.desc") : t("recovery.desc")}
      >
        <GroupForm
          ui={flow.ui}
          group="code"
          locale={locale}
          showFlowMessages
          primaryLabel={sent ? t("recovery.confirm") : t("recovery.submit")}
          labels={{
            email: { label: t("field.email"), hint: t("field.email-hint"), placeholder: "you@bulbashenko.com" },
            code: { label: t("field.code"), hint: t("field.code-hint") },
          }}
        />
        <a className="link" href="/login">
          {t("login.cancel")}
        </a>
      </Panel>
    </Shell>
  )
}
