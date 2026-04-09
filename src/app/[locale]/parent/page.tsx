"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { use } from "react"
import { Locale } from "@/lib/i18n/config"
import { apiClient } from "@/lib/api"
import { DailyResume } from "@/types/domain"
import { formatLocalDateKey, safeDateForLocaleDisplay } from "@/lib/date-local"
import { Home, CheckCircle2, Baby, Utensils, CalendarDays, ChevronLeft, ChevronRight, Pencil, Check, X, RefreshCw } from "lucide-react"

type Tab = "home" | "presence" | "child" | "menu" | "events"

/** Affichage parent : libellés + emoji (enums API ↔ saisie enseignant). */
function parentResumeAppetit(v?: string | null): { emoji: string; text: string } {
  switch (v) {
    case "Excellent": return { emoji: "😊", text: "Excellent" }
    case "Bon": return { emoji: "🙂", text: "Bien" }
    case "Moyen": return { emoji: "😐", text: "Moyen" }
    case "Faible": return { emoji: "😕", text: "Mal" }
    case "Refus": return { emoji: "🚫", text: "Refus" }
    default: return { emoji: "❓", text: v && String(v).trim() ? String(v) : "—" }
  }
}

function parentResumeHumeur(v?: string | null): { emoji: string; text: string } {
  switch (v) {
    case "Excellent": return { emoji: "😊", text: "Excellente" }
    case "Bon": return { emoji: "🙂", text: "Bonne" }
    case "Moyen": return { emoji: "😐", text: "Moyenne" }
    case "Difficile":
    case "Tres_difficile": return { emoji: "😟", text: "Difficile" }
    default: return { emoji: "❓", text: v && String(v).trim() ? String(v) : "—" }
  }
}

/** API : Courte→Moyen, Moyenne→Bon, Longue→Excellent (voir enseignant). */
function parentResumeSieste(v?: string | null): { emoji: string; text: string } {
  switch (v) {
    case "Excellent": return { emoji: "😴", text: "Longue" }
    case "Bon": return { emoji: "😴", text: "Moyenne" }
    case "Moyen": return { emoji: "😴", text: "Courte" }
    case "Difficile": return { emoji: "😟", text: "Difficile" }
    case "Pas_de_sieste": return { emoji: "🚫", text: "Pas de sieste" }
    default: return { emoji: "❓", text: v && String(v).trim() ? String(v) : "—" }
  }
}

function parentResumeParticipation(v?: string | null): { emoji: string; text: string } {
  switch (v) {
    case "Excellent": return { emoji: "🌟", text: "Excellente" }
    case "Bon": return { emoji: "✨", text: "Bonne" }
    case "Moyen": return { emoji: "😐", text: "Moyenne" }
    case "Faible": return { emoji: "😕", text: "Faible" }
    case "Absent": return { emoji: "➖", text: "Absent" }
    default: return { emoji: "❓", text: v && String(v).trim() ? String(v) : "—" }
  }
}

