# Умный Дом с Алисой — Хаб Сценариев

Контентный портал с пошаговыми руководствами по настройке сценариев автоматизации и решению технических проблем в экосистеме «Умный Дом с Алисой» от Яндекса.

## Стек

- **Astro v6** — статическая генерация (SSG), Zero-JS по умолчанию
- **Vanilla CSS** — дизайн-система на CSS-переменных, светлая/тёмная темы, стекломорфизм
- **TypeScript** — строгий режим (`astro/tsconfigs/strict`)
- **Node.js** ≥ 20

## Быстрый старт

```bash
npm install
npm run dev        # dev-сервер на localhost:4321
npm run build      # продакшн-билд в dist/
npm test           # SEO/a11y/security тесты
npm run typecheck  # проверка типов
```

## Структура

```
src/
├── content/scenarios/   # Markdown-статьи (39 шт., Zod-валидация)
├── pages/               # Страницы (index, 404, about, privacy, сценарии)
├── components/          # Astro-компоненты (Header, Footer, DeviceList, ...)
├── layouts/Layout.astro # Базовый layout с SEO-разметкой
├── styles/global.css    # 520 строк дизайн-системы
└── utils/difficulty.ts  # Хелперы
```

## Деплой

Продакшн на Vercel: `alice-smarthome.ru`.  
`vercel.json` содержит редирект `www → non-www` и security-заголовки.

## Тесты

60 автоматизированных тестов (`tests/seo.test.js`):
- SEO-метаданные, JSON-LD Schema.org, canonical, hreflang
- A11y (skip-link, ARIA, focus-visible, prefers-reduced-motion)
- Безопасность (noopener, внешние ссылки)
- Структура контента, перелинковка, карта сайта

## Контрибьютинг

Статьи пишутся в Markdown с YAML-фронтматтером. Схема валидируется через Zod (`src/content.config.ts`). После добавления статьи запустите `npm test` для проверки SEO-стандартов.

## Лицензия

MIT
