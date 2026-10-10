import "server-only"
import { permissions, relationshipsRead, relationshipsWrite } from "./ory"

/** The groups that exist. Membership lives only in Keto: Group:<name>#members@User:<identity id>. */
export const GROUPS = ["infra-admins", "site-admins", "mail-users", "vpn-users"] as const
export type Group = (typeof GROUPS)[number]

export const isGroup = (value: string): value is Group => (GROUPS as readonly string[]).includes(value)

const member = (identityId: string) => ({
  subjectSetNamespace: "User",
  subjectSetObject: identityId,
  subjectSetRelation: "",
})

export async function isMember(identityId: string, group: Group): Promise<boolean> {
  const result = await permissions().checkPermission({
    namespace: "Group",
    object: group,
    relation: "members",
    ...member(identityId),
  })
  return result.allowed
}

/** Groups of one person, sorted. Unknown objects in Keto are ignored. */
export async function groupsOf(identityId: string): Promise<Group[]> {
  const found = await relationshipsRead().getRelationships({
    namespace: "Group",
    relation: "members",
    ...member(identityId),
    pageSize: 100,
  })
  return (found.relation_tuples ?? [])
    .map((tuple) => tuple.object)
    .filter(isGroup)
    .sort()
}

/** Makes the membership exactly `wanted`: adds the missing groups, removes the rest. */
export async function setGroups(identityId: string, wanted: readonly Group[]): Promise<void> {
  const current = await groupsOf(identityId)
  const write = relationshipsWrite()
  for (const group of wanted.filter((g) => !current.includes(g))) {
    await write.createRelationship({
      createRelationshipBody: {
        namespace: "Group",
        object: group,
        relation: "members",
        subject_set: { namespace: "User", object: identityId, relation: "" },
      },
    })
  }
  for (const group of current.filter((g) => !wanted.includes(g))) {
    await write.deleteRelationships({ namespace: "Group", object: group, relation: "members", ...member(identityId) })
  }
}

/** Removes every membership of a person (before deleting the identity). */
export async function removeFromAllGroups(identityId: string): Promise<void> {
  await relationshipsWrite().deleteRelationships({ namespace: "Group", relation: "members", ...member(identityId) })
}
