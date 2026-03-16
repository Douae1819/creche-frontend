"use client";

import { useState, useEffect, use } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Pencil, Trash2, CheckCircle2, X } from "lucide-react";
import { apiClient } from "@/lib/api";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { Locale } from "@/lib/i18n/config";

// ─── types ────────────────────────────────────────────────────────────────────
interface DayMenu {
  id?: string | null;
  collationMatin: string;
  repas: string;
  gouter: string;
  statut?: "Brouillon" | "Publie";
}

type WeekData = Record<string, DayMenu>;

interface DayModalState {
  date: string;
  collationMatin: string;
  repas: string;
  gouter: string;
}

// ─── constants ────────────────────────────────────────────────────────────────
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;

const MEAL_ROWS = [
  { key: "collationMatin" as const, label: "🍎 Collation du matin",  placeholder: "Ex : Yaourt, fruits frais" },
  { key: "repas"          as const, label: "🍽️ Repas (déjeuner)",    placeholder: "Ex : Poulet rôti, riz"     },
  { key: "gouter"         as const, label: "🧃 Goûter",              placeholder: "Ex : Compote, lait"        },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
// Use local date components to avoid UTC offset shifting the date (e.g. UTC+1 midnight → prev day in UTC)
const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Parse an ISO date string (YYYY-MM-DD) as local midnight (not UTC midnight)
const parseLocalDate = (iso: string): Date => {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d);
};

const getMondayOf = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};

const getWeekDates = (monday: Date): string[] =>
  Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISO(d);
  });

