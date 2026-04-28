"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Edit2, X, Archive } from "lucide-react";
import { useTranslations } from "next-intl";
import { Locale } from "@/lib/i18n/config";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { apiClient } from "@/lib/api";

type EnseignantClasseItem = {
  enseignant: {
    utilisateur?: {
      id: string;
      prenom: string;
      nom: string;
      email?: string;
    } | null;
  } | null;
};

type ClasseItem = {
  id: string;
  nom: string;
  enseignants?: EnseignantClasseItem[];
};

type EnfantItem = {
  id: string;
  name: string;
  prenom?: string;
  nom?: string;
  genre?: string;
  remarques?: string;
  group: string;
  classId?: string;
  teacher: string;
  parent: string;
  todayStatus: string;
  todayStatusCode?: string;
  presences?: Array<{
    id: string;
    date: string;
    statut: string;
  }>;
};

/** Présence du jour : même clé UTC que le backend (après fix UTC) ; repli si l’API ne renvoie qu’un ligne « jour courant ». */
function resolveTodayPresence(presences: any[] | undefined, todayUtc: string): any | undefined {
  if (!presences?.length) return undefined;
  const byIso = presences.find((presence: any) => {
    try {
      if (!presence.date) return false;
      const dateObj = new Date(presence.date);
      if (isNaN(dateObj.getTime())) return false;
      return dateObj.toISOString().split("T")[0] === todayUtc;
    } catch {
      return false;
    }
  });
  if (byIso) return byIso;
  if (presences.length === 1) return presences[0];
  return undefined;
}

