'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';
import type { Locale } from './translations';

export const defaultNS = 'translation';

export const resources = {
  en: { translation: en },
  zh: { translation: zh },
} as const;

const storageKey = 'i18nextLng';

const detectInitialLanguage = (): Locale => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage?.getItem(storageKey);
    if (stored) {
      return stored.startsWith('zh') ? 'zh' : 'en';
    }

    if (window.navigator?.language?.startsWith('zh')) {
      return 'zh';
    }

    const htmlLang = document.documentElement.lang;
    if (htmlLang && htmlLang.startsWith('zh')) {
      return 'zh';
    }
  }

  return 'en';
};

const initialLanguage = detectInitialLanguage();

if (!i18n.isInitialized) {
  void i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      defaultNS,
      initImmediate: false,
      interpolation: {
        escapeValue: false,
      },
    })
    .then(() => {
      // Ensure the language is set correctly after initialization
      if (i18n.language !== initialLanguage) {
        void i18n.changeLanguage(initialLanguage);
      }
    })
    .catch((error) => {
      console.error('Failed to initialize i18next', error);
    });
}

export default i18n;

