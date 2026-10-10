import "server-only"

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Environment variable ${name} is not set`)
  return value.replace(/\/$/, "")
}

/** Where the services are, from the UI server's point of view. Admin URLs never reach the browser. */
export const env = {
  /** Public origin of the login portal, e.g. https://auth.bulbashenko.com. Kratos and Hydra live on the same host. */
  get publicUrl() {
    return required("PUBLIC_URL")
  },
  /** Host of the admin page (users.int), mesh-only. */
  get adminHost() {
    return required("ADMIN_HOST")
  },
  get kratosPublic() {
    return required("KRATOS_PUBLIC_URL")
  },
  get kratosAdmin() {
    return required("KRATOS_ADMIN_URL")
  },
  get hydraAdmin() {
    return required("HYDRA_ADMIN_URL")
  },
  get ketoRead() {
    return required("KETO_READ_URL")
  },
  get ketoWrite() {
    return required("KETO_WRITE_URL")
  },
}
