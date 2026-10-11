import type { LoginFlow } from "@ory/client-fetch"
import { headers } from "next/headers"
import { Panel, Shell } from "@/components/Shell"
import { EyeForm } from "@/components/kratos/client"
import {
  Field,
  findNode,
  HiddenInputs,
  inGroups,
  inputAttrs,
  Messages,
  NodeButton,
  NodeScripts,
  NodeTriggers,
  OtpField,
} from "@/components/kratos/nodes"
import { loadFlow, logoutUrl, type SearchParams } from "@/lib/flows"
import { getT } from "@/lib/locale"

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const flow = await loadFlow<LoginFlow>("login", params)
  const { locale, t } = await getT()
  const nonce = (await headers()).get("x-nonce") ?? undefined
  const nodes = flow.ui.nodes
  const hasError = flow.ui.messages?.some((m) => m.type === "error") || nodes.some((n) => n.messages.some((m) => m.type === "error"))
  const rd = flow.oauth2_login_request?.client?.client_name || hostOf(flow.return_to)

  if (flow.requested_aal === "aal2") {
    return (
      <Shell eye={hasError ? "error" : "idle"}>
        <SecondFactor flow={flow} rd={rd} />
      </Shell>
    )
  }

  const passkey = inGroups(nodes, "passkey")
  const trigger = passkey.find((n) => inputAttrs(n)?.onclickTrigger)
  const identifier = findNode(nodes, "identifier")
  const password = findNode(nodes, "password")
  const submit = inGroups(nodes, "password").find((n) => inputAttrs(n)?.name === "method")
  const refresh = flow.refresh

  return (
    <Shell eye={hasError ? "error" : "idle"}>
      <Panel
        path="~/identity/auth"
        rd={rd}
        step={refresh ? t("login.refresh.label") : undefined}
        title={refresh ? t("login.refresh.title") : t("login.title")}
        desc={refresh ? t("login.refresh.desc") : t("login.desc")}
      >
        <EyeForm action={flow.ui.action} method={flow.ui.method} className="stack">
          <HiddenInputs nodes={nodes} />
          <Messages messages={flow.ui.messages} locale={locale} />
          {trigger && <NodeButton node={trigger} locale={locale} variant="primary" label={t("login.passkey")} />}
          {trigger && password && <div className="divider">{t("login.or-password")}</div>}
          {password && (
            <div className="fields">
              {identifier && inputAttrs(identifier)?.type !== "hidden" && (
                <Field
                  node={identifier}
                  locale={locale}
                  label={t("field.username")}
                  hint={t("field.username-hint")}
                  placeholder="admin"
                />
              )}
              <Field node={password} locale={locale} label={t("field.password")} hint={t("field.password-hint")} />
              {!refresh && (
                <div className="links">
                  <span />
                  <a className="link" href="/recovery">
                    {t("login.reset")}
                  </a>
                </div>
              )}
            </div>
          )}
          {submit && <NodeButton node={submit} locale={locale} variant="secondary" label={t("login.submit")} />}
        </EyeForm>
        <NodeScripts nodes={nodes} nonce={nonce} />
        <NodeTriggers nodes={nodes} />
      </Panel>
    </Shell>
  )
}

async function SecondFactor({ flow, rd }: { flow: LoginFlow; rd?: string }) {
  const { locale, t } = await getT()
  const nodes = flow.ui.nodes
  const totpCode = findNode(nodes, "totp_code")
  const lookup = findNode(nodes, "lookup_secret")
  const lookupSubmit = inGroups(nodes, "lookup_secret").find((n) => inputAttrs(n)?.name === "method")
  // Kratos may echo the identifier in the second-factor flow; never fall back to another node's value.
  const identifierNode = findNode(nodes, "identifier")
  const name = identifierNode ? String(inputAttrs(identifierNode)?.value ?? "") : ""
  const signOut = await logoutUrl()

  return (
    <Panel
      path="~/identity/auth/2fa"
      rd={rd}
      step={t("login.2fa.label")}
      title={name && name !== "null" ? t("login.2fa.title", { name }) : t("login.2fa.title-anon")}
      desc={t("login.2fa.desc")}
    >
      <Messages messages={flow.ui.messages} locale={locale} />
      {totpCode && (
        <EyeForm action={flow.ui.action} method={flow.ui.method} className="stack">
          <HiddenInputs nodes={inGroups(nodes, "default", "totp")} />
          <input type="hidden" name="method" value="totp" />
          <OtpField node={totpCode} locale={locale} label={t("login.2fa.code")} hint={t("login.2fa.code-hint")} />
          <button type="submit" className="btn btn-primary">
            <span>{t("login.submit")}</span>
            <span className="arrow" aria-hidden="true">→</span>
          </button>
        </EyeForm>
      )}
      {lookup && lookupSubmit && (
        <details>
          <summary className="link">{t("login.2fa.lookup")}</summary>
          <EyeForm action={flow.ui.action} method={flow.ui.method} className="stack" style={{ marginTop: 16 }}>
            <HiddenInputs nodes={inGroups(nodes, "default", "lookup_secret")} />
            <Field node={lookup} locale={locale} label={t("login.2fa.lookup-label")} hint="LOOKUP / CODE" />
            <NodeButton node={lookupSubmit} locale={locale} variant="secondary" label={t("login.submit")} />
          </EyeForm>
        </details>
      )}
      {signOut && (
        <div className="links">
          <span />
          <a className="link" href={signOut}>
            {t("login.logout")}
          </a>
        </div>
      )}
    </Panel>
  )
}

function hostOf(url?: string) {
  if (!url) return undefined
  try {
    const u = new URL(url)
    return u.host + (u.pathname === "/" ? "" : u.pathname)
  } catch {
    return undefined
  }
}
