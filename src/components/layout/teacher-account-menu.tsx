"use client"

import { useState } from "react"
import Link from "next/link"
import { LogOut, ChevronDown, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocale, useTranslations } from "next-intl"

type Props = {
  onLogout: () => void
}

export function TeacherAccountMenu({ onLogout }: Props) {
  const tc = useTranslations("common")
  const td = useTranslations("teacher.dashboard.accountMenu")
  const locale = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-1"
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        {tc("account")}
        <ChevronDown className="w-3 h-3" />
      </Button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenuOpen(false)} />
          <div
            className="absolute right-0 top-10 z-20 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="menu"
          >
            <Link
              href={`/${locale}/teacher/account`}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <KeyRound className="h-4 w-4" />
              {td("changePassword")}
            </Link>
            <div className="my-1 border-t border-gray-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onLogout()
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              {tc("logout")}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
