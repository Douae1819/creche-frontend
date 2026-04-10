"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { apiClient } from "@/lib/api"
import { formatLocalDateKey } from "@/lib/date-local"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  const router = useRouter()
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
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [bannerOk, setBannerOk] = useState<string | null>(null)
  const [bannerErr, setBannerErr] = useState<string | null>(null)

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
        const res = await apiClient.listClassDailySummaries({
          classeId: teacherClass.id,
          date: summaryDate,
          pageSize: 10,
        })
        const rows = unwrapList<CollectiveRow>(res)
        const row = rows[0] ?? null
        if (!cancelled) {
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
    if (!teacherClass || isCollectivePublished) return collectiveId
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
    if (!teacherClass || isCollectivePublished) return
    setSaving(true)
    setBannerErr(null)
    setBannerOk(null)
    try {
      await persistCollective()
      setBannerOk(t("success.dailyMessageSaved"))
      setTimeout(() => setBannerOk(null), 3000)
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      const m = ax?.response?.data?.message
      setBannerErr(typeof m === "string" ? m : t("errors.saveMessageError"))
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!teacherClass || isCollectivePublished) return
    setPublishing(true)
    setBannerErr(null)
    setBannerOk(null)
    try {
      let id = collectiveId
      if (!id) {
        id = await persistCollective()
      }
      if (!id) {
        setBannerErr(t("errors.saveMessageError"))
        return
      }
      await apiClient.publishClassDailySummary(id)
      setCollectiveStatut("Publie")
      setBannerOk(t("success.messageSentToParents"))
      setTimeout(() => setBannerOk(null), 3500)
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      const m = ax?.response?.data?.message
      setBannerErr(typeof m === "string" ? m : t("errors.sendMessageError"))
    } finally {
      setPublishing(false)
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

      {isCollectivePublished ? (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {t("errors.collectivePublishedReadonly")}
        </p>
      ) : null}

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
            disabled={isCollectivePublished}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              className="bg-sky-500 hover:bg-sky-600 text-white"
              disabled={saving || isCollectivePublished}
              onClick={() => void handleSave()}
            >
              {saving ? "…" : tSections("saveButton")}
            </Button>
            <Button type="button" variant="outline" disabled={publishing || isCollectivePublished} onClick={() => void handlePublish()}>
              {publishing ? "…" : tSections("sendAllButton")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push(`/${locale}/teacher`)}>
              {tSections("finishDayButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
