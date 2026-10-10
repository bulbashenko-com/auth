import type { VerificationFlow } from "@ory/client-fetch"
import { Panel, Shell } from "@/components/Shell"
import { GroupForm } from "@/components/kratos/GroupForm"
import { loadFlow, type SearchParams } from "@/lib/flows"
import { getT } from "@/lib/locale"

export default async function VerificationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const flow = await loadFlow<VerificationFlow>("verification", await searchParams)
  const { locale, t } = await getT()
  const done = flow.state === "passed_challenge"
  return (
    <Shell eye={done ? "ok" : "idle"}>
      <Panel
        path="~/identity/verification"
        step={t("verification.label")}
        title={done ? t("verification.done.title") : t("verification.title")}
        desc={done ? t("verification.done.desc") : t("verification.desc")}
      >
        {!done && (
          <GroupForm
            ui={flow.ui}
            group="code"
            locale={locale}
            showFlowMessages
            labels={{
              email: { label: t("field.email"), hint: t("field.email-hint") },
              code: { label: t("field.code"), hint: t("field.code-hint") },
            }}
          />
        )}
        <a className="link" href="/">
          {t("error.back")}
        </a>
      </Panel>
    </Shell>
  )
}