const formatWeekLabel = (monday: Date) => {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return `${monday.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} – ${friday.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
};

// ─── component ────────────────────────────────────────────────────────────────
export default function MenusPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale: currentLocale } = use(params);

  const [monday,   setMonday]   = useState<Date>(() => getMondayOf(new Date()));
  const [allMenus, setAllMenus] = useState<WeekData>({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Day-level modal (edit all 3 fields at once)
  const [dayModal,      setDayModal]      = useState<DayModalState | null>(null);
  const [modalPublish,  setModalPublish]  = useState(true);  // publish on save by default
  const [saving,        setSaving]        = useState(false);
  const [modalErr,      setModalErr]      = useState<string | null>(null);
  const [publishingWeek, setPublishingWeek] = useState(false);

  // Week-fill modal
  const [weekModal, setWeekModal] = useState(false);
  const [weekForm,  setWeekForm]  = useState({ collationMatin: "", repas: "", gouter: "" });
  const [weekSaving, setWeekSaving] = useState(false);
  const [weekErr,  setWeekErr]    = useState<string | null>(null);

  // Confirm delete modal
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchMenus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.listMenus(1, 200);
      const rawItems: any[] = response.data?.data ?? response.data?.items ?? [];
      const mapped: WeekData = {};
      rawItems.forEach((m: any) => {
        const iso = m.date?.slice(0, 10);
        if (iso) mapped[iso] = { id: m.id, collationMatin: m.collationMatin ?? "", repas: m.repas ?? "", gouter: m.gouter ?? "", statut: m.statut };
      });
      setAllMenus(mapped);
    } catch {
      setError("Erreur lors du chargement des menus.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenus(); }, []);

  // ── week navigation ────────────────────────────────────────────────────────
  const prevWeek = () => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d); };
  const nextWeek = () => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d); };
  const goToday  = () => setMonday(getMondayOf(new Date()));

  // ── modal ──────────────────────────────────────────────────────────────────
  const openModal = (date: string) => {
    const m = allMenus[date];
    setDayModal({ date, collationMatin: m?.collationMatin ?? "", repas: m?.repas ?? "", gouter: m?.gouter ?? "" });
    setModalPublish(m?.statut !== "Publie"); // default: publish if not already published
    setModalErr(null);
  };

  const closeModal = () => { setDayModal(null); setModalErr(null); };

  const saveModal = async () => {
    if (!dayModal) return;
    const { date, collationMatin, repas, gouter } = dayModal;
    if (!collationMatin.trim() && !repas.trim() && !gouter.trim()) {
      setModalErr("Veuillez renseigner au moins un champ.");
      return;
    }
    setSaving(true);
    setModalErr(null);
    try {
      const existing = allMenus[date];
      let saved: any;
      if (existing?.id) {
        const res = await apiClient.updateMenu(existing.id, { collationMatin, repas, gouter } as any);
        saved = res.data;
      } else {
        const res = await apiClient.createMenu({ date, collationMatin, repas, gouter } as any);
        saved = res.data;
      }
      // Auto-publish if checkbox checked (and menu is not already published)
      let finalStatut = saved?.statut ?? existing?.statut ?? "Brouillon";
      if (modalPublish && finalStatut !== "Publie" && saved?.id) {
        try { await apiClient.publishMenu(saved.id); finalStatut = "Publie"; } catch {}
      }
      setAllMenus(prev => ({
        ...prev,
        [date]: {
          id:             saved?.id            ?? existing?.id,
          collationMatin: saved?.collationMatin ?? collationMatin,
          repas:          saved?.repas          ?? repas,
          gouter:         saved?.gouter         ?? gouter,
          statut:         finalStatut as "Brouillon" | "Publie",
        },
      }));
      closeModal();
    } catch {
      setModalErr("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  // ── publish / delete ───────────────────────────────────────────────────────
  const confirmAndDeleteWeek = () => {
    const daysWithMenus = weekDates.filter(d => allMenus[d]?.id);
    if (!daysWithMenus.length) return;
    setConfirmDelete(true);
  };

  const handleDeleteWeek = async () => {
    const daysWithMenus = weekDates.filter(d => allMenus[d]?.id);
    setDeleting(true);
    try {
      for (const date of daysWithMenus) {
        const menu = allMenus[date];
        if (!menu?.id) continue;
        if (menu.statut === "Publie") await apiClient.updateMenu(menu.id, { statut: "Brouillon" } as any);
        await apiClient.deleteMenu(menu.id);
      }
      setAllMenus(prev => {
        const n = { ...prev };
        daysWithMenus.forEach(d => delete n[d]);
        return n;
      });
      setConfirmDelete(false);
    } catch {
      alert("Erreur lors de la suppression de la semaine.");
    } finally {
      setDeleting(false);
    }
  };
  const saveWeekModal = async () => {
    const { collationMatin, repas, gouter } = weekForm;
    if (!collationMatin.trim() && !repas.trim() && !gouter.trim()) {
      setWeekErr("Veuillez renseigner au moins un champ.");
      return;
    }
    setWeekSaving(true);
    setWeekErr(null);
    try {
      for (const date of weekDates) {
        const existing = allMenus[date];
        if (existing?.id) continue; // skip days that already have a menu
        const res = await apiClient.createMenu({ date, collationMatin, repas, gouter } as any);
        const saved = res.data;
        let statut: "Brouillon" | "Publie" = "Brouillon";
        if (saved?.id) {
          try { await apiClient.publishMenu(saved.id); statut = "Publie"; } catch {}
        }
        setAllMenus(prev => ({
          ...prev,
          [date]: { id: saved?.id, collationMatin, repas, gouter, statut },
        }));
      }
      setWeekModal(false);
      setWeekForm({ collationMatin: "", repas: "", gouter: "" });
    } catch {
      setWeekErr("Erreur lors de la création des menus.");
    } finally {
      setWeekSaving(false);
    }
  };

  const handlePublish = async (date: string) => {
    const menu = allMenus[date];
    if (!menu?.id || menu.statut === "Publie") return;
    try {
      await apiClient.publishMenu(menu.id);
      setAllMenus(prev => ({ ...prev, [date]: { ...prev[date], statut: "Publie" } }));
    } catch {
      alert("Erreur lors de la publication.");
    }
  };

  const handlePublishWeek = async () => {
    const drafts = weekDates.filter(d => allMenus[d]?.id && allMenus[d]?.statut !== "Publie");
    if (!drafts.length) return;
    setPublishingWeek(true);
    try {
      for (const date of drafts) {
        const menu = allMenus[date];
        if (!menu?.id) continue;
        await apiClient.publishMenu(menu.id);
        setAllMenus(prev => ({ ...prev, [date]: { ...prev[date], statut: "Publie" } }));
      }
    } catch { alert("Erreur lors de la publication de la semaine."); }
    finally { setPublishingWeek(false); }
  };



  // ── render ─────────────────────────────────────────────────────────────────
  const weekDates = getWeekDates(monday);
  const todayISO  = toISO(new Date());

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6 max-w-5xl mx-auto">

          {/* ── Header ── */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Menus de la semaine</h1>

            {/* Navigation row */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevWeek} className="h-9 w-9 p-0"><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm font-medium text-foreground text-center flex-1 sm:flex-none sm:min-w-[200px]">{formatWeekLabel(monday)}</span>
              <Button variant="outline" size="sm" onClick={nextWeek} className="h-9 w-9 p-0"><ChevronRight className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={goToday} className="hidden sm:inline-flex">Aujourd&apos;hui</Button>
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday} className="sm:hidden">Aujourd&apos;hui</Button>
              <Button
                size="sm"
                onClick={() => { setWeekModal(true); setWeekErr(null); setWeekForm({ collationMatin: "", repas: "", gouter: "" }); }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <span className="hidden sm:inline">+ Ajouter menu semaine</span>
                <span className="sm:hidden">+ Semaine</span>
              </Button>
              {weekDates.some(d => allMenus[d]?.id && allMenus[d]?.statut !== "Publie") && (
                <Button
                  size="sm"
                  onClick={handlePublishWeek}
                  disabled={publishingWeek}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {publishingWeek ? "Publication…" : "Publier la semaine"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={confirmAndDeleteWeek}
                disabled={weekDates.every(d => !allMenus[d]?.id)}
                className="text-destructive border-destructive/40 hover:bg-destructive/10 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span className="hidden sm:inline">Supprimer la semaine</span>
                <span className="sm:hidden">Supprimer</span>
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">{error}</div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement des menus…</p>
          ) : (
            <>
              {/* ── Mobile: day cards ─────────────────────────────── */}
              <div className="md:hidden space-y-3">
                {weekDates.map((iso, idx) => {
                  const d          = parseLocalDate(iso);
                  const isToday    = iso === todayISO;
                  const menu       = allMenus[iso];
                  const isPublished = menu?.statut === "Publie";
                  return (
                    <div key={iso} className={`rounded-xl border bg-white overflow-hidden shadow-sm ${isToday ? "border-primary" : "border-border"}`}>
                      {/* Day header */}
                      <div className={`flex items-start justify-between gap-2 px-4 py-3 ${isToday ? "bg-primary/5" : "bg-muted/30"}`}>
                        <div className="flex-shrink-0">
                          <p className={`font-bold text-sm ${isToday ? "text-primary" : "text-foreground"}`}>{JOURS[idx]}</p>
                          <p className="text-xs text-muted-foreground">{d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          {isPublished ? (
                            <>
                              <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200 font-medium whitespace-nowrap">✓ Publié</span>
                              <button onClick={() => openModal(iso)} className="inline-flex items-center gap-1 text-[11px] bg-sky-100 text-sky-700 px-2 py-1 rounded-full border border-sky-200 active:opacity-70 whitespace-nowrap"><Pencil className="w-3 h-3" /> Modifier</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => openModal(iso)} className="inline-flex items-center gap-1 text-[11px] bg-sky-100 text-sky-700 px-2 py-1 rounded-full border border-sky-200 active:opacity-70 whitespace-nowrap">
                                <Pencil className="w-3 h-3" /> {menu?.id ? "Modifier" : "Ajouter"}
                              </button>
                              {menu?.id && (
                                <button onClick={() => handlePublish(iso)} className="text-[11px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200 active:opacity-70 whitespace-nowrap">Publier</button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {/* Meal rows */}
                      <div className="divide-y divide-border px-4">
                        {MEAL_ROWS.map(row => (
                          <div key={row.key} className="py-2.5 flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground flex-shrink-0 pt-0.5">{row.label}</span>
                            <span className="text-sm text-foreground break-words min-w-0">{menu?.[row.key] || <span className="text-muted-foreground/40 italic text-xs">—</span>}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop: weekly table ──────────────────────────── */}
              <Card className="hidden md:block p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-4 py-3 text-left font-semibold text-foreground w-44 border-r border-border">Repas</th>
                        {weekDates.map((iso, idx) => {
                          const isToday    = iso === todayISO;
                          const menu       = allMenus[iso];
                          const isPublished = menu?.statut === "Publie";
                          return (
                            <th key={iso} className={`px-3 py-3 text-center font-semibold min-w-[155px] border-r border-border last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}>
                              <div className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{JOURS[idx]}</div>
                              <div className="text-xs text-muted-foreground font-normal mb-1">
                                {parseLocalDate(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                              </div>
                              {/* Actions */}
                              <div className="flex justify-center items-center gap-1 mt-1">
                                {isPublished ? (
                                  <div className="flex justify-center items-center gap-1">
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">Publié ✓</span>
                                    <button onClick={() => openModal(iso)} className="text-[10px] inline-flex items-center gap-0.5 bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full border border-sky-200 hover:bg-sky-200 transition-colors"><Pencil className="w-2.5 h-2.5" /> Mod.</button>
                                    </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => openModal(iso)}
                                      className="text-[10px] inline-flex items-center gap-0.5 bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full border border-sky-200 hover:bg-sky-200 transition-colors"
                                      title="Modifier ce jour"
                                    >
                                      <Pencil className="w-2.5 h-2.5" /> Modifier
                                    </button>
                                    {menu?.id && (
                                      <>
                                        <button onClick={() => handlePublish(iso)} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200 hover:bg-amber-200 transition-colors">Publier</button>
                                        </>
                                    )}
                                  </>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {MEAL_ROWS.map((row, rowIdx) => (
                        <tr key={row.key} className={`border-b border-border last:border-b-0 ${rowIdx % 2 === 0 ? "bg-white" : "bg-muted/10"}`}>
                          <td className="px-4 py-3 font-semibold text-sm text-foreground border-r border-border">
                            {row.label}
                          </td>
                          {weekDates.map(iso => {
                            const menu       = allMenus[iso];
                            const value      = menu?.[row.key] ?? "";
                            const isPublished = menu?.statut === "Publie";
                            return (
                              <td
                                key={iso}
                                onClick={() => openModal(iso)}
                                title="Cliquer pour modifier le menu du jour"
                                className="px-3 py-3 border-r border-border last:border-r-0 text-xs align-middle min-w-[155px] cursor-pointer hover:bg-sky-50/60 transition-colors"
                              >
                                {value ? (
                                  <span className="text-foreground">{value}</span>
                                ) : (
                                  <span className="text-muted-foreground/30">Cliquer pour saisir</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── Day Edit Modal ────────────────────────────────────────────────────── */}
      {dayModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div>
                <h2 className="font-bold text-base text-foreground">
                  {JOURS[weekDates.indexOf(dayModal.date)]} —{" "}
                  {parseLocalDate(dayModal.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Saisissez les 3 repas puis cliquez sur Enregistrer.</p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {MEAL_ROWS.map(row => (
                <div key={row.key}>
                  <label className="block text-xs font-semibold text-foreground mb-1">{row.label}</label>
                  <Input
                    value={dayModal[row.key]}
                    onChange={e => setDayModal(prev => prev ? { ...prev, [row.key]: e.target.value } : prev)}
                    placeholder={row.placeholder}
                    className="h-10 text-sm"
                    onKeyDown={e => { if (e.key === "Enter") saveModal(); }}
                  />
                </div>
              ))}

              {/* Publish toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modalPublish}
                  onChange={e => setModalPublish(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Publier immédiatement <span className="text-xs text-gray-400 font-normal">(visible aux parents)</span>
                </span>
              </label>

              {modalErr && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{modalErr}</p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <Button variant="outline" onClick={closeModal} disabled={saving}>Annuler</Button>
              <Button onClick={saveModal} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ──────────────────────────────────────────────── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Supprimer la semaine ?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vous allez supprimer tous les menus de la semaine du{" "}
                    <span className="font-medium text-foreground">{formatWeekLabel(monday)}</span>.
                    {weekDates.some(d => allMenus[d]?.statut === "Publie") && (
                      <span className="block mt-1.5 text-amber-700 font-medium">
                        ⚠️ Certains menus sont déjà publiés et visibles aux parents.
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Cette action est irréversible.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Annuler
              </Button>
              <Button
                onClick={handleDeleteWeek}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                {deleting ? "Suppression…" : "Oui, supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Week Fill Modal ─────────────────────────────────────────────────────── */}
      {weekModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div>
                <h2 className="font-bold text-base text-foreground">Ajouter menu pour la semaine</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{formatWeekLabel(monday)} — appliqué aux jours vides uniquement</p>
              </div>
              <button onClick={() => setWeekModal(false)} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {MEAL_ROWS.map(row => (
                <div key={row.key}>
                  <label className="block text-xs font-semibold text-foreground mb-1">{row.label}</label>
                  <Input
                    value={weekForm[row.key]}
                    onChange={e => setWeekForm(prev => ({ ...prev, [row.key]: e.target.value }))}
                    placeholder={row.placeholder}
                    className="h-10 text-sm"
                  />
                </div>
              ))}
              {weekErr && <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{weekErr}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <Button variant="outline" onClick={() => setWeekModal(false)} disabled={weekSaving}>Annuler</Button>
              <Button onClick={saveWeekModal} disabled={weekSaving} className="bg-primary text-primary-foreground">
                {weekSaving ? "Création…" : "Créer les menus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
