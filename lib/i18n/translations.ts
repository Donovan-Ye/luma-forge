export type Locale = 'en' | 'zh';

import type en from './locales/en.json';

export type TranslationRecord = typeof en;

export type TranslationKey = keyof TranslationRecord;

