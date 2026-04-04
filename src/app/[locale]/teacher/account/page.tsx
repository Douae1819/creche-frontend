"use client"

import { use, useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api"
import type { Locale } from "@/lib/i18n/config"

export default function TeacherAccountPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params)
  const tm = useTranslations("teacher.dashboard.accountMenu")
  const ta = useTranslations("teacher.account")

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(ta("errors.required"))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(tm("passwordMismatch"))
      return
    }
    try {
      setLoading(true)
      await apiClient.changeAuthPassword(oldPassword, newPassword, confirmPassword)
      setSuccess(tm("passwordChanged"))
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } }
      const msg = ax?.response?.data?.message
      setError(
        typeof msg === "string"
          ? msg
          : Array.isArray(msg)
            ? msg.join("\n")
            : tm("passwordError"),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/${locale}/teacher`}
          className="text-sm text-sky-600 hover:underline"
        >
          ← {ta("back")}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">{ta("title")}</h1>
      </div>

      <Card className="p-6">
        {error && (
          <p className="mb-3 whitespace-pre-line text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="mb-3 text-sm text-emerald-600">{success}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{tm("oldPassword")}</label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tm("newPassword")}</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tm("confirmPassword")}</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600">
              {loading ? ta("saving") : tm("submit")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
