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

// Only detect and initialize on client side to prevent SSR mismatch
let initialLanguage: Locale = 'en';
let initPromise: Promise<void> | null = null;

if (typeof window !== 'undefined') {
  initialLanguage = detectInitialLanguage();

  if (!i18n.isInitialized) {
    // Pre-set language on i18n instance to prevent English flash
    // This ensures react-i18next uses the correct language immediately
    try {
      // Try to set language directly before initialization
      if ('language' in i18n) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i18n as any).language = initialLanguage;
      }
    } catch {
      // Ignore if we can't set it directly
    }

    initPromise = i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: initialLanguage,
        fallbackLng: 'en',
        defaultNS,
        initImmediate: true, // Initialize immediately to prevent async delay
      })
      .then(() => {
        // Double-check language is correct after init
        if (i18n.language !== initialLanguage) {
          return i18n.changeLanguage(initialLanguage).then(() => {
            // Ensure we return void
            return undefined;
          });
        }
        return undefined;
      })
      .then(() => undefined) // Ensure promise resolves to void
      .catch((error) => {
        console.error('Failed to initialize i18next', error);
        // Don't throw - resolve anyway to prevent blocking
        return undefined;
      });
  } else {
    // Already initialized, create resolved promise
    initPromise = Promise.resolve();
  }
} else {
  // Server-side, create resolved promise
  initPromise = Promise.resolve();
}

/**
 * Returns a promise that resolves when i18n is initialized.
 * This can be used with React Suspense to wait for i18n to be ready.
 */
export function waitForI18n(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }
  // If for some reason initPromise is null, check if already initialized
  if (i18n.isInitialized) {
    return Promise.resolve();
  }
  // Otherwise, wait a bit and check again (shouldn't happen in practice)
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (i18n.isInitialized) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 10);
    // Fallback timeout
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 1000);
  });
}

export default i18n;

