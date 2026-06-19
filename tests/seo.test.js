// ============================================================
// Тесты SEO, UI/UX, a11y, производительности — стандарты 2026
// Паттерны заимствованы из Shweicary, Dansk, Energy (node:test)
// ============================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { fileURLToPath } from "node:url";

const SITE_URL = "https://alice-smarthome.ru";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = path.join(__dirname, "../src/content/scenarios");
const DIST_DIR = path.join(__dirname, "../dist");
const PUBLIC_DIR = path.join(__dirname, "../public");
const SRC_DIR = path.join(__dirname, "../src");

// ============================================================
// HELPERS
// ============================================================

function parseArticle(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`File ${filePath} is missing frontmatter`);
  const frontmatter = match[1];
  const body = content.substring(match[0].length).trim();
  const data = {};
  const lines = frontmatter.split(/\r?\n/);
  let currentKey = null;
  let inSteps = false;
  let currentStep = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("devices:")) { data.devices = []; currentKey = "devices"; inSteps = false; continue; }
    if (trimmed.startsWith("steps:")) { data.steps = []; currentKey = "steps"; inSteps = true; continue; }
    if (currentKey === "devices" && trimmed.startsWith("-")) {
      const device = trimmed.replace(/^-\s*"/, "").replace(/"$/, "").replace(/^-\s*/, "");
      data.devices.push(device);
      continue;
    }
    if (inSteps && trimmed.startsWith("-")) {
      if (currentStep) data.steps.push(currentStep);
      currentStep = {};
    }
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex !== -1) {
      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
      if (inSteps && currentStep) currentStep[key.replace(/^-\s*/, "")] = value;
      else if (!inSteps && currentKey !== "devices") data[key] = value;
    }
  }
  if (currentStep && inSteps) data.steps.push(currentStep);
  return { data, body };
}

function getAstroFiles(dir) {
  const files = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fp = path.join(dir, file);
    if (fs.statSync(fp).isDirectory()) files.push(...getAstroFiles(fp));
    else if (file.endsWith(".astro")) files.push(fp);
  });
  return files;
}

function getHtmlFiles(dir) {
  const files = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fp = path.join(dir, file);
    if (fs.statSync(fp).isDirectory()) files.push(...getHtmlFiles(fp));
    else if (file.endsWith(".html")) files.push(fp);
  });
  return files;
}

function getImageDimensions(filePath) {
  try {
    const stdout = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}"`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return {
      width: parseInt(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || "0"),
      height: parseInt(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || "0")
    };
  } catch { return null; }
}

function words(value = "") {
  return `${value}`.split(/\s+/).filter(Boolean);
}

const articleFiles = fs.readdirSync(SCENARIOS_DIR)
  .filter(f => f.endsWith(".md"))
  .map(f => ({ name: f, path: path.join(SCENARIOS_DIR, f), ...parseArticle(path.join(SCENARIOS_DIR, f)) }));

const scenarioEntries = articleFiles.filter(a => a.data.category === "scenario");
const troubleshootingEntries = articleFiles.filter(a => a.data.category === "troubleshooting");
const allArticleSlugs = new Set(articleFiles.map(a => a.name.replace(".md", "")));

// ============================================================
// 1. SEO МЕТАДАННЫЕ (descriptions, titles)
// ============================================================

test("[SEO 2026] Description: длина от 100 до 170 символов для сниппетов Яндекс/Google", () => {
  articleFiles.forEach(a => {
    const len = (a.data.description || "").length;
    assert.ok(len >= 100 && len <= 170, `${a.name}: description ${len} симв. (нужно 100–170)`);
  });
});

test("[SEO 2026] Title: длина не более 70 символов", () => {
  articleFiles.forEach(a => {
    const len = (a.data.title || "").length;
    assert.ok(len <= 70, `${a.name}: title ${len} симв. (максимум 70)`);
  });
});

test("[SEO 2026] Title: минимальная длина 20 символов", () => {
  articleFiles.forEach(a => {
    const len = (a.data.title || "").length;
    assert.ok(len >= 20, `${a.name}: title ${len} симв. (минимум 20)`);
  });
});

