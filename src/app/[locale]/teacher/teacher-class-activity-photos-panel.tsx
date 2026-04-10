"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { apiClient } from "@/lib/api"
import { formatLocalDateKey } from "@/lib/date-local"
import { TeacherActivityPhotosSection, type ClassActivityPhotoRow } from "./teacher-activity-photos"

type TPhotos = (k: string, values?: Record<string, number | string>) => string

type PanelCoreProps = {
  classeId: string
  /** Si fourni, la date est pilotée par le parent (ex. page résumé du jour). */
  dateYmd?: string
  onDateChange?: (v: string) => void
  t: TPhotos
}

/** Logique photos (sans next-intl) — pour pages hors `[locale]` ou tests. */
export function TeacherClassActivityPhotosPanelCore({
  classeId,
  dateYmd: controlledDate,
  onDateChange,
  t,
}: PanelCoreProps) {
  const [internalDate, setInternalDate] = useState(() => formatLocalDateKey(new Date()))
  const activityPhotoDate = controlledDate ?? internalDate
  const setActivityPhotoDate = onDateChange ?? setInternalDate
  const [classActivityPhotos, setClassActivityPhotos] = useState<ClassActivityPhotoRow[]>([])
  const [classActivityPhotosLoading, setClassActivityPhotosLoading] = useState(false)
  const [activityPhotoLegende, setActivityPhotoLegende] = useState("")
  const [activityPhotoUploading, setActivityPhotoUploading] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [inlineSuccess, setInlineSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!classeId) return
    let cancelled = false
    ;(async () => {
      setClassActivityPhotosLoading(true)
      try {
        const res = await apiClient.listClassActivityPhotos({
          classeId,
          date: activityPhotoDate,
        })
        const data = (res.data as { data?: ClassActivityPhotoRow[] })?.data
        if (!cancelled) setClassActivityPhotos(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setClassActivityPhotos([])
      } finally {
        if (!cancelled) setClassActivityPhotosLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [classeId, activityPhotoDate])

  const handleActivityPhotosUpload = async (files: File[]) => {
    const list = files.filter(Boolean)
    if (!list.length || !classeId) return
    setActivityPhotoUploading(true)
    setInlineError(null)
    try {
      const legende = activityPhotoLegende?.trim() || undefined
      for (const f of list) {
        await apiClient.uploadClassActivityPhoto(classeId, activityPhotoDate, f, legende)
      }
      setActivityPhotoLegende("")
      const res = await apiClient.listClassActivityPhotos({
        classeId,
        date: activityPhotoDate,
      })
      const data = (res.data as { data?: ClassActivityPhotoRow[] })?.data
      setClassActivityPhotos(Array.isArray(data) ? data : [])
      setInlineSuccess(list.length > 1 ? `${list.length} photos ajoutées` : "Photo ajoutée")
      setTimeout(() => setInlineSuccess(null), 2500)
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } }
      const m = ax?.response?.data?.message
      setInlineError(
        typeof m === "string"
          ? m
          : Array.isArray(m)
            ? m.join(" ")
            : "Envoi photo impossible — vérifier l’API et le type de fichier.",
      )
    } finally {
      setActivityPhotoUploading(false)
    }
  }

  const handleDeleteActivityPhoto = async (id: string) => {
    if (!classeId) return
    setInlineError(null)
    try {
      await apiClient.deleteClassActivityPhoto(id)
      setClassActivityPhotos(prev => prev.filter(p => p.id !== id))
    } catch {
      setInlineError("Suppression impossible")
    }
  }

  return (
    <div className="space-y-2">
      {inlineSuccess ? (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">{inlineSuccess}</div>
      ) : null}
      {inlineError ? (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex justify-between gap-2">
          <span>{inlineError}</span>
          <button type="button" className="shrink-0 opacity-70 hover:opacity-100" onClick={() => setInlineError(null)}>
            ✕
          </button>
        </div>
      ) : null}
      <TeacherActivityPhotosSection
        t={t}
        dateYmd={activityPhotoDate}
        onDateChange={setActivityPhotoDate}
        photos={classActivityPhotos}
        loading={classActivityPhotosLoading}
        legende={activityPhotoLegende}
        onLegendeChange={setActivityPhotoLegende}
        uploading={activityPhotoUploading}
        onUploadFiles={handleActivityPhotosUpload}
        onDelete={handleDeleteActivityPhoto}
      />
    </div>
  )
}

type PanelProps = Omit<PanelCoreProps, "t">

export function TeacherClassActivityPhotosPanel(props: PanelProps) {
  const t = useTranslations("teacher.dashboard")
  return <TeacherClassActivityPhotosPanelCore {...props} t={t} />
}

const FR_ACTIVITY_PHOTOS: Record<string, string> = {
  activityPhotosTitle: "Photos des activités du jour",
  activityPhotosSubtitle: "Album visible par tous les parents de la classe (plusieurs photos par jour).",
  activityPhotosDate: "Jour",
  activityPhotosManage: "Gérer / envoyer des photos",
  activityPhotosLoading: "Chargement…",
  activityPhotosCountThisDay: "{count} photo(s) pour ce jour.",
  activityPhotosModalTitle: "Envoyer des photos d’activités",
  activityPhotosClose: "Fermer",
  activityPhotosLegende: "Légende (optionnel)",
  activityPhotosPickMultiple: "Choisir des images",
  activityPhotosStaged: "{count} image(s) prête(s) à l’envoi",
  activityPhotosRemoveStaged: "Retirer",
  activityPhotosSend: "Envoyer les photos",
  activityPhotosUploading: "Envoi en cours…",
  activityPhotosMultipleHint:
    "Choisissez des images, vérifiez l’aperçu, puis « Envoyer les photos ». Fermez avec ✕ ou en dehors de la fenêtre.",
  activityPhotosEmpty: "Aucune photo pour ce jour.",
  activityPhotosOnlineSection: "Déjà en ligne pour ce jour",
  activityPhotosDelete: "Supprimer",
}

/** Libellés FR pour les photos sur `/teacher/...` (hors next-intl). */
export function teacherDashboardActivityPhotosTFr(key: string, values?: Record<string, number | string>): string {
  let s = FR_ACTIVITY_PHOTOS[key] ?? key
  if (values) {
    for (const [vk, vv] of Object.entries(values)) {
      s = s.replaceAll(`{${vk}}`, String(vv))
    }
  }
  return s
}
