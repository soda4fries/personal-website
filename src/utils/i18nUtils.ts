import type { LanguageCode } from '@/i18n/ui';

/**
 * Replicates Astro's getRelativeLocaleUrl function for use in React components
 * Based on the i18n config: prefixDefaultLocale: false, defaultLocale: 'en'
 */
export function getRelativeLocaleUrl(
  locale: LanguageCode,
  path: string = ''
): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Since prefixDefaultLocale is false and defaultLocale is 'en'
  // For 'en' locale, don't add prefix
  if (locale === 'en') {
    return cleanPath;
  }

  // For other locales, add the locale prefix
  return `/${locale}${cleanPath}`;
}
