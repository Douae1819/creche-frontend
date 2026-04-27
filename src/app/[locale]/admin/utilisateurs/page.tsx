"use client";

import { use, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { readJwtRole } from "@/lib/jwt-client";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { Locale } from "@/lib/i18n/config";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { useTranslations } from "next-intl";

const noSub = () => () => {};

type UserItem = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  role: "ADMIN" | "ENSEIGNANT" | "PARENT" | string;
  statut: "INVITED" | "ACTIVE" | "DISABLED" | string;
  dernierAcces?: string | null;
};

export default function UtilisateursPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const t = useTranslations("admin.users");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingError, setCreatingError] = useState<string | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [createForm, setCreateForm] = useState({
    email: "",
    prenom: "",
    nom: "",
    role: "ENSEIGNANT" as "ENSEIGNANT" | "PARENT" | "ADMIN",
    telephone: "",
  });

  // useSyncExternalStore — "" côté serveur, cookie JWT côté client
  const currentUserRole = useSyncExternalStore(noSub, readJwtRole, () => "");
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.listUsers({ limit: 200 });
        const items: UserItem[] = res.data.data ?? [];

        if (!cancelled) {
          setUsers(items);
        }
      } catch (err) {
        console.error("[Users] Error loading users", err);
        if (!cancelled) {
          setError(t("loadError"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    if (selectedRoleFilter && u.role !== selectedRoleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.prenom?.toLowerCase().includes(q) ||
        u.nom?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setCreatingError(null);

    try {
      const payload = {
        email: createForm.email,
        prenom: createForm.prenom,
        nom: createForm.nom,
        role: createForm.role,
        telephone: createForm.telephone || undefined,
      };
      await apiClient.createUser(payload);
      const res = await apiClient.listUsers({ limit: 200 });
      const items: UserItem[] = res.data.data ?? [];
      setUsers(items);
      setCreateForm({ email: "", prenom: "", nom: "", role: "ENSEIGNANT", telephone: "" });
    } catch (err) {
      console.error("[Users] Error creating user", err);
      setCreatingError(t("createError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async (id: string, statut: "INVITED" | "ACTIVE" | "DISABLED") => {
    try {
      await apiClient.updateUserStatus(id, statut);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, statut } : u)),
      );
    } catch (err) {
      console.error("[Users] Error updating status", err);
      alert(t("statusError"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await apiClient.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error("[Users] Error deleting user", err);
      alert(t("deleteError"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? t("countLoading") : t("count", { count: users.length })}
              </p>
            </div>
            <Button onClick={() => setShowForm((prev) => !prev)} className="bg-primary flex-shrink-0">
              {showForm ? t("close") : t("newUser")}
            </Button>
          </div>

          {/* Formulaire création */}
          {showForm && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t("createTitle")}</h2>
              {creatingError && (
                <p className="text-sm text-destructive mb-3">{creatingError}</p>
              )}
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("firstName")}</label>
                    <Input
                      name="prenom"
                      value={createForm.prenom}
                      onChange={handleCreateChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("lastName")}</label>
                    <Input
                      name="nom"
                      value={createForm.nom}
                      onChange={handleCreateChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("email")}</label>
                    <Input
                      type="email"
                      name="email"
                      value={createForm.email}
                      onChange={handleCreateChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("role")}</label>
                    <select
                      name="role"
                      value={createForm.role}
                      onChange={handleCreateChange}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="ENSEIGNANT">{t("roleTeacher")}</option>
                      <option value="PARENT">{t("roleParent")}</option>
                      {isSuperAdmin && <option value="ADMIN">{t("roleAdmin")}</option>}
                    </select>
                    {isSuperAdmin && createForm.role === "ADMIN" && (
                      <p className="text-xs text-amber-600 mt-1">⚠️ {t("adminWarning")}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t("phoneOptional")}</label>
                  <Input
                    name="telephone"
                    value={createForm.telephone}
                    onChange={handleCreateChange}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="bg-primary" disabled={submitting}>
                    {t("invite")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setCreatingError(null);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="p-6">
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 text-sm"
                />
              </div>
              <select
                value={selectedRoleFilter}
                onChange={(e) => { setSelectedRoleFilter(e.target.value); setPage(1); }}
                className="border rounded-md px-2 py-2 text-xs bg-background min-w-[130px]"
              >
                <option value="">{t("allRoles")}</option>
                <option value="ADMIN">ADMIN</option>
                <option value="ENSEIGNANT">ENSEIGNANT</option>
                <option value="PARENT">PARENT</option>
              </select>
              {isSuperAdmin && (
                <span className="text-xs px-2 py-1.5 rounded-md bg-purple-100 text-purple-700 font-semibold border border-purple-200 flex-shrink-0">
                  👑 {t("superAdminBadge")}
                </span>
              )}
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-12">
                {t("loadingList")}
              </p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                {t("empty")}
              </p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="md:hidden space-y-3">
                  {paginatedUsers.map((u) => {
                    const roleColors: Record<string, string> = {
                      ADMIN: "bg-red-50 text-red-700 border-red-200",
                      ENSEIGNANT: "bg-blue-50 text-blue-700 border-blue-200",
                      PARENT: "bg-green-50 text-green-700 border-green-200",
                    };
                    return (
                      <div key={u.id} className="rounded-lg border bg-white p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-semibold text-foreground">{u.prenom} {u.nom}</p>
                            <p className="text-xs text-muted-foreground break-all">{u.email}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${roleColors[u.role] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={u.statut}
                            onChange={(e) => handleChangeStatus(u.id, e.target.value as "INVITED" | "ACTIVE" | "DISABLED")}
                            className="border rounded-md px-2 py-1 text-xs flex-1 min-w-[110px]"
                          >
                            <option value="INVITED">{t("statusInvited")}</option>
                            <option value="ACTIVE">{t("statusActive")}</option>
                            <option value="DISABLED">{t("statusDisabled")}</option>
                          </select>
                          <Link href={withLocalePath(currentLocale, `/admin/utilisateurs/${u.id}`)}>
                            <Button variant="outline" size="sm" className="text-xs h-7">{t("profileMobile")}</Button>
                          </Link>
                          <Button variant="outline" size="sm" className="text-xs h-7 text-red-600 border-red-500 hover:bg-red-50" onClick={() => handleDelete(u.id)}>
                            {t("delete")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-3 text-left font-semibold text-foreground">{t("colName")}</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">{t("colEmail")}</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">{t("colRole")}</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">{t("colStatus")}</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">{t("colActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((u) => (
                        <tr key={u.id} className="border-b border-border hover:bg-muted/40">
                          <td className="px-6 py-3 font-medium">
                            {u.prenom} {u.nom}
                          </td>
                          <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                          <td className="px-6 py-3">
                            <Badge variant="outline" className="uppercase">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-3">
                            <select
                              value={u.statut}
                              onChange={(e) =>
                                handleChangeStatus(
                                  u.id,
                                  e.target.value as "INVITED" | "ACTIVE" | "DISABLED",
                                )
                              }
                              className="border rounded-md px-2 py-1 text-xs"
                            >
                              <option value="INVITED">{t("statusInvited")}</option>
                              <option value="ACTIVE">{t("statusActive")}</option>
                              <option value="DISABLED">{t("statusDisabled")}</option>
                            </select>
                          </td>
                          <td className="px-6 py-3 text-xs">
                            <div className="flex gap-2">
                              <Link href={withLocalePath(currentLocale, `/admin/utilisateurs/${u.id}`)}>
                                <Button variant="outline" size="sm">
                                  {t("viewProfile")}
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-500 hover:bg-red-50"
                                onClick={() => handleDelete(u.id)}
                              >
                                {t("delete")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  {t("paginationRange", {
                    from: (page - 1) * PAGE_SIZE + 1,
                    to: Math.min(page * PAGE_SIZE, filteredUsers.length),
                    total: filteredUsers.length,
                  })}
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
    </div>
  );
}
