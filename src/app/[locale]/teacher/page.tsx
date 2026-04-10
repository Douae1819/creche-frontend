"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Cookies from "js-cookie"

/** Lit un claim du JWT stocké dans le cookie */
function readJwtUserId(): string {
  try {
    const token = Cookies.get("token") || Cookies.get("auth_token")
    if (!token) return ""
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : ""
    return String(JSON.parse(atob(base64 + pad))["userId"] ?? "")
  } catch { return "" }
}
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { apiClient } from "@/lib/api"
import { ActivityPhotoFromApi } from "@/components/activity-photo-from-api"
import { formatLocalDateKey } from "@/lib/date-local"
import { CheckCircle, XCircle, LayoutGrid, User, Camera, Trash2, Loader2 } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type Enfant = {
  id: string
  prenom?: string | null
  nom?: string | null
  allergies?: string[] | null
  photoUrl?: string | null
}

type Classe = { id: string; nom: string }

type ResumeForm = {
  appetit: "Bien" | "Moyen" | "Mal"
  humeur: "Bonne" | "Moyenne" | "Mauvaise"
  sieste: "Courte" | "Moyenne" | "Longue"
  participation: "Bonne" | "Moyenne" | "Faible"
  message: string
}

const DEFAULT_FORM: ResumeForm = {
  appetit: "Bien",
  humeur: "Bonne",
  sieste: "Moyenne",
  participation: "Bonne",
  message: "",
}

// ── Enum mappers ──────────────────────────────────────────────────────────────
const toAppetitEnum     = (v: ResumeForm["appetit"])      => v === "Bien"   ? "Bon"      : v === "Moyen"    ? "Moyen"   : "Faible"
const toHumeurEnum      = (v: ResumeForm["humeur"])       => v === "Bonne"  ? "Bon"      : v === "Moyenne"  ? "Moyen"   : "Difficile"
const toSiesteEnum      = (v: ResumeForm["sieste"])       => v === "Courte" ? "Moyen"    : v === "Moyenne"  ? "Bon"     : "Excellent"
const toParticipationEnum = (v: ResumeForm["participation"]) => v === "Bonne" ? "Bon"   : v === "Moyenne"  ? "Moyen"   : "Faible"

const fromAppetitEnum     = (v?: string): ResumeForm["appetit"]      => v === "Bon" ? "Bien" : v === "Faible" ? "Mal"      : "Moyen"
const fromHumeurEnum      = (v?: string): ResumeForm["humeur"]       => v === "Bon" ? "Bonne": v === "Difficile" ? "Mauvaise" : "Moyenne"
const fromSiesteEnum      = (v?: string): ResumeForm["sieste"]       => v === "Excellent" ? "Longue" : v === "Moyen" ? "Courte" : "Moyenne"
const fromParticipationEnum = (v?: string): ResumeForm["participation"] => v === "Bon" ? "Bonne" : v === "Faible" ? "Faible" : "Moyenne"

type ClassActivityPhotoRow = { id: string; mimeType?: string; legende?: string | null }

