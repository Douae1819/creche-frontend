"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
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
  ScrollText,
  Building2,
  Menu,
  X,
} from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  submenu?: { label: string; href: string }[];
}

const sidebarItems: SidebarItem[] = [
  {
    label: "Vue d'ensemble",
    href: "/admin",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Tous les enfants",
    href: "/admin/enfants",
    icon: <Baby className="w-5 h-5" />,
  },
  {
    label: "Toutes les inscriptions",
    href: "/admin/inscriptions",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    label: "Gestion des classes",
    href: "/admin/classes",
    icon: <Users className="w-5 h-5" />,
  },
  {
    label: "Enseignants & classes",
    href: "/admin/teachers",
    icon: <Users className="w-5 h-5" />,
  },
  {
    label: "Menu enfant",
    href: "/admin/menus",
    icon: <UtensilsCrossed className="w-5 h-5" />,
  },
  {
    label: "Événements",
    href: "/admin/events",
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    label: "Présences",
    href: "/admin/presences",
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    label: "Tous les utilisateurs",
    href: "/admin/utilisateurs",
    icon: <Users className="w-5 h-5" />,
  },
  {
    label: "Règlement intérieur",
    href: "/admin/reglement-interieur",
    icon: <ScrollText className="w-5 h-5" />,
  },
  {
    label: "Notre établissement",
    href: "/admin/etablissement",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    label: "Profil / Mot de passe",
    href: "/admin/profile",
    icon: <Settings className="w-5 h-5" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { locale } = useI18n();

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label],
    );
  };

  const handleLogout = () => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("auth_token");
    } catch {
      // ignore
    }
    setMobileOpen(false);
    setLogoutConfirm(false);
    router.push(`/${locale}/auth/login-user`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gray-200 bg-white shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen overflow-y-auto fixed left-0 top-0 pt-6 hidden md:block">
        {/* Logo + titre */}
        <div className="px-6 mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-transparent">
              <Image
                src="/Group 13.svg"
                alt="Logo PetitsPas"
                width={40}
                height={40}
              />
            </div>
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">
                PetitsPas
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Admin</p>
            </div>
          </Link>
        </div>

        {/* Liens */}
        <nav className="space-y-1 px-3 pb-28">
          {sidebarItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus.includes(item.label);

            if (!hasSubmenu) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate">{item.label}</span>
                </Link>
              );
            }

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate">{item.label}</span>
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
                      const isSubActive = pathname === subitem.href;
                      return (
                        <Link
                          key={subitem.href}
                          href={subitem.href}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all",
                            isSubActive
                              ? "bg-primary/20 text-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20",
                          )}
                        >
                          <span>•</span>
                          {subitem.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bas de sidebar */}
        <div className=" absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4 space-y-2 bg-sidebar">
          <div className="px-4 py-2">
            <LanguageSwitcher currentLocale={locale} />
          </div>
          <button
            type="button"
            onClick={() => setLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      <aside
        className={cn(
          "md:hidden w-[85vw] max-w-[20rem] bg-sidebar border-r border-sidebar-border h-screen overflow-y-auto fixed left-0 top-0 pt-[calc(env(safe-area-inset-top)+1.5rem)] z-50 transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-6 mb-6 flex items-start justify-between gap-3">
          <Link
            href="/"
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
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">PetitsPas</h1>
              <p className="text-xs text-sidebar-foreground/60">Admin</p>
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

        <nav className="space-y-1 px-3 pb-28">
          {sidebarItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus.includes(item.label);

            if (!hasSubmenu) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate [@media(max-width:220px)]:hidden">{item.label}</span>
                </Link>
              );
            }

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate [@media(max-width:220px)]:hidden">{item.label}</span>
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
                      const isSubActive = pathname === subitem.href;
                      return (
                        <Link
                          key={subitem.href}
                          href={subitem.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all",
                            isSubActive
                              ? "bg-primary/20 text-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20",
                          )}
                        >
                          <span>•</span>
                          {subitem.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4 space-y-2 bg-sidebar">
          <div className="px-4 py-2">
            <LanguageSwitcher currentLocale={locale} />
          </div>
          <button
            type="button"
            onClick={() => { setMobileOpen(false); setLogoutConfirm(true); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
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
              <h2 className="text-base font-semibold text-gray-900">Se déconnecter ?</h2>
            </div>
            <p className="text-sm text-gray-600">
              Vous allez être déconnecté de votre session. Vos données non sauvegardées seront perdues.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"
              >
                Se déconnecter
              </button>
              <button
                type="button"
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
