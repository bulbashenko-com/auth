import { redirect } from "next/navigation"
import { Panel, Shell } from "@/components/Shell"
import { logoutUrl, type SearchParams } from "@/lib/flows"
import { getT } from "@/lib/locale"
import { oauth2 } from "@/lib/ory"

/**
 * Hydra's logout step (?logout_challenge=): accepted at once; Hydra then also ends the Kratos session
 * (urls.identity_provider). Without a challenge: ends the Kratos session through Kratos' logout URL.
 */
export default async function LogoutPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const challenge = typeof params.logout_challenge === "string" ? params.logout_challenge : undefined
  if (challenge) {
    const { redirect_to } = await oauth2().acceptOAuth2LogoutRequest({ logoutChallenge: challenge })
    redirect(redirect_to)
  }
  const url = await logoutUrl()
  if (url) redirect(url)

  const { t } = await getT()
  return (
    <Shell eye="ok">
      <Panel path="~/identity/logout" step="SIGN OUT" title={t("logout.title")} desc={t("logout.desc")}>
        <a className="btn btn-secondary" href="/login" style={{ alignSelf: "flex-start" }}>
          <span>{t("error.back")}</span>
        </a>
      </Panel>
    </Shell>
  )
}