export default function EnfantsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const t = useTranslations('admin.children');
  const [search, setSearch] = useState("");
  const [children, setChildren] = useState<EnfantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [families, setFamilies] = useState<{ id: string; emailPrincipal: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnfantItem | null>(null);
  const [editForm, setEditForm] = useState({ prenom: "", nom: "", genre: "", classeId: "", remarques: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    familleId: "",
    dateNaissance: "",
  });
  
  // Date d'aujourd'hui pour filtrer les présences
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let cancelled = false;

    async function fetchChildren() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.listChildren(1, 50);
        const items = res.data.items ?? res.data.data ?? [];

        const mapped: EnfantItem[] = items.map((enfant: any) => {
          const fullName = `${enfant.prenom} ${enfant.nom}`.trim();
          const group = enfant.classe?.nom ?? "—";
          const tuteurs = enfant.famille?.tuteurs ?? [];
          const principal = tuteurs.find((t: any) => t.principal) ?? tuteurs[0];
          const parentName = principal
            ? `${principal.prenom ?? ""} ${principal.nom ?? ""}`.trim() || principal.telephone || "—"
            : "—";

          // Trouver la présence pour aujourd'hui
          let todayStatus = "Non défini";
          let todayStatusCode: string | undefined = undefined;
          
          // Si l'enfant a des présences, chercher celle d'aujourd'hui
          if (enfant.presences && Array.isArray(enfant.presences)) {
            const todayPresence = resolveTodayPresence(enfant.presences, today);
            if (todayPresence) {
              if (todayPresence.statut === "Present") {
                todayStatus = "Présent";
                todayStatusCode = "Present";
              } else if (todayPresence.statut === "Absent") {
                todayStatus = "Absent";
                todayStatusCode = "Absent";
              } else if (todayPresence.statut === "Justifie") {
                todayStatus = "Justifié";
                todayStatusCode = "Justifie";
              }
            }
          }

          return {
            id: enfant.id,
            prenom: enfant.prenom ?? "",
            nom: enfant.nom ?? "",
            name: fullName,
            group,
            classId: enfant.classe?.id,
            genre: enfant.genre ?? undefined,
            remarques: enfant.remarques ?? undefined,
            teacher: "—",
            parent: parentName,
            todayStatus,
            todayStatusCode,
            presences: enfant.presences?.map((presence: any) => {
              try {
                if (!presence.date) return null;
                const dateObj = new Date(presence.date);
                if (isNaN(dateObj.getTime())) return null;
                return {
                  id: presence.id,
                  date: dateObj.toISOString().split('T')[0],
                  statut: presence.statut
                };
              } catch (e) {
                console.warn('Invalid date in presence:', presence.date, e);
                return null;
              }
            }).filter((p: any) => p !== null) || []
          } as EnfantItem;
        });

        if (!cancelled) {
          setChildren(mapped);
        }
      } catch (err) {
        console.error("[Admin/Enfants] Error loading children", err);
        if (!cancelled) {
          setError("Impossible de charger les enfants.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchChildren();

    // Charger les classes pour le select de groupe
    async function fetchClasses() {
      try {
        const res = await apiClient.listClasses();
        const classesData: ClasseItem[] = res.data?.items ?? res.data ?? [];
        setClasses(classesData);

        // Dériver la liste des enseignants uniques à partir des classes
        const teacherMap = new Map<string, string>();
        for (const cl of classesData) {
          if (!cl.enseignants) continue;
          for (const ec of cl.enseignants) {
            const u = ec.enseignant?.utilisateur;
            if (u && u.id && !teacherMap.has(u.id)) {
              const fullName = `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || u.email || u.id;
              teacherMap.set(u.id, fullName);
            }
          }
        }
        setTeachers(Array.from(teacherMap.entries()).map(([id, name]) => ({ id, name })));
      } catch (err) {
        console.error("[Admin/Enfants] Error loading classes", err);
      }
    }

    fetchClasses();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeClass = async (id: string, classId: string) => {
    try {
      await apiClient.updateChild(id, {
        classe: classId ? { connect: { id: classId } } : { disconnect: true },
      });
      setChildren((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                classId,
                group: classes.find((cl) => cl.id === classId)?.nom ?? "—",
              }
            : c,
        ),
      );
    } catch (err) {
      console.error("[Admin/Enfants] Error updating class", err);
      alert("Erreur lors de la mise à jour de la classe.");
    }
  };

  const handleChangeStatus = async (id: string, rawStatut: string) => {
    try {
      const allowed = new Set(["Present", "Absent", "Justifie"]);
      const statut = allowed.has(rawStatut)
        ? (rawStatut as "Present" | "Absent" | "Justifie")
        : null;

      await apiClient.updateChildStatus(id, statut);

      setChildren((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;

          const updatedPresences = [...(c.presences || [])];
          const todayIndex = updatedPresences.findIndex((p) => p.date === today);

          if (!statut) {
            if (todayIndex !== -1) {
              updatedPresences.splice(todayIndex, 1);
            }
            return {
              ...c,
              todayStatusCode: undefined,
              todayStatus: "Non défini",
              presences: updatedPresences,
            };
          }

          if (todayIndex !== -1) {
            updatedPresences[todayIndex] = {
              ...updatedPresences[todayIndex],
              statut,
            };
          } else {
            updatedPresences.push({
              id: `temp-${Date.now()}`,
              date: today,
              statut,
            });
          }

          const todayStatusLabel =
            statut === "Present"
              ? "Présent"
              : statut === "Absent"
                ? "Absent"
                : "Justifié";

          return {
            ...c,
            todayStatusCode: statut,
            todayStatus: todayStatusLabel,
            presences: updatedPresences,
          };
        }),
      );
    } catch (err: any) {
      const detail =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur lors de la mise à jour du statut.";
      console.error("[Admin/Enfants] Error updating status", err);
      alert(String(detail));
    }
  };
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.familleId || !formData.dateNaissance) {
        alert("Veuillez choisir une famille et une date de naissance.");
        return;
      }

      await apiClient.createChild({
        prenom: formData.prenom,
        nom: formData.nom,
        famille: {
          connect: { id: formData.familleId },
        },
        dateNaissance: new Date(formData.dateNaissance).toISOString(),
      });

      // Après création/mise à jour, on recharge la liste
      const res = await apiClient.listChildren(1, 50);
      const items = res.data.items ?? res.data.data ?? [];
      const mapped: EnfantItem[] = items.map((enfant: any) => {
        const fullName = `${enfant.prenom} ${enfant.nom}`.trim();
        const group = enfant.classe?.nom ?? "—";
        const tuteurs = enfant.famille?.tuteurs ?? [];
        const principal = tuteurs.find((t: any) => t.principal) ?? tuteurs[0];
        const parentName = principal
          ? `${principal.prenom ?? ""} ${principal.nom ?? ""}`.trim() || principal.telephone || "—"
          : "—";

        // Trouver la présence pour aujourd'hui
        let todayStatus = "Non défini";
        
        if (enfant.presences && Array.isArray(enfant.presences)) {
          const todayPresence = resolveTodayPresence(enfant.presences, today);
          if (todayPresence) {
            if (todayPresence.statut === "Present") todayStatus = "Présent";
            else if (todayPresence.statut === "Absent") todayStatus = "Absent";
            else if (todayPresence.statut === "Justifie") todayStatus = "Justifié";
          }
        }

        return {
          id: enfant.id,
          name: fullName,
          group,
          teacher: "—",
          parent: parentName,
          todayStatus,
          presences: enfant.presences?.map((presence: any) => {
            try {
              if (!presence.date) return null;
              const dateObj = new Date(presence.date);
              if (isNaN(dateObj.getTime())) return null;
              return {
                id: presence.id,
                date: dateObj.toISOString().split('T')[0],
                statut: presence.statut
              };
            } catch (e) {
              console.warn('Invalid date in presence:', presence.date, e);
              return null;
            }
          }).filter((p: any) => p !== null) || []
        } as EnfantItem;
      });
      setChildren(mapped);

      setFormData({ prenom: "", nom: "", familleId: "", dateNaissance: "" });
      setModalOpen(false);
    } catch (err) {
      console.error("[Admin/Enfants] Error saving child", err);
      alert("Erreur lors de l'enregistrement de l'enfant.");
    }
  };


  const handleEditOpen = (child: EnfantItem) => {
    setEditTarget(child);
    setEditForm({ prenom: child.prenom ?? "", nom: child.nom ?? "", genre: child.genre ?? "", classeId: child.classId ?? "", remarques: child.remarques ?? "" });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    try {
      setEditSaving(true);
      await apiClient.updateChild(editTarget.id, {
        prenom: editForm.prenom,
        nom: editForm.nom,
        genre: editForm.genre || undefined,
        classeId: editForm.classeId || undefined,
        remarques: editForm.remarques || undefined,
      });
      setChildren((prev) =>
        prev.map((c) =>
          c.id === editTarget.id
            ? { ...c, prenom: editForm.prenom, nom: editForm.nom, name: editForm.prenom + " " + editForm.nom, genre: editForm.genre, classeId: editForm.classeId, remarques: editForm.remarques, group: classes.find((cl) => cl.id === editForm.classeId)?.nom ?? c.group }
            : c
        )
      );
      setEditModalOpen(false);
      setEditTarget(null);
    } catch (err) {
      console.error("[Admin/Enfants] Error editing child", err);
      alert("Erreur lors de la modification.");
    } finally {
      setEditSaving(false);
    }
  };
  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await apiClient.deleteChild(archiveTarget.id);
      setChildren((prev) => prev.filter((c) => c.id !== archiveTarget.id));
    } catch (err) {
      console.error("[Admin/Enfants] Error archiving child", err);
      alert("Erreur lors de l'archivage de l'enfant.");
    } finally {
      setArchiveTarget(null);
    }
  };

  const filtered = children.filter((child) => {
    const q = search.toLowerCase();
    if (q && !child.name.toLowerCase().includes(q)) {
      return false;
    }

    if (selectedClassId && child.classId !== selectedClassId) {
      return false;
    }

    if (selectedTeacherId) {
      const childClasse = classes.find((cl) => cl.id === child.classId);
      if (!childClasse || !childClasse.enseignants || childClasse.enseignants.length === 0) {
        return false;
      }
      const taughtBySelected = childClasse.enseignants.some((ec) => {
        const u = ec.enseignant?.utilisateur;
        return u?.id === selectedTeacherId;
      });
      if (!taughtBySelected) {
        return false;
      }
    }

    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <SidebarNew currentLocale={currentLocale} />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {loading ? 'Chargement…' : `${children.length} enfant${children.length > 1 ? 's' : ''}`} · {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <Button
              onClick={async () => {
                try {
                  const res = await apiClient.listChildFamilies();
                  setFamilies(res.data ?? []);
                  setModalOpen(true);
                } catch (err) {
                  console.error('[Admin/Enfants] Error loading families', err);
                  alert('Impossible de charger les familles.');
                }
              }}
            >
              + Ajouter
            </Button>
          </div>

          <Card className="p-6">
            {error && (
              <p className="mb-4 text-sm text-destructive">{error}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="border border-input rounded-md px-2 py-2 text-xs bg-background flex-1 min-w-[130px]"
                >
                  <option value="">Toutes les classes</option>
                  {classes.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.nom}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="border border-input rounded-md px-2 py-2 text-xs bg-background flex-1 min-w-[130px]"
                >
                  <option value="">Tous les enseignants</option>
                  {teachers.map((tch) => (
                    <option key={tch.id} value={tch.id}>
                      {tch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Chargement…</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Aucun enfant ne correspond.</p>
              ) : (
                paginated.map((child) => (
                  <div key={child.id} className="rounded-lg border bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{child.name}</p>
                        <p className="text-xs text-muted-foreground">{child.parent}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleEditOpen(child)} aria-label="Modifier">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Link href={`/${currentLocale}/admin/enfants/${child.id}`} className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:bg-muted">
                          <Eye className="w-3 h-3" /> Voir
                        </Link>
                        <Button size="icon" variant="outline" className="h-7 w-7 text-amber-600 hover:bg-amber-50" onClick={() => setArchiveTarget({ id: child.id, name: child.name })} aria-label="Archiver">
                          <Archive className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <select value={child.classId ?? ""} onChange={(e) => handleChangeClass(child.id, e.target.value)} className="border border-input rounded-md px-2 py-1 text-xs bg-background flex-1 min-w-[110px]">
                        <option value="">— Classe —</option>
                        {classes.map((cl) => (<option key={cl.id} value={cl.id}>{cl.nom}</option>))}
                      </select>
                      <select value={child.todayStatusCode ?? ""} onChange={(e) => handleChangeStatus(child.id, e.target.value)} className="border border-input rounded-md px-2 py-1 text-xs bg-background flex-1 min-w-[110px]">
                        <option value="">Présence…</option>
                        <option value="Present">Présent</option>
                        <option value="Absent">Absent</option>
                        <option value="Justifie">Justifié</option>
                      </select>
                    </div>
                    {child.todayStatusCode && (
                      <Badge className={
                        child.todayStatus === "Présent" ? "bg-green-100 text-green-700" :
                        child.todayStatus === "Absent" ? "bg-red-100 text-red-700" :
                        child.todayStatus === "Justifié" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }>{child.todayStatus}</Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 text-left font-semibold text-foreground">{t('name')}</th>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">{t('group')}</th>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">{t('parent')}</th>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">Présence aujourd'hui</th>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-6 text-center text-muted-foreground">
                          Chargement des enfants…
                        </td>
                      </tr>
                    ) : filtered.length > 0 ? (
                      paginated.map((child) => (
                        <tr
                          key={child.id}
                          className="border-b border-border hover:bg-muted/50"
                        >
                          <td className="px-6 py-3 font-medium">{child.name}</td>
                          <td className="px-6 py-3 text-muted-foreground">
                            <select
                              value={child.classId ?? ""}
                              onChange={(e) => handleChangeClass(child.id, e.target.value)}
                              className="border border-input rounded-md px-2 py-1 text-xs bg-background"
                            >
                              <option value="">—</option>
                              {classes.map((cl) => (
                                <option key={cl.id} value={cl.id}>
                                  {cl.nom}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-3 text-muted-foreground text-xs">{child.parent}</td>
                          <td className="px-6 py-3">
                            <select
                              value={child.todayStatusCode ?? ""}
                              onChange={(e) => handleChangeStatus(child.id, e.target.value)}
                              className="border border-input rounded-md px-2 py-1 text-xs bg-background mb-1"
                            >
                              <option value="">Sélectionner</option>
                              <option value="Present">Présent</option>
                              <option value="Absent">Absent</option>
                              <option value="Justifie">Justifié</option>
                            </select>
                            <Badge
                              className={
                                child.todayStatus === "Présent"
                                  ? "bg-green-100 text-green-700"
                                  : child.todayStatus === "Absent"
                                  ? "bg-red-100 text-red-700"
                                  : child.todayStatus === "Justifié"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }
                            >
                              {child.todayStatus}
                            </Badge>
                            {child.presences && child.presences.length > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                Historique: {child.presences.slice(-3).map(p => {
                                  try {
                                    const dateObj = new Date(p.date);
                                    if (isNaN(dateObj.getTime())) return null;
                                    return `${dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}: ${p.statut === 'Present' ? '✓' : p.statut === 'Absent' ? '✗' : '~'}`;
                                  } catch (e) {
                                    return null;
                                  }
                                }).filter((s: any) => s !== null).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3 flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOpen(child)}
                              className="gap-1 text-xs"
                            >
                              <Edit2 className="w-3 h-3" />
                              Modifier
                            </Button>
                            <Link
                              href={`/${currentLocale}/admin/enfants/${child.id}`}
                              className="inline-flex items-center gap-2 px-3 py-1 border rounded text-xs hover:bg-muted"
                            >
                              <Eye className="w-4 h-4" />
                              {t('viewProfile')}
                            </Link>
                            <Button
                              size="icon"
                              variant="outline"
                              className="text-amber-600 hover:bg-amber-50"
                              onClick={() => setArchiveTarget({ id: child.id, name: child.name })}
                              aria-label="Archiver"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-6 text-center text-muted-foreground">
                          Aucun enfant ne correspond à votre recherche.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length} enfants
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-muted">←</button>
                  {Array.from({length: totalPages}, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)} className={"px-3 py-1 text-xs border rounded " + (n === page ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{n}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-muted">→</button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal ajout enfant */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Ajouter un enfant</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom</label>
                  <Input
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <Input
                    name="nom"
                    value={formData.nom}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Famille</label>
                <select
                  name="familleId"
                  value={formData.familleId}
                  onChange={handleFormChange}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  required
                >
                  <option value="">Sélectionner une famille</option>
                  {families.map((fam) => (
                    <option key={fam.id} value={fam.id}>
                      {fam.emailPrincipal}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date de naissance</label>
                <Input
                  type="date"
                  name="dateNaissance"
                  value={formData.dateNaissance}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalOpen(false);
                    setFormData({ prenom: "", nom: "", familleId: "", dateNaissance: "" });
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editModalOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Modifier {editTarget.name}</h2>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prenom</label>
                  <Input value={editForm.prenom} onChange={(e) => setEditForm((prev) => ({ ...prev, prenom: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <Input value={editForm.nom} onChange={(e) => setEditForm((prev) => ({ ...prev, nom: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Genre</label>
                  <select value={editForm.genre} onChange={(e) => setEditForm((prev) => ({ ...prev, genre: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">— Non specifie —</option>
                    <option value="M">Garcon</option>
                    <option value="F">Fille</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Classe</label>
                  <select value={editForm.classeId} onChange={(e) => setEditForm((prev) => ({ ...prev, classeId: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">— Aucune classe —</option>
                    {classes.map((cl) => (<option key={cl.id} value={cl.id}>{cl.nom}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Remarques</label>
                <textarea value={editForm.remarques} onChange={(e) => setEditForm((prev) => ({ ...prev, remarques: e.target.value }))} placeholder="Notes..." rows={3} className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleEditSave} disabled={editSaving} className="flex-1">
                  {editSaving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={editSaving}>Annuler</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation archivage */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Archive className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Archiver cet enfant ?</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{archiveTarget.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Les données seront conservées conformément à la Loi 09-08 (conservation ≥ 5 ans).
              L&apos;enfant n&apos;apparaîtra plus dans les listes actives.
            </p>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={handleArchiveConfirm}
              >
                Confirmer l&apos;archivage
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setArchiveTarget(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}