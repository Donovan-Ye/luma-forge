'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n/translations';
import i18n from '@/lib/i18n/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const DEFAULT_LOCALE: Locale = 'en';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = i18n.language || i18n.resolvedLanguage || DEFAULT_LOCALE;
    return (initial === 'zh' ? 'zh' : 'en') as Locale;
  });

  // Keep local state in sync if i18next language changes from elsewhere
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setLocaleState((lng === 'zh' ? 'zh' : 'en') as Locale);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    }
  }, [locale]);

  const updateLocale = useCallback((nextLocale: Locale | ((prev: Locale) => Locale)) => {
    setLocaleState((prev) => {
      const resolved = typeof nextLocale === 'function' ? nextLocale(prev) : nextLocale;

      if (i18n.language !== resolved) {
        void i18n.changeLanguage(resolved).catch((error) => {
          console.error('Failed to change language', error);
        });
        // Manually save to localStorage since we removed LanguageDetector
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('i18nextLng', resolved);
        }
      }

      return resolved;
    });
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
  }, [updateLocale]);

  const toggleLocale = useCallback(() => {
    updateLocale((prev) => (prev === 'en' ? 'zh' : 'en'));
  }, [updateLocale]);

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale],
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}

