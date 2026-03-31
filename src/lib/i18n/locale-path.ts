import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

const NEXT_INTL_LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Toujours préfixer avec la locale (/fr/..., /ar/...) pour cibler les routes sous `app/[locale]/...`
 * et éviter les doublons historiques `app/(dashboard)/admin/...` sur `/admin` sans préfixe.
 */
export function withLocalePath(locale: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/") return `/${locale}`;
  return `/${locale}${p}`;
}

/** Chemin sans préfixe de locale (/ar/parent → /parent). */
export function pathnameWithoutLocalePrefix(pathname: string): string {
  const raw = pathname || "/";
  const segments = raw.split("/").filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
    const rest = segments.slice(1);
    return rest.length ? `/${rest.join("/")}` : "/";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function hrefForLocaleFromPathname(pathname: string, newLocale: Locale): string {
  const bare = pathnameWithoutLocalePrefix(pathname);
  return withLocalePath(newLocale, bare);
}

/** Met à jour le cookie lue par le middleware next-intl avant un changement de route manuel. */
export function setNextIntlLocaleCookie(locale: Locale): void {
  document.cookie = `${NEXT_INTL_LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}
