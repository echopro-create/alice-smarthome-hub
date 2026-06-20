import { NextResponse } from 'next/server';

const locales = ['sv', 'en', 'no', 'ru'];
const defaultLocale = 'sv';

function getLocale(request) {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return defaultLocale;

  // Парсим заголовок Accept-Language (например: "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7")
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

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Проверяем, есть ли уже локаль в пути
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Получаем подходящую локаль
  const locale = getLocale(request);
  
  // Перенаправляем на путь с локалью (например, /about -> /sv/about)
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Пропускаем внутренние запросы Next.js, API и статические файлы (включая папку images)
    '/((?!api|_next/static|_next/image|images|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
