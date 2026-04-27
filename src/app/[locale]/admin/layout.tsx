"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { readJwtRole } from "@/lib/jwt-client"
import { getSessionSnapshot } from "@/lib/auth-session"

/**
 * Protège l’espace admin côté client (JWT rôle ADMIN ou SUPER_ADMIN + cookie de session).
 * La sécurité réelle est assurée par l’API ; ce layout évite d’afficher l’UI à un compte non autorisé.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const { hasAnyToken } = getSessionSnapshot()
    if (!hasAnyToken) {
      const locale = pathname.split("/").filter(Boolean)[0] || "fr"
      router.replace(`/${locale}`)
      return
    }
    const role = readJwtRole().toUpperCase()
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      const locale = pathname.split("/").filter(Boolean)[0] || "fr"
      router.replace(`/${locale}`)
      return
    }
    setReady(true)
  }, [pathname, router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  return <>{children}</>
}
