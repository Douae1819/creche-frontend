"use client";

import { useState, useEffect, use } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Eye } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Locale } from "@/lib/i18n/config";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { apiClient } from "@/lib/api";

type InscriptionItem = {
  id: string;
  childName: string;
  parentName: string;
  email: string;
  statutCode: "CANDIDATURE" | "EN_COURS" | "ACTIF" | "REJETEE" | null;
  createdAt: string;
};

function badgeClassForStatus(code: InscriptionItem["statutCode"]): string {
  switch (code) {
    case "ACTIF":
      return "bg-green-100 text-green-700";
    case "CANDIDATURE":
      return "bg-yellow-100 text-yellow-700";
    case "EN_COURS":
      return "bg-blue-100 text-blue-700";
    case "REJETEE":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function InscriptionsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const t = useTranslations("admin.inscriptions");
  const [search, setSearch] = useState("");
  const [inscriptions, setInscriptions] = useState<InscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InscriptionItem["statutCode"] | null>(null);

  const handleAccept = async (id: string) => {
    try {
      await apiClient.acceptAdminInscription(id);
      setInscriptions((prev) =>
        prev.map((insc) =>
          insc.id === id ? { ...insc, statutCode: "ACTIF" } : insc,
        ),
      );
    } catch (err) {
      console.error("[Admin/Inscriptions] Error accepting inscription", err);
      alert(t("errors.accept"));
    }
  };

  const handleReject = async (id: string) => {
    const raison = prompt(t("rejectPrompt")) ?? undefined;
    try {
      await apiClient.rejectAdminInscription(id, raison);
      setInscriptions((prev) =>
        prev.map((insc) =>
          insc.id === id ? { ...insc, statutCode: "REJETEE" } : insc,
        ),
      );
    } catch (err) {
      console.error("[Admin/Inscriptions] Error rejecting inscription", err);
      alert(t("errors.reject"));
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchInscriptions() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.listAdminInscriptions();
        const items = res.data?.items ?? [];

        const mapped: InscriptionItem[] = items.map((insc: any) => {
          const childName = insc.enfant
            ? `${insc.enfant.prenom ?? ""} ${insc.enfant.nom ?? ""}`.trim() || "—"
            : "—";
          const firstParent = Array.isArray(insc.parents) && insc.parents.length > 0 ? insc.parents[0] : null;
          const parentName = firstParent?.nom ?? "—";
          const email = firstParent?.email ?? "—";

          const statut: InscriptionItem["statutCode"] = insc.statut ?? null;

          return {
            id: insc.id,
            childName,
            parentName,
            email,
            statutCode: statut,
            createdAt: insc.createdAt,
          };
        });

        if (!cancelled) {
          setInscriptions(mapped);
        }
      } catch (err) {
        console.error("[Admin/Inscriptions] Error loading inscriptions", err);
        if (!cancelled) {
          setError(t("errors.load"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchInscriptions();

    return () => {
      cancelled = true;
    };
  }, [currentLocale]);

  const labelForStatus = (code: InscriptionItem["statutCode"]) => {
    if (!code) return t("status.UNKNOWN");
    const key =
      code === "CANDIDATURE"
        ? "status.CANDIDATURE"
        : code === "EN_COURS"
          ? "status.EN_COURS"
          : code === "ACTIF"
            ? "status.ACTIF"
            : "status.REJETEE";
    return t(key);
  };

  const filtered = inscriptions.filter((insc) => {
    const matchesSearch =
      insc.childName.toLowerCase().includes(search.toLowerCase()) ||
      insc.parentName.toLowerCase().includes(search.toLowerCase()) ||
      insc.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter ? insc.statutCode === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t("title")}</h1>
            <p className="text-muted-foreground">{t("countLabel", { count: inscriptions.length })}</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="relative md:w-72">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs md:text-sm">
              <Button
                variant={statusFilter === null ? "default" : "outline"}
                size="sm"
                className="rounded-full px-4"
                onClick={() => setStatusFilter(null)}
              >
                {t("filters.all")}
              </Button>
              <Button
                variant={statusFilter === "CANDIDATURE" ? "default" : "outline"}
                size="sm"
                className="rounded-full px-4"
                onClick={() => setStatusFilter("CANDIDATURE")}
              >
                {t("filters.review")}
              </Button>
              <Button
                variant={statusFilter === "EN_COURS" ? "default" : "outline"}
                size="sm"
                className="rounded-full px-4"
                onClick={() => setStatusFilter("EN_COURS")}
              >
                {t("filters.inProgress")}
              </Button>
              <Button
                variant={statusFilter === "ACTIF" ? "default" : "outline"}
                size="sm"
                className="rounded-full px-4"
                onClick={() => setStatusFilter("ACTIF")}
              >
                {t("filters.accepted")}
              </Button>
              <Button
                variant={statusFilter === "REJETEE" ? "default" : "outline"}
                size="sm"
                className="rounded-full px-4"
                onClick={() => setStatusFilter("REJETEE")}
              >
                {t("filters.rejected")}
              </Button>
            </div>
          </div>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              filtered.map((insc) => (
                <Card key={insc.id} className="p-6 border-2 border-border/50">
                  <div className="mb-4 pb-4 border-b border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{insc.childName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(insc.createdAt).toLocaleDateString(currentLocale === "ar" ? "ar-MA" : "fr-FR")}
                        </p>
                      </div>
                      <Badge className={badgeClassForStatus(insc.statutCode)}>{labelForStatus(insc.statutCode)}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{t("parent")}:</span>
                      <span className="font-medium text-end">{insc.parentName}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{t("email")}:</span>
                      <span className="font-medium text-end break-all">{insc.email}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Link href={withLocalePath(currentLocale, `/admin/inscriptions/${insc.id}`)}>
                      <Button size="sm" variant="outline" className="flex items-center gap-2 bg-transparent">
                        <Eye className="w-4 h-4" />
                        {t("viewDetails")}
                      </Button>
                    </Link>
                    {insc.statutCode === "CANDIDATURE" || insc.statutCode === "EN_COURS" ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={() => handleAccept(insc.id)}
                        >
                          {t("actions.accept")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                          onClick={() => handleReject(insc.id)}
                        >
                          {t("actions.reject")}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
