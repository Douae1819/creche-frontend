import { NextRequest, NextResponse } from "next/server";

const LOCALES = new Set(["fr", "ar"]);
const DASHBOARD_SEGMENTS = new Set(["admin", "teacher", "parent"]);

type AppRole = "ADMIN" | "SUPER_ADMIN" | "ENSEIGNANT" | "PARENT" | "";

function decodeJwtRole(token?: string): AppRole {
  if (!token) return "";
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return "";
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
    const payload = JSON.parse(atob(base64 + pad)) as { role?: string };
    const role = String(payload.role ?? "").toUpperCase();
    if (
      role === "ADMIN" ||
      role === "SUPER_ADMIN" ||
      role === "ENSEIGNANT" ||
      role === "PARENT"
    ) {
      return role;
    }
    return "";
  } catch {
    return "";
  }
}

function homeForLocale(locale: string): string {
  return `/${locale}`;
}

function dashboardForRole(locale: string, role: AppRole): string {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return `/${locale}/admin`;
  if (role === "ENSEIGNANT") return `/${locale}/teacher`;
  if (role === "PARENT") return `/${locale}/parent`;
  return homeForLocale(locale);
}

function canAccessSegment(role: AppRole, segment: string): boolean {
  if (segment === "admin") return role === "ADMIN" || role === "SUPER_ADMIN";
  if (segment === "teacher") return role === "ENSEIGNANT";
  if (segment === "parent") return role === "PARENT";
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return NextResponse.next();

  const locale = segments[0];
  const appSection = segments[1];
  if (!LOCALES.has(locale) || !DASHBOARD_SEGMENTS.has(appSection)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value || req.cookies.get("auth_token")?.value;
  const role = decodeJwtRole(token);

  if (!token || !role) {
    return NextResponse.redirect(new URL(homeForLocale(locale), req.url));
  }

  if (!canAccessSegment(role, appSection)) {
    return NextResponse.redirect(new URL(dashboardForRole(locale, role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:locale(fr|ar)/admin/:path*", "/:locale(fr|ar)/teacher/:path*", "/:locale(fr|ar)/parent/:path*"],
};