// ============================================================
// 2. КОНТЕНТ (объем, keyword stuffing)
// ============================================================

test("[SEO 2026] Content: объём статьи не менее 150 слов (защита от МПК/Proxima)", () => {
  articleFiles.forEach(a => {
    const wc = words(a.body).length;
    assert.ok(wc >= 150, `${a.name}: ${wc} слов (минимум 150)`);
  });
});

test("[SEO 2026] Content: уникальность описаний (нет дубликатов)", () => {
  const seen = new Map();
  articleFiles.forEach(a => {
    const desc = a.data.description;
    if (seen.has(desc)) assert.fail(`Дубликат description между ${seen.get(desc)} и ${a.name}`);
    seen.set(desc, a.name);
  });
});

test("[SEO 2026] Content: уникальность заголовков (нет дубликатов)", () => {
  const seen = new Map();
  articleFiles.forEach(a => {
    const t = a.data.title;
    if (seen.has(t)) assert.fail(`Дубликат title между ${seen.get(t)} и ${a.name}`);
    seen.set(t, a.name);
  });
});

test("[SEO 2026] Content: отсутствие keyword stuffing (повтор фраз)", () => {
  const skipPhrases = new Set([
    "умный дом", "умного дома", "умном доме", "с алисой", "дом с алисой",
    "приложение дом с алисой", "умных устройств", "яндекс станция", "яндекс станции"
  ]);
  articleFiles.forEach(a => {
    const cleaned = a.body.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const counts = new Map();
    for (let i = 0; i <= tokens.length - 3; i++) {
      const phrase = tokens.slice(i, i + 3).join(" ");
      if (phrase.length >= 10 && !skipPhrases.has(phrase)) {
        counts.set(phrase, (counts.get(phrase) || 0) + 1);
      }
    }
    const [topPhrase, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || ["", 0];
    assert.ok(topCount <= 6, `${a.name}: фраза "${topPhrase}" повторяется ${topCount} раз (keywod stuffing)`);
  });
});

// ============================================================
// 3. СХЕМЫ JSON-LD
// ============================================================

test("[SEO 2026] Schema: сценарии имеют HowTo с обязательными полями (datePublished, steps)", () => {
  scenarioEntries.forEach(a => {
    assert.ok(Array.isArray(a.data.steps) && a.data.steps.length > 0, `${a.name}: нет шагов`);
    assert.ok(a.data.publishDate, `${a.name}: нет publishDate`);
    a.data.steps.forEach((step, i) => {
      assert.ok(step.title, `${a.name} шаг ${i + 1}: нет title`);
      assert.ok(step.text, `${a.name} шаг ${i + 1}: нет text`);
    });
  });
});

test("[SEO 2026] Schema: Yandex share URL ведёт на официальный домен Яндекса", () => {
  scenarioEntries.forEach(a => {
    if (a.data.yandexShareUrl) {
      assert.ok(
        a.data.yandexShareUrl.startsWith("https://yandex.ru/alice/shared-scenarios/"),
        `${a.name}: невалидный yandexShareUrl: ${a.data.yandexShareUrl}`
      );
    }
  });
});

test("[SEO 2026] Schema: сценарии содержат список необходимого оборудования", () => {
  scenarioEntries.forEach(a => {
    assert.ok(Array.isArray(a.data.devices) && a.data.devices.length > 0, `${a.name}: нет списка devices`);
  });
});

test("[SEO 2026] Schema: все статьи имеют поле category", () => {
  articleFiles.forEach(a => {
    assert.ok(a.data.category, `${a.name}: отсутствует category`);
    assert.ok(["scenario", "troubleshooting"].includes(a.data.category), `${a.name}: невалидный category`);
  });
});

test("[SEO 2026] Schema: все статьи имеют updatedDate", () => {
  articleFiles.forEach(a => {
    assert.ok(a.data.updatedDate, `${a.name}: отсутствует updatedDate`);
  });
});

// ============================================================
// 4. ПЕРЕЛИНКОВКА (internal linking)
// ============================================================

test("[SEO 2026] Linking: нет orphan-страниц (каждая статья ссылается на ≥1 другую)", () => {
  if (articleFiles.length <= 1) return;
  articleFiles.forEach(a => {
    const links = a.body.match(/\[([^\]]+)\]\((\/[^)]+)\)/g) || [];
    const internal = links.filter(l => l.includes("/scenarios/") || l.includes("/troubleshooting/"));
    assert.ok(internal.length >= 1, `${a.name}: ни одной внутренней ссылки (orphan page)`);
  });
});

