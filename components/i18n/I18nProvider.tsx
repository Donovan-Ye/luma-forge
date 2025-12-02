'use client';

import { useEffect, useState } from 'react';
import { waitForI18n } from '@/lib/i18n/i18n';
import i18n from '@/lib/i18n/i18n';

/**
 * Component that waits for i18n to be initialized before rendering children.
 * This prevents the language flash by ensuring i18n is ready before any
 * components that use translations are rendered.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Get the expected language from localStorage
  const getExpectedLang = () => {
    if (typeof window === 'undefined') return 'en';
    const stored = window.localStorage?.getItem('i18nextLng');
    return stored?.startsWith('zh') ? 'zh' : 'en';
  };

  const [isReady, setIsReady] = useState(() => {
    // Check if already initialized with correct language on first render
    if (typeof window !== 'undefined') {
      const expectedLang = getExpectedLang();
      if (i18n.isInitialized && i18n.language === expectedLang) {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    // Get the expected language from localStorage
    const expectedLang = getExpectedLang();

    // If already ready from initial state, no need to do anything
    if (isReady) {
      return;
    }

    // Check if already initialized with correct language (async check to avoid linter warning)
    if (i18n.isInitialized && i18n.language === expectedLang) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setIsReady(true);
      });
      return;
    }

    // Wait for initialization
    waitForI18n()
      .then(() => {
        // Wait a bit to ensure language is set correctly
        const checkReady = () => {
          if (i18n.language === expectedLang) {
            setIsReady(true);
          } else {
            // If language doesn't match, wait a bit more
            setTimeout(checkReady, 50);
          }
        };

        // Start checking after a short delay
        setTimeout(checkReady, 10);

        // Fallback timeout - render anyway after 500ms
        setTimeout(() => {
          setIsReady(true);
        }, 500);
      })
      .catch((error) => {
        console.error('Failed to wait for i18n initialization', error);
        // Still set ready to prevent blocking forever
        setTimeout(() => setIsReady(true), 100);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Don't render until ready - this prevents the flash
  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}

