import { redirect } from "next/navigation"
import { Panel, Shell } from "@/components/Shell"
import { beginConsent } from "@/lib/consent"
import type { SearchParams } from "@/lib/flows"
import type { Key } from "@/lib/i18n"
import { getT } from "@/lib/locale"
import { answer } from "./actions"

export default async function ConsentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const challenge = typeof params.consent_challenge === "string" ? params.consent_challenge : undefined
  if (!challenge) redirect("/")

  const result = await beginConsent(challenge)
  if ("redirectTo" in result) redirect(result.redirectTo)

  const { t } = await getT()
  const client = result.request.client
  const clientName = client?.client_name || client?.client_id || "?"
  const scopeLabel = (scope: string) => {
    const key = `scope.${scope}` as Key
    const label = t(key)
    return label === key ? scope : label
  }

  return (
    <Shell eye="idle">
      <Panel
        path="~/identity/consent"
        rd={clientName}
        step={t("consent.label")}
        title={t("consent.title")}
        desc={t("consent.desc", { client: clientName })}
      >
        <form action={answer} className="stack">
          <input type="hidden" name="consent_challenge" value={challenge} />
          <div className="box">
            {result.decision.grantScope.map((scope) => (
              <div key={scope} className="box-row">
                <span className="key">{scope}</span>
                <span className="val">{scopeLabel(scope)}</span>
              </div>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" name="remember" defaultChecked />
            <span className="mark" aria-hidden="true" />
            <span>{t("consent.remember")}</span>
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" name="answer" value="allow" className="btn btn-primary" style={{ flex: 1 }}>
              <span>{t("consent.accept")}</span>
              <span className="arrow" aria-hidden="true">→</span>
            </button>
            <button type="submit" name="answer" value="deny" className="btn btn-quiet" style={{ flex: "0 0 160px" }}>
              <span>{t("consent.deny")}</span>
            </button>
          </div>
        </form>
      </Panel>
    </Shell>
  )
}
