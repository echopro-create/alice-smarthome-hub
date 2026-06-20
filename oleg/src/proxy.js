import { NextResponse } from 'next/server';

const locales = ['sv', 'en', 'no', 'ru'];
const defaultLocale = 'sv';

function getLocale(request) {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return defaultLocale;

  const parsedLanguages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, q = 'q=1'] = lang.split(';');
      const quality = parseFloat(q.split('=')[1] || '1');
      return { code: code.trim().split('-')[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const lang of parsedLanguages) {
    if (locales.includes(lang.code)) {
      return lang.code;
    }
  }

  return defaultLocale;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  const locale = getLocale(request);

  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
