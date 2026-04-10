"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { apiClient } from "@/lib/api"
import { formatLocalDateKey } from "@/lib/date-local"
import { TeacherActivityPhotosSection, type ClassActivityPhotoRow } from "./teacher-activity-photos"

type PanelProps = {
  classeId: string
  /** Si fourni, la date est pilotée par le parent (ex. page résumé du jour). */
  dateYmd?: string
  onDateChange?: (v: string) => void
}

export function TeacherClassActivityPhotosPanel({ classeId, dateYmd: controlledDate, onDateChange }: PanelProps) {
  const t = useTranslations("teacher.dashboard")
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
