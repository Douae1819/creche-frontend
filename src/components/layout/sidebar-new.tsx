"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import { useAuthStore } from "@/modules/auth/store";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { apiClient } from "@/lib/api";
import { clearSessionTokens } from "@/lib/auth-session";
import {
  LayoutDashboard,
  Users,
  Baby,
  FileText,
  Settings,
  LogOut,
  UtensilsCrossed,
  Calendar,
  ClipboardList,
  Menu,
  X,
  ScrollText,
  Building2,
} from "lucide-react";
import { withLocalePath } from "@/lib/i18n/locale-path";

// Lit un claim du JWT depuis les cookies (côté client seulement)
function readJwtClaim(claim: "role" | "email"): string {
  try {
    const token = Cookies.get("token") || Cookies.get("auth_token");
    if (!token) return "";
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
    return String(JSON.parse(atob(base64 + pad))[claim] ?? "");
  } catch { return ""; }
}
const noSubscribe = () => () => {};

interface SidebarItem {
  labelKey: string;
  href: string;
  icon: React.ReactNode;
  submenu?: { labelKey: string; href: string }[];
}

export function SidebarNew({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const t = useTranslations('sidebar');
  const clearAuthStore = useAuthStore((s) => s.logout);

  // useSyncExternalStore : "" sur serveur, valeur du cookie sur client — sans useEffect
  const jwtRole  = useSyncExternalStore(noSubscribe, () => readJwtClaim("role"),  () => "");
  const jwtEmail = useSyncExternalStore(noSubscribe, () => readJwtClaim("email"), () => "");
  const isSuperAdmin = jwtRole === "SUPER_ADMIN";
  const adminEmail   = jwtEmail;

  const sidebarItems: SidebarItem[] = [
    {
      labelKey: "overview",
      href: "/admin",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      labelKey: "children",
      href: "/admin/enfants",
      icon: <Baby className="w-5 h-5" />,
    },
    {
      labelKey: "registrations",
      href: "/admin/inscriptions",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      labelKey: "classes",
      href: "/admin/classes",
      icon: <Users className="w-5 h-5" />,
    },
    {
      labelKey: "teachers",
      href: "/admin/teachers",
      icon: <Users className="w-5 h-5" />,
    },
    {
      labelKey: "menus",
      href: "/admin/menus",
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      labelKey: "events",
      href: "/admin/events",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      labelKey: "presenceHistory",
      href: "/admin/presences",
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      labelKey: "users",
      href: "/admin/utilisateurs",
      icon: <Users className="w-5 h-5" />,
    },
    {
      labelKey: "reglement",
      href: "/admin/reglement-interieur",
      icon: <ScrollText className="w-5 h-5" />,
    },
    {
      labelKey: "etablissement",
      href: "/admin/etablissement",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      labelKey: "profile",
      href: "/admin/profile",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const toggleMenu = (labelKey: string) => {
    setExpandedMenus((prev) =>
      prev.includes(labelKey) ? prev.filter((m) => m !== labelKey) : [...prev, labelKey],
    );
  };

  const handleLogout = async () => {
    await apiClient.logout();
    clearAuthStore();
    clearSessionTokens();
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("auth_token");
    } catch {
      // ignore
    }

    const loginPath = withLocalePath(currentLocale, "/");
    setMobileOpen(false);
    router.push(loginPath);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed left-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gray-200 bg-white shadow-md active:scale-95 transition-transform"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={cn(
          "md:hidden fixed inset-0 z-[55] bg-black/40 transition-opacity duration-200",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "w-64 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden fixed left-0 top-0 bottom-0 z-50",
          "hidden md:flex",
        )}
      >
        <div className="flex-shrink-0 px-6 mb-4 pt-6">
          <Link href={withLocalePath(currentLocale, "/admin")} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-transparent">
              <Image
                src="/Group 13.svg"
                alt="Logo PetitsPas"
                width={40}
                height={40}
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-sidebar-foreground">PetitsPas</h1>
              {isSuperAdmin ? (
                <span className="text-xs font-semibold text-purple-600">👑 Super Admin</span>
              ) : (
                <p className="text-xs text-sidebar-foreground/60">Admin</p>
              )}
            </div>
          </Link>
          {isSuperAdmin && adminEmail && (
            <p className="text-[10px] text-sidebar-foreground/50 mt-1 truncate pl-[52px]">{adminEmail}</p>
          )}
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 px-3 pb-3">
          {sidebarItems.map((item) => {
            const pathForActive = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
            const isActive = pathForActive === item.href || (item.href !== "/admin" && pathForActive.startsWith(item.href + "/"));
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus.includes(item.labelKey);

            if (!hasSubmenu) {
              return (
                <Link
                  key={item.labelKey}
                  href={withLocalePath(currentLocale, item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate">{t(item.labelKey)}</span>
                </Link>
              );
            }

            return (
              <div key={item.labelKey}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.labelKey)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate">{t(item.labelKey)}</span>
                  <Baby
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>

                {isExpanded && item.submenu && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu.map((subitem) => {
                      const subPathForActive = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
                      const isSubActive = subPathForActive === subitem.href;
                      return (
                        <Link
                          key={subitem.href}
                          href={withLocalePath(currentLocale, subitem.href)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all",
                            isSubActive
                              ? "bg-primary/20 text-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20",
                          )}
                        >
                          <span>•</span>
                          {t(subitem.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="relative z-10 flex-shrink-0 border-t border-sidebar-border p-2 space-y-1 bg-sidebar pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="px-4 py-2">
            <LanguageSwitcher currentLocale={currentLocale as any} variant="toggle" />
          </div>
          <button
            onClick={() => setLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {t('logout')}
          </button>
        </div>
      </aside>

      <aside
        className={cn(
          "md:hidden w-[85vw] max-w-[20rem] bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden fixed left-0 top-0 bottom-0 pt-[calc(env(safe-area-inset-top)+1.5rem)] z-[60] transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="flex-shrink-0 px-6 mb-4 flex items-start justify-between gap-3">
          <Link
            href={withLocalePath(currentLocale, "/admin")}
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-transparent">
              <Image
                src="/Group 13.svg"
                alt="Logo PetitsPas"
                width={40}
                height={40}
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-sidebar-foreground">PetitsPas</h1>
              {isSuperAdmin ? (
                <span className="text-xs font-semibold text-purple-600">👑 Super Admin</span>
              ) : (
                <p className="text-xs text-sidebar-foreground/60">Admin</p>
              )}
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-sidebar-border text-sidebar-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 px-3 pb-3">
          {sidebarItems.map((item) => {
            const pathForActive = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
            const isActive = pathForActive === item.href || (item.href !== "/admin" && pathForActive.startsWith(item.href + "/"));
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus.includes(item.labelKey);

            if (!hasSubmenu) {
              return (
                <Link
                  key={item.labelKey}
                  href={withLocalePath(currentLocale, item.href)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate [@media(max-width:220px)]:hidden">{t(item.labelKey)}</span>
                </Link>
              );
            }

            return (
              <div key={item.labelKey}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.labelKey)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate [@media(max-width:220px)]:hidden">{t(item.labelKey)}</span>
                  <Baby
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>

                {isExpanded && item.submenu && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu.map((subitem) => {
                      const subPathForActive = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
                      const isSubActive = subPathForActive === subitem.href;
                      return (
                        <Link
                          key={subitem.href}
                          href={withLocalePath(currentLocale, subitem.href)}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all",
                            isSubActive
                              ? "bg-primary/20 text-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20",
                          )}
                        >
                          <span>•</span>
                          {t(subitem.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-sidebar-border p-4 space-y-2 bg-sidebar pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          <div className="px-4 py-2">
            <LanguageSwitcher currentLocale={currentLocale as any} variant="toggle" />
          </div>
          <button
            onClick={() => { setMobileOpen(false); setLogoutConfirm(true); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Logout confirmation dialog */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">{t('logoutConfirmTitle')}</h2>
            </div>
            <p className="text-sm text-gray-600">{t('logoutConfirmMessage')}</p>
            <div className="flex gap-3 pt-1">
            <button
              onClick={() => void handleLogout()}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"
              >
                {t('logoutConfirmYes')}
              </button>
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('logoutConfirmNo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
