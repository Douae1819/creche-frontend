"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { LogOut, ChevronDown } from "lucide-react"
import { type Locale } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"
import { hrefForLocaleFromPathname, setNextIntlLocaleCookie, withLocalePath } from "@/lib/i18n/locale-path"
import { apiClient } from "@/lib/api"

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const t = useTranslations()
  const currentLocale = useLocale() as Locale
  const [menuOpen, setMenuOpen] = useState(false)

  const isArabic = currentLocale === "ar"
  const nextLocale: Locale = isArabic ? "fr" : "ar"

  const handleToggleLanguage = () => {
    setNextIntlLocaleCookie(nextLocale)
    router.replace(hrefForLocaleFromPathname(pathname, nextLocale))
  }

  const handleLogout = async () => {
    await apiClient.logout()
    try {
      localStorage.removeItem("token")
      localStorage.removeItem("auth_token")
    } catch {
      /* ignore */
    }
    router.replace(withLocalePath(currentLocale, "/auth/login-user"))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Slim top bar — z élevé quand menu ouvert pour passer au-dessus de la bottom nav parent (z-50) */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 bg-white border-b border-gray-100 shadow-sm transition-[z-index]",
          menuOpen ? "z-[200]" : "z-[60]",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between h-12 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-sky-50">
              <Image src="/Group 13.svg" alt="PetitsPas" width={28} height={28} />
            </div>
            <span className="text-sm font-bold text-gray-900">PetitsPas</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleToggleLanguage} className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full px-2.5 py-1">
              {isArabic ? "FR" : "AR"}
            </button>
            {/* Profile menu — logout protected behind click */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                className="text-sm font-semibold text-gray-800 hover:text-gray-900 border border-gray-200 bg-white rounded-full px-3 py-1.5 flex items-center gap-1 shadow-sm"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {t("common.account") || "Mon compte"}
                <ChevronDown className="w-3 h-3" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-[190] cursor-default bg-transparent"
                    aria-label={t("common.closeMenu")}
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-[210] mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[200px] max-h-[min(50vh,280px)] overflow-y-auto"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); handleLogout() }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      {t("common.logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Main content — add top padding for header */}
      <main className="pt-12">{children}</main>
    </div>
  )
}
