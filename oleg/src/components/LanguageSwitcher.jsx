'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './LanguageSwitcher.module.css';

const locales = [
  { code: 'sv', label: 'SV' },
  { code: 'en', label: 'EN' },
  { code: 'no', label: 'NO' },
  { code: 'ru', label: 'RU' }
];

export default function LanguageSwitcher() {
  const pathname = usePathname();

  if (!pathname) return null;

  // Извлекаем текущую локаль из пути (например, /sv/contacts -> sv)
  const segments = pathname.split('/');
  const currentLocale = segments[1];

  const getRedirectPath = (locale) => {
    const newSegments = [...segments];
    newSegments[1] = locale;
    return newSegments.join('/') || '/';
  };

  return (
    <div className={styles.switcher} aria-label="Language Selector">
      {locales.map((locale) => {
        const isActive = currentLocale === locale.code;
        return (
          <Link
            key={locale.code}
            href={getRedirectPath(locale.code)}
            className={`${styles.langLink} ${isActive ? styles.active : ''}`}
          >
            {locale.label}
          </Link>
        );
      })}
    </div>
  );
}
