"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { UIProvider } from "@/lib/ui-context";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { Header } from "@/components/layout/header";
import { I18nProvider } from "@/providers/i18n-provider";
import { useI18n } from "@/providers/i18n-provider";
import { defaultLocale } from "@/lib/i18n/config";
import frMessages from "@/messages/fr.json";

function DashboardSidebar() {
  const { locale } = useI18n();
  return <SidebarNew currentLocale={locale} />;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={defaultLocale} messages={frMessages}>
      <I18nProvider initialLocale={defaultLocale}>
        <UIProvider>
          <div className="flex">
            <DashboardSidebar />
            <div className="md:ml-64 flex-1 min-h-screen pt-16 md:pt-0">
              <Header />
              <main className="p-4 md:p-6">{children}</main>
            </div>
          </div>
        </UIProvider>
      </I18nProvider>
    </NextIntlClientProvider>
  );
}
