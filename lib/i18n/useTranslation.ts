'use client';

import { useCallback } from 'react';
import { useTranslation as useI18NextTranslation } from 'react-i18next';
import type { TranslationKey } from './translations';
import { useLocale } from '@/providers/LocaleProvider';

type TemplateReplacements = Record<string, string | number>;

export function useTranslation() {
  const { locale } = useLocale();
  const { t: i18nT } = useI18NextTranslation();

  const t = useCallback(
    (key: TranslationKey, replacements?: TemplateReplacements) =>
      i18nT(key, replacements),
    [i18nT],
  );

  return { t, locale };
}

