#!/usr/bin/env node
// Makes Hydra's OAuth2 clients exactly the ones described in the given directories (*.json): creates the missing,
// replaces the existing (PUT, so removed fields go back to defaults) and deletes clients that are not described.
// `${VAR}` in a file is replaced from the environment; a missing variable is an error.
//
//   node scripts/sync-clients.mjs <dir> [<dir> ...]      (HYDRA_ADMIN_URL, default http://hydra:4445)

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const admin = (process.env.HYDRA_ADMIN_URL ?? "http://hydra:4445").replace(/\/$/, "")
const dirs = process.argv.slice(2)
if (dirs.length === 0) {
  console.error("usage: sync-clients.mjs <dir> [<dir> ...]")
  process.exit(2)
}

function substitute(text, file) {
  return text.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => {
    const value = process.env[name]
    if (!value) throw new Error(`${file}: environment variable ${name} is not set`)
    return value
  })
}

async function call(method, path, body) {
  const response = await fetch(`${admin}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok && response.status !== 404) {
    throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`)
  }
  return response
}

const wanted = new Map()
for (const dir of dirs) {
  for (const name of (await readdir(dir)).filter((f) => f.endsWith(".json")).sort()) {
    const file = join(dir, name)
    const client = JSON.parse(substitute(await readFile(file, "utf8"), file))
    if (!client.client_id) throw new Error(`${file}: client_id is required`)
    if (!client.metadata?.required_group) throw new Error(`${file}: metadata.required_group is required`)
    wanted.set(client.client_id, client)
  }
}

const existing = await (await call("GET", "/admin/clients?page_size=500")).json()
const existingIds = new Set(existing.map((c) => c.client_id))

for (const [id, client] of wanted) {
  if (existingIds.has(id)) {
    await call("PUT", `/admin/clients/${encodeURIComponent(id)}`, client)
    console.log(`updated ${id}`)
  } else {
    await call("POST", "/admin/clients", client)
    console.log(`created ${id}`)
  }
}
for (const id of existingIds) {
  if (!wanted.has(id)) {
    await call("DELETE", `/admin/clients/${encodeURIComponent(id)}`)
    console.log(`deleted ${id}`)
  }
}
