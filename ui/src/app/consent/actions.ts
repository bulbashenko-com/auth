"use server"

import { redirect } from "next/navigation"
import { answerConsent } from "@/lib/consent"

/** The person's answer. Next.js checks the Origin of server actions; the decision itself is rebuilt server-side. */
export async function answer(form: FormData) {
  const challenge = String(form.get("consent_challenge") ?? "")
  if (!challenge) throw new Error("Missing consent challenge")
  const allow = form.get("answer") === "allow"
  const remember = form.get("remember") === "on"
  redirect(await answerConsent(challenge, allow, remember))
}
