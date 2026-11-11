export const locales = ['ja', 'zh', 'en'] as const;
export type Locale = typeof locales[number];
export const localeKey = 'kongPortfolio.language';

export function resolveLocale(saved: string | null, languages: readonly string[]): Locale {
  if (locales.includes(saved as Locale)) return saved as Locale;
  for (const language of languages) {
    const base = language.toLowerCase().split(/[-_]/)[0];
    if (locales.includes(base as Locale)) return base as Locale;
  }
  return 'ja';
}

export function initialLocale(): Locale {
  let saved = null;
  try { saved = localStorage.getItem(localeKey) ?? localStorage.getItem('kongProtolio.language') ?? localStorage.getItem('kongortfolio.language'); } catch { /* Private/storage-disabled browsing. */ }
  return resolveLocale(saved, navigator.languages?.length ? navigator.languages : [navigator.language]);
}

export function rememberLocale(locale: Locale) {
  try { localStorage.setItem(localeKey, locale); } catch { /* Selection still works for this visit. */ }
}

export { copy } from './ui';
