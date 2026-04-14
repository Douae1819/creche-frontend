"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { apiClient } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";

type AssignedClass = {
  classe: {
    id: string;
    nom: string;
    niveau?: string | null;
  };
};

type UserProfile = {
  id: string;
  email: string;
  telephone?: string | null;
  prenom: string;
  nom: string;
  langue?: string | null;
  role: string;
  statut: string;
  emailNotificationsEnabled?: boolean;
  creeLe?: string | null;
  modifieLe?: string | null;
  enseignant?: {
    id: string;
    fonction?: string | null;
    specialite?: string | null;
    classes?: AssignedClass[];
  } | null;
  tuteur?: {
    id: string;
    familleId: string;
    lien?: string | null;
    prenom?: string | null;
    nom?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    email?: string | null;
    principal?: boolean | null;
    famille?: {
      id: string;
      emailPrincipal?: string | null;
      languePreferee?: string | null;
      adresseFacturation?: string | null;
      enfants?: Array<{
        id: string;
        prenom: string;
        nom: string;
        dateNaissance?: string | null;
        genre?: string | null;
        classeId?: string | null;
        profilSante?: {
          allergies?: Array<{
            id: string;
            nom: string;
            severite?: string | null;
            notes?: string | null;
          }>;
        } | null;
        classe?: {
          id: string;
          nom: string;
        } | null;
      }>;
      tuteurs?: Array<{
        id: string;
        lien?: string | null;
        prenom?: string | null;
        nom?: string | null;
        telephone?: string | null;
        adresse?: string | null;
        email?: string | null;
        principal?: boolean | null;
      }>;
    };
  };
};

const FONCTIONS = [
  "Éducateur(trice) de jeunes enfants",
  "Auxiliaire de puériculture",
  "Psychomotricien(ne)",
  "Orthophoniste",
  "Animateur(trice)",
  "Référent(e) pédagogique",
  "Directeur(trice) adjoint(e)",
  "Autre",
];

