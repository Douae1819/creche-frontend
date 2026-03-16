"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Baby, Calendar, FileText, CheckCircle2, AlertTriangle, Clock, Users, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Locale } from "@/lib/i18n/config";
import Link from "next/link";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { apiClient } from "@/lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Retourne le lundi de la semaine courante (00:00:00) */
function getMondayOfCurrentWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=dim, 1=lun…
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const t = useTranslations("admin.dashboard");

  const [loading, setLoading] = useState(true);
  const [pendingRegistrations, setPendingRegistrations] = useState<number>(0);
  const [totalChildren, setTotalChildren] = useState<number>(0);
  const [monthlyEvents, setMonthlyEvents] = useState<number>(0);
  const [presenceStats, setPresenceStats] = useState<any[]>([]);
  const [inscriptionStats, setInscriptionStats] = useState<any[]>([]);
  const [teacherAttendanceStatus, setTeacherAttendanceStatus] = useState<any[]>([]);
  const [presencePeriod, setPresencePeriod] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    const token = localStorage.getItem("token") || document.cookie.includes("token");
    if (!token) { router.push("/auth/login"); return; }
    void fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presencePeriod]);

  async function fetchStats() {
    try {
      setLoading(true);
      const now = new Date();
      const currentYear = now.getFullYear();

      // ── Fenêtre pour le graphe de présences ──────────────────────────────
      let presenceFrom: Date;
      const presenceTo = new Date(now);
      presenceTo.setHours(23, 59, 59, 999);

      if (presencePeriod === "day") {
        presenceFrom = new Date(now);
        presenceFrom.setHours(0, 0, 0, 0);
      } else if (presencePeriod === "week") {
        presenceFrom = getMondayOfCurrentWeek(); // lundi de la semaine courante
      } else {
        presenceFrom = new Date(currentYear, now.getMonth(), 1);
      }

      const oneMonthAhead = new Date(now);
      oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);

      const [
        inscriptionsRes,
        childrenRes,
        eventsRes,
        presencesRes,
        inscriptionStatsRes,
        teacherAttendanceRes,
      ] = await Promise.all([
        apiClient.listAdminInscriptions(),
        apiClient.listChildren(1, 1000),
        apiClient.listAdminEvents({ page: 1, pageSize: 100 }),
        apiClient.listDashboardPresences({
          from: presenceFrom.toISOString().slice(0, 10),
          to: presenceTo.toISOString().slice(0, 10),
        }),
        apiClient.listDashboardInscriptions({ year: currentYear }),
        apiClient.listDashboardTeacherAttendanceStatus(),
      ]);

      // ── Inscriptions : ne compter que CANDIDATURE + EN_COURS ─────────────
      const insPayload = inscriptionsRes.data;
      const insItems: any[] = Array.isArray(insPayload?.data)
        ? insPayload.data
        : Array.isArray(insPayload?.items)
        ? insPayload.items
        : Array.isArray(insPayload)
        ? insPayload
        : [];
      const pendingCount = insItems.filter(
        (i: any) => i.statut === "CANDIDATURE" || i.statut === "EN_COURS",
      ).length;
      setPendingRegistrations(pendingCount);

      // ── Enfants actifs ────────────────────────────────────────────────────
      const childrenPayload = childrenRes.data;
      const childrenItems: any[] = Array.isArray(childrenPayload?.data)
        ? childrenPayload.data
        : Array.isArray(childrenPayload?.items)
        ? childrenPayload.items
        : Array.isArray(childrenPayload)
        ? childrenPayload
        : [];
      setTotalChildren(childrenItems.length);

      // ── Événements ────────────────────────────────────────────────────────
      const eventsPayload = eventsRes.data;
      const eventsItems: any[] = Array.isArray(eventsPayload?.data)
        ? eventsPayload.data
        : Array.isArray(eventsPayload?.items)
        ? eventsPayload.items
        : Array.isArray(eventsPayload)
        ? eventsPayload
        : [];
      setMonthlyEvents(eventsItems.length);

      // ── Graphe présences ──────────────────────────────────────────────────
      const presPayload = presencesRes.data;
      setPresenceStats(Array.isArray(presPayload?.items) ? presPayload.items : []);

      // ── Graphe inscriptions ───────────────────────────────────────────────
      const inscStatsPayload = inscriptionStatsRes.data;
      setInscriptionStats(Array.isArray(inscStatsPayload?.items) ? inscStatsPayload.items : []);

      // ── Statut appel par enseignant ───────────────────────────────────────
      const teacherPayload = teacherAttendanceRes.data;
      setTeacherAttendanceStatus(Array.isArray(teacherPayload?.items) ? teacherPayload.items : []);
    } catch (err) {
      console.error("[Admin/Dashboard] Error loading stats", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  // ── Calculs présence du jour ───────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPresence = presenceStats.find((d: any) => d.date === todayStr) ?? null;
  const todayRecorded = todayPresence
    ? (todayPresence.present || 0) + (todayPresence.absent || 0) + (todayPresence.justifie || 0)
    : 0;

  type PresenceStatus = "complete" | "partial" | "none";
  const presenceStatus: PresenceStatus =
    todayRecorded >= totalChildren && totalChildren > 0
      ? "complete"
      : todayRecorded > 0
      ? "partial"
      : "none";

  const presenceStatusConfig = {
    complete: {
      label: "Appel complet",
      desc: `Tous les enfants ont été pointés aujourd'hui (${todayRecorded}/${totalChildren}).`,
      bg: "bg-emerald-500",
      icon: <CheckCircle2 className="w-5 h-5" />,
      badge: "OK",
    },
    partial: {
      label: "Appel partiel",
      desc: `${todayRecorded} enfant(s) pointé(s) sur ${totalChildren}. Certains enseignants n'ont pas encore fait l'appel.`,
      bg: "bg-amber-400",
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: `${todayRecorded}/${totalChildren}`,
    },
    none: {
      label: "Appel non effectué",
      desc: "Aucune présence enregistrée pour aujourd'hui. Vérifiez que les enseignants ont fait l'appel.",
      bg: "bg-rose-500",
      icon: <Clock className="w-5 h-5" />,
      badge: "!",
    },
  } satisfies Record<PresenceStatus, object>;

  const cfg = presenceStatusConfig[presenceStatus];

  // ── Graphe ────────────────────────────────────────────────────────────────
  const maxPresenceTotal =
    presenceStats.length > 0
      ? Math.max(...presenceStats.map((d: any) => (d.present || 0) + (d.absent || 0) + (d.justifie || 0)))
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <div className="flex-1 md:ml-64 flex flex-col pt-16 md:pt-0">
        {/* Header */}
        <header className="bg-white border-b border-border/70 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2 min-w-0">
                <Baby className="h-7 w-7 text-primary flex-shrink-0" />
                <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{t("title")}</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 w-full">

          {/* ── Présence du jour ─────────────────────────────────────────── */}
          <Card className="p-4 border border-gray-200 bg-white rounded-xl shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Présence du jour</p>
                <p className="text-xs text-gray-600 mt-1">{(cfg as any).desc}</p>
              </div>
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold flex-shrink-0 ${(cfg as any).bg}`}
              >
                {(cfg as any).icon}
                <span>{(cfg as any).badge}</span>
              </div>
            </div>
          </Card>

          {/* ── Stat cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Enfants */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Baby className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t("totalChildren")}</p>
                <p className="text-2xl font-bold text-gray-900">{totalChildren}</p>
              </div>
            </Card>

            {/* Inscriptions en attente */}
            <Link href={`/${currentLocale}/admin/inscriptions`} className="block">
              <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{t("pendingRegistrations")}</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingRegistrations}</p>
                </div>
                {pendingRegistrations > 0 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </Card>
            </Link>

            {/* Événements */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t("monthlyEvents")}</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyEvents}</p>
              </div>
            </Card>
          </div>

          {/* ── Appel du jour par enseignant ─────────────────────────────── */}
          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Appel du jour par enseignant
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              <Link href={`/${currentLocale}/admin/presences`}>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  Historique <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            {teacherAttendanceStatus.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-6 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun enseignant n'a encore fait l'appel aujourd'hui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teacherAttendanceStatus.map((item: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-900">
                        {item.enseignantPrenom} {item.enseignantNom}
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.completed
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {item.completed ? "Complet" : `${item.totalEnfantsAvecPresence}/${item.totalEnfants}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(item.classes as any[]).map((cls: any) => (
                        <span
                          key={cls.classeId}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                            cls.completed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {cls.completed ? "✓" : "⚠"} {cls.classeNom} — {cls.enfantsAvecPresence}/{cls.totalEnfants}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Charts ───────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Graphe présences */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl px-5 py-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{t("presenceChartTitle")}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Présences des enfants sur la période.</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {(["day", "week", "month"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPresencePeriod(p)}
                      className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                        presencePeriod === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {p === "day" ? "Jour" : p === "week" ? "Semaine" : "Mois"}
                    </button>
                  ))}
                </div>
              </div>

              {presenceStats.length > 0 && maxPresenceTotal > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {presenceStats.map((d: any) => {
                    const total = (d.present || 0) + (d.absent || 0) + (d.justifie || 0);
                    const presentPct = total > 0 ? Math.round(((d.present || 0) / total) * 100) : 0;
                    const isToday = d.date === todayStr;
                    return (
                      <div
                        key={d.date}
                        className={`text-xs border-b pb-2 last:border-0 ${isToday ? "text-primary" : "text-muted-foreground"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                            {new Date(d.date).toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                            {isToday && (
                              <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                Auj.
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-600">✓ {d.present || 0}</span>
                            <span className="text-[10px] text-red-500">✗ {d.absent || 0}</span>
                            <span className="text-[10px] text-blue-500">~ {d.justifie || 0}</span>
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                              {total}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${presentPct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 w-12 text-right">{presentPct}% présents</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                  <p className="text-sm text-gray-500">{t("presenceChartEmpty")}</p>
                </div>
              )}
            </Card>

            {/* Graphe inscriptions */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl px-5 py-4">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-gray-900">{t("inscriptionChartTitle")}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Dossiers d'inscription reçus par mois.</p>
              </div>
              {inscriptionStats.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {inscriptionStats.map((m: any) => (
                    <div key={m.month} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{m.month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${Math.round((m.total / Math.max(...inscriptionStats.map((x: any) => x.total || 0), 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-muted-foreground w-8 text-right">{m.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                  <p className="text-sm text-gray-500">{t("inscriptionChartEmpty")}</p>
                </div>
              )}
            </Card>
          </section>

          {/* ── Raccourcis ───────────────────────────────────────────────── */}
          {pendingRegistrations > 0 && (
            <Card className="border border-amber-200 bg-amber-50 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {pendingRegistrations} inscription{pendingRegistrations > 1 ? "s" : ""} en attente de traitement
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">Des dossiers nécessitent votre validation.</p>
                </div>
              </div>
              <Link href={`/${currentLocale}/admin/inscriptions`}>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0 gap-1 text-xs">
                  Traiter <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </Card>
          )}

        </main>
      </div>
    </div>
  );
}
