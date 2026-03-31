"use client";

import { NextIntlClientProvider } from 'next-intl';
import { I18nProvider } from '@/providers/i18n-provider';
import { ReactNode, useEffect, useState, use } from 'react';
import { Locale, defaultLocale } from '@/lib/i18n/config';

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = use(params);
  const locale = resolvedParams.locale as Locale;
  
  const [messages, setMessages] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      // Valider que la locale est définie
      if (!locale) {
        console.error('Locale is undefined, using default locale');
        return;
      }

      try {
        const messagesModule = await import(`@/messages/${locale}.json`);
        setMessages(messagesModule.default);
      } catch (error) {
        console.error(`Failed to load messages for locale: ${locale}`, error);
        // Fallback to default locale
        try {
          const fallbackModule = await import(`@/messages/${defaultLocale}.json`);
          setMessages(fallbackModule.default);
        } catch (fallbackError) {
          console.error('Failed to load fallback messages', fallbackError);
          setMessages({});
        }
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [locale]);

  const loadingLabel = locale === 'ar' ? 'جاري التحميل…' : 'Chargement…';

  if (loading || !locale) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        {loadingLabel}
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <I18nProvider initialLocale={locale}>
        {children}
      </I18nProvider>
    </NextIntlClientProvider>
  );
}