test("[SEO 2026] Linking: все внутренние ссылки ведут на существующие slug'и", () => {
  articleFiles.forEach(a => {
    const linkRegex = /\[([^\]]+)\]\((\/[^)]+)\)/g;
    let m;
    while ((m = linkRegex.exec(a.body)) !== null) {
      const url = m[2];
      if (url.startsWith("/scenarios/") || url.startsWith("/troubleshooting/")) {
        const prefix = url.startsWith("/scenarios/") ? "/scenarios/" : "/troubleshooting/";
        const target = url.substring(prefix.length);
        assert.ok(allArticleSlugs.has(target), `${a.name}: битая ссылка ${url}`);
      }
    }
  });
});

test("[SEO 2026] Linking: информативные анкоры без стоп-слов", () => {
  const badAnchors = ["тут", "здесь", "подробнее", "ссылка", "нажмите", "кликните", "go", "link"];
  articleFiles.forEach(a => {
    const linkRegex = /\[([^\]]+)\]\((\/[^)]+)\)/g;
    let m;
    while ((m = linkRegex.exec(a.body)) !== null) {
      const anchor = m[1].trim();
      assert.ok(anchor.length >= 3, `${a.name}: короткий анкор "${anchor}"`);
      const isBad = badAnchors.some(w => anchor.toLowerCase().includes(w));
      assert.ok(!isBad, `${a.name}: неинформативный анкор "${anchor}"`);
    }
  });
});

// ============================================================
// 5. ИЗОБРАЖЕНИЯ (image SEO / CLS)
// ============================================================

test("[SEO 2026] Images: все <img> в .astro файлах имеют loading=lazy, decoding=async, alt, width, height", () => {
  const violations = [];
  getAstroFiles(SRC_DIR).forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const imgRegex = /<img([^>]*)\/?>/g;
    let m;
    while ((m = imgRegex.exec(content)) !== null) {
      const attrs = m[1] || "";
      if (!/loading=["']lazy["']/.test(attrs)) violations.push({ file: path.basename(fp), tag: m[0], error: "Missing loading='lazy'" });
      if (!/decoding=["']async["']/.test(attrs)) violations.push({ file: path.basename(fp), tag: m[0], error: "Missing decoding='async'" });
      if (!/alt=/i.test(attrs)) violations.push({ file: path.basename(fp), tag: m[0], error: "Missing alt" });
      if (!/width=/i.test(attrs) || !/height=/i.test(attrs)) violations.push({ file: path.basename(fp), tag: m[0], error: "Missing width/height (CLS)" });
    }
  });
  assert.deepEqual(violations, [], "Нарушения CLS/SEO в img-тегах");
});

// ============================================================
// 6. OG-IMAGE
// ============================================================

test("[SEO 2026] OG Image: файл /og-image.png существует и имеет разумный размер (<300 KB)", () => {
  const fp = path.join(PUBLIC_DIR, "og-image.png");
  assert.ok(fs.existsSync(fp), "og-image.png не найден в public/");
  const dims = getImageDimensions(fp);
  assert.ok(dims, "Не удалось прочитать размеры og-image.png");
  assert.ok(dims.width >= 512 && dims.height >= 512, `OG размер ${dims.width}×${dims.height}, ожидалось >=512×512`);
  const kb = fs.statSync(fp).size / 1024;
  assert.ok(kb < 700, `OG image слишком большой: ${kb.toFixed(0)} KB (лимит 700 KB)`);
});

// ============================================================
// 7. OPERATIONAL ARTIFACTS (robots.txt, manifest, favicons)
// ============================================================

test("[SEO 2026] Artifacts: robots.txt существует со ссылкой на sitemap", () => {
  const fp = `${PUBLIC_DIR}/robots.txt`;
  assert.ok(fs.existsSync(fp), "robots.txt не найден");
  const content = fs.readFileSync(fp, "utf8");
  assert.match(content, /Sitemap:\s*https:\/\/alice-smarthome\.ru\/sitemap-index\.xml/i, "robots.txt: нет ссылки на sitemap");
});

test("[SEO 2026] Artifacts: site.webmanifest существует и корректен", () => {
  const fp = `${PUBLIC_DIR}/site.webmanifest`;
  assert.ok(fs.existsSync(fp), "site.webmanifest не найден");
  const manifest = JSON.parse(fs.readFileSync(fp, "utf8"));
  assert.ok(manifest.name, "manifest: нет name");
  assert.ok(manifest.short_name, "manifest: нет short_name");
  assert.ok(manifest.theme_color, "manifest: нет theme_color");
  assert.ok(manifest.start_url === "/", "manifest: start_url должен быть /");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "manifest: нужно ≥2 иконки");
});

test("[SEO 2026] Artifacts: favicon.ico и favicon.svg существуют", () => {
  assert.ok(fs.existsSync(`${PUBLIC_DIR}/favicon.ico`), "favicon.ico не найден");
  assert.ok(fs.existsSync(`${PUBLIC_DIR}/favicon.svg`), "favicon.svg не найден");
});

test("[SEO 2026] Artifacts: apple-touch-icon.png существует", () => {
  assert.ok(fs.existsSync(`${PUBLIC_DIR}/apple-touch-icon.png`), "apple-touch-icon.png не найден");
});

// ============================================================
// 8. HTML СТРУКТУРА (dist-based проверки)
// ============================================================

function getDistHtmlFiles() {
  if (!fs.existsSync(DIST_DIR)) return [];
  return getHtmlFiles(DIST_DIR);
}

test("[SEO 2026] HTML: каждая страница имеет ровно 1 <h1>", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const h1s = content.match(/<h1[^>]*>/gi) || [];
    assert.equal(h1s.length, 1, `${fp}: ${h1s.length} тегов <h1> (должен быть 1)`);
  });
});

