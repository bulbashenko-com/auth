import { ResponseError } from "@ory/client-fetch"
import { Panel, Shell } from "@/components/Shell"
import type { SearchParams } from "@/lib/flows"
import { getT } from "@/lib/locale"
import { frontend } from "@/lib/ory"

/** Kratos errors (?id=...) and Hydra errors (?error=...&error_description=...). Details stay generic on purpose. */
export default async function ErrorPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const { t } = await getT()
  let title = t("error.title")
  let desc = t("error.desc")
  const id = typeof params.id === "string" ? params.id : undefined
  const hydraError = typeof params.error === "string" ? params.error : undefined

  if (hydraError === "access_denied") {
    title = t("error.denied.title")
    desc = t("error.denied.desc")
  } else if (hydraError) {
    desc = `${hydraError}${typeof params.error_description === "string" ? `\n${params.error_description}` : ""}`
  } else if (id) {
    try {
      const flowError = await frontend().getFlowError({ id })
      const e = flowError.error as { message?: string; reason?: string } | undefined
      desc = [e?.message, e?.reason].filter(Boolean).join("\n") || desc
    } catch (error) {
      if (!(error instanceof ResponseError)) throw error
    }
  }

  return (
    <Shell eye="error">
      <Panel path="~/identity/error" step={t("error.label")} title={title} desc={desc}>
        <a className="btn btn-secondary" href="/login" style={{ alignSelf: "flex-start" }}>
          <span>{t("error.back")}</span>
        </a>
      </Panel>
    </Shell>
  )
}
