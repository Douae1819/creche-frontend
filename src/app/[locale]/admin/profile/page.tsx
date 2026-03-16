"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";

export default function AdminProfilePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale: currentLocale } = use(params);
  const t = useTranslations("admin");

  const [oldPassword,     setOldPassword]     = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [success,         setSuccess]         = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!oldPassword || !newPassword || !confirmPassword) { setError(t("profile.errors.required")); return; }
    if (newPassword !== confirmPassword) { setError(t("profile.errors.mismatch")); return; }
    try {
      setLoading(true);
      await apiClient.changeAuthPassword(oldPassword, newPassword, confirmPassword);
      setSuccess(t("profile.success"));
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join("\n") : t("profile.errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />
      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 flex items-center justify-center">
        <div className="w-full max-w-lg space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">{t("profile.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("profile.subtitle")}</p>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t("profile.changePasswordTitle")}</h2>
            {error   && <p className="text-sm text-destructive mb-3 whitespace-pre-line">{error}</p>}
            {success && <p className="text-sm text-emerald-600 mb-3">{success}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("profile.fields.oldPassword")}</label>
                <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("profile.fields.newPassword")}</label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("profile.fields.confirmPassword")}</label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={loading} className="bg-primary">
                  {loading ? t("profile.buttons.loading") : t("profile.buttons.submit")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