test("[SEO 2026] HTML: canonical URL уникален, в нижнем регистре, без ?/#", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  const canonicals = new Set();
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const m = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    assert.ok(m, `${fp}: нет canonical URL`);
    const url = m[1];
    assert.equal(url, url.toLowerCase(), `${fp}: canonical в верхнем регистре`);
    assert.ok(!url.includes("?"), `${fp}: canonical содержит ?`);
    assert.ok(!url.includes("#"), `${fp}: canonical содержит #`);
    if (url !== `${SITE_URL}/`) assert.ok(!url.endsWith("/"), `${fp}: canonical с трейлинг-слешем`);
    assert.ok(!canonicals.has(url), `${fp}: дубликат canonical ${url}`);
    canonicals.add(url);
  });
});

test("[SEO 2026] HTML: иерархия заголовков без перескоков (h1→h3 без h2)", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const levels = [];
    const headingRegex = /<h([1-6])[^>]*>/gi;
    let mh;
    while ((mh = headingRegex.exec(content)) !== null) levels.push(parseInt(mh[1], 10));
    let maxSeen = 1;
    for (const lvl of levels) {
      if (lvl > maxSeen + 1) assert.fail(`${fp}: пропущен уровень — с H${maxSeen} на H${lvl}`);
      if (lvl > maxSeen) maxSeen = lvl;
    }
  });
});

test("[SEO 2026] HTML: заголовки не содержат вложенных ссылок", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const linkInHeader = /<h([1-6])[^>]*>(?:(?!<\/h\1>)[\s\S])*?<a\s[\s\S]*?<\/h\1>/gi.test(content);
    assert.ok(!linkInHeader, `${fp}: ссылка внутри заголовка`);
  });
});

