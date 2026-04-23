"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { apiClient } from "@/lib/api"
import { formatLocalDateKey } from "@/lib/date-local"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sparkles } from "lucide-react"
import { TeacherClassActivityPhotosPanel } from "../teacher-class-activity-photos-panel"

type Classe = { id: string; nom: string }

type ClassSummaryPayload = {
  date?: string
  classeId?: string
  classeNom?: string
  totalEnfants?: number
  presentsCount?: number
  absentsCount?: number
  resumesCount?: number
}

type CollectiveRow = {
  id: string
  activites: string
  apprentissages: string
  humeurGroupe: string
  observations?: string | null
  statut?: string
}

function unwrapList<T>(res: { data?: unknown }): T[] {
  const body = res.data as Record<string, unknown> | undefined
  if (!body) return []
  const data = body.data
  if (Array.isArray(data)) return data as T[]
  if (Array.isArray(body)) return body as T[]
  return []
}

function unwrapOne<T>(res: { data?: unknown }): T | null {
  const body = res.data as Record<string, unknown> | T | undefined
  if (!body || typeof body !== "object") return null
  if ("data" in body && body.data !== undefined && body.data !== null && typeof body.data === "object") {
    return body.data as T
  }
  return body as T
}

export default function TeacherDaySummaryPage() {
  const t = useTranslations("teacher.summary")
  const tSections = useTranslations("teacher.summary.sections")
  const params = useParams()
  const locale = (params?.locale as string) ?? "fr"

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [teacherClass, setTeacherClass] = useState<Classe | null>(null)
  const [summaryDate, setSummaryDate] = useState(() => formatLocalDateKey(new Date()))
  const [classKpi, setClassKpi] = useState<ClassSummaryPayload | null>(null)
  const [collectiveId, setCollectiveId] = useState<string | null>(null)
  const [collectiveStatut, setCollectiveStatut] = useState<string | null>(null)
  /** Champs API requis, non affichés — conservés depuis le serveur ou « — » par défaut */
  const [collectiveMeta, setCollectiveMeta] = useState({
    activites: "—",
    apprentissages: "—",
    humeurGroupe: "—",
  })
  const [observations, setObservations] = useState("")
  const [aiRewriting, setAiRewriting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [bannerOk, setBannerOk] = useState<string | null>(null)
  const [bannerErr, setBannerErr] = useState<string | null>(null)

  const loadCollectiveSummary = async (classId: string, date: string) => {
    const res = await apiClient.listClassDailySummaries({
      classeId: classId,
      date,
      pageSize: 10,
    })
    const rows = unwrapList<CollectiveRow>(res)
    const row = rows[0] ?? null
    if (row) {
      setCollectiveId(row.id)
      setCollectiveStatut(row.statut ?? null)
      setCollectiveMeta({
        activites: (row.activites ?? "").trim() || "—",
        apprentissages: (row.apprentissages ?? "").trim() || "—",
        humeurGroupe: (row.humeurGroupe ?? "").trim() || "—",
      })
      setObservations(row.observations ?? "")
    } else {
      setCollectiveId(null)
      setCollectiveStatut(null)
      setCollectiveMeta({ activites: "—", apprentissages: "—", humeurGroupe: "—" })
      setObservations("")
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const classesRes = await apiClient.listClasses()
        const classes = classesRes.data?.data ?? classesRes.data ?? []
        if (!Array.isArray(classes) || classes.length === 0) {
          if (!cancelled) setLoadError(t("errors.noClass"))
          return
        }
        const cls = classes[0] as Classe
        if (!cancelled) setTeacherClass({ id: cls.id, nom: cls.nom })
      } catch {
        if (!cancelled) setLoadError(t("errors.loadSummaryError"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    if (!teacherClass?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiClient.getClassSummary(teacherClass.id, summaryDate)
        const s = unwrapOne<ClassSummaryPayload>(res)
        if (!cancelled) setClassKpi(s)
      } catch {
        if (!cancelled) {
          setClassKpi(null)
          setBannerErr(t("errors.summaryUnavailable"))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [teacherClass?.id, summaryDate, t])

  useEffect(() => {
    if (!teacherClass?.id) return
    let cancelled = false
    ;(async () => {
      try {
        await loadCollectiveSummary(teacherClass.id, summaryDate)
      } catch {
        if (!cancelled) {
          setCollectiveId(null)
          setCollectiveStatut(null)
          setCollectiveMeta({ activites: "—", apprentissages: "—", humeurGroupe: "—" })
          setObservations("")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [teacherClass?.id, summaryDate])

  const attendanceRate =
    classKpi?.totalEnfants && classKpi.totalEnfants > 0
      ? Math.round(((classKpi.presentsCount ?? 0) / classKpi.totalEnfants) * 100)
      : null

  const isCollectivePublished = collectiveStatut === "Publie"

  const persistCollective = async (): Promise<string | null> => {
    if (!teacherClass) return collectiveId
    const act = collectiveMeta.activites.trim() || "—"
    const app = collectiveMeta.apprentissages.trim() || "—"
    const hum = collectiveMeta.humeurGroupe.trim() || "—"
    const obs = observations.trim() || undefined
    if (collectiveId) {
      await apiClient.updateClassDailySummary(collectiveId, {
        activites: act,
        apprentissages: app,
        humeurGroupe: hum,
        observations: obs ?? null,
      })
      return collectiveId
    }
    try {
      const res = await apiClient.createClassDailySummary({
        classeId: teacherClass.id,
        date: summaryDate,
        activites: act,
        apprentissages: app,
        humeurGroupe: hum,
        observations: obs,
      })
      const created = (unwrapOne<{ id: string; statut?: string }>(res) ?? res.data) as { id?: string; statut?: string } | null
      const id = created?.id ?? null
      if (id) {
        setCollectiveId(id)
        setCollectiveStatut(created?.statut ?? "Brouillon")
      }
      return id
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      const m = String(ax?.response?.data?.message ?? "")
      if (m.includes("existe déjà") || m.includes("already")) {
        const again = await apiClient.listClassDailySummaries({
          classeId: teacherClass.id,
          date: summaryDate,
          pageSize: 5,
        })
        const rows = unwrapList<CollectiveRow>(again)
        const row = rows[0]
        if (row?.id) {
          setCollectiveId(row.id)
          setCollectiveStatut(row.statut ?? null)
          await apiClient.updateClassDailySummary(row.id, {
            activites: act,
            apprentissages: app,
            humeurGroupe: hum,
            observations: obs ?? null,
          })
          return row.id
        }
      }
      throw e
    }
  }

  const handleSave = async () => {
    if (!teacherClass) return
    const classId = teacherClass.id
    setSaving(true)
    setBannerErr(null)
    setBannerOk(null)
    try {
      await persistCollective()
      await loadCollectiveSummary(classId, summaryDate)
      setBannerOk(isCollectivePublished ? "Message mis à jour." : t("success.dailyMessageSaved"))
      setTimeout(() => setBannerOk(null), 3000)
    } catch (e: unknown) {
      await loadCollectiveSummary(classId, summaryDate)
      const ax = e as { response?: { data?: { message?: string } } }
      const m = ax?.response?.data?.message
      setBannerErr(typeof m === "string" ? m : t("errors.saveMessageError"))
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!teacherClass) return
    const classId = teacherClass.id
    setPublishing(true)
    setBannerErr(null)
    setBannerOk(null)
    try {
      if (isCollectivePublished) {
        await persistCollective()
        await loadCollectiveSummary(classId, summaryDate)
        setBannerOk("Message envoyé mis à jour.")
        setTimeout(() => setBannerOk(null), 3000)
        return
      }
      let id = collectiveId
      if (!id) {
        id = await persistCollective()
      }
      if (!id) {
        setBannerErr(t("errors.saveMessageError"))
        return
      }
      await apiClient.publishClassDailySummary(id)
      await loadCollectiveSummary(classId, summaryDate)
      setBannerOk(`${t("success.messageSentToParents")} Vous pouvez encore le modifier ici.`)
      setTimeout(() => setBannerOk(null), 3500)
    } catch (e: unknown) {
      await loadCollectiveSummary(classId, summaryDate)
      const ax = e as { response?: { data?: { message?: string } } }
      const m = ax?.response?.data?.message
      setBannerErr(typeof m === "string" ? m : t("errors.sendMessageError"))
    } finally {
      setPublishing(false)
    }
  }

  const handleAiRewrite = async () => {
    if (aiRewriting) return
    const source = observations.trim()
    if (!source) {
      setBannerErr(t("errors.aiRewriteInputMissing"))
      return
    }

    setAiRewriting(true)
    setBannerErr(null)
    setBannerOk(null)
    try {
      const res = await apiClient.rewriteDailyMessageWithAi(source)
      const message = String((res.data as { message?: string })?.message ?? "").trim()
      if (!message) throw new Error("empty_ai_message")
      setObservations(message)
      setBannerOk(t("success.aiRewriteReady"))
      setTimeout(() => setBannerOk(null), 2800)
    } catch {
      setBannerErr(t("errors.aiRewriteError"))
    } finally {
      setAiRewriting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">{t("loading")}</div>
  }
  if (loadError || !teacherClass) {
    return (
      <div className="p-6 space-y-4 max-w-lg">
        <p className="text-sm text-red-600">{loadError ?? t("errors.noClass")}</p>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/teacher`}>{t("back")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <Button variant="ghost" className="mb-1 -ml-2 text-sky-700" asChild>
            <Link href={`/${locale}/teacher`}>← {t("back")}</Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-600 mt-0.5">{teacherClass.nom}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 whitespace-nowrap">{t("summaryDateLabel")}</span>
          <Input type="date" value={summaryDate} onChange={e => setSummaryDate(e.target.value)} className="w-auto text-sm h-9" />
        </div>
      </div>

      {bannerOk ? (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{bannerOk}</div>
      ) : null}
      {bannerErr ? (
        <div className="flex items-center justify-between rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          <span>{bannerErr}</span>
          <button type="button" className="ml-3 opacity-60 hover:opacity-100" onClick={() => setBannerErr(null)}>
            ✕
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-emerald-600">{classKpi?.presentsCount ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("kpis.presentLabel")}</p>
        </div>
        <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-red-500">{classKpi?.absentsCount ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("kpis.absentLabel")}</p>
        </div>
        <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-sky-600">{classKpi?.resumesCount ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("kpis.resumesLabel")}</p>
        </div>
        <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-gray-800">{attendanceRate !== null ? `${attendanceRate}%` : "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("kpis.attendanceRateLabel")}</p>
        </div>
      </div>

      <TeacherClassActivityPhotosPanel classeId={teacherClass.id} dateYmd={summaryDate} onDateChange={setSummaryDate} />

      <Card className="border border-gray-200 shadow-sm rounded-2xl">
        <CardContent className="pt-4 space-y-3">
          <h2 className="text-base font-bold text-gray-900">
            📝 {tSections("dailyMessageTitle")}
          </h2>
          <textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder={tSections("dailyMessagePlaceholder")}
            rows={5}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={aiRewriting}
              onClick={() => void handleAiRewrite()}
              className={`relative overflow-hidden gap-2 border-sky-300 text-sky-700 transition-all duration-300 ${
                aiRewriting
                  ? "bg-sky-50/90 shadow-[0_0_0_1px_rgba(14,165,233,0.2),0_0_20px_rgba(56,189,248,0.35)]"
                  : "hover:bg-sky-50"
              }`}
            >
              {aiRewriting ? (
                <>
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-sky-200/40 to-transparent animate-pulse" />
                  <Sparkles className="w-4 h-4 text-sky-600 animate-pulse" />
                  <Sparkles className="w-3 h-3 text-sky-400 animate-bounce [animation-duration:1.4s]" />
                </>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 px-1.5 py-0.5 text-[10px] font-semibold leading-none border border-sky-200">
                IA
              </span>
              {aiRewriting ? tSections("aiRewritingButton") : tSections("aiRewriteButton")}
            </Button>
            <Button
              type="button"
              className="bg-sky-500 hover:bg-sky-600 text-white"
              disabled={saving || aiRewriting}
              onClick={() => void handleSave()}
            >
              {saving ? "…" : tSections("saveButton")}
            </Button>
            <Button type="button" variant="outline" disabled={publishing || aiRewriting} onClick={() => void handlePublish()}>
              {publishing ? "…" : isCollectivePublished ? "Modifier le message envoyé" : tSections("sendAllButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
