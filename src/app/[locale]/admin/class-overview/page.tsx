"use client";

import { use, useEffect, useState } from "react";
import { Locale } from "@/lib/i18n/config";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EnseignantClasseItem {
  enseignant: {
    utilisateur?: {
      id: string;
      prenom: string;
      nom: string;
      email: string;
    } | null;
  } | null;
}

interface ClasseItem {
  id: string;
  nom: string;
  enseignants?: EnseignantClasseItem[];
}

interface EnfantItem {
  id: string;
  prenom: string;
  nom: string;
  dateNaissance: string;
  classe?: { id: string; nom: string } | null;
}

export default function ClassOverviewPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const t = useTranslations("admin.classOverview");
  const dateLocale = currentLocale === "ar" ? "ar-MA" : "fr-FR";

  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [children, setChildren] = useState<EnfantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedClasse: ClasseItem | null =
    classes.find((c: ClasseItem) => c.id === selectedClasseId) || null;

  useEffect(() => {
    void loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const classesRes = await apiClient.listClasses();

      const classesData: ClasseItem[] = classesRes.data?.items ?? classesRes.data ?? [];
      setClasses(classesData);

      if (classesData.length > 0) {
        setSelectedClasseId(classesData[0].id);
        await loadChildrenForClass(classesData[0].id);
      }
    } catch (err) {
      console.error("[ClassOverview] Error loading initial data", err);
      setError("Erreur lors du chargement des classes ou enseignants.");
    } finally {
      setLoading(false);
    }
  };

  const loadChildrenForClass = async (classeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.listChildren(1, 200);
      const items = res.data?.items ?? res.data?.data ?? [];
      const filtered = items.filter((e: any) => e.classeId === classeId);
      setChildren(filtered);
    } catch (err) {
      console.error("[ClassOverview] Error loading children", err);
      setError(t("loadChildrenError"));
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const classeId = event.target.value;
    setSelectedClasseId(classeId);
    if (classeId) {
      await loadChildrenForClass(classeId);
    } else {
      setChildren([]);
    }
  };

  if (loading && classes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SidebarNew currentLocale={currentLocale} />
        <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">{t("loadingTitle")}</h1>
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Enfants par classe & enseignants
              </h1>
              <p className="text-muted-foreground mt-1">
                Vue récapitulative des enfants par classe et des enseignants associés.
              </p>
            </div>
          </div>

          {error && (
            <Card className="p-4 bg-destructive/10 border-destructive/30">
              <p className="text-destructive">{error}</p>
            </Card>
          )}

          <Card className="p-4 flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {t("selectedClass")}
            </span>
            <select
              value={selectedClasseId}
              onChange={handleClassChange}
              className="border rounded-md px-3 py-2 text-sm"
            >
              {classes.map((classe) => (
                <option key={classe.id} value={classe.id}>
                  {classe.nom}
                </option>
              ))}
            </select>
          </Card>

          <Card className="p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2 text-left font-semibold">{t("colChild")}</th>
                    <th className="px-4 py-2 text-left font-semibold">{t("colClass")}</th>
                    <th className="px-4 py-2 text-left font-semibold">{t("colBirth")}</th>
                    <th className="px-4 py-2 text-left font-semibold">{t("colTeachers")}</th>
                  </tr>
                </thead>
                <tbody>
                  {children.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                        {t("emptyClass")}
                      </td>
                    </tr>
                  ) : (
                    children.map((enfant) => (
                      <tr key={enfant.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2">
                          {enfant.prenom} {enfant.nom}
                        </td>
                        <td className="px-4 py-2">
                          {enfant.classe?.nom ?? "-"}
                        </td>
                        <td className="px-4 py-2">
                          {new Date(enfant.dateNaissance).toLocaleDateString(dateLocale)}
                        </td>
                        <td className="px-4 py-2">
                          {selectedClasse && selectedClasse.enseignants && selectedClasse.enseignants.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedClasse.enseignants.map((ec: EnseignantClasseItem, idx: number) => {
                                const u = ec.enseignant?.utilisateur;
                                if (!u) return null;
                                return (
                                  <span
                                    key={u.id ?? idx}
                                    className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200"
                                  >
                                    {u.prenom} {u.nom}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t("noTeachers")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