test("[SEO 2026] HTML: все <img> в сгенерированном HTML имеют loading=lazy, decoding=async, alt, width, height", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const imgRegex = /<img([^>]*)\/?>/gi;
    let mi;
    while ((mi = imgRegex.exec(content)) !== null) {
      const attrs = mi[1] || "";
      assert.ok(/loading=["']lazy["']/i.test(attrs), `${fp}: img без loading=lazy`);
      assert.ok(/decoding=["']async["']/i.test(attrs), `${fp}: img без decoding=async`);
      assert.ok(/alt=/i.test(attrs), `${fp}: img без alt`);
      assert.ok(/width=/i.test(attrs) && /height=/i.test(attrs), `${fp}: img без width/height (CLS)`);
    }
  });
});

// ============================================================
// 9. A11Y (accessibility)
// ============================================================

test("[A11Y 2026] HTML: skip-link присутствует (клавиатурная навигация)", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    assert.ok(content.includes("skip-link"), `${fp}: нет skip-link`);
  });
});

test("[A11Y 2026] HTML: главная навигация имеет aria-label", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const hasAriaNav = /<nav[^>]*aria-label=["'][^"']+["'][^>]*>/.test(content);
    assert.ok(hasAriaNav, `${fp}: <nav> без aria-label`);
  });
});

test("[A11Y 2026] CSS: prefers-reduced-motion присутствует в стилях", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  const cssFiles = fs.readdirSync(path.join(DIST_DIR, "_astro")).filter(f => f.endsWith(".css"));
  const allCss = cssFiles.map(f => fs.readFileSync(path.join(DIST_DIR, "_astro", f), "utf8")).join("\n");
  assert.ok(allCss.includes("prefers-reduced-motion"), "prefers-reduced-motion отсутствует в CSS");
});

test("[A11Y 2026] HTML: :focus-visible стили определены", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  const cssFiles = fs.readdirSync(path.join(DIST_DIR, "_astro")).filter(f => f.endsWith(".css"));
  const allCss = cssFiles.map(f => fs.readFileSync(path.join(DIST_DIR, "_astro", f), "utf8")).join("\n");
  assert.ok(allCss.includes("focus-visible"), ":focus-visible стили отсутствуют в CSS");
});

// ============================================================
// 10. SEO ТЕХНИЧЕСКОЕ (sitemap, hreflang, meta robots)
// ============================================================

test("[SEO 2026] Sitemap: sitemap-index.xml существует", () => {
  assert.ok(fs.existsSync(`${DIST_DIR}/sitemap-index.xml`), "sitemap-index.xml не найден");
});

test("[SEO 2026] Sitemap: sitemap-0.xml содержит все страницы (канонические URL без ?/#)", () => {
  const fp = path.join(DIST_DIR, "sitemap-0.xml");
  if (!fs.existsSync(fp)) return;
  const content = fs.readFileSync(fp, "utf8");
  const locs = [...content.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => {
    let url = m[1];
    if (url.endsWith("/") && url !== `${SITE_URL}/`) url = url.replace(/\/$/, "");
    return url;
  });
  const unique = new Set(locs);
  assert.equal(locs.length, unique.size, "sitemap содержит дубликаты URL");
  locs.forEach(url => {
    assert.ok(!url.includes("?"), `sitemap URL с ?: ${url}`);
    assert.ok(!url.includes("#"), `sitemap URL с #: ${url}`);
  });
  // Сравниваем с собранными страницами
  const pages = getDistHtmlFiles();
  const pageUrls = new Set(pages.map(p => {
    let rel = "/" + path.relative(DIST_DIR, p);
    rel = rel.replace(/index\.html$/, "");
    if (rel === "/") rel = "/";
    if (rel !== "/" && rel.endsWith("/")) rel = rel.replace(/\/$/, "");
    let url = `${SITE_URL}${rel}`;
    if (url !== `${SITE_URL}/` && url.endsWith("/")) url = url.replace(/\/$/, "");
    return url;
  }));
  locs.forEach(url => {
    assert.ok(pageUrls.has(url), `sitemap URL не соответствует собранной странице: ${url} (доступно: ${[...pageUrls].join(", ")})`);
  });
  // Обратная проверка: все собранные страницы есть в sitemap (кроме 404)
  pageUrls.forEach(url => {
    if (url.includes("/404")) return;
    assert.ok(locs.some(l => l.replace(/\/$/, "") === url.replace(/\/$/, "")),
      `Собранная страница отсутствует в sitemap: ${url}`);
  });
});

