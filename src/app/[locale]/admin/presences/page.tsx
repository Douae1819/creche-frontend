"use client"

import { use, useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarNew } from "@/components/layout/sidebar-new"
import { apiClient } from "@/lib/api"
import type { Locale } from "@/lib/i18n/config"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react"

type PresenceRow = {
  id: string
  date: string
  statut: "Present" | "Absent" | "Justifie"
  enfant?: {
    id: string
    prenom?: string
    nom?: string
    classe?: { id: string; nom: string }
  }
  arriveeA?: string
  departA?: string
  enregistrePar?: { id: string; prenom: string; nom: string }
}

type ClasseItem  = { id: string; nom: string }
type TeacherItem = { id: string; prenom: string; nom: string; email?: string }

export default function AdminPresencesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale: currentLocale } = use(params)
  const t = useTranslations("admin.presences")
  const dateLocale = currentLocale === "ar" ? "ar-MA" : "fr-FR"

  const today = new Date().toISOString().slice(0, 10)

  const rowStatutLabel = (s: PresenceRow["statut"]) =>
    s === "Present" ? t("apiStatus.Present") : s === "Absent" ? t("apiStatus.Absent") : t("apiStatus.Justifie")

  const [dateMin,         setDateMin]         = useState(today)
  const [dateMax,         setDateMax]         = useState(today)
  const [classeId,        setClasseId]        = useState("")
  const [enregistreParId, setEnregistreParId] = useState("")
  const [statut,          setStatut]          = useState("")
  const [q,               setQ]               = useState("")
  const [page,            setPage]            = useState(1)
  const [pageSize,        setPageSize]        = useState(25)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [items,           setItems]           = useState<PresenceRow[]>([])
  const [classes,         setClasses]         = useState<ClasseItem[]>([])
  const [teachers,        setTeachers]        = useState<TeacherItem[]>([])
  const [total,           setTotal]           = useState(0)
  const [showFilters,     setShowFilters]     = useState(false)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  )

  // Stats from current page
  const nbPresent  = items.filter(r => r.statut === "Present").length
  const nbAbsent   = items.filter(r => r.statut === "Absent").length
  const nbJustifie = items.filter(r => r.statut === "Justifie").length

  useEffect(() => {
    let cancelled = false
    async function loadFilters() {
      try {
        const [classesRes, teachersRes] = await Promise.all([
          apiClient.listClasses(),
          apiClient.listUsers({ role: "ENSEIGNANT", limit: 200 }),
        ])
        const cls: ClasseItem[] = Array.isArray(classesRes.data?.data)
          ? classesRes.data.data : Array.isArray(classesRes.data) ? classesRes.data : []
        const teacherRows: TeacherItem[] = (
          Array.isArray(teachersRes.data?.data) ? teachersRes.data.data
          : Array.isArray(teachersRes.data?.items) ? teachersRes.data.items
          : Array.isArray(teachersRes.data) ? teachersRes.data : []
        ).filter((u: TeacherItem) => u?.id)
        if (!cancelled) { setClasses(cls); setTeachers(teacherRows) }
      } catch {}
    }
    void loadFilters()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const res = await apiClient.listPresences({
          dateMin: dateMin || undefined, dateMax: dateMax || undefined,
          classeId: classeId || undefined, enregistreParId: enregistreParId || undefined,
          statut: statut || undefined, q: q || undefined, page, pageSize,
        })
        const payload = res.data
        const rows: PresenceRow[] = Array.isArray(payload?.items) ? payload.items
          : Array.isArray(payload?.data) ? payload.data
          : Array.isArray(payload) ? payload : []
        if (!cancelled) {
          setItems(rows)
          setTotal(typeof payload?.total === "number" ? payload.total : rows.length)
        }
      } catch {
        if (!cancelled) setError(t("loadError"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [dateMin, dateMax, classeId, enregistreParId, statut, q, page, pageSize])

  const fetchAll = async (): Promise<PresenceRow[]> => {
    const all: PresenceRow[] = []
    let p = 1
    while (true) {
      const res = await apiClient.listPresences({ dateMin: dateMin || undefined, dateMax: dateMax || undefined, classeId: classeId || undefined, enregistreParId: enregistreParId || undefined, statut: statut || undefined, q: q || undefined, page: p, pageSize: 200 })
      const payload = res.data
      const rows: PresenceRow[] = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
      all.push(...rows)
      if (!payload?.hasNext || rows.length < 200) break
      p++
    }
    return all
  }

  const exportCsv = async () => {
    const rows = await fetchAll()
    const header = [
      t("colDate"),
      t("colChild"),
      t("colClass"),
      t("colStatus"),
      t("colArrival"),
      t("colTeacher"),
    ].join(",")
    const lines = rows.map(r => [
      r.date ?? "", `${r.enfant?.prenom ?? ""} ${r.enfant?.nom ?? ""}`.trim(),
      r.enfant?.classe?.nom ?? "", rowStatutLabel(r.statut), r.arriveeA ?? "",
      r.enregistrePar ? `${r.enregistrePar.prenom} ${r.enregistrePar.nom}`.trim() : ""
    ].map(c => `"${String(c).replaceAll('"','""')}"`).join(","))
    const csv = [header, ...lines].join("\n")
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `presences_${dateMin}_${dateMax}.csv` })
    document.body.appendChild(a); a.click(); a.remove()
  }

  const printTable = async () => {
    const rows = await fetchAll()
    const htmlRows = rows.map(r => {
      const name = r.enfant ? `${r.enfant.prenom ?? ""} ${r.enfant.nom ?? ""}`.trim() || "—" : "—"
      const teacher = r.enregistrePar ? `${r.enregistrePar.prenom} ${r.enregistrePar.nom}`.trim() : "—"
      return `<tr><td>${r.date ?? "—"}</td><td>${name}</td><td>${r.enfant?.classe?.nom ?? "—"}</td><td>${rowStatutLabel(r.statut)}</td><td>${r.arriveeA ?? "—"}</td><td>${teacher}</td></tr>`
    }).join("")
    const w = window.open("", "_blank")
    if (!w) return
    const th = [t("colDate"), t("colChild"), t("colClass"), t("colStatus"), t("colArrival"), t("colTeacher")].map(h => `<th>${h}</th>`).join("")
    w.document.write(`<html><head><title>${t("printTitle")}</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{font-size:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f0f0f0}</style></head><body><h1>${t("printHeading")}</h1><p style="color:#666">${t("printPeriod", { from: dateMin || "—", to: dateMax || "—" })}</p><table><thead><tr>${th}</tr></thead><tbody>${htmlRows}</tbody></table></body></html>`)
    w.document.close(); w.focus(); w.print(); w.close()
  }

  const badgeVariant = (s: PresenceRow["statut"]) =>
    s === "Present" ? "bg-emerald-100 text-emerald-700" : s === "Absent" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"

  const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      <SidebarNew currentLocale={currentLocale} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-border px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-start justify-between gap-3 flex-wrap max-w-6xl mx-auto">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowFilters(f => !f)} className="flex items-center gap-1.5 md:hidden">
                <Filter className="w-3.5 h-3.5" />
                {showFilters ? t("hideFilters") : t("showFilters")}
                {(classeId || statut || enregistreParId || q) && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block ml-0.5" />}
              </Button>
              <Button size="sm" onClick={printTable} className="flex items-center gap-1.5">
                📄 <span className="hidden sm:inline">{t("exportPdf")}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <Card className={`p-4 ${showFilters ? "block" : "hidden md:block"}`}>
            {/* Date row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 items-end">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t("dateStart")}</p>
                <Input type="date" value={dateMin} onChange={e => { setPage(1); setDateMin(e.target.value) }} className="h-10" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t("dateEnd")}</p>
                <Input type="date" value={dateMax} onChange={e => { setPage(1); setDateMax(e.target.value) }} className="h-10" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t("class")}</p>
                <select className={selectClass} value={classeId} onChange={e => { setPage(1); setClasseId(e.target.value) }}>
                  <option value="">{t("allClasses")}</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t("teacher")}</p>
                <select className={selectClass} value={enregistreParId} onChange={e => { setPage(1); setEnregistreParId(e.target.value) }}>
                  <option value="">{t("allTeachers")}</option>
                  {teachers.map(u => <option key={u.id} value={u.id}>{`${u.prenom} ${u.nom}`.trim()}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t("status")}</p>
                <select className={selectClass} value={statut} onChange={e => { setPage(1); setStatut(e.target.value) }}>
                  <option value="">{t("allStatus")}</option>
                  <option value="Present">{t("statusPresent")}</option>
                  <option value="Absent">{t("statusAbsent")}</option>
                  <option value="Justifie">{t("statusJustified")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t("child")}</p>
                <Input value={q} onChange={e => { setPage(1); setQ(e.target.value) }} placeholder={t("childPlaceholder")} className="h-10" />
              </div>
            </div>

            {/* Quick actions */}
            <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPage(1); setDateMin(today); setDateMax(today) }}>
                  {t("today")}
                </Button>
                {(classeId || statut || enregistreParId || q || dateMin !== today || dateMax !== today) && (
                  <Button variant="outline" size="sm" onClick={() => { setDateMin(today); setDateMax(today); setClasseId(""); setStatut(""); setEnregistreParId(""); setQ(""); setPage(1) }} className="flex items-center gap-1 text-muted-foreground">
                    <X className="w-3 h-3" /> {t("reset")}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={exportCsv}>{t("csv")}</Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t("perPage")}</span>
                <select className="h-8 rounded border border-input bg-background px-2 text-xs" value={String(pageSize)} onChange={e => { setPage(1); setPageSize(Number(e.target.value)) }}>
                  {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </Card>

          {/* ── Stats ──────────────────────────────────────────────────────── */}
          {total > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3 text-center bg-emerald-50 border border-emerald-200">
                <p className="text-xl font-bold text-emerald-700">{nbPresent}</p>
                <p className="text-xs text-emerald-600">{t("presentCount")}</p>
              </div>
              <div className="rounded-xl p-3 text-center bg-red-50 border border-red-200">
                <p className="text-xl font-bold text-red-600">{nbAbsent}</p>
                <p className="text-xs text-red-500">{t("absentCount")}</p>
              </div>
              <div className="rounded-xl p-3 text-center bg-blue-50 border border-blue-200">
                <p className="text-xl font-bold text-blue-700">{nbJustifie}</p>
                <p className="text-xs text-blue-600">{t("justifiedCount")}</p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">{error}</p>}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">📋</span>
              <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              {/* Pagination top */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  {total > 1
                    ? t("resultsPlural", { total, page, totalPages })
                    : t("results", { total, page, totalPages })}
                </p>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-7 w-7 p-0">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-7 w-7 p-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* ── Desktop: table ──────────────────────────────────────── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b bg-muted/20">
                      <th className="py-3 px-4 font-medium">{t("colDate")}</th>
                      <th className="py-3 px-4 font-medium">{t("colChild")}</th>
                      <th className="py-3 px-4 font-medium">{t("colClass")}</th>
                      <th className="py-3 px-4 font-medium">{t("colStatus")}</th>
                      <th className="py-3 px-4 font-medium">{t("colArrival")}</th>
                      <th className="py-3 px-4 font-medium">{t("colTeacher")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(row => {
                      const teacher = row.enregistrePar ? `${row.enregistrePar.prenom} ${row.enregistrePar.nom}`.trim() : "—"
                      const enfant  = row.enfant ? `${row.enfant.prenom ?? ""} ${row.enfant.nom ?? ""}`.trim() : "—"
                      return (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{row.date ?? "—"}</td>
                          <td className="py-3 px-4 font-medium">{enfant || "—"}</td>
                          <td className="py-3 px-4 text-muted-foreground">{row.enfant?.classe?.nom ?? "—"}</td>
                          <td className="py-3 px-4">
                            <Badge className={badgeVariant(row.statut)}>{rowStatutLabel(row.statut)}</Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{row.arriveeA ?? "—"}</td>
                          <td className="py-3 px-4 text-muted-foreground">{teacher}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile: cards ────────────────────────────────────────── */}
              <div className="md:hidden divide-y divide-border">
                {items.map(row => {
                  const teacher = row.enregistrePar ? `${row.enregistrePar.prenom} ${row.enregistrePar.nom}`.trim() : null
                  const enfant  = row.enfant ? `${row.enfant.prenom ?? ""} ${row.enfant.nom ?? ""}`.trim() : "—"
                  const dateLabel = row.date ? new Date(row.date + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "short", day: "2-digit", month: "short" }) : "—"
                  return (
                    <div key={row.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{enfant}</p>
                          <Badge className={`text-[11px] ${badgeVariant(row.statut)}`}>{rowStatutLabel(row.statut)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {dateLabel}
                          {row.enfant?.classe?.nom ? ` · ${row.enfant.classe.nom}` : ""}
                          {row.arriveeA ? ` · ${t("mobileArrival")} ${row.arriveeA}` : ""}
                          {teacher ? ` · ${teacher}` : ""}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination bottom */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" /> {t("prev")}
                  </Button>
                  <span className="text-xs text-muted-foreground">{t("pageOf", { page, totalPages })}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="flex items-center gap-1">
                    {t("next")} <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
