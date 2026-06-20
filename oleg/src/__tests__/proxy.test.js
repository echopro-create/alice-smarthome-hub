import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '../proxy';

// Мокаем NextResponse.redirect
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: vi.fn((url) => ({
        status: 307,
        headers: { get: () => url.toString(), location: url.toString() },
        url: url.toString(),
      })),
    },
  };
});

describe('Middleware i18n Routing', () => {
  it('should ignore paths that already have a valid locale prefix', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/contacts'));
    const res = proxy(req);
    // middleware не должен возвращать редирект (res === undefined)
    expect(res).toBeUndefined();
  });

  it('should redirect to default locale (sv) if Accept-Language header is missing', () => {
    const req = new NextRequest(new URL('http://localhost:3000/contacts'));
    // Убираем Accept-Language заголовок
    req.headers.delete('accept-language');

    proxy(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectedUrl = NextResponse.redirect.mock.calls[0][0].toString();
    expect(redirectedUrl).toBe('http://localhost:3000/sv/contacts');
  });

  it('should parse Accept-Language and redirect to matching locale (ru)', () => {
    const req = new NextRequest(new URL('http://localhost:3000/about'));
    req.headers.set('accept-language', 'ru-RU,ru;q=0.9,en-US;q=0.8');

    proxy(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectedUrl = NextResponse.redirect.mock.calls[NextResponse.redirect.mock.calls.length - 1][0].toString();
    expect(redirectedUrl).toBe('http://localhost:3000/ru/about');
  });

  it('should fallback to default locale (sv) if Accept-Language contains only unsupported locales', () => {
    const req = new NextRequest(new URL('http://localhost:3000/services'));
    req.headers.set('accept-language', 'fr-FR,fr;q=0.9,de;q=0.8');

    proxy(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectedUrl = NextResponse.redirect.mock.calls[NextResponse.redirect.mock.calls.length - 1][0].toString();
    expect(redirectedUrl).toBe('http://localhost:3000/sv/services');
  });
});
