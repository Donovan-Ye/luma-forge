'use client';

import { useLocale } from '@/providers/LocaleProvider';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Locale } from '@/lib/i18n/translations';

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();

  const options: Array<{ value: Locale; label: string }> = [
    { value: 'en', label: t('languageEnglish') },
    { value: 'zh', label: t('languageChinese') },
  ];

  return (
    <div
      role="group"
      aria-label={t('languageLabel')}
      className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/40 p-0.5 text-[10px] uppercase tracking-wide text-zinc-400"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLocale(option.value)}
          className={`px-2 py-1 rounded-full transition-colors ${
            locale === option.value
              ? 'bg-zinc-100 text-zinc-900'
              : 'hover:text-zinc-100'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

