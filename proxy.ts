import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./src/lib/i18n/config";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/(fr|ar)/:path*",
  ],
};
