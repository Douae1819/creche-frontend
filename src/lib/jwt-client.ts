import Cookies from "js-cookie"

/** Payload minimal du JWT d’accès (auth Nest). */
export function readJwtPayload(): {
  role?: string
  userId?: string
  email?: string
  sub?: string
} | null {
  try {
    const token = Cookies.get("token") || Cookies.get("auth_token")
    if (!token) return null
    const base64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/")
    if (!base64) return null
    const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : ""
    return JSON.parse(atob(base64 + pad))
  } catch {
    return null
  }
}

export function readJwtRole(): string {
  return String(readJwtPayload()?.role ?? "")
}
