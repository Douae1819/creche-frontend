'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { locales, type Locale, localeNames, localeFlags } from '@/lib/i18n/config';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  hrefForLocaleFromPathname,
  setNextIntlLocaleCookie,
} from '@/lib/i18n/locale-path';

export function LanguageSwitcher({
  currentLocale,
  variant = 'menu',
}: {
  currentLocale: Locale;
  variant?: 'menu' | 'toggle';
}) {
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    setNextIntlLocaleCookie(newLocale);
    router.replace(hrefForLocaleFromPathname(pathname || '/', newLocale));
  };

  if (variant === 'toggle') {
    return (
      <div
        className="flex w-full rounded-lg border border-sidebar-border bg-sidebar-accent/15 p-0.5"
        role="group"
        aria-label="Langue"
      >
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => switchLanguage(locale)}
            className={cn(
              'flex-1 rounded-md px-2 py-2 text-xs font-semibold transition-all',
              locale === currentLocale
                ? 'bg-background text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border/80'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/25',
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span aria-hidden>{localeFlags[locale]}</span>
              <span>{locale === 'fr' ? 'FR' : 'عربي'}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{localeFlags[currentLocale]}</span>
          <span className="hidden sm:inline">{localeNames[currentLocale]}</span>
          <span className="sr-only">Changer de langue</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLanguage(locale)}
            className="flex items-center gap-2"
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            <span>{localeFlags[locale]}</span>
            <span>{localeNames[locale]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
