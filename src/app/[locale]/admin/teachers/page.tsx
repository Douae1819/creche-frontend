"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { apiClient } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";
import { useTranslations } from "next-intl";
import { withLocalePath } from "@/lib/i18n/locale-path";

interface TeachersPageProps {
  params: Promise<{ locale: Locale }>;
}

interface ClassAssignment {
  classeId: string;
  nom: string;
  niveau?: string | null;
}

interface TeacherItem {
  userId: string;
  enseignantId: string | null;
  fullName: string;
  email: string;
  statut: string;
  assignedClasses: ClassAssignment[];
}

interface ClassItem {
  id: string;
  nom: string;
  niveau?: string | null;
  enseignants?: Array<{
    enseignant: {
      id: string;
      utilisateur?: { id: string } | null;
    };
  }>;
}

export default function TeachersPage({ params }: TeachersPageProps) {
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const tt = useTranslations("admin.teachersManage");

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTeacher, setNewTeacher] = useState({ prenom: "", nom: "", email: "" });
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, classesRes] = await Promise.all([
        apiClient.listUsers({ role: "ENSEIGNANT", limit: 200 }),
        apiClient.listClasses(),
      ]);

      const usersPayload = usersRes.data;
      const usersAll: any[] = Array.isArray(usersPayload?.data)
        ? usersPayload.data
        : Array.isArray(usersPayload?.items)
        ? usersPayload.items
        : Array.isArray(usersPayload)
        ? usersPayload
        : [];

      const classesData: ClassItem[] = (() => {
        const p = classesRes.data;
        return Array.isArray(p?.data) ? p.data : Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : [];
      })();

      // Build teacher list with their assigned classes
      const teacherItems: TeacherItem[] = usersAll.map((u: any) => {
        // Find all classes where this teacher is assigned
        const assignedClasses: ClassAssignment[] = classesData
          .filter((c) =>
            Array.isArray(c.enseignants) &&
            c.enseignants.some(
              (ec) =>
                ec.enseignant?.utilisateur?.id === u.id ||
                (u.enseignantId && ec.enseignant?.id === u.enseignantId),
            ),
          )
          .map((c) => ({ classeId: c.id, nom: c.nom, niveau: c.niveau }));

        return {
          userId: u.id,
          enseignantId: u.enseignantId ?? null,
          fullName: `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || u.email,
          email: u.email,
          statut: u.statut,
          assignedClasses,
        };
      });

      setTeachers(teacherItems);
      setClasses(classesData);
    } catch (err) {
      console.error("[Admin/Teachers] Error loading data", err);
      setError(tt("loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTeacher = async () => {
    setCreateError(null);
    if (!newTeacher.email || !newTeacher.prenom || !newTeacher.nom) {
      setCreateError(tt("createRequired"));
      return;
    }
    try {
      setCreating(true);
      await apiClient.createUser({ ...newTeacher, role: "ENSEIGNANT" });
      setNewTeacher({ prenom: "", nom: "", email: "" });
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setCreateError(typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(" ") : tt("createError"));
    } finally {
      setCreating(false);
    }
  };

  const handleAssignClass = async (teacherUserId: string) => {
    if (!selectedClassId) return;
    try {
      setAssignLoading(true);
      await apiClient.assignTeacherToClass(teacherUserId, selectedClassId);
      setAssigningTeacherId(null);
      setSelectedClassId("");
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert(typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(" ") : tt("assignError"));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveClass = async (teacher: TeacherItem, classeId: string) => {
    if (!teacher.enseignantId) return;
    if (!confirm(tt("unassignConfirm"))) return;
    try {
      await apiClient.removeTeacherFromClass(classeId, teacher.enseignantId);
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert(typeof msg === "string" ? msg : tt("removeError"));
    }
  };

  const statutColor = (s: string) => {
    if (s === "ACTIVE") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s === "INVITED") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-gray-100 text-gray-500 border-gray-200";
  };

  const statutLabel = (s: string) => {
    if (s === "ACTIVE") return tt("statusActive");
    if (s === "INVITED") return tt("statusInvited");
    if (s === "DISABLED") return tt("statusDisabled");
    return s;
  };

  // Classes not yet assigned to this teacher
  const availableClasses = (teacher: TeacherItem) =>
    classes.filter((c) => !teacher.assignedClasses.some((a) => a.classeId === c.id));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{tt("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? tt("loadingShort") : tt("count", { count: teachers.length })}
              </p>
            </div>
            <Link href={withLocalePath(currentLocale, "/admin")}>
              <Button variant="outline">{tt("backDashboard")}</Button>
            </Link>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Add teacher form */}
          <Card className="p-5">
            <h2 className="text-base font-semibold mb-3">{tt("inviteTitle")}</h2>
            <p className="text-xs text-muted-foreground mb-3">
              {tt("inviteHint")}
            </p>
            {createError && <p className="text-xs text-destructive mb-2">{createError}</p>}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={tt("firstNamePh")}
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
                value={newTeacher.prenom}
                onChange={(e) => setNewTeacher((p) => ({ ...p, prenom: e.target.value }))}
              />
              <input
                type="text"
                placeholder={tt("lastNamePh")}
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
                value={newTeacher.nom}
                onChange={(e) => setNewTeacher((p) => ({ ...p, nom: e.target.value }))}
              />
              <input
                type="email"
                placeholder={tt("emailPh")}
                className="flex-[2] border border-border rounded-md px-3 py-2 text-sm bg-background"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher((p) => ({ ...p, email: e.target.value }))}
              />
              <Button onClick={handleCreateTeacher} disabled={creating} className="whitespace-nowrap">
                {creating ? tt("creating") : tt("invite")}
              </Button>
            </div>
          </Card>

          {/* Teachers list */}
          {loading ? (
            <p className="text-sm text-muted-foreground">{tt("loading")}</p>
          ) : teachers.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <p className="text-muted-foreground">{tt("empty")}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {teachers.map((teacher) => (
                <Card key={teacher.userId} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Identity */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                        {(teacher.fullName[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{teacher.fullName}</p>
                        <p className="text-xs text-muted-foreground">{teacher.email}</p>
                      </div>
                    </div>

                    {/* Statut + link to profile */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border uppercase ${statutColor(teacher.statut)}`}>
                        {statutLabel(teacher.statut)}
                      </span>
                      <Link href={withLocalePath(currentLocale, `/admin/utilisateurs/${teacher.userId}`)}>
                        <Button variant="outline" size="sm">{tt("profile")}</Button>
                      </Link>
                    </div>
                  </div>

                  {/* Assigned classes */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {tt("assignedClasses")}
                    </p>
                    <div className="flex flex-wrap gap-2 items-center min-h-[28px]">
                      {teacher.assignedClasses.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{tt("noClass")}</span>
                      ) : (
                        teacher.assignedClasses.map((ac) => (
                          <span
                            key={ac.classeId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700"
                          >
                            {ac.nom}
                            {ac.niveau && (
                              <span className="bg-blue-200 text-blue-800 px-1 py-0.5 rounded text-[10px]">
                                {ac.niveau}
                              </span>
                            )}
                            <button
                              onClick={() => handleRemoveClass(teacher, ac.classeId)}
                              className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
                              title={tt("removeTitle")}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Assign to class */}
                  <div className="mt-3">
                    {assigningTeacherId === teacher.userId ? (
                      <div className="flex gap-2 items-center">
                        <select
                          className="border border-border rounded-md px-2 py-1 text-sm bg-background flex-1 max-w-xs"
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                          <option value="">{tt("chooseClass")}</option>
                          {availableClasses(teacher).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}{c.niveau ? ` (${c.niveau})` : ""}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleAssignClass(teacher.userId)}
                          disabled={assignLoading || !selectedClassId}
                        >
                          {tt("assign")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setAssigningTeacherId(null); setSelectedClassId(""); }}
                        >
                          {tt("cancel")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setAssigningTeacherId(teacher.userId); setSelectedClassId(""); }}
                        disabled={availableClasses(teacher).length === 0}
                      >
                        {tt("assignToClass")}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
