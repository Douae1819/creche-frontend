"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { apiClient } from "@/lib/api"

type ClassSummary = {
  date: string
  classeId: string
  classeNom: string
  totalEnfants: number
  presentsCount: number
  absentsCount: number
  justifiesCount: number
  resumesCount: number
  avgNapMinutes?: number
}

type ExportStats = {
  date: string
  appetitStats: Record<string, number>
  humeurStats: Record<string, number>
  participationStats: Record<string, number>
}

export default function TeacherSummary() {
  const t = useTranslations("teacher.summary")
  const params = useParams()
  const locale = (params?.locale as string) ?? "fr"

  const [summaryData, setSummaryData] = useState<ClassSummary | null>(null)
  const [stats, setStats] = useState<ExportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyMessage, setDailyMessage] = useState("")
  const [classSummaryId, setClassSummaryId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      try {
        setLoading(true)
        setError(null)

        const todayDate = new Date().toISOString().slice(0, 10)

        const classesRes = await apiClient.listClasses()
        const classes = classesRes.data?.data ?? classesRes.data ?? []
        if (!classes.length) {
          if (!cancelled) setError(t("errors.noClass"))
          return
        }

        const cls = classes[0]

        const [summaryRes, statsRes, classDailyRes] = await Promise.all([
          apiClient.getClassSummary(cls.id, todayDate),
          apiClient.exportClassStatistics(cls.id, todayDate, todayDate),
          apiClient.listClassDailySummaries({ classeId: cls.id, date: todayDate }),
        ])

        const summary = summaryRes.data
        const statsPayload = statsRes.data
        const statsArray: any[] = Array.isArray(statsPayload)
          ? statsPayload
          : Array.isArray(statsPayload?.data)
            ? statsPayload.data
            : Array.isArray(statsPayload?.items)
              ? statsPayload.items
              : []
        const classDailyArray = classDailyRes.data?.data ?? classDailyRes.data ?? []
        const classDaily =
          Array.isArray(classDailyArray) && classDailyArray.length > 0
            ? classDailyArray[0]
            : null
        const statsForDay =
          Array.isArray(statsArray) && statsArray.length > 0
            ? statsArray.find((s: any) => s?.date === todayDate) ?? statsArray[0]
            : null

        if (!cancelled) {
          setSummaryData(summary)

          // Debug: inspect raw statistics returned by the API for this day
          if (statsForDay) {
            // eslint-disable-next-line no-console
            console.log("[TeacherSummary] statsForDay", statsForDay)
          } else {
            // eslint-disable-next-line no-console
            console.log("[TeacherSummary] no statsForDay for", todayDate, statsArray)
          }

          setStats(
            statsForDay
              ? {
                  date: statsForDay.date,
                  appetitStats: statsForDay.appetitStats ?? {},
                  humeurStats: statsForDay.humeurStats ?? {},
                  participationStats: statsForDay.participationStats ?? {},
                }
              : null,
          )

          if (classDaily) {
            setClassSummaryId(classDaily.id)
            setPublished(classDaily.statut === "Publie")
            if (typeof classDaily.observations === "string") {
              setDailyMessage(classDaily.observations)
            }
          } else {
            setClassSummaryId(null)
            setPublished(false)
            setDailyMessage("")
          }
        }
      } catch (e) {
        console.error("[TeacherSummary] loadSummary error", e)
        if (!cancelled) setError(t("errors.loadSummaryError"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSummary()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSaveDailyMessage = async () => {
    if (!summaryData) return
    try {
      setSaving(true)
      setInfoMessage(null)
      const date = summaryData.date
      const classeId = summaryData.classeId

      if (classSummaryId) {
        await apiClient.updateClassDailySummary(classSummaryId, {
          observations: dailyMessage || null,
        })
      } else {
        const res = await apiClient.createClassDailySummary({
          classeId,
          date,
          activites: "", // simplifié pour MVP
          apprentissages: "",
          humeurGroupe: "",
          observations: dailyMessage || null,
        })
        const created = res.data
        if (created?.id) {
          setClassSummaryId(created.id)
        }
      }

      setInfoMessage(t("success.dailyMessageSaved"))
      setTimeout(() => setInfoMessage(null), 3000)
    } catch (e) {
      console.error("[TeacherSummary] handleSaveDailyMessage error", e)
      setInfoMessage(t("errors.saveMessageError"))
    } finally {
      setSaving(false)
    }
  }

  const handleSendToAll = async () => {
    if (!summaryData) return
    try {
      setSending(true)
      setInfoMessage(null)

      let id = classSummaryId
      const date = summaryData.date
      const classeId = summaryData.classeId

      if (!id) {
        const res = await apiClient.createClassDailySummary({
          classeId,
          date,
          activites: "",
          apprentissages: "",
          humeurGroupe: "",
          observations: dailyMessage || null,
        })
        const created = res.data
        id = created?.id ?? null
        if (id) setClassSummaryId(id)
      }

      if (id) {
        const res = await apiClient.publishClassDailySummary(id)
        if (res?.data?.statut === "Publie") {
          setPublished(true)
        }
      }

      setInfoMessage(t("success.messageSentToParents"))
      setTimeout(() => setInfoMessage(null), 4000)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? ""
      if (msg.includes("déjà publié") || msg.includes("already")) {
        setPublished(true)
        setInfoMessage(t("success.messageSentToParents"))
      } else {
        console.error("[TeacherSummary] handleSendToAll error", e)
        setInfoMessage(t("errors.sendMessageError"))
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">{t("loading")}</div>
  }

  if (error || !summaryData) {
    return <div className="p-6 text-sm text-red-600">{error ?? t("errors.summaryUnavailable")}</div>
  }

  const presentCount = summaryData.presentsCount

  const formatNap = (minutes?: number) => {
    if (!minutes || minutes <= 0) return "0h00"
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const hLabel = `${h}h`
    const mLabel = m.toString().padStart(2, "0")
    return `${hLabel}${mLabel}`
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 lg:px-0 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            {summaryData.classeNom} • {summaryData.date}
          </p>
        </div>
        <Link href={`/${locale}/teacher`}>
          <Button variant="outline" className="rounded-lg bg-transparent border border-gray-300 font-medium text-sm">
            ← {t("back")}
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-sky-50 to-sky-100 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600 uppercase">{t("kpis.presentLabel")}</p>
              <p className="text-4xl font-bold text-sky-700 mt-2">{summaryData.presentsCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600 uppercase">{t("kpis.attendanceRateLabel")}</p>
              <p className="text-4xl font-bold text-green-700 mt-2">
                {summaryData.totalEnfants > 0
                  ? Math.round((summaryData.presentsCount / summaryData.totalEnfants) * 100)
                  : 0}
                %
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600 uppercase">{t("kpis.avgNapLabel")}</p>
              <p className="text-4xl font-bold text-purple-700 mt-2">
                {formatNap(summaryData.avgNapMinutes)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Breakdown */}
        <Card className="border border-gray-200 shadow-sm md:col-span-2">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span>📊</span> Présences du jour
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{summaryData.presentsCount}</p>
                <p className="text-xs text-green-600 mt-1">Présents</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{summaryData.absentsCount}</p>
                <p className="text-xs text-red-600 mt-1">Absents</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{summaryData.justifiesCount}</p>
                <p className="text-xs text-blue-600 mt-1">Justifiés</p>
              </div>
            </div>
            <p className="text-xs text-center text-gray-400 mt-3">{summaryData.resumesCount} fiche(s) de résumé complétée(s)</p>
          </CardContent>
        </Card>
        {/* Appetite */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span>🍽️</span> {t("sections.appetiteTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {stats && Object.entries(stats.appetitStats).length > 0 ? (
              Object.entries(stats.appetitStats).map(([label, count]) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">{label}</span>
                    <span className="text-lg font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: presentCount > 0 ? `${(count / presentCount) * 100}%` : "0%" }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">Aucune donnée d'appétit pour cette journée.</p>
            )}
          </CardContent>
        </Card>

        {/* Mood */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span>😊</span> {t("sections.moodTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {stats && Object.entries(stats.humeurStats).length > 0 ? (
              Object.entries(stats.humeurStats).map(([label, count]) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">{label}</span>
                    <span className="text-lg font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: presentCount > 0 ? `${(count / presentCount) * 100}%` : "0%" }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">Aucune donnée d'humeur pour cette journée.</p>
            )}
          </CardContent>
        </Card>

        {/* Participation */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span>⭐</span> {t("sections.participationTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {stats && Object.entries(stats.participationStats).length > 0 ? (
              Object.entries(stats.participationStats).map(([label, count]) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">{label}</span>
                    <span className="text-lg font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: presentCount > 0 ? `${(count / presentCount) * 100}%` : "0%" }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">Aucune donnée de participation pour cette journée.</p>
            )}
          </CardContent>
        </Card>

        {/* Daily Message */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span>📝</span> {t("sections.dailyMessageTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {infoMessage && (
              <div className="mb-3 text-xs px-3 py-2 rounded-md border bg-sky-50 text-sky-800 border-sky-200">
                {infoMessage}
              </div>
            )}
            <textarea
              placeholder={t("sections.dailyMessagePlaceholder")}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-transparent resize-none"
              rows={3}
              value={dailyMessage}
              onChange={(e) => setDailyMessage(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-lg border border-gray-300 font-medium text-sm bg-transparent"
                onClick={handleSaveDailyMessage}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : t("sections.saveButton")}
              </Button>
              <Button
                className="rounded-lg bg-sky-500 text-white hover:bg-sky-600 font-semibold text-sm px-6 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleSendToAll}
                disabled={sending || !dailyMessage}
              >
                {published ? "✓ Envoyé" : t("sections.sendAllButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <Link href={`/${locale}/teacher`}>
          <Button className="rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 font-semibold px-8 py-3">
            {t("sections.finishDayButton")}
          </Button>
        </Link>
      </div>
    </div>
  )
}
