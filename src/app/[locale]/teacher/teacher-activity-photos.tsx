"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ActivityPhotoFromApi } from "@/components/activity-photo-from-api"
import { Camera, Trash2, Loader2, X } from "lucide-react"

export type ClassActivityPhotoRow = { id: string; mimeType?: string; legende?: string | null }

type StagedPhoto = { file: File; preview: string }

export type TeacherActivityPhotosSectionProps = {
  t: (k: string, values?: Record<string, number | string>) => string
  dateYmd: string
  onDateChange: (v: string) => void
  photos: ClassActivityPhotoRow[]
  loading: boolean
  legende: string
  onLegendeChange: (v: string) => void
  uploading: boolean
  onUploadFiles: (files: File[]) => Promise<void>
  onDelete: (id: string) => void
}

/** Album classe : carte + modale (aperçu puis envoi) */
export function TeacherActivityPhotosSection({
  t,
  dateYmd,
  onDateChange,
  photos,
  loading,
  legende,
  onLegendeChange,
  uploading,
  onUploadFiles,
  onDelete,
}: TeacherActivityPhotosSectionProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [staged, setStaged] = useState<StagedPhoto[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [modalOpen])

  useEffect(() => {
    if (modalOpen) return
    setStaged(prev => {
      prev.forEach(s => URL.revokeObjectURL(s.preview))
      return []
    })
  }, [modalOpen])

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const next = Array.from(list).map(file => ({ file, preview: URL.createObjectURL(file) }))
    setStaged(prev => [...prev, ...next])
  }

  const removeStaged = (index: number) => {
    setStaged(prev => {
      const copy = [...prev]
      const [removed] = copy.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.preview)
      return copy
    })
  }

  const handleSendStaged = async () => {
    if (staged.length === 0) return
    const files = staged.map(s => s.file)
    await onUploadFiles(files)
    setStaged(prev => {
      prev.forEach(s => URL.revokeObjectURL(s.preview))
      return []
    })
  }

  return (
    <>
      <Card className="border border-sky-100 shadow-sm rounded-2xl lg:col-span-3 bg-gradient-to-br from-sky-50/80 to-white">
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900">{t("activityPhotosTitle")}</h2>
              <p className="text-xs text-gray-500">{t("activityPhotosSubtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600 whitespace-nowrap">{t("activityPhotosDate")}</span>
              <Input
                type="date"
                value={dateYmd}
                onChange={e => onDateChange(e.target.value)}
                className="w-auto text-sm h-9"
              />
              <Button
                type="button"
                className="gap-2 bg-sky-500 hover:bg-sky-600 text-white shrink-0"
                onClick={() => setModalOpen(true)}
              >
                <Camera className="w-4 h-4" />
                {t("activityPhotosManage")}
              </Button>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">{t("activityPhotosLoading")}</p>
          ) : (
            <p className="text-sm text-gray-600">{t("activityPhotosCountThisDay", { count: photos.length })}</p>
          )}
        </CardContent>
      </Card>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal
            aria-labelledby="activity-photos-modal-title"
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b px-4 py-3 bg-white z-10 rounded-t-2xl shrink-0">
              <h3 id="activity-photos-modal-title" className="text-sm font-bold text-gray-900 pr-2">
                {t("activityPhotosModalTitle")}
              </h3>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"
                onClick={() => setModalOpen(false)}
                aria-label={t("activityPhotosClose")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <span className="text-xs text-gray-600 block mb-1">{t("activityPhotosDate")}</span>
                <Input
                  type="date"
                  value={dateYmd}
                  onChange={e => onDateChange(e.target.value)}
                  className="w-auto text-sm h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">{t("activityPhotosLegende")}</label>
                <Input
                  value={legende}
                  onChange={e => onLegendeChange(e.target.value)}
                  placeholder={t("activityPhotosLegende")}
                  className="text-sm"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={e => {
                  addFiles(e.target.files)
                  e.target.value = ""
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                className="w-full gap-2 border-sky-300"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
                {t("activityPhotosPickMultiple")}
              </Button>
              {staged.length > 0 ? (
                <p className="text-xs font-medium text-sky-800">{t("activityPhotosStaged", { count: staged.length })}</p>
              ) : null}
              {staged.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {staged.map((s, i) => (
                    <div key={`${s.preview}-${i}`} className="relative rounded-lg overflow-hidden border border-sky-200 aspect-square">
                      <img src={s.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-white/95 border border-gray-200 text-gray-700"
                        onClick={() => removeStaged(i)}
                      >
                        {t("activityPhotosRemoveStaged")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <Button
                type="button"
                className="w-full gap-2 bg-sky-500 hover:bg-sky-600 text-white"
                disabled={uploading || staged.length === 0}
                onClick={() => void handleSendStaged()}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {uploading ? t("activityPhotosUploading") : t("activityPhotosSend")}
              </Button>
              <p className="text-xs text-gray-400">{t("activityPhotosMultipleHint")}</p>
              {loading ? (
                <p className="text-sm text-gray-400 py-2">{t("activityPhotosLoading")}</p>
              ) : photos.length === 0 ? (
                <p className="text-sm text-gray-500 py-1 border-t pt-3">{t("activityPhotosEmpty")}</p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-600 pt-3 border-t">{t("activityPhotosOnlineSection")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {photos.map(p => (
                      <div
                        key={p.id}
                        className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm"
                      >
                        <ActivityPhotoFromApi photoId={p.id} imgClassName="w-full h-36 object-cover" />
                        {p.legende ? <p className="text-xs p-2 text-gray-600 line-clamp-2">{p.legende}</p> : null}
                        <button
                          type="button"
                          onClick={() => onDelete(p.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 border border-red-200 text-red-600 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity shadow"
                          aria-label={t("activityPhotosDelete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
