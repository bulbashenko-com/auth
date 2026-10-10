// Ory Permission Language: people are Kratos identity ids, groups are named objects.
// Membership: Group:infra-admins#members@<identity id>.
import { Namespace } from "@ory/keto-namespace-types"

class User implements Namespace {}

class Group implements Namespace {
  related: {
    members: User[]
  }
}
