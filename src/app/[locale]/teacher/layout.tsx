"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { LogOut, ChevronDown } from "lucide-react"

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()
  const [menuOpen, setMenuOpen] = useState(false)

  const isArabic = pathname?.startsWith("/ar")
  const currentLocale = isArabic ? "ar" : "fr"
  const currentLabel = isArabic ? "AR" : "FR"
  const nextLocale = isArabic ? "fr" : "ar"
  const nextLabel = isArabic ? "FR" : "AR"

  const handleToggleLanguage = () => {
    if (!pathname) return
    const segments = pathname.split("/")

    const rest = segments.slice(3).join("/") // parties après /[locale]/teacher
    const newPath = `/${nextLocale}/teacher${rest ? `/${rest}` : ""}`
    router.push(newPath)
  }

  const handleLogout = () => {
    if (typeof document !== "undefined") {
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    }
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("token")
      }
    } catch {
      // ignore
    }
    router.push(`/${currentLocale}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 md:px-6 py-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-200 overflow-hidden">
              <Image
                src="/Group 13.svg"
                alt="Logo PetitsPas"
                width={40}
                height={40}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t("teacher.dashboard.title")}</h1>
              <p className="text-sm text-gray-500">Crèche PetitsPas</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={handleToggleLanguage}
            >
              {currentLabel} • {nextLabel}
            </Button>
            {/* Profile menu — logout protected behind click */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-1"
              >
                {t("common.account") || "Mon compte"}
                <ChevronDown className="w-3 h-3" />
              </Button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                    <button
                      onClick={() => { setMenuOpen(false); handleLogout() }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("common.logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 md:px-6 py-6 md:py-8">{children}</main>
    </div>
  )
}
