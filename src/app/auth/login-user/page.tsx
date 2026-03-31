"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

/** Anciens liens / auth interceptors : même destination que `/{locale}` (formulaire de connexion). */
function loginHomeHref(): string {
  const c = Cookies.get("NEXT_LOCALE");
  const loc: Locale = c && locales.includes(c as Locale) ? (c as Locale) : defaultLocale;
  return `/${loc}`;
}

export default function AuthLoginUserFallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(loginHomeHref());
  }, [router]);

  return null;
}
