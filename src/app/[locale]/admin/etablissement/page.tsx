"use client";

import { use, useState, useEffect } from "react";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin.etablissement");

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
      .catch(() => setError(t("loadError")))
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
      setSuccess(t("success"));
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError(t("saveError"));
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
                {t("title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("subtitle")}
              </p>
            </div>
            {!editing && (
              <Button onClick={openEdit} className="gap-2 flex-shrink-0">
                <Pencil className="w-4 h-4" /> {t("edit")}
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
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : editing ? (
              /* ── Edit form ── */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{t("nameInstitution")}</label>
                    <Input
                      value={form.nom}
                      onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                      placeholder={t("placeholderName")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{t("capacity")}</label>
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
                  <label className="block text-xs font-medium text-foreground mb-1">{t("address")}</label>
                  <Input
                    value={form.adresse}
                    onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                    placeholder={t("placeholderAddress")}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{t("phone")}</label>
                    <Input
                      value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                      placeholder={t("placeholderPhone")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{t("contactEmail")}</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder={t("placeholderEmail")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{t("website")}</label>
                    <Input
                      value={form.siteWeb ?? ""}
                      onChange={e => setForm(f => ({ ...f, siteWeb: e.target.value }))}
                      placeholder={t("placeholderWebsite")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{t("openingHours")}</label>
                    <Input
                      value={form.horaires ?? ""}
                      onChange={e => setForm(f => ({ ...f, horaires: e.target.value }))}
                      placeholder={t("placeholderHours")}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{t("description")}</label>
                  <textarea
                    value={form.description ?? ""}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={t("placeholderDescription")}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={save} disabled={saving} className="gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {saving ? t("saving") : t("save")}
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} disabled={saving} className="gap-1.5">
                    <X className="w-3.5 h-3.5" /> {t("cancel")}
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
                      <p className="text-xs text-muted-foreground mb-0.5">{t("name")}</p>
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
                <InfoRow icon={<MapPin   className="w-4 h-4" />} label={t("address")}           value={etab.adresse} />
                <InfoRow icon={<Phone    className="w-4 h-4" />} label={t("phone")}         value={etab.telephone} />
                <InfoRow icon={<Mail     className="w-4 h-4" />} label={t("email")}             value={etab.email} />
                <InfoRow icon={<Globe    className="w-4 h-4" />} label={t("website")}          value={etab.siteWeb} />
                <InfoRow icon={<Clock    className="w-4 h-4" />} label={t("openingHours")}          value={etab.horaires} />
                <InfoRow icon={<Users    className="w-4 h-4" />} label={t("capacityLabel")} value={etab.capacite ? t("capacityChildren", { count: etab.capacite }) : null} />
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t("emptyState")}
                </p>
                <Button onClick={openEdit} variant="outline" className="gap-2">
                  <Pencil className="w-4 h-4" /> {t("fillInfo")}
                </Button>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