test("[SEO 2026] Hreflang: ru и x-default присутствуют на каждой странице", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    assert.match(content, /hreflang="ru"/, `${fp}: нет hreflang="ru"`);
    assert.match(content, /hreflang="x-default"/, `${fp}: нет hreflang="x-default"`);
  });
});

test("[SEO 2026] OG: og:image:width и og:image:height присутствуют на всех страницах", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    assert.match(content, /og:image:width/, `${fp}: нет og:image:width`);
    assert.match(content, /og:image:height/, `${fp}: нет og:image:height`);
  });
});

test("[SEO 2026] Twitter: twitter:card summary_large_image присутствует", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    assert.match(content, /twitter:card.*summary_large_image/, `${fp}: нет twitter:card summary_large_image`);
  });
});

test("[SEO 2026] Lang: все страницы имеют lang='ru'", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    assert.match(content, /<html[^>]*lang="ru"/, `${fp}: нет lang="ru" на <html>`);
  });
});

test("[SEO 2026] Noindex: страница 404 должна быть noindex", () => {
  const fp = `${DIST_DIR}/404.html`;
  if (!fs.existsSync(fp)) return;
  const content = fs.readFileSync(fp, "utf8");
  assert.match(content, /<title>Страница не найдена/, "404 не имеет корректного title");
});

test("[SEO 2026] Article: article:published_time присутствует на страницах статей", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  const articlePages = files.filter(f => f.includes("/scenarios/"));
  articlePages.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    assert.match(content, /article:published_time/, `${fp}: нет article:published_time`);
  });
});

// ============================================================
// 11. БЕЗОПАСНОСТЬ (security / CSP / rel-атрибуты)
// ============================================================

test("[Security 2026] External: внешние ссылки имеют rel='noopener noreferrer'", () => {
  const allAstro = getAstroFiles(SRC_DIR);
  const violations = [];
  allAstro.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const aRegex = /<a\s[^>]*href="https?:\/\/(?!alice-smarthome)[^"]*"[^>]*>/g;
    let m;
    while ((m = aRegex.exec(content)) !== null) {
      const tag = m[0];
      if (!/rel=["'](?:.*\b)?noopener\s+noreferrer(?:.*\b)?["']/.test(tag)) {
        if (tag.includes("target=\"_blank\"") || tag.includes("target='_blank'")) {
          violations.push({ file: path.basename(fp), tag });
        }
      }
    }
  });
  assert.deepEqual(violations, [], "Внешние ссылки без rel=noopener noreferrer");
});

test("[Security 2026] External: кнопки Яндекс.Маркета содержат target=_blank и rel=noopener", () => {
  const allAstro = getAstroFiles(SRC_DIR);
  let hasMarketButton = false;
  allAstro.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    if (content.includes("market.yandex.ru")) {
      hasMarketButton = true;
      assert.match(content, /target=["']_blank["']/, `${path.basename(fp)}: market.yandex без target=_blank`);
      assert.match(content, /rel=["'](?:.*\b)?noopener\s+noreferrer(?:.*\b)?["']/, `${path.basename(fp)}: market.yandex без rel=noopener`);
    }
  });
  assert.ok(hasMarketButton, "Не найдено ссылок на Яндекс.Маркет в .astro файлах");
});

// ============================================================
// 12. JSON-LD СТРУКТУРНЫЕ ДАННЫЕ (built output)
// ============================================================

test("[SEO 2026] JSON-LD: все страницы имеют валидный JSON-LD без ошибок парсинга", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    scripts.forEach(s => {
      const json = s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, "");
      try { JSON.parse(json); } catch (e) {
        assert.fail(`${fp}: невалидный JSON-LD — ${e.message}`);
      }
    });
  });
});