function TeacherActivityPhotosPanel({
  t,
  dateYmd,
  onDateChange,
  photos,
  loading,
  legende,
  onLegendeChange,
  uploading,
  onFileChange,
  onDelete,
  fileInputRef,
}: {
  t: (k: string) => string
  dateYmd: string
  onDateChange: (v: string) => void
  photos: ClassActivityPhotoRow[]
  loading: boolean
  legende: string
  onLegendeChange: (v: string) => void
  uploading: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: (id: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <Card className="border border-sky-100 shadow-sm rounded-2xl lg:col-span-3 bg-gradient-to-br from-sky-50/80 to-white">
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">{t("activityPhotosTitle")}</h2>
            <p className="text-xs text-gray-500">{t("activityPhotosSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 whitespace-nowrap">{t("activityPhotosDate")}</span>
            <Input
              type="date"
              value={dateYmd}
              onChange={e => onDateChange(e.target.value)}
              className="w-auto text-sm h-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <Input
            value={legende}
            onChange={e => onLegendeChange(e.target.value)}
            placeholder={t("activityPhotosLegende")}
            className="text-sm max-w-md flex-1 min-w-[140px]"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            className="gap-2 border-sky-300"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {uploading ? t("activityPhotosUploading") : t("activityPhotosAdd")}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 py-4">{t("activityPhotosLoading")}</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-gray-500 py-3">{t("activityPhotosEmpty")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map(p => (
              <div key={p.id} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                <ActivityPhotoFromApi photoId={p.id} imgClassName="w-full h-36 object-cover" />
                {p.legende ? <p className="text-xs p-2 text-gray-600 line-clamp-2">{p.legende}</p> : null}
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 border border-red-200 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  aria-label={t("activityPhotosDelete")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const t = useTranslations("teacher.dashboard")
  const params = useParams()
  const locale = (params?.locale as string) ?? "fr"

  const [teacherClass,  setTeacherClass]  = useState<Classe | null>(null)
  const [teacherName,   setTeacherName]   = useState<string>("")
  const [children,      setChildren]      = useState<Enfant[]>([])
  const [currentChildIndex, setCurrentChildIndex] = useState(0)
  const [attendanceData, setAttendanceData] = useState<Record<string, "Present" | "Absent">>({})
  const [childResumes,  setChildResumes]  = useState<Record<string, { id: string }>>({})

  // FIX: per-child form state — prevents values leaking between children
  const [childForms, setChildForms] = useState<Record<string, ResumeForm>>({})

  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState<string | null>(null)   // blocks page
  const [saveError,     setSaveError]     = useState<string | null>(null)   // shown inline only
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [savingResume,  setSavingResume]  = useState(false)
  const [viewMode, setViewMode] = useState<"individual" | "overview">("individual")

  const [activityPhotoDate, setActivityPhotoDate] = useState(() => formatLocalDateKey(new Date()))
  const [classActivityPhotos, setClassActivityPhotos] = useState<ClassActivityPhotoRow[]>([])
  const [classActivityPhotosLoading, setClassActivityPhotosLoading] = useState(false)
  const [activityPhotoLegende, setActivityPhotoLegende] = useState("")
  const [activityPhotoUploading, setActivityPhotoUploading] = useState(false)
  const activityFileInputRef = useRef<HTMLInputElement>(null)

  const currentChild = children[currentChildIndex] ?? null
  const today = formatLocalDateKey(new Date())
  const now   = new Date()

  // Per-child form helpers
  const getForm = (childId: string): ResumeForm => childForms[childId] ?? DEFAULT_FORM
  const patchForm = (childId: string, patch: Partial<ResumeForm>) =>
    setChildForms(prev => ({ ...prev, [childId]: { ...(prev[childId] ?? DEFAULT_FORM), ...patch } }))

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        setLoading(true)
        setLoadError(null)

        const classesRes = await apiClient.listClasses()
        const classes = classesRes.data?.data ?? classesRes.data ?? []
        if (!classes.length) {
          if (!cancelled) setLoadError("Aucune classe disponible")
          return
        }

        const cls: Classe = classes[0]
        if (!cancelled) {
          setTeacherClass({ id: cls.id, nom: cls.nom })
          // Identifier l'enseignant connecté via son userId dans le JWT
          const myUserId = readJwtUserId()
          const enseignants: any[] = (cls as any).enseignants ?? []
          // Chercher d'abord l'enseignant qui correspond au compte connecté
          const myEnseignant = enseignants.find(
            (ec: any) => ec.enseignant?.utilisateur?.id === myUserId
          )
          const u = myEnseignant?.enseignant?.utilisateur
          if (u) {
            setTeacherName(u.prenom ?? u.nom ?? u.email ?? "")
          } else if (enseignants.length > 0) {
            // Fallback : utiliser l'email du JWT si le nom n'est pas trouvable
            const token = Cookies.get("token") || Cookies.get("auth_token")
            try {
              const base64 = (token ?? "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
              const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : ""
              const email = String(JSON.parse(atob(base64 + pad))["email"] ?? "")
              setTeacherName(email)
            } catch { /* ignore */ }
          }
        }

        const enfantsRes = await apiClient.getClassWithChildren(cls.id)
        const enfants = enfantsRes.data?.enfants ?? []
        if (!cancelled) setChildren(enfants)

        // Load all presences
        let allPresences: any[] = []
        let page = 1
        let hasMore = true
        while (hasMore && !cancelled) {
          const presRes = await apiClient.getPresences(cls.id, today, page, 100)
          const items   = presRes.data?.items ?? presRes.data?.data ?? []
          if (!Array.isArray(items) || items.length === 0) { hasMore = false; break }
          allPresences = [...allPresences, ...items]
          if (!(presRes.data?.hasNext ?? false) || items.length < 100) hasMore = false
          else page++
        }
        if (!cancelled) {
          const map: Record<string, "Present" | "Absent"> = {}
          for (const p of allPresences) {
            const id = p.enfantId || p.enfant?.id
            if (id && p.statut) map[id] = p.statut
          }
          setAttendanceData(map)
        }

        // Load all daily resumes for today — populate per-child forms
        const resumesRes = await apiClient.getResumes(cls.id, today)
        const resumes    = resumesRes.data?.data ?? resumesRes.data ?? []
        if (!cancelled && Array.isArray(resumes)) {
          const resumeMap: Record<string, { id: string }> = {}
          const formsMap:  Record<string, ResumeForm>     = {}
          for (const r of resumes) {
            if (!r.enfantId || !r.id) continue
            resumeMap[r.enfantId] = { id: r.id }
            formsMap[r.enfantId]  = {
              appetit:       fromAppetitEnum(r.appetit),
              humeur:        fromHumeurEnum(r.humeur),
              sieste:        fromSiesteEnum(r.sieste),
              participation: fromParticipationEnum(r.participation),
              message: Array.isArray(r.observations) && r.observations.length > 0
                ? (typeof r.observations[0] === "string" ? r.observations[0] : r.observations[0]?.observation ?? "")
                : "",
            }
          }
          setChildResumes(resumeMap)
          setChildForms(formsMap)
        }
      } catch (e: any) {
        console.error("[Teacher] loadData error", e)
        if (!cancelled) {
          if (e?.response?.status === 401) {
            setLoadError("Session expirée. Merci de vous reconnecter.")
            if (typeof window !== "undefined") {
              const pathname = window.location.pathname || ""
              window.location.href = `/${pathname.startsWith("/ar") ? "ar" : "fr"}`
            }
          } else {
            setLoadError("Impossible de charger les données")
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()
    return () => { cancelled = true }
  }, [today])

  useEffect(() => {
    if (!teacherClass?.id) return
    let cancelled = false
    ;(async () => {
      setClassActivityPhotosLoading(true)
      try {
        const res = await apiClient.listClassActivityPhotos({
          classeId: teacherClass.id,
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
    return () => { cancelled = true }
  }, [teacherClass?.id, activityPhotoDate])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePresence = async (presence: "Present" | "Absent") => {
    if (!currentChild || !teacherClass) return
    if (attendanceData[currentChild.id] !== undefined) {
      setSaveError("La présence a déjà été enregistrée pour cet enfant aujourd'hui.")
      return
    }
    setSaveError(null)
    try {
      await apiClient.recordPresences({
        classeId: teacherClass.id,
        date: today,
        presences: [{
          enfantId: currentChild.id,
          statut: presence,
          arriveeA: presence === "Present" ? new Date().toTimeString().slice(0, 5) : null,
          departA: null,
        }],
      })
      setAttendanceData(prev => ({ ...prev, [currentChild.id]: presence }))
      setSuccessMessage(`Présence enregistrée — ${currentChild.prenom ?? ""} ${currentChild.nom ?? ""}`.trim())
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (e) {
      console.error("[Teacher] handlePresence error", e)
      setSaveError("Erreur lors de l'enregistrement de la présence")
    }
  }

  const handleActivityPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f || !teacherClass) return
    setActivityPhotoUploading(true)
    setSaveError(null)
    try {
      await apiClient.uploadClassActivityPhoto(
        teacherClass.id,
        activityPhotoDate,
        f,
        activityPhotoLegende || undefined,
      )
      setActivityPhotoLegende("")
      const res = await apiClient.listClassActivityPhotos({
        classeId: teacherClass.id,
        date: activityPhotoDate,
      })
      const data = (res.data as { data?: ClassActivityPhotoRow[] })?.data
      setClassActivityPhotos(Array.isArray(data) ? data : [])
      setSuccessMessage("Photo ajoutée")
      setTimeout(() => setSuccessMessage(null), 2500)
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } }
      const m = ax?.response?.data?.message
      setSaveError(
        typeof m === "string"
          ? m
          : Array.isArray(m)
            ? m.join(" ")
            : "Envoi photo impossible — réessayer ou vérifier le type de fichier (jpeg, png, webp, gif).",
      )
    } finally {
      setActivityPhotoUploading(false)
    }
  }

  const handleDeleteActivityPhoto = async (id: string) => {
    if (!teacherClass) return
    setSaveError(null)
    try {
      await apiClient.deleteClassActivityPhoto(id)
      setClassActivityPhotos(prev => prev.filter(p => p.id !== id))
    } catch {
      setSaveError("Suppression impossible")
    }
  }

  const handleSaveDailySummary = async () => {
    if (!teacherClass || !currentChild) return
    const form = getForm(currentChild.id)
    const resumePayload: any = {
      appetit:       toAppetitEnum(form.appetit),
      humeur:        toHumeurEnum(form.humeur),
      sieste:        toSiesteEnum(form.sieste),
      participation: toParticipationEnum(form.participation),
      observations:  form.message ? [form.message] : [],
    }
    setSavingResume(true)
    setSaveError(null)
    try {
      const existing = childResumes[currentChild.id]
      if (existing?.id) {
        // UPDATE existing resume
        await apiClient.updateResume(existing.id, resumePayload)
      } else {
        // CREATE new resume
        const res = await apiClient.createResume({
          enfantId: currentChild.id,
          date: today,
          ...resumePayload,
        })
        const createdId = res.data?.id ?? res.data?.resumeId ?? null
        if (createdId) {
          setChildResumes(prev => ({ ...prev, [currentChild.id]: { id: createdId } }))
        }
      }
      setSuccessMessage("Résumé de journée enregistré avec succès")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (e: any) {
      console.error("[Teacher] handleSaveDailySummary error", e)
      const msg = e?.response?.data?.message || e?.message || "Erreur lors de l'enregistrement"
      const msgStr = Array.isArray(msg) ? msg.join(", ") : String(msg)

      // Auto-retry: if "already exists", fetch the ID then update
      if (msgStr.includes("existe déjà") || msgStr.includes("already exists")) {
        try {
          const resumesRes = await apiClient.getResumes(teacherClass.id, today)
          const resumes    = resumesRes.data?.data ?? resumesRes.data ?? []
          if (Array.isArray(resumes)) {
            const found = resumes.find((r: any) => r.enfantId === currentChild.id)
            if (found?.id) {
              setChildResumes(prev => ({ ...prev, [currentChild.id]: { id: found.id } }))
              await apiClient.updateResume(found.id, resumePayload)
              setSuccessMessage("Résumé de journée enregistré avec succès")
              setTimeout(() => setSuccessMessage(null), 3000)
              return
            }
          }
        } catch (retryErr) {
          console.error("[Teacher] retry update failed", retryErr)
        }
      }
      setSaveError(msgStr)
    } finally {
      setSavingResume(false)
    }
  }

  const handleNext = () => {
    if (!currentChild) return
    if (attendanceData[currentChild.id] !== undefined || isAttendanceComplete) {
      if (currentChildIndex < children.length - 1) { setCurrentChildIndex(i => i + 1); setSaveError(null) }
      return
    }
    setSaveError("Veuillez enregistrer la présence avant de continuer.")
  }

  const handlePrevious = () => {
    if (currentChildIndex > 0) setCurrentChildIndex(i => i - 1)
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const isAttendanceComplete = children.length > 0 && children.every(e => attendanceData[e.id] !== undefined)
  const isAllProcessed       = children.length > 0 && children.every(e => {
    const att = attendanceData[e.id]
    if (att === undefined) return false
    if (att === "Absent") return true   // absent = pas de résumé requis
    return !!childResumes[e.id]
  })
  const hasPresenceForCurrent = !!(currentChild && attendanceData[currentChild.id] !== undefined)
  const hasResumeForCurrent   = !!(currentChild && childResumes[currentChild.id])
  const progressPercent       = children.length > 0 ? ((currentChildIndex + 1) / children.length) * 100 : 0
  const canNavigateToSummary  = isAllProcessed || isAttendanceComplete
  const currentForm           = currentChild ? getForm(currentChild.id) : DEFAULT_FORM

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading)    return <div className="p-6 text-sm text-gray-600">Chargement du tableau de bord enseignant…</div>
  if (loadError)  return <div className="p-6 text-sm text-red-600">{loadError}</div>
  if (!teacherClass) return <div className="p-6 text-sm text-gray-600">Aucune classe assignée.</div>
  if (!children.length) return <div className="p-6 text-sm text-gray-600">Aucun enfant dans la classe {teacherClass.nom}.</div>

  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  // ── Overview mode ─────────────────────────────────────────────────────────
  if (viewMode === "overview") {
    const nbPresent = Object.values(attendanceData).filter(v => v === "Present").length
    const nbAbsent  = Object.values(attendanceData).filter(v => v === "Absent").length
    const nbResumes = Object.keys(childResumes).length

    return (
      <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 lg:px-0 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            {teacherName && <p className="text-sm font-bold text-gray-900 mb-0.5">👋 Bonjour, {teacherName} !</p>}
            <h1 className="text-2xl font-bold text-gray-900">{teacherClass.nom}</h1>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setViewMode("individual"); setSaveError(null) }} className="text-xs">
              Vue individuelle
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{nbPresent}</p>
            <p className="text-xs text-gray-500 mt-0.5">Présents</p>
          </div>
          <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-500">{nbAbsent}</p>
            <p className="text-xs text-gray-500 mt-0.5">Absents</p>
          </div>
          <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-sky-600">{nbResumes}</p>
            <p className="text-xs text-gray-500 mt-0.5">Résumés faits</p>
          </div>
        </div>

        {/* Children grid — click to jump to individual view */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {children.map((child, idx) => {
            const presence  = attendanceData[child.id]
            const hasResume = !!childResumes[child.id]
            const presenceBadge =
              presence === "Present" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
              presence === "Absent"  ? "bg-red-100 text-red-700 border-red-200" :
              "bg-gray-100 text-gray-500 border-gray-200"
            const presenceLabel = presence === "Present" ? "Présent" : presence === "Absent" ? "Absent" : "Non marqué"

            return (
              <div
                key={child.id}
                className="rounded-xl border bg-white p-3 shadow-sm flex flex-col items-center gap-2 cursor-pointer hover:border-sky-300 hover:shadow-md transition-all"
                onClick={() => { setCurrentChildIndex(idx); setViewMode("individual"); setSaveError(null) }}
              >
                <div className="h-10 w-10 rounded-full bg-sky-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0 overflow-hidden">
                  {(child as any).photoUrl
                    ? <img src={(child as any).photoUrl} alt="" className="w-full h-full object-cover" />
                    : child.prenom?.[0] ?? "?"
                  }
                </div>
                <p className="text-xs font-semibold text-center text-gray-900 leading-tight line-clamp-2">
                  {`${child.prenom ?? ""} ${child.nom ?? ""}`.trim()}
                </p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${presenceBadge}`}>{presenceLabel}</span>
                {presence !== "Absent" && hasResume && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 font-medium">Résumé ✓</span>
                )}
              </div>
            )
          })}
        </div>

        <TeacherActivityPhotosPanel
          t={t}
          dateYmd={activityPhotoDate}
          onDateChange={setActivityPhotoDate}
          photos={classActivityPhotos}
          loading={classActivityPhotosLoading}
          legende={activityPhotoLegende}
          onLegendeChange={setActivityPhotoLegende}
          uploading={activityPhotoUploading}
          onFileChange={handleActivityPhotoFile}
          onDelete={handleDeleteActivityPhoto}
          fileInputRef={activityFileInputRef}
        />

        {canNavigateToSummary && (
          <div className="flex justify-end">
            <Link href={`/${locale}/teacher/summary`}>
              <Button className="bg-sky-500 hover:bg-sky-600 text-white">{t("summaryCta")} →</Button>
            </Link>
          </div>
        )}
      </div>
    )
  }

  // ── Individual mode ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 lg:px-0 py-6 md:py-8">

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          {teacherName && <p className="text-base font-bold text-gray-900 mb-0.5">👋 Bonjour, {teacherName} !</p>}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{teacherClass.nom}</h1>
          <p className="text-xs text-gray-600 mt-0.5">{children.length} {children.length > 1 ? "élèves" : "élève"}</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setViewMode("overview"); setSaveError(null) }}
            className="text-xs gap-1.5"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vue classe</span>
          </Button>
          <Button
            variant="outline"
            className="rounded-lg bg-transparent border border-gray-300 font-medium text-xs md:text-sm"
            onClick={() => setViewMode("overview")}
          >
            ← Retour
          </Button>
        </div>
      </div>

      {/* Banners */}
      {successMessage && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}
      {saveError && (
        <div className="flex items-center justify-between rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-3 opacity-60 hover:opacity-100 text-base leading-none">✕</button>
        </div>
      )}

      {/* Main layout */}
      <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Child card */}
        <Card className="border border-gray-200 shadow-sm rounded-2xl lg:col-span-1">
          <CardContent className="pt-4 flex flex-col gap-4">
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-2 pb-2">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-sky-500 text-white flex items-center justify-center text-3xl font-bold flex-shrink-0 border-4 border-sky-100 shadow-sm">
                {(currentChild as any)?.photoUrl
                  ? <img src={(currentChild as any).photoUrl} alt={currentChild?.prenom ?? ""} className="w-full h-full object-cover" />
                  : currentChild?.prenom?.[0]?.toUpperCase() ?? "?"
                }
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900">
                  {`${currentChild?.prenom ?? ""} ${currentChild?.nom ?? ""}`.trim()}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{teacherClass.nom}</p>
              </div>
            </div>

            {currentChild && (
              <>
                {/* Presence buttons */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => handlePresence("Present")}
                    disabled={attendanceData[currentChild.id] !== undefined}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />{t("presentButton")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handlePresence("Absent")}
                    disabled={attendanceData[currentChild.id] !== undefined}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />{t("absentButton")}
                  </Button>
                </div>

                {/* Status badge */}
                <div className="text-xs">
                  {attendanceData[currentChild.id] === "Absent" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-red-50 text-red-600 border-red-200">
                      Absent — pas de résumé requis
                    </span>
                  ) : attendanceData[currentChild.id] !== undefined && childResumes[currentChild.id] ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-300">
                      ✓ Présence & résumé faits
                    </span>
                  ) : attendanceData[currentChild.id] !== undefined ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-300">
                      Présence faite — résumé à renseigner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-gray-50 text-gray-500 border-gray-200">
                      Présence à enregistrer
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Allergies warning */}
            {Array.isArray(currentChild?.allergies) && currentChild.allergies.length > 0 && (
              <p className="text-xs font-bold text-red-600">🚨 {currentChild.allergies.join(", ")}</p>
            )}
          </CardContent>
        </Card>

        {/* Resume card */}
        <Card className="border border-gray-200 shadow-sm rounded-2xl lg:col-span-2">
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base md:text-lg font-bold text-gray-900">{t("daySummaryTitle")}</h2>
              {hasResumeForCurrent && attendanceData[currentChild?.id ?? ""] !== "Absent" && (
                <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-medium">
                  Modifiable
                </span>
              )}
            </div>

            {/* Absent — no resume */}
            {currentChild && attendanceData[currentChild.id] === "Absent" ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <span className="text-4xl">🏠</span>
                <p className="text-sm font-semibold text-gray-700">
                  {currentChild.prenom} est absent(e) aujourd'hui
                </p>
                <p className="text-xs text-gray-400">Le résumé journalier ne s'applique pas aux enfants absents.</p>
              </div>
            ) : (<>

            {/* 4 metric cards — each reads from per-child form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Appétit */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2">
                <div className="text-3xl">{currentForm.appetit === "Bien" ? "😋" : currentForm.appetit === "Moyen" ? "😐" : "😟"}</div>
                <p className="text-xs text-gray-500">Appétit</p>
                <p className="text-lg font-bold text-emerald-600">{currentForm.appetit}</p>
                <div className="mt-1 flex gap-2">
                  {(["Bien", "Moyen", "Mal"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => currentChild && patchForm(currentChild.id, { appetit: opt })}
                      className={`px-2 py-1 text-xs rounded-full border ${currentForm.appetit === opt ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-700 border-gray-300"}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* Humeur */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2">
                <div className="text-3xl">{currentForm.humeur === "Bonne" ? "😄" : currentForm.humeur === "Moyenne" ? "😐" : "😢"}</div>
                <p className="text-xs text-gray-500">Humeur</p>
                <p className="text-lg font-bold text-sky-600">{currentForm.humeur}</p>
                <div className="mt-1 flex gap-2">
                  {(["Bonne", "Moyenne", "Mauvaise"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => currentChild && patchForm(currentChild.id, { humeur: opt })}
                      className={`px-2 py-1 text-xs rounded-full border ${currentForm.humeur === opt ? "bg-sky-500 text-white border-sky-500" : "bg-white text-gray-700 border-gray-300"}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* Sieste */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2">
                <div className="text-3xl">{currentForm.sieste === "Courte" ? "😪" : currentForm.sieste === "Moyenne" ? "😴" : "🛌"}</div>
                <p className="text-xs text-gray-500">Sieste</p>
                <p className="text-lg font-bold text-gray-700">{currentForm.sieste}</p>
                <div className="mt-1 flex gap-2">
                  {(["Courte", "Moyenne", "Longue"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => currentChild && patchForm(currentChild.id, { sieste: opt })}
                      className={`px-2 py-1 text-xs rounded-full border ${currentForm.sieste === opt ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-700 border-gray-300"}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* Participation */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2">
                <div className="text-3xl">{currentForm.participation === "Bonne" ? "⭐" : currentForm.participation === "Moyenne" ? "✨" : "💤"}</div>
                <p className="text-xs text-gray-500">Participation</p>
                <p className="text-lg font-bold text-emerald-600">{currentForm.participation}</p>
                <div className="mt-1 flex gap-2">
                  {(["Bonne", "Moyenne", "Faible"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => currentChild && patchForm(currentChild.id, { participation: opt })}
                      className={`px-2 py-1 text-xs rounded-full border ${currentForm.participation === opt ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-700 border-gray-300"}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Observation */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Observation (optionnel)</label>
              <Input
                value={currentForm.message}
                onChange={e => currentChild && patchForm(currentChild.id, { message: e.target.value })}
                placeholder="Message pour les parents…"
                className="text-sm"
              />
            </div>

            {/* Save footer */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-400">
                {hasResumeForCurrent
                  ? "Résumé déjà enregistré — modification possible"
                  : hasPresenceForCurrent
                  ? "Prêt à enregistrer"
                  : "Enregistrez la présence d'abord"}
              </span>
              <Button
                onClick={handleSaveDailySummary}
                disabled={savingResume || !hasPresenceForCurrent}
                className={`text-sm px-4 py-2 rounded-lg ${
                  savingResume ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-sky-500 hover:bg-sky-600 text-white"
                }`}
              >
                {savingResume ? "Enregistrement…" : hasResumeForCurrent ? "Mettre à jour" : "Valider le résumé"}
              </Button>
            </div>
            </>)}
          </CardContent>
        </Card>

        <TeacherActivityPhotosPanel
          t={t}
          dateYmd={activityPhotoDate}
          onDateChange={setActivityPhotoDate}
          photos={classActivityPhotos}
          loading={classActivityPhotosLoading}
          legende={activityPhotoLegende}
          onLegendeChange={setActivityPhotoLegende}
          uploading={activityPhotoUploading}
          onFileChange={handleActivityPhotoFile}
          onDelete={handleDeleteActivityPhoto}
          fileInputRef={activityFileInputRef}
        />
      </div>

      {/* Navigation & Progress */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 gap-2">
        <Button
          onClick={handlePrevious}
          disabled={currentChildIndex === 0}
          className="text-gray-700 border border-gray-300 rounded-lg px-3 sm:px-5 py-2 font-medium text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          ← <span className="hidden sm:inline">{t("prev")}</span>
        </Button>

        <div className="flex-1 mx-2 sm:mx-8 flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{currentChildIndex + 1} / {children.length}</span>
        </div>

        {canNavigateToSummary ? (
          <Link href={`/${locale}/teacher/summary`}>
            <Button className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-4 sm:px-9 py-2 sm:py-3 font-semibold text-xs sm:text-sm flex-shrink-0">
              <span className="hidden sm:inline">{t("summaryCta")} </span>→
            </Button>
          </Link>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!hasPresenceForCurrent && !isAttendanceComplete}
            className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-4 sm:px-7 py-2 font-semibold text-xs sm:text-sm flex-shrink-0"
          >
            <span className="hidden sm:inline">{t("next")} </span>→
          </Button>
        )}
      </div>
    </div>
  )
}
