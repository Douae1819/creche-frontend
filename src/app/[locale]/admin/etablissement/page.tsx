"use client";

import { use, useState, useEffect } from "react";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";
import {
  Building2, Phone, Mail, Globe, Clock, Users, MapPin,
  Pencil, Check, X,
} from "lucide-react";

interface EtablissementInfo {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  siteWeb?: string | null;
  description?: string | null;
  horaires?: string | null;
  capacite?: number | null;
}

const EMPTY: EtablissementInfo = {
  nom: "", adresse: "", telephone: "", email: "",
  siteWeb: "", description: "", horaires: "", capacite: undefined,
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <div className="flex-shrink-0 text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export default function EtablissementPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale: currentLocale } = use(params);

  const [etab,        setEtab]        = useState<EtablissementInfo>(EMPTY);
  const [form,        setForm]        = useState<EtablissementInfo>(EMPTY);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState<string | null>(null);

  useEffect(() => {
    apiClient.getEtablissement()
      .then((res) => {
        const d = res.data ?? {};
        const info: EtablissementInfo = {
          nom:         d.nom         ?? "",
          adresse:     d.adresse     ?? "",
          telephone:   d.telephone   ?? "",
          email:       d.email       ?? "",
          siteWeb:     d.siteWeb     ?? "",
          description: d.description ?? "",
          horaires:    d.horaires    ?? "",
          capacite:    d.capacite    ?? undefined,
        };
        setEtab(info);
        setForm(info);
      })
      .catch(() => setError("Impossible de charger les informations de l'établissement."))
      .finally(() => setLoading(false));
  }, []);

  const openEdit = () => { setForm({ ...etab }); setEditing(true); setError(null); setSuccess(null); };
  const cancelEdit = () => { setEditing(false); setError(null); };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: any = { ...form };
      if (!payload.capacite) delete payload.capacite;
      else payload.capacite = Number(payload.capacite);
      const res = await apiClient.updateEtablissement(payload);
      const d = res.data ?? {};
      const saved: EtablissementInfo = {
        nom: d.nom ?? "", adresse: d.adresse ?? "", telephone: d.telephone ?? "",
        email: d.email ?? "", siteWeb: d.siteWeb ?? "", description: d.description ?? "",
        horaires: d.horaires ?? "", capacite: d.capacite ?? undefined,
      };
      setEtab(saved);
      setEditing(false);
      setSuccess("Informations enregistrées avec succès.");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  const hasInfo = etab.nom || etab.adresse || etab.telephone || etab.email ||
    etab.siteWeb || etab.description || etab.horaires || etab.capacite;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-7 h-7 text-primary" />
                Notre établissement
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Informations de la crèche visibles dans l&apos;application.
              </p>
            </div>
            {!editing && (
              <Button onClick={openEdit} className="gap-2 flex-shrink-0">
                <Pencil className="w-4 h-4" /> Modifier
              </Button>
            )}
          </div>

          {/* Feedback banners */}
          {success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Card */}
          <Card className="p-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : editing ? (
              /* ── Edit form ── */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Nom de l&apos;établissement</label>
                    <Input
                      value={form.nom}
                      onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                      placeholder="Crèche PetitsPas"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Capacité d&apos;accueil</label>
                    <Input
                      type="number"
                      min={1}
                      value={form.capacite ?? ""}
                      onChange={e => setForm(f => ({ ...f, capacite: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      placeholder="60"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Adresse</label>
                  <Input
                    value={form.adresse}
                    onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                    placeholder="12 rue des Enfants, Casablanca"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Téléphone</label>
                    <Input
                      value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                      placeholder="+212 522 000 000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Email de contact</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="contact@petitspas.ma"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Site web</label>
                    <Input
                      value={form.siteWeb ?? ""}
                      onChange={e => setForm(f => ({ ...f, siteWeb: e.target.value }))}
                      placeholder="https://petitspas.ma"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Horaires d&apos;ouverture</label>
                    <Input
                      value={form.horaires ?? ""}
                      onChange={e => setForm(f => ({ ...f, horaires: e.target.value }))}
                      placeholder="Lun–Ven : 07h30 – 18h00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                  <textarea
                    value={form.description ?? ""}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Courte description de la crèche…"
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={save} disabled={saving} className="gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} disabled={saving} className="gap-1.5">
                    <X className="w-3.5 h-3.5" /> Annuler
                  </Button>
                </div>
              </div>
            ) : hasInfo ? (
              /* ── Read view ── */
              <div>
                {etab.nom && (
                  <div className="flex items-start gap-3 py-3 border-b border-border">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Nom</p>
                      <p className="text-base font-bold text-foreground">{etab.nom}</p>
                    </div>
                  </div>
                )}
                {etab.description && (
                  <div className="py-3 border-b border-border">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-foreground">{etab.description}</p>
                  </div>
                )}
                <InfoRow icon={<MapPin   className="w-4 h-4" />} label="Adresse"           value={etab.adresse} />
                <InfoRow icon={<Phone    className="w-4 h-4" />} label="Téléphone"         value={etab.telephone} />
                <InfoRow icon={<Mail     className="w-4 h-4" />} label="Email"             value={etab.email} />
                <InfoRow icon={<Globe    className="w-4 h-4" />} label="Site web"          value={etab.siteWeb} />
                <InfoRow icon={<Clock    className="w-4 h-4" />} label="Horaires"          value={etab.horaires} />
                <InfoRow icon={<Users    className="w-4 h-4" />} label="Capacité d'accueil" value={etab.capacite ? `${etab.capacite} enfants` : null} />
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Aucune information renseignée pour le moment.
                </p>
                <Button onClick={openEdit} variant="outline" className="gap-2">
                  <Pencil className="w-4 h-4" /> Renseigner les informations
                </Button>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