export default function AdminUserProfilePage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    fonction: "",
    specialite: "",
  });

  const resolved = use(params);
  const currentLocale = resolved.locale;
  const userId = resolved.id;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.getAdminUser(userId);
        const payload = res.data as UserProfile;

        if (!cancelled) {
          setProfile(payload);
          setEditForm({
            prenom: payload.prenom ?? "",
            nom: payload.nom ?? "",
            telephone: payload.telephone ?? "",
            fonction: payload.enseignant?.fonction ?? "",
            specialite: payload.enseignant?.specialite ?? "",
          });
        }
      } catch (e) {
        console.error("[Admin/UserProfile] load error", e);
        if (!cancelled) setError("Impossible de charger le profil utilisateur.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleDateString(currentLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return value;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiClient.updateUserProfile(userId, {
        prenom: editForm.prenom || undefined,
        nom: editForm.nom || undefined,
        telephone: editForm.telephone || undefined,
        fonction: editForm.fonction || undefined,
        specialite: editForm.specialite || undefined,
      });
      setProfile(res.data as UserProfile);
      setEditing(false);
    } catch (e: any) {
      console.error("[Admin/UserProfile] save error", e);
      setSaveError(e?.response?.data?.message ?? "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEmailNotifications = async (enabled: boolean) => {
    if (!profile) return;
    setNotificationSaving(true);
    setNotificationError(null);
    try {
      await apiClient.updateUserEmailNotifications(userId, enabled);
      setProfile((prev) => (prev ? { ...prev, emailNotificationsEnabled: enabled } : prev));
    } catch (e: any) {
      console.error("[Admin/UserProfile] email notifications toggle error", e);
      setNotificationError(
        e?.response?.data?.message ?? "Impossible de mettre à jour la préférence de notification.",
      );
    } finally {
      setNotificationSaving(false);
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-red-100 text-red-700 border-red-200";
      case "ENSEIGNANT": return "bg-blue-100 text-blue-700 border-blue-200";
      case "PARENT": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const statutColor = (statut: string) => {
    switch (statut) {
      case "ACTIVE": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "INVITED": return "bg-amber-100 text-amber-700 border-amber-200";
      case "DISABLED": return "bg-gray-100 text-gray-500 border-gray-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Profil utilisateur</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Détails du compte et informations associées.
              </p>
            </div>
            <Link href={`/${currentLocale}/admin/utilisateurs`}>
              <Button variant="outline">← Retour</Button>
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !profile ? (
            <p className="text-sm text-muted-foreground">Profil introuvable.</p>
          ) : (
            <div className="space-y-6">
              {/* Identity Card */}
              <Card className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
                      {(profile.prenom?.[0] ?? "?").toUpperCase()}
                      {(profile.nom?.[0] ?? "").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-foreground">
                        {profile.prenom} {profile.nom}
                      </p>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border uppercase ${roleColor(profile.role)}`}>
                      {profile.role}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border uppercase ${statutColor(profile.statut)}`}>
                      {profile.statut}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Téléphone</p>
                    <p className="font-medium">{profile.telephone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Langue</p>
                    <p className="font-medium uppercase">{profile.langue || "fr"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Créé le</p>
                    <p className="font-medium">{formatDate(profile.creeLe)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Modifié le</p>
                    <p className="font-medium">{formatDate(profile.modifieLe)}</p>
                  </div>
                </div>

                <div className="mt-5 border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Notifications email</p>
                      <p className="text-xs text-muted-foreground">
                        Active/désactive les emails de notification pour ce compte (présence, événements, etc.).
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={profile.emailNotificationsEnabled ?? true}
                        disabled={notificationSaving}
                        onChange={(e) => void handleToggleEmailNotifications(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="font-medium">
                        {profile.emailNotificationsEnabled ?? true ? "Activées" : "Désactivées"}
                      </span>
                    </label>
                  </div>
                  {notificationError && (
                    <p className="text-xs text-destructive mt-2">{notificationError}</p>
                  )}
                  {profile.role !== "PARENT" && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Note: cette option est surtout utile pour les comptes parent.
                    </p>
                  )}
                </div>
              </Card>

              {/* ENSEIGNANT section */}
              {profile.role === "ENSEIGNANT" && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold">Profil enseignant</h2>
                    {!editing ? (
                      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                        Modifier
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          {saving ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(false);
                            setSaveError(null);
                            setEditForm({
                              prenom: profile.prenom ?? "",
                              nom: profile.nom ?? "",
                              telephone: profile.telephone ?? "",
                              fonction: profile.enseignant?.fonction ?? "",
                              specialite: profile.enseignant?.specialite ?? "",
                            });
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    )}
                  </div>

                  {saveError && (
                    <p className="text-sm text-destructive mb-3">{saveError}</p>
                  )}

                  {editing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Prénom</label>
                        <Input
                          value={editForm.prenom}
                          onChange={(e) => setEditForm((p) => ({ ...p, prenom: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Nom</label>
                        <Input
                          value={editForm.nom}
                          onChange={(e) => setEditForm((p) => ({ ...p, nom: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Téléphone</label>
                        <Input
                          value={editForm.telephone}
                          onChange={(e) => setEditForm((p) => ({ ...p, telephone: e.target.value }))}
                          placeholder="+212..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Fonction</label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                          value={editForm.fonction}
                          onChange={(e) => setEditForm((p) => ({ ...p, fonction: e.target.value }))}
                        >
                          <option value="">— Sélectionner —</option>
                          {FONCTIONS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Spécialité</label>
                        <Input
                          value={editForm.specialite}
                          onChange={(e) => setEditForm((p) => ({ ...p, specialite: e.target.value }))}
                          placeholder="Ex: Anglais, Art plastique, Éveil musical..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Fonction</p>
                        <p className="font-medium">{profile.enseignant?.fonction || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Spécialité</p>
                        <p className="font-medium">{profile.enseignant?.specialite || "—"}</p>
                      </div>
                    </div>
                  )}

                  {/* Classes assignées */}
                  <div className="mt-5 border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3">Classes assignées</h3>
                    {profile.enseignant?.classes && profile.enseignant.classes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.enseignant.classes.map((ec) => (
                          <span
                            key={ec.classe.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
                          >
                            {ec.classe.nom}
                            {ec.classe.niveau && (
                              <span className="bg-primary/20 px-1.5 py-0.5 rounded text-[10px]">
                                {ec.classe.niveau}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune classe assignée.{" "}
                        <Link href={`/${currentLocale}/admin/classes`} className="text-primary underline">
                          Gérer les classes
                        </Link>
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* PARENT section */}
              {profile.role === "PARENT" && (
                <>
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Famille</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Email principal</p>
                        <p className="font-medium">{profile.tuteur?.famille?.emailPrincipal ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Adresse facturation</p>
                        <p className="font-medium">{profile.tuteur?.famille?.adresseFacturation ?? "—"}</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-sm font-semibold mb-3">Tuteurs</h3>
                      {profile.tuteur?.famille?.tuteurs && profile.tuteur.famille.tuteurs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-muted-foreground border-b">
                                <th className="py-2 pr-4">Nom</th>
                                <th className="py-2 pr-4">Lien</th>
                                <th className="py-2 pr-4">Email</th>
                                <th className="py-2 pr-4">Téléphone</th>
                                <th className="py-2 pr-4">Principal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profile.tuteur.famille.tuteurs.map((t) => (
                                <tr key={t.id} className="border-b last:border-0">
                                  <td className="py-3 pr-4 font-medium">
                                    {`${t.prenom ?? ""} ${t.nom ?? ""}`.trim() || "—"}
                                    {t.principal && (
                                      <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        Principal
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 pr-4 text-muted-foreground">{t.lien ?? "—"}</td>
                                  <td className="py-3 pr-4 text-muted-foreground">{t.email ?? "—"}</td>
                                  <td className="py-3 pr-4 text-muted-foreground">{t.telephone ?? "—"}</td>
                                  <td className="py-3 pr-4 text-muted-foreground">{t.principal ? "Oui" : "Non"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucun tuteur.</p>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Enfants</h2>
                    {profile.tuteur?.famille?.enfants && profile.tuteur.famille.enfants.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b">
                              <th className="py-2 pr-4">Nom</th>
                              <th className="py-2 pr-4">Naissance</th>
                              <th className="py-2 pr-4">Genre</th>
                              <th className="py-2 pr-4">Classe</th>
                              <th className="py-2 pr-4">Allergies</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.tuteur.famille.enfants.map((e) => (
                              <tr key={e.id} className="border-b last:border-0">
                                <td className="py-3 pr-4 font-medium">
                                  <Link
                                    href={`/${currentLocale}/admin/enfants/${e.id}`}
                                    className="text-primary hover:underline"
                                  >
                                    {e.prenom} {e.nom}
                                  </Link>
                                </td>
                                <td className="py-3 pr-4 text-muted-foreground">
                                  {e.dateNaissance
                                    ? new Date(e.dateNaissance).toLocaleDateString(currentLocale)
                                    : "—"}
                                </td>
                                <td className="py-3 pr-4 text-muted-foreground">{e.genre ?? "—"}</td>
                                <td className="py-3 pr-4 text-muted-foreground">
                                  {e.classe?.nom ?? "Non affecté"}
                                </td>
                                <td className="py-3 pr-4 text-muted-foreground">
                                  {e.profilSante?.allergies && e.profilSante.allergies.length > 0
                                    ? e.profilSante.allergies.map((a) => a.nom).join(", ")
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun enfant.</p>
                    )}
                  </Card>
                </>
              )}

              {/* ADMIN section */}
              {profile.role === "ADMIN" && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-2">Administrateur</h2>
                  <p className="text-sm text-muted-foreground">
                    Compte administrateur avec accès complet à la plateforme.
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