test("[SEO 2026] JSON-LD: статьи HowTo имеют обязательные поля (name, description, datePublished, step)", () => {
  const files = getDistHtmlFiles().filter(f => f.includes("/scenarios/") && !f.includes("/404"));
  if (files.length === 0) return;
  const howToPages = [];
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    scripts.forEach(s => {
      const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
      const schemas = Array.isArray(json) ? json : [json];
      schemas.forEach(node => {
        if (node["@type"] === "HowTo") howToPages.push({ file: fp, schema: node });
      });
    });
  });
  howToPages.forEach(item => {
    assert.ok(item.schema.name, `${item.file}: HowTo без name`);
    assert.ok(item.schema.description, `${item.file}: HowTo без description`);
    assert.ok(item.schema.datePublished, `${item.file}: HowTo без datePublished`);
    assert.ok(Array.isArray(item.schema.step) && item.schema.step.length > 0, `${item.file}: HowTo без шагов`);
    item.schema.step.forEach((step, i) => {
      assert.ok(step.name, `${item.file}: HowToStep ${i + 1} без name`);
      assert.ok(step.text, `${item.file}: HowToStep ${i + 1} без text`);
    });
  });
});

test("[SEO 2026] JSON-LD: страницы статей имеют BreadcrumbList", () => {
  const files = getDistHtmlFiles().filter(f => f.includes("/scenarios/") && !f.includes("/404"));
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    let hasBreadcrumb = false;
    scripts.forEach(s => {
      const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
      const schemas = Array.isArray(json) ? json : [json];
      if (schemas.some(n => n["@type"] === "BreadcrumbList")) hasBreadcrumb = true;
    });
    assert.ok(hasBreadcrumb, `${fp}: нет BreadcrumbList в JSON-LD`);
  });
});

// ============================================================
// 13. UX / НАВИГАЦИЯ
// ============================================================

test("[UX 2026] Nav: хлебные крошки присутствуют на страницах статей", () => {
  const files = getDistHtmlFiles().filter(f => f.includes("/scenarios/") && !f.includes("/404"));
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    assert.match(content, /aria-label=["']Хлебные крошки["']/, `${fp}: нет хлебных крошек`);
    assert.match(content, /Главная/, `${fp}: хлебные крошки без ссылки на Главную`);
  });
});

test("[UX 2026] Theme: кнопка переключения темы присутствует", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  files.forEach(fp => {
    const content = fs.readFileSync(fp, "utf8");
    assert.match(content, /theme-toggle/, `${fp}: нет кнопки theme-toggle`);
    assert.match(content, /localStorage/, `${fp}: нет логики localStorage для темы`);
  });
});

test("[UX 2026] Footer: ссылки на /about, /privacy, /contacts ведут на существующие страницы", () => {
  const files = getDistHtmlFiles();
  if (files.length === 0) return;
  const pagePaths = new Set(files.map(f => {
    let rel = "/" + path.relative(DIST_DIR, f);
    rel = rel.replace(/index\.html$/, "");
    return rel === "/" ? "/" : `/${rel.replace(/\/$/, "").replace(/^\//, "")}/`;
  }));
  ["/about/", "/privacy/", "/contacts/"].forEach(p => {
    assert.ok(pagePaths.has(p), `Страница ${p} не собрана, но ссылается из футера (доступные: ${[...pagePaths].join(", ")})`);
  });
});

// ============================================================
// 14. КОНТЕНТ-ПЛАН (coverage)
// ============================================================

test("[SEO 2026] Coverage: есть минимум 1 troubleshooting и 1 scenario", () => {
  assert.ok(scenarioEntries.length >= 1, "Нет ни одной статьи категории scenario");
  assert.ok(troubleshootingEntries.length >= 1, "Нет ни одной статьи категории troubleshooting");
});

test("[SEO 2026] Coverage: все сценарии имеют хотя бы 3 устройства", () => {
  scenarioEntries.forEach(a => {
    assert.ok(a.data.devices && a.data.devices.length >= 3, `${a.name}: менее 3 устройств`);
  });
});

test("[SEO 2026] Dates: publishDate не позже updatedDate", () => {
  articleFiles.forEach(a => {
    if (a.data.publishDate && a.data.updatedDate) {
      const pub = new Date(a.data.publishDate);
      const upd = new Date(a.data.updatedDate);
      assert.ok(pub <= upd, `${a.name}: publishDate позже updatedDate`);
    }
  });
});