export default function ParentDashboard({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params)
  const locale = resolvedParams.locale
  const dateLocale = locale === "ar" ? "ar-MA" : "fr-FR"
  const t = useTranslations("parent")
  const formatLien = (lien?: string | null): string => {
    if (!lien) return "—"
    switch (lien) {
      case "Mere": return t("relations.Mere")
      case "Pere": return t("relations.Pere")
      case "Tuteur": return t("relations.Tuteur")
      case "GrandMere": return t("relations.GrandMere")
      case "GrandPere": return t("relations.GrandPere")
      case "Autre": return t("relations.Autre")
      default: return lien
    }
  }
  const [activeTab, setActiveTab] = useState<Tab>("home")

  const [child, setChild] = useState<{
    id: string | number; classeId?: string | null; name: string; class: string
    birthdate?: string | null; age?: string; avatar: string; photoUrl?: string | null
    status?: string; allergies: string[]
    classeEnseignants?: { prenom?: string | null; nom?: string | null }[]
    classeNbEleves?: number | null
  } | null>(null)

  const [parentPrenom, setParentPrenom] = useState("")
  const [tuteurs, setTuteurs] = useState<{
    id: string; prenom?: string | null; nom?: string | null; telephone?: string | null
    adresse?: string | null; email?: string | null; lien?: string | null
  }[]>([])
  const [editingProfile, setEditingProfile] = useState(false)
  const [editTelephone, setEditTelephone] = useState("")
  const [editAdresse, setEditAdresse] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveMsg, setProfileSaveMsg] = useState<string | null>(null)
  const [profileSaveErr, setProfileSaveErr] = useState<string | null>(null)

  // Health state
  const [sante, setSante] = useState<Record<string, unknown> | null>(null)
  const [santeLoading, setSanteLoading] = useState(false)
  const [editingSante, setEditingSante] = useState(false)
  const [santeForm, setSanteForm] = useState<{
    medecin: string; notes: string; restrictionAlimentaire: string; tags: string[]
    allergies: { nom: string; severite?: string }[]; intolerances: { nom: string }[]
  }>({ medecin: "", notes: "", restrictionAlimentaire: "", tags: [], allergies: [], intolerances: [] })
  const [santeSaving, setSanteSaving] = useState(false)
  const [santeSaveMsg, setSanteSaveMsg] = useState<string | null>(null)
  const [santeDeleting, setSanteDeleting] = useState(false)
  // Delegation edit state
  const [editingDelegation, setEditingDelegation] = useState<string | null>(null)
  const [delegationForm, setDelegationForm] = useState<{ nom: string; telephone: string; cin: string; relation: string }>({ nom: "", telephone: "", cin: "", relation: "" })
  const [addingDelegation, setAddingDelegation] = useState(false)
  const [newDelegationForm, setNewDelegationForm] = useState<{ nom: string; telephone: string; cin: string; relation: string }>({ nom: "", telephone: "", cin: "", relation: "" })
  const [delegationSaving, setDelegationSaving] = useState(false)
  const [delegationMsg, setDelegationMsg] = useState<string | null>(null)

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" })
  const [todayMenu, setTodayMenu] = useState<{ date: string; entree?: string | null; plat?: string | null; dessert?: string | null } | null>(null)
  const [weekMenus, setWeekMenus] = useState<Record<string, { date: string; entree?: string | null; plat?: string | null; dessert?: string | null }>>({})
  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; date: string; title: string; time?: string | null; description?: string | null }[]>([])
  const [authorizedPersons, setAuthorizedPersons] = useState<{ id: string; name: string; role?: string | null; phone?: string | null }[]>([])
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [dailyMessage, setDailyMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [dailyResumeToday, setDailyResumeToday] = useState<DailyResume | null>(null)
  const [presenceOnToday, setPresenceOnToday] = useState<{ statut: string } | null>(null)
  const [presences, setPresences] = useState<any[]>([])
  const [presencePage, setPresencePage] = useState(1)
  const [presenceTotal, setPresenceTotal] = useState(0)
  const [presenceLoading, setPresenceLoading] = useState(false)
  const presencePageSize = 20
  // Filter: YYYY-MM (e.g. "2026-03"), empty = all
  const now = new Date()
  const [presenceFilterMonth, setPresenceFilterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`)

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const [todayResumeLoading, setTodayResumeLoading] = useState(false)
  const [resumeRefreshTick, setResumeRefreshTick] = useState(0)

  const profileRef = useRef<{ tuteurs?: any[]; telephone?: string; adresse?: string; prenom?: string | null } | null>(null)
  const [enfantsInFamily, setEnfantsInFamily] = useState<any[]>([])
  const STORAGE_ENFANT_ID = "petitspas-parent-selected-enfant-id"

  const applyEnfantFromServer = (enfant: any, profile: any) => {
    setChild({
      id: enfant.id,
      classeId: enfant.classeId ?? null,
      name: `${enfant.prenom ?? ""} ${enfant.nom ?? ""}`.trim() || t("ui.defaultChildName"),
      class: enfant.classeNom ?? enfant.classeId ?? "",
      birthdate: enfant.dateNaissance ?? null,
      age: undefined,
      avatar: "👧",
      photoUrl: enfant.photoUrl ?? null,
      status: undefined,
      allergies: Array.isArray(enfant.allergies) ? enfant.allergies : [],
      classeEnseignants: Array.isArray(enfant.classeEnseignants) ? enfant.classeEnseignants : [],
      classeNbEleves: enfant.classeNbEleves ?? null,
    })
    if (enfant.profilSante) {
      setSante(enfant.profilSante)
      setSanteForm({
        medecin: enfant.profilSante.medecin ?? "",
        notes: enfant.profilSante.notes ?? "",
        restrictionAlimentaire: enfant.profilSante.restrictionAlimentaire ?? "",
        tags: Array.isArray(enfant.profilSante.tags) ? enfant.profilSante.tags : [],
        allergies: Array.isArray(enfant.profilSante.allergies) ? enfant.profilSante.allergies.map((a: { nom: string; severite?: string }) => ({ nom: a.nom, severite: a.severite ?? "" })) : [],
        intolerances: Array.isArray(enfant.profilSante.intolerances) ? enfant.profilSante.intolerances.map((i: { nom: string }) => ({ nom: i.nom })) : [],
      })
    } else {
      setSante(null)
      setSanteForm({ medecin: "", notes: "", restrictionAlimentaire: "", tags: [], allergies: [], intolerances: [] })
    }
    const delegations = Array.isArray(enfant.delegations) ? enfant.delegations : []
    if (delegations.length > 0) {
      setAuthorizedPersons(delegations.map((d: any) => ({ id: d.id, name: d.nom, role: d.relation ?? null, phone: d.telephone ?? null })))
    } else if (Array.isArray(profile?.tuteurs)) {
      setAuthorizedPersons(profile.tuteurs.map((tt: any) => ({ id: tt.id, name: `${tt.prenom ?? ""} ${tt.nom ?? ""}`.trim() || tt.email || "", role: tt.lien ?? null, phone: tt.telephone ?? null })))
    }
  }

  const handleSelectChild = (id: string) => {
    try {
      localStorage.setItem(STORAGE_ENFANT_ID, id)
    } catch { /* ignore */ }
    const enfant = enfantsInFamily.find((e: any) => String(e.id) === id)
    const profile = profileRef.current
    if (!enfant || !profile) return
    applyEnfantFromServer(enfant, profile)
    setDailyResumeToday(null)
    setPresenceOnToday(null)
    setResumeRefreshTick(tk => tk + 1)
  }

  useEffect(() => {
    let cancelled = false
    async function loadProfileAndResume() {
      try {
        setProfileLoading(true); setProfileError(null)
        const profileRes = await apiClient.getParentProfile()
        const profile = profileRes.data
        profileRef.current = profile
        const enfants = Array.isArray(profile?.enfants) ? profile.enfants : []
        setEnfantsInFamily(enfants)
        if (!enfants.length) {
          if (!cancelled) setProfileError(t("ui.noChildError"))
          return
        }
        let enfant: any = enfants[0]
        try {
          const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_ENFANT_ID) : null
          if (saved && enfants.some((e: any) => String(e.id) === saved)) {
            enfant = enfants.find((e: any) => String(e.id) === saved) ?? enfants[0]
          }
        } catch { /* ignore */ }
        if (!cancelled) {
          const prenom = profile?.prenom ?? profile?.tuteurs?.[0]?.prenom ?? ""
          if (!cancelled) setParentPrenom(prenom)
          const tts = Array.isArray(profile?.tuteurs) ? profile.tuteurs : []
          if (!cancelled) setTuteurs(tts)
          if (!cancelled) setEditTelephone(profile?.telephone ?? tts[0]?.telephone ?? "")
          if (!cancelled) setEditAdresse(profile?.adresse ?? tts[0]?.adresse ?? "")
          applyEnfantFromServer(enfant, profile)
          // Message du jour (classe) : chargé dans useEffect dédié + refresh / polling
          try {
              const menusRes = await apiClient.listMenus(1, 100)
              const rawMenus: any[] = menusRes.data?.data ?? menusRes.data?.items ?? (Array.isArray(menusRes.data) ? menusRes.data : [])
              const menusByDate: Record<string, any> = {}
              rawMenus.forEach((m: any) => {
                const iso = (typeof m.date === "string" ? m.date : "")?.slice(0, 10)
                if (iso) menusByDate[iso] = { date: iso, entree: m.collationMatin ?? null, plat: m.repas ?? null, dessert: m.gouter ?? null }
              })
              if (!cancelled) {
                setWeekMenus(menusByDate)
                const today = new Date()
                const todayKey = formatLocalDateKey(today)
                const todayTime = new Date(todayKey).getTime()
                if (menusByDate[todayKey]) { setTodayMenu(menusByDate[todayKey]) }
                else {
                  const entries = Object.values(menusByDate)
                  if (entries.length > 0) {
                    const closest = entries.reduce((best: any, cur: any) => Math.abs(new Date(cur.date).getTime() - todayTime) < Math.abs(new Date(best.date).getTime() - todayTime) ? cur : best)
                    setTodayMenu(closest)
                  }
                }
              }
            } catch {}
          try {
            const eventsRes = await apiClient.listParentEvents({ page: 1, pageSize: 50 })
            const payload = eventsRes.data
            const rawEvents: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : []
            const nowTs = Date.now()
            if (!cancelled) setUpcomingEvents(
              rawEvents
                // filtre : ne garder que les événements non encore terminés
                .filter((ev: any) => ev.endAt ? new Date(ev.endAt).getTime() >= nowTs : ev.startAt ? new Date(ev.startAt).getTime() >= nowTs : true)
                .sort((a: { startAt?: string }, b: { startAt?: string }) => new Date(a.startAt ?? 0).getTime() - new Date(b.startAt ?? 0).getTime())
                .map((ev: { id?: string; startAt?: string; endAt?: string; titre?: string; title?: string; description?: string }) => {
                  const start = ev.startAt ? new Date(ev.startAt) : null
                  const end   = ev.endAt   ? new Date(ev.endAt)   : null
                  let timeLabel: string | null = null
                  if (start) { const st = start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" }); timeLabel = end ? `${st} – ${end.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}` : st }
                  return { id: ev.id ?? String(Math.random()), date: start ? start.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" }).toUpperCase() : "", title: ev.titre ?? ev.title ?? "", time: timeLabel, description: ev.description ?? null }
                })
            )
          } catch {}
        }
      } finally { if (!cancelled) setProfileLoading(false) }
    }
    loadProfileAndResume()
    return () => { cancelled = true }
  }, [locale, t, dateLocale])

  // Journal de classe du jour (carte Accueil) — rechargé au refresh / poll
  useEffect(() => {
    const classeId = child?.classeId
    if (!classeId) return
    let cancelled = false
    const todayKey = formatLocalDateKey(new Date())
    async function loadTodayClassMessage() {
      try {
        const res = await apiClient.getClassJournal(classeId as string, todayKey)
        const raw = res.data as Record<string, unknown> | null
        if (raw && typeof raw === "object" && "empty" in raw && raw.empty === true) {
          if (!cancelled) setDailyMessage(null)
          return
        }
        const journal = (raw && typeof raw === "object" && "data" in raw && raw.data && typeof raw.data === "object" ? raw.data : raw) as {
          observations?: string; activites?: string; apprentissages?: string
        } | null
        const fromObs = typeof journal?.observations === "string" ? journal.observations : ""
        const combined = [journal?.activites, journal?.apprentissages]
          .filter((p: any) => typeof p === "string" && p.trim().length > 0)
          .join(". ")
        if (!cancelled) setDailyMessage(fromObs || combined || null)
      } catch {
        if (!cancelled) setDailyMessage(null)
      }
    }
    void loadTodayClassMessage()
    return () => { cancelled = true }
  }, [child?.classeId, resumeRefreshTick])

  const refreshResumeRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function parseResumeBody(data: unknown): DailyResume | null {
    if (data == null || typeof data !== "object") return null
    let cur: unknown = data
    for (let depth = 0; depth < 6; depth++) {
      if (!cur || typeof cur !== "object") return null
      const layer = cur as Record<string, unknown>
      if (layer.empty === true) return null
      const inner = layer.data
      if (inner !== null && typeof inner === "object" && !Array.isArray(inner)) {
        cur = inner
        continue
      }
      break
    }
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return null
    const o = cur as Record<string, unknown>
    if (o.empty === true) return null

    // Normaliser observations (string, objets { observation }, etc.)
    let obsList: string[] = []
    if (Array.isArray(o.observations)) {
      obsList = o.observations.map((item: unknown) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object" && "observation" in (item as object)) {
          const ob = (item as { observation?: unknown }).observation
          return typeof ob === "string" ? ob : ""
        }
        return ""
      }).filter((s: string) => s.trim().length > 0)
    } else if (typeof o.observations === "string" && o.observations.trim()) {
      obsList = [o.observations.trim()]
    }
    o.observations = obsList

    const hasContent =
      o.humeur != null ||
      o.appetit != null ||
      o.sieste != null ||
      o.participation != null ||
      obsList.length > 0
    if (!hasContent) return null
    return cur as unknown as DailyResume
  }

  useEffect(() => {
    if (!child?.id) return
    let cancelled = false
    async function loadTodayResume() {
      setTodayResumeLoading(true)
      const enfantId = String(child!.id)
      const todayKey = formatLocalDateKey(new Date())
      try {
        const [resumeRes, presRes] = await Promise.all([
          apiClient.getChildResume(enfantId, todayKey),
          apiClient.getChildPresences(enfantId, 1, 1, todayKey, todayKey).catch(() => null),
        ])
        if (cancelled) return
        const parsed = parseResumeBody(resumeRes.data)
        setDailyResumeToday(parsed)
        const payload = presRes?.data as { data?: unknown[] } | undefined
        const items = Array.isArray(payload?.data) ? payload.data : []
        const row = items[0] as { statut?: string } | undefined
        setPresenceOnToday(row?.statut ? { statut: row.statut } : null)
      } catch {
        if (!cancelled) {
          setDailyResumeToday(null)
          setPresenceOnToday(null)
        }
      } finally {
        if (!cancelled) setTodayResumeLoading(false)
      }
    }
    void loadTodayResume()
    return () => { cancelled = true }
  }, [child?.id, resumeRefreshTick])

  // Poll every 60 s — l’enseignant peut publier le résumé / message en cours de journée
  useEffect(() => {
    if (!child?.id) return
    if (refreshResumeRef.current) clearInterval(refreshResumeRef.current)
    refreshResumeRef.current = setInterval(() => {
      setResumeRefreshTick(t => t + 1)
    }, 60_000)
    return () => { if (refreshResumeRef.current) clearInterval(refreshResumeRef.current) }
  }, [child?.id])

  useEffect(() => {
    if (!child?.id) return
    let cancelled = false
    setPresenceLoading(true)
    const [year, month] = presenceFilterMonth ? presenceFilterMonth.split("-") : []
    const dateMin = year && month ? `${year}-${month}-01` : undefined
    const dateMax = year && month ? `${year}-${month}-${new Date(Number(year), Number(month), 0).getDate()}` : undefined
    apiClient.getChildPresences(child.id as string, presencePage, presencePageSize, dateMin, dateMax)
      .then(res => {
        if (cancelled) return
        const payload = res.data
        const items = payload?.data ?? payload?.items ?? (Array.isArray(payload) ? payload : [])
        setPresences(Array.isArray(items) ? items : [])
        setPresenceTotal(payload?.pagination?.total ?? payload?.total ?? items.length)
      })
      .catch(() => { if (!cancelled) setPresences([]) })
      .finally(() => { if (!cancelled) setPresenceLoading(false) })
    return () => { cancelled = true }
  }, [child?.id, presencePage, presenceFilterMonth])

  // Load health when switching to child tab (runs once per enfant, not on every render)
  useEffect(() => {
    if (activeTab !== "child" || !child?.id) return
    let cancelled = false
    async function fetchSante() {
      setSanteLoading(true)
      try {
        const res = await apiClient.getChildSante(child!.id as string)
        if (!cancelled && res.data) {
          const s = res.data
          setSante(s)
          setSanteForm({
            medecin: (s.medecin as string) ?? "",
            notes: (s.notes as string) ?? "",
            restrictionAlimentaire: (s.restrictionAlimentaire as string) ?? "",
            tags: Array.isArray(s.tags) ? (s.tags as string[]) : [],
            allergies: Array.isArray(s.allergies) ? (s.allergies as {nom:string;severite?:string}[]).map(a => ({ nom: a.nom, severite: a.severite ?? "" })) : [],
            intolerances: Array.isArray(s.intolerances) ? (s.intolerances as {nom:string}[]).map(i => ({ nom: i.nom })) : [],
          })
        }
      } catch { /* 404 = no health profile yet, keep pre-populated data from profile response */ }
      finally { if (!cancelled) setSanteLoading(false) }
    }
    fetchSante()
    return () => { cancelled = true }
  }, [activeTab, child?.id])

  const handlePasswordChange = async () => {
    setPasswordMessage(null); setPasswordError(null)
    if (passwords.new !== passwords.confirm) { setPasswordError(t("profile.passwordMismatch")); return }
    try {
      await apiClient.changePassword(passwords.current, passwords.new)
      setPasswords({ current: "", new: "", confirm: "" }); setShowPasswordForm(false); setPasswordMessage(t("profile.passwordChanged"))
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setPasswordError(typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(" ") : t("ui.passwordErrorGeneric"))
    }
  }

  const handleSaveProfile = async () => {
    setProfileSaveMsg(null); setProfileSaveErr(null); setProfileSaving(true)
    try {
      await apiClient.updateParentMe({ telephone: editTelephone || undefined, adresse: editAdresse || undefined })
      setTuteurs(prev => prev.map((tt, i) => i === 0 ? { ...tt, telephone: editTelephone||null, adresse: editAdresse||null } : tt))
      setProfileSaveMsg(t("ui.profileUpdated")); setEditingProfile(false)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setProfileSaveErr(typeof msg === "string" ? msg : t("ui.updateError"))
    } finally { setProfileSaving(false) }
  }

  if (profileLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto animate-pulse" style={{ background: "#AEDFF7" }}><span className="text-2xl">👶</span></div>
        <p className="text-sm text-gray-500">{t("ui.loading")}</p>
      </div>
    </div>
  )
  if (profileError) return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <Card className="w-full max-w-sm text-center p-6"><p className="text-red-600 text-sm">{profileError}</p></Card>
    </div>
  )

  // ─── Nav items ────────────────────────────────────────────────────────────
  const navItems: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "home",     icon: <Home className="w-5 h-5" />,          label: t("nav.home") },
    { id: "presence", icon: <CheckCircle2 className="w-5 h-5" />,  label: t("nav.presence") },
    { id: "child",    icon: <Baby className="w-5 h-5" />,          label: t("nav.child") },
    { id: "menu",     icon: <Utensils className="w-5 h-5" />,      label: t("nav.menu") },
    { id: "events",   icon: <CalendarDays className="w-5 h-5" />,  label: t("nav.events") },
  ]

  // ─── Daily Resume Cards ───────────────────────────────────────────────────
  const todayISO = formatLocalDateKey(todayDate)

  const PresenceOnlyFallback = ({ forDate, statut }: { forDate: string; statut: string }) => {
    const stLabel = statut === "Present" ? t("ui.statusPresent") : statut === "Absent" ? t("ui.statusAbsent") : statut
    return (
      <div className="rounded-xl p-3 border space-y-1" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>
        <p className="text-xs text-gray-500 capitalize">
          {new Date(`${forDate}T12:00:00`).toLocaleDateString(dateLocale, { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <p className="text-sm text-gray-800">✓ {t("ui.presenceOnlyLine", { status: stLabel })}</p>
      </div>
    )
  }

  const ResumeCards = ({ resume }: { resume: DailyResume | null }) => {
    if (!resume) return null
    const dRaw = resume.date as unknown
    const ymdPrefer =
      resume.requestedDate ??
      (typeof dRaw === "string" ? dRaw.slice(0, 10) : dRaw instanceof Date ? formatLocalDateKey(dRaw) : null)
    const dateForDisplay = safeDateForLocaleDisplay(resume.date as unknown, ymdPrefer)
    const dateLine =
      dateForDisplay != null && !Number.isNaN(dateForDisplay.getTime())
        ? dateForDisplay.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })
        : "—"
    const shownForFallback =
      dateForDisplay != null && !Number.isNaN(dateForDisplay.getTime())
        ? dateForDisplay.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })
        : "—"

    const appet = parentResumeAppetit(resume.appetit as string | undefined)
    const hum = parentResumeHumeur(resume.humeur as string | undefined)
    const si = parentResumeSieste(resume.sieste as string | undefined)
    const part = parentResumeParticipation(resume.participation as string | undefined)

    const metricRows = [
      { label: t("ui.appetite"), ...appet, color: "#FFF4ED", textColor: "#D97706" },
      { label: t("ui.mood"), ...hum, color: "#EBF7FD", textColor: "#1A73A7" },
      { label: t("ui.nap"), ...si, color: "#F0EEFF", textColor: "#5B4FCF" },
      { label: t("ui.participation"), ...part, color: "#F0FDF4", textColor: "#16A34A" },
    ]

    return (
      <div className="space-y-3">
        {resume.isFallback && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t("ui.resumeFallbackNotice", { shown: shownForFallback })}
          </p>
        )}
        <p className="text-xs text-gray-500 capitalize">
          {dateLine}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {metricRows.map(item => (
            <div key={item.label} className="rounded-xl p-3 flex flex-col gap-1" style={{ background: item.color, border: "1px solid rgba(0,0,0,0.06)" }}>
              <span className="text-xl" aria-hidden>{item.emoji}</span>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-sm font-bold" style={{ color: item.textColor }}>{item.text}</p>
            </div>
          ))}
        </div>
        {resume.observations && resume.observations.length > 0 && (
          <div className="rounded-xl p-3 border" style={{ background: "rgba(174,223,247,0.2)", borderColor: "#AEDFF7" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "#1A1A1A" }}>💬 {t("ui.observations")}</p>
            <ul className="text-sm text-gray-600 space-y-0.5">
              {resume.observations.map((obs, i) => <li key={i}>• {obs}</li>)}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // ─── Tab: Home ────────────────────────────────────────────────────────────
  const HomeTab = () => (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Greeting + child hero */}
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="rounded-2xl p-5" style={{ background: "#EBF6FB", border: "1.5px solid transparent", animation: "fadeSlideIn 0.5s ease-out" }}>
        <p className="text-xs font-medium mb-1" style={{ color: "#1A1A1A", opacity: 0.65 }}>
          {new Date().toLocaleDateString(dateLocale,{weekday:"long",day:"2-digit",month:"long"})}
        </p>
        <h2 className="text-xl font-bold mb-3" style={{ color: "#1A1A1A" }}>
          {parentPrenom ? t("ui.greetingNamed", { name: parentPrenom }) : t("ui.greeting")}
        </h2>
        <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.45)" }}>
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border-2 border-white/60" style={{ background: "white" }}>
            {child?.photoUrl ? <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" /> : <span className="text-2xl">{child?.avatar ?? "👧"}</span>}
          </div>
          <div className="min-w-0 w-full">
            <p className="font-bold text-base truncate" style={{ color: "#1A1A1A" }}>{child?.name ?? ""}</p>
            <p className="text-sm truncate" style={{ color: "#1A1A1A", opacity: 0.65 }}>{child?.class}</p>
            {enfantsInFamily.length > 1 && (
              <div className="mt-3 pt-3 border-t border-black/5">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#1A1A1A", opacity: 0.65 }}>{t("ui.selectChild")}</label>
                <select
                  value={String(child?.id ?? "")}
                  onChange={e => handleSelectChild(e.target.value)}
                  className="w-full text-sm rounded-xl border px-3 py-2 bg-white max-w-full"
                  style={{ borderColor: "#C5E8F7", color: "#1A1A1A" }}
                >
                  {enfantsInFamily.map((e: any) => (
                    <option key={e.id} value={String(e.id)}>
                      {`${e.prenom ?? ""} ${e.nom ?? ""}`.trim() || t("ui.defaultChildName")}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Résumé individuel (humeur, sieste…) + présence du jour */}
      <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-gray-900">📋 {t("ui.dailySummaryTitle")}</CardTitle>
            <button
              type="button"
              onClick={() => setResumeRefreshTick(tk => tk + 1)}
              disabled={todayResumeLoading}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
              title={t("ui.refreshTitle")}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${todayResumeLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {todayResumeLoading ? (
            <p className="text-sm text-gray-400 text-center py-6 animate-pulse">{t("ui.loading")}</p>
          ) : dailyResumeToday ? (
            <ResumeCards resume={dailyResumeToday} />
          ) : presenceOnToday ? (
            <PresenceOnlyFallback forDate={todayISO} statut={presenceOnToday.statut} />
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">{t("ui.dailySummaryEmpty")}</p>
          )}
        </CardContent>
      </Card>

      {/* Class message */}
      <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
          <CardTitle className="text-sm font-bold text-gray-900">💬 {t("ui.messageClassTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {dailyMessage ? <p className="text-sm text-gray-700 leading-relaxed">{dailyMessage}</p> : <p className="text-sm text-gray-400">{t("ui.noMessageToday")}</p>}
        </CardContent>
      </Card>

      {/* Events preview */}
      {upcomingEvents.length > 0 && (
        <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
          <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-900">📅 {t("ui.upcomingEventsTitle")}</CardTitle>
              <button type="button" onClick={() => setActiveTab("events")} className="text-xs hover:underline" style={{ color: "#FF6F61" }}>{t("ui.seeAll")}</button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            {upcomingEvents.slice(0, 2).map(ev => (
              <div key={ev.id} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: "rgba(174,223,247,0.2)", border: "1px solid #C5E8F7" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#AEDFF7", color: "#1A1A1A" }}>{ev.date}</div>
                <div><p className="text-sm font-semibold text-gray-900">{ev.title}</p>{ev.time && <p className="text-xs text-gray-500">{ev.time}</p>}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )

  // ─── Tab: Presence ────────────────────────────────────────────────────────
  const PresenceTab = () => {
    const todayStr = formatLocalDateKey(new Date())
    // For today's status: check if current filter month matches today, then look in loaded data
    const todayPresence = presences.find((p: any) => (p.date ?? "").slice(0, 10) === todayStr)
    const statut = todayPresence?.statut

    const totalPages = Math.max(1, Math.ceil(presenceTotal / presencePageSize))

    // Build month options: current month + 11 previous months
    const monthOptions: { value: string; label: string }[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
      const label = d.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
      monthOptions.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }

    // Stats for filtered period
    const nbPresent = presences.filter(p => p.statut === "Present").length
    const nbAbsent  = presences.filter(p => p.statut === "Absent").length

    return (
      <div className="px-4 pt-4 pb-4 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t("ui.presencesTitle")}</h2>

        {/* Today status */}
        <div className={`rounded-2xl p-4 border-2 ${statut === "Present" ? "bg-emerald-50 border-emerald-300" : statut === "Absent" ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{statut === "Present" ? "✅" : statut === "Absent" ? "❌" : "❓"}</span>
            <div>
              <p className="font-bold text-gray-900">{statut === "Present" ? t("ui.presentToday") : statut === "Absent" ? t("ui.absentToday") : t("ui.unknownStatus")}</p>
              <p className="text-xs text-gray-500">{new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "2-digit", month: "long" })}</p>
            </div>
          </div>
        </div>

        {/* Attendance history with filter + pagination */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-bold text-gray-900 flex-shrink-0">{t("ui.attendanceHistory")}</CardTitle>
              {/* Month filter */}
              <select
                value={presenceFilterMonth}
                onChange={e => { setPresenceFilterMonth(e.target.value); setPresencePage(1) }}
                className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 max-w-[160px]"
                style={{ borderColor: "#C5E8F7", color: "#1A1A1A" }}
              >
                <option value="">{t("ui.allMonths")}</option>
                {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {/* Mini stats */}
            {(nbPresent > 0 || nbAbsent > 0) && (
              <div className="flex gap-2 mb-3">
                <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                  <p className="text-lg font-bold text-emerald-700">{nbPresent}</p>
                  <p className="text-xs text-emerald-600">{t("ui.present")}</p>
                </div>
                <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: "#FFF5F5", border: "1px solid #FED7D7" }}>
                  <p className="text-lg font-bold text-red-600">{nbAbsent}</p>
                  <p className="text-xs text-red-500">{t("ui.absent")}</p>
                </div>
                <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: "#EAF5FB", border: "1px solid #C5E8F7" }}>
                  <p className="text-lg font-bold" style={{ color: "#1A73A7" }}>{presenceTotal}</p>
                  <p className="text-xs text-gray-500">{t("ui.total")}</p>
                </div>
              </div>
            )}

            {presenceLoading ? (
              <p className="text-sm text-gray-400 text-center py-6 animate-pulse">{t("ui.loading")}</p>
            ) : presences.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">{t("ui.noPresencesFound")}</p>
            ) : (
              <div className="space-y-1">
                {presences.map((p: any, i: number) => {
                  const d = (p.date ?? "").slice(0, 10)
                  const label = d ? new Date(`${d}T12:00:00`).toLocaleDateString(dateLocale, { weekday: "short", day: "2-digit", month: "short" }) : "—"
                  const stLabel = p.statut === "Present" ? t("ui.statusPresent") : p.statut === "Absent" ? t("ui.statusAbsent") : (p.statut ?? "—")
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <p className="text-sm text-gray-700 capitalize">{label}</p>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${p.statut === "Present" ? "bg-emerald-100 text-emerald-700" : p.statut === "Absent" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                        {stLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setPresencePage(p => Math.max(1, p-1))} disabled={presencePage <= 1 || presenceLoading}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-40"
                  style={{ background: "#EAF5FB", color: "#1A1A1A", border: "1px solid #C5E8F7" }}>
                  <ChevronLeft className="w-3.5 h-3.5" /> {t("ui.prev")}
                </button>
                <p className="text-xs text-gray-500">{t("ui.presencePage", { page: presencePage, totalPages })}</p>
                <button type="button" onClick={() => setPresencePage(p => Math.min(totalPages, p+1))} disabled={presencePage >= totalPages || presenceLoading}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-40"
                  style={{ background: "#EAF5FB", color: "#1A1A1A", border: "1px solid #C5E8F7" }}>
                  {t("ui.next")} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Tab: Child ───────────────────────────────────────────────────────────

  const loadSante = async () => {
    if (!child?.id) return
    setSanteLoading(true)
    try {
      const res = await apiClient.getChildSante(child.id as string)
      const s = res.data ?? null
      setSante(s)
      if (s) {
        setSanteForm({
          medecin: (s.medecin as string) ?? "",
          notes: (s.notes as string) ?? "",
          restrictionAlimentaire: (s.restrictionAlimentaire as string) ?? "",
          tags: Array.isArray(s.tags) ? (s.tags as string[]) : [],
          allergies: Array.isArray(s.allergies) ? (s.allergies as {nom:string;severite?:string}[]).map(a => ({ nom: a.nom, severite: a.severite ?? "" })) : [],
          intolerances: Array.isArray(s.intolerances) ? (s.intolerances as {nom:string}[]).map(i => ({ nom: i.nom })) : [],
        })
      } else {
        setSanteForm({ medecin: "", notes: "", restrictionAlimentaire: "", tags: [], allergies: [], intolerances: [] })
      }
    } catch { setSante(null) }
    finally { setSanteLoading(false) }
  }

  const handleSaveSante = async () => {
    if (!child?.id) return
    setSanteSaving(true); setSanteSaveMsg(null)
    try {
      await apiClient.upsertChildSante(child.id as string, santeForm)
      setSanteSaveMsg(t("ui.santeSaved"))
      await loadSante()
      setEditingSante(false)
    } catch (err: unknown) {
      const msg = (err as {response?: {data?: {message?: unknown}}})?.response?.data?.message
      setSanteSaveMsg(typeof msg === "string" ? t("ui.errorWithDetail", { detail: msg }) : t("ui.updateError"))
    } finally { setSanteSaving(false) }
  }

  const handleDeleteSante = async () => {
    if (!child?.id || !window.confirm(t("ui.santeDeleteConfirm"))) return
    setSanteDeleting(true)
    try {
      await apiClient.deleteChildSante(child.id as string)
      setSante(null); setSanteForm({ medecin: "", notes: "", restrictionAlimentaire: "", tags: [], allergies: [], intolerances: [] })
      setSanteSaveMsg(t("ui.santeDeleted"))
    } catch { setSanteSaveMsg(t("ui.updateError")) }
    finally { setSanteDeleting(false) }
  }

  const handleStartEditDelegation = (d: {id:string; name:string; phone?:string|null; role?:string|null}) => {
    setEditingDelegation(d.id)
    setDelegationForm({ nom: d.name ?? "", telephone: d.phone ?? "", cin: "", relation: d.role ?? "" })
    setDelegationMsg(null)
  }

  const handleSaveDelegation = async (delegationId: string) => {
    if (!child?.id) return
    setDelegationSaving(true); setDelegationMsg(null)
    try {
      await apiClient.updateParentDelegation(child.id as string, delegationId, delegationForm)
      setAuthorizedPersons(prev => prev.map(p => p.id === delegationId ? { ...p, name: delegationForm.nom, phone: delegationForm.telephone, role: delegationForm.relation } : p))
      setEditingDelegation(null); setDelegationMsg(t("ui.delegationUpdated"))
    } catch { setDelegationMsg(t("ui.updateError")) }
    finally { setDelegationSaving(false) }
  }

  const handleDeleteDelegation = async (delegationId: string) => {
    if (!child?.id || !window.confirm(t("ui.delegationDeleteConfirm"))) return
    setDelegationSaving(true)
    try {
      await apiClient.deleteParentDelegation(child.id as string, delegationId)
      setAuthorizedPersons(prev => prev.filter(p => p.id !== delegationId)); setDelegationMsg(t("ui.delegationDeleted"))
    } catch { setDelegationMsg(t("ui.updateError")) }
    finally { setDelegationSaving(false) }
  }

  const handleAddDelegation = async () => {
    if (!child?.id) return
    setDelegationSaving(true); setDelegationMsg(null)
    try {
      const res = await apiClient.addParentDelegation(child.id as string, newDelegationForm)
      const d = res.data as {id:string; nom:string; telephone:string; relation:string}
      setAuthorizedPersons(prev => [...prev, { id: d.id, name: d.nom, phone: d.telephone, role: d.relation }])
      setAddingDelegation(false); setNewDelegationForm({ nom: "", telephone: "", cin: "", relation: "" }); setDelegationMsg(t("ui.delegationAdded"))
    } catch { setDelegationMsg(t("ui.updateError")) }
    finally { setDelegationSaving(false) }
  }

  const ChildTab = () => (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t("ui.profileChildTitle")}</h2>

      {/* Child + class info */}
      <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border-2" style={{ background: "#AEDFF7", borderColor: "#AEDFF7" }}>
              {child?.photoUrl ? <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" /> : <span className="text-3xl">{child?.avatar ?? "👧"}</span>}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-lg">{child?.name ?? ""}</p>
              <p className="text-sm" style={{ color: "#1A1A1A", opacity: 0.6 }}>{child?.class}</p>
              {child?.birthdate && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("ui.bornOn", { date: new Date(child.birthdate).toLocaleDateString(dateLocale, { day: "2-digit", month: "long", year: "numeric" }) })}
                </p>
              )}
            </div>
          </div>
          {(child?.classeNbEleves != null || (child?.classeEnseignants && child.classeEnseignants.length > 0)) && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
              {child?.classeNbEleves != null && (
                <p className="text-sm text-gray-700">
                  👶{" "}
                  {child.classeNbEleves > 1 ? t("ui.studentsInClassPlural", { count: child.classeNbEleves }) : t("ui.studentsInClass", { count: child.classeNbEleves })}
                </p>
              )}
              {child?.classeEnseignants && child.classeEnseignants.length > 0 && (
                <p className="text-sm text-gray-700">👩‍🏫 {child.classeEnseignants.map((e, i) => <span key={i}>{i > 0 ? ", " : ""}{[e.prenom, e.nom].filter(Boolean).join(" ") || t("ui.teacherFallback")}</span>)}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authorized persons with edit/delete/add */}
      <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-gray-900">👥 {t("ui.authorizedTitle")}</CardTitle>
            <button type="button" onClick={() => { setAddingDelegation(true); setDelegationMsg(null) }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "#EAF5FB", color: "#1A1A1A", border: "1px solid #C5E8F7" }}>
              + {t("ui.add")}
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-3 space-y-2">
          {delegationMsg && <p className="text-xs px-3 py-2 rounded-lg mb-1" style={{ background: "#EAF5FB", color: "#1A1A1A" }}>{delegationMsg}</p>}
          {authorizedPersons.length === 0 && !addingDelegation && (
            <p className="text-sm text-gray-400 text-center py-4">{t("ui.noAuthorized")}</p>
          )}
          {authorizedPersons.map(person => (
            <div key={person.id} className="rounded-xl p-3" style={{ background: "rgba(174,223,247,0.15)", border: "1px solid #AEDFF7" }}>
              {editingDelegation === person.id ? (
                <div className="space-y-2">
                  {([[t("ui.delegationName"), "nom", t("ui.phFullName")], [t("ui.delegationPhone"), "telephone", t("ui.phPhone")], [t("ui.delegationCin"), "cin", t("ui.phCin")], [t("ui.delegationRelation"), "relation", t("ui.phRelation")]] as [string, keyof typeof delegationForm, string][]).map(([label, field, ph]) => (
                    <div key={field}>
                      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                      <Input value={delegationForm[field]} onChange={e => setDelegationForm(prev => ({ ...prev, [field]: e.target.value }))} placeholder={ph} className="h-8 text-sm" />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => handleSaveDelegation(person.id)} disabled={delegationSaving} className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: "#FF6F61" }}>{delegationSaving ? "..." : t("ui.save")}</button>
                    <button type="button" onClick={() => setEditingDelegation(null)} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#EAF5FB", color: "#6B7280", border: "1px solid #C5E8F7" }}>{t("ui.cancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{person.name}</p>
                    {person.role && <p className="text-xs text-gray-600 mt-0.5">{formatLien(person.role)}</p>}
                    {person.phone && <p className="text-xs mt-0.5" style={{ color: "#FF6F61" }}>📞 {person.phone}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button type="button" onClick={() => handleStartEditDelegation(person)} className="p-1.5 rounded-lg" style={{ background: "#EAF5FB", border: "1px solid #C5E8F7" }}><Pencil className="w-3 h-3 text-gray-600" /></button>
                    <button type="button" onClick={() => handleDeleteDelegation(person.id)} disabled={delegationSaving} className="p-1.5 rounded-lg" style={{ background: "#FFF0EE", border: "1px solid #FFD4CE" }}><X className="w-3 h-3 text-red-500" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {addingDelegation && (
            <div className="rounded-xl p-3 border-2 border-dashed space-y-2" style={{ borderColor: "#AEDFF7" }}>
              <p className="text-xs font-semibold text-gray-700">{t("ui.newAuthorized")}</p>
              {([[t("ui.delegationNameReq"), "nom", t("ui.phFullName")], [t("ui.delegationPhoneReq"), "telephone", t("ui.phPhone")], [t("ui.delegationCin"), "cin", t("ui.phCin")], [t("ui.delegationRelation"), "relation", t("ui.phRelation")]] as [string, keyof typeof newDelegationForm, string][]).map(([label, field, ph]) => (
                <div key={field}>
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <Input value={newDelegationForm[field]} onChange={e => setNewDelegationForm(prev => ({ ...prev, [field]: e.target.value }))} placeholder={ph} className="h-8 text-sm" />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={handleAddDelegation} disabled={delegationSaving || !newDelegationForm.nom || !newDelegationForm.telephone} className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: "#FF6F61" }}>{delegationSaving ? "..." : t("ui.add")}</button>
                <button type="button" onClick={() => { setAddingDelegation(false); setNewDelegationForm({ nom: "", telephone: "", cin: "", relation: "" }) }} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#EAF5FB", color: "#6B7280", border: "1px solid #C5E8F7" }}>{t("ui.cancel")}</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health profile */}
      
      {/* Password change */}
      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardHeader className="pb-3 border-b border-gray-50">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-gray-900">🔐 {t("profile.passwordCardTitle")}</CardTitle>
            {!showPasswordForm && (
              <Button onClick={() => setShowPasswordForm(true)} variant="outline" size="sm" className="shrink-0 border-gray-200">
                {t("profile.editPassword")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {passwordMessage && <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{passwordMessage}</div>}
          {passwordError && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{passwordError}</div>}
          {!showPasswordForm ? null : (
            <div className="space-y-3">
              {[
                { key: "current" as const, label: t("profile.currentPasswordLabel"), ph: "••••••••" },
                { key: "new" as const,     label: t("profile.newPasswordLabel"), ph: "••••••••" },
                { key: "confirm" as const, label: t("ui.confirmPasswordShort"),           ph: "••••••••" },
              ].map(field => (
                <div key={field.key}>
                  <p className="text-xs font-medium text-gray-600 mb-1">{field.label}</p>
                  <Input type="password" placeholder={field.ph} value={passwords[field.key]} onChange={e => setPasswords(p => ({ ...p, [field.key]: e.target.value }))} className="h-10" />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button onClick={handlePasswordChange} size="sm" className="flex-1 text-white" style={{ background: "#FF6F61" }}>{t("profile.saveButton")}</Button>
                <Button onClick={() => setShowPasswordForm(false)} variant="outline" size="sm" className="flex-1">{t("profile.cancelButton")}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // ─── Tab: Menu ────────────────────────────────────────────────────────────
  const MenuTab = () => {
    const MENU_ROWS = [
      { icon: "🥛", label: t("ui.collation"),  hint: t("ui.hintApprox9"),  key: "entree"  as const },
      { icon: "🍽️", label: t("ui.lunch"),   hint: t("ui.hintApprox12"), key: "plat"    as const },
      { icon: "🍪", label: t("ui.snack"),     hint: t("ui.hintApprox16"), key: "dessert" as const },
    ]
    // Current week: Mon–Sun (local dates, no UTC offset issues)
    const today = new Date()
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7)
    const weekEnd   = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
    // Parse date string as local (YYYY-MM-DD → local midnight)
    const parseLocal = (iso: string) => { const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d) }
    const weekMenuList = Object.values(weekMenus)
      .filter((m: any) => {
        const d = parseLocal(m.date as string)
        return d >= weekStart && d <= weekEnd
      })
      .sort((a: any, b: any) => parseLocal(a.date).getTime() - parseLocal(b.date).getTime())

    return (
      <div className="px-4 pt-4 pb-4 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t("ui.menuTabTitle")}</h2>

        {/* Today's menu */}
        <Card className="shadow-md rounded-2xl overflow-hidden" style={{ border: "2px solid #AEDFF7", background: "linear-gradient(to bottom, rgba(174,223,247,0.12), white)" }}>
          <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>🍽️</span> {t("ui.menuTodayTitle")}
              {todayMenu && <span className="ml-auto text-xs font-normal text-gray-400">{new Date(todayMenu.date).toLocaleDateString(dateLocale, { weekday: "long", day: "2-digit", month: "long" })}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {todayMenu ? (
              <div className="space-y-2">
                {MENU_ROWS.filter(r => todayMenu[r.key]).map(row => (
                  <div key={row.key} className="flex items-start gap-3 py-2.5 border-t first:border-0 first:pt-0" style={{ borderColor: "rgba(174,223,247,0.5)" }}>
                    <span className="text-xl flex-shrink-0 leading-none mt-0.5">{row.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{row.label}</p>
                        <p className="text-[9px] text-gray-400">{row.hint}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug break-words">{todayMenu[row.key]}</p>
                    </div>
                  </div>
                ))}
                {!todayMenu.entree && !todayMenu.plat && !todayMenu.dessert && <p className="text-sm text-gray-400">{t("ui.noMealsFilled")}</p>}
              </div>
            ) : (
              <div className="text-center py-4">
                <span className="text-3xl">🍽️</span>
                <p className="text-sm text-gray-400 mt-2">{t("ui.noMenuPublished")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week menus — current week only */}
        <Card className="border shadow-sm rounded-2xl overflow-hidden" style={{ borderColor: "#AEDFF7" }}>
          <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
            <CardTitle className="text-sm font-bold text-gray-900">
              📋 {t("ui.menuWeekTitle")}
              <span className="ml-2 text-[11px] font-normal text-gray-400">
                {weekStart.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" })} – {weekEnd.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2 px-3">
            {weekMenuList.length === 0 ? (
              <div className="text-center py-5">
                <span className="text-3xl">🗓️</span>
                <p className="text-sm text-gray-400 mt-2">{t("ui.noMenuWeek")}</p>
              </div>
            ) : weekMenuList.map((menu: any) => {
              const d = new Date(); const localISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
              const isMenuToday = menu.date === localISO
              return (
                <div key={menu.date} className="rounded-xl p-3" style={{ background: isMenuToday ? "rgba(174,223,247,0.25)" : "rgba(174,223,247,0.08)", border: `1px solid ${isMenuToday ? "#AEDFF7" : "rgba(174,223,247,0.35)"}` }}>
                  <p className="text-xs font-bold mb-2 capitalize flex items-center gap-1.5" style={{ color: isMenuToday ? "#1A73A7" : "#1A1A1A" }}>
                    {isMenuToday && <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{t("ui.todayBadge")}</span>}
                    {new Date(menu.date + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "long", day: "2-digit", month: "short" })}
                  </p>
                  <div className="space-y-1">
                    {MENU_ROWS.filter(r => menu[r.key]).map(row => (
                      <div key={row.key} className="flex items-start gap-2 text-xs">
                        <span className="flex-shrink-0 w-5 text-center">{row.icon}</span>
                        <span className="text-gray-500 flex-shrink-0 w-24">{row.label}</span>
                        <span className="text-gray-800 font-medium break-words min-w-0 flex-1">{menu[row.key]}</span>
                      </div>
                    ))}
                    {!menu.entree && !menu.plat && !menu.dessert && <p className="text-xs text-gray-400 italic">{t("ui.noMealsDay")}</p>}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Tab: Events ──────────────────────────────────────────────────────────
  const EventsTab = () => (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t("ui.eventsTitle")}</h2>
      {upcomingEvents.length === 0 ? (
        <Card className="border border-gray-100 rounded-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <span className="text-4xl">📅</span>
            <p className="mt-3 text-sm text-gray-400">{t("ui.noUpcomingEventsShort")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcomingEvents.map(ev => (
            <div key={ev.id} className="flex items-start gap-3 rounded-2xl bg-white shadow-sm p-4" style={{ border: "1px solid #C5E8F7" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 text-center leading-tight" style={{ background: "#AEDFF7", color: "#1A1A1A" }}>{ev.date}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{ev.title}</p>
                {ev.time && <p className="text-xs text-gray-500 mt-0.5">🕐 {ev.time}</p>}
                {ev.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{ev.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20 md:pb-8 overflow-x-hidden" style={{ background: "#FFFFFF" }}>
      {/* Desktop tab bar */}
      <div className="hidden md:block sticky top-0 z-40 border-b" style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderColor: "#C5E8F7" }}>
        <div className="max-w-2xl mx-auto px-4 flex gap-1 py-2">
          {navItems.map(item => {
            const isActive = activeTab === item.id
            return (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={isActive ? { background: "#AEDFF7", color: "#1A1A1A" } : { color: "#6B7280" }}>
                {item.icon}<span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pt-4 md:pt-6">
        {activeTab === "home"     && <HomeTab />}
        {activeTab === "presence" && <PresenceTab />}
        {activeTab === "child"    && <ChildTab />}
        {activeTab === "menu"     && <MenuTab />}
        {activeTab === "events"   && <EventsTab />}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(10px)", borderColor: "#C5E8F7", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map(item => {
            const isActive = activeTab === item.id
            return (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className={"flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all "+(isActive?"":"text-gray-400")}
                style={isActive ? { color: "#FF6F61" } : {}}>
                <span style={{ transform: isActive ? "scale(1.1)" : "scale(1)", transition: "transform 0.15s" }}>{item.icon}</span>
                <span className="text-[10px] font-medium" style={isActive ? { color: "#FF6F61" } : {}}>{item.label}</span>
                {isActive && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: "#FF6F61" }} />}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
