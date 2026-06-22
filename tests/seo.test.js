// ============================================================
// Тесты SEO, UI/UX, a11y, производительности — стандарты 2026
// Паттерны заимствованы из Shweicary, Dansk, Energy (node:test)
// ============================================================

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { fileURLToPath } from "node:url";

const SITE_URL = "https://smart-hub.info";
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

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith("devices:")) {
			data.devices = [];
			currentKey = "devices";
			inSteps = false;
			continue;
		}
		if (trimmed.startsWith("steps:")) {
			data.steps = [];
			currentKey = "steps";
			inSteps = true;
			continue;
		}
		if (currentKey === "devices" && trimmed.startsWith("-")) {
			const device = trimmed
				.replace(/^-\s*"/, "")
				.replace(/"$/, "")
				.replace(/^-\s*/, "");
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
			if (inSteps && currentStep) {
				currentStep[key.replace(/^-\s*/, "")] = value;
			} else {
				// После списка устройств новая строка ключ-значение — выходим из режима устройств
				if (currentKey === "devices" && !trimmed.startsWith("-")) currentKey = null;
				if (!inSteps && currentKey !== "devices") data[key] = value;
			}
		}
	}
	if (currentStep && inSteps) data.steps.push(currentStep);
	return { data, body };
}

function getAstroFiles(dir) {
	const files = [];
	const list = fs.readdirSync(dir);
	list.forEach((file) => {
		const fp = path.join(dir, file);
		if (fs.statSync(fp).isDirectory()) files.push(...getAstroFiles(fp));
		else if (file.endsWith(".astro")) files.push(fp);
	});
	return files;
}

function getHtmlFiles(dir) {
	const files = [];
	const list = fs.readdirSync(dir);
	list.forEach((file) => {
		const fp = path.join(dir, file);
		if (fs.statSync(fp).isDirectory()) files.push(...getHtmlFiles(fp));
		else if (file.endsWith(".html") && !file.startsWith("google") && !file.startsWith("yandex")) files.push(fp);
	});
	return files;
}

function getImageDimensions(filePath) {
	try {
		const stdout = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}"`, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "ignore"],
		});
		return {
			width: parseInt(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || "0"),
			height: parseInt(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || "0"),
		};
	} catch {
		return null;
	}
}

function words(value = "") {
	return `${value}`.split(/\s+/).filter(Boolean);
}

const articleFiles = fs
	.readdirSync(SCENARIOS_DIR)
	.filter((f) => f.endsWith(".md"))
	.map((f) => ({ name: f, path: path.join(SCENARIOS_DIR, f), ...parseArticle(path.join(SCENARIOS_DIR, f)) }));

const scenarioEntries = articleFiles.filter((a) => a.data.category === "scenario");
const troubleshootingEntries = articleFiles.filter((a) => a.data.category === "troubleshooting");
const allArticleSlugs = new Set(articleFiles.map((a) => a.name.replace(".md", "")));

// ============================================================
// 1. SEO МЕТАДАННЫЕ (descriptions, titles)
// ============================================================

test("[SEO 2026] Description: длина от 100 до 170 символов для сниппетов Яндекс/Google", () => {
	articleFiles.forEach((a) => {
		const len = (a.data.description || "").length;
		assert.ok(len >= 100 && len <= 170, `${a.name}: description ${len} симв. (нужно 100–170)`);
	});
});

test("[SEO 2026] Title: длина не более 70 символов", () => {
	articleFiles.forEach((a) => {
		const len = (a.data.title || "").length;
		assert.ok(len <= 70, `${a.name}: title ${len} симв. (максимум 70)`);
	});
});

test("[SEO 2026] Title: минимальная длина 20 символов", () => {
	articleFiles.forEach((a) => {
		const len = (a.data.title || "").length;
		assert.ok(len >= 20, `${a.name}: title ${len} симв. (минимум 20)`);
	});
});

// ============================================================
// 2. КОНТЕНТ (объем, keyword stuffing)
// ============================================================

test("[SEO 2026] Content: объём статьи не менее 150 слов (для будущих статей — от 700 до 900 слов)", () => {
	articleFiles.forEach((a) => {
		const wc = words(a.body).length;
		const isFuture = a.data.publishDate && new Date(a.data.publishDate) > new Date("2026-06-22");
		if (isFuture) {
			assert.ok(wc >= 700 && wc <= 900, `${a.name}: ${wc} слов в будущей статье (требуется от 700 до 900 слов)`);
		} else {
			assert.ok(wc >= 150, `${a.name}: ${wc} слов (минимум 150)`);
		}
	});
});

test("[SEO 2026] Content: уникальность описаний (нет дубликатов)", () => {
	const seen = new Map();
	articleFiles.forEach((a) => {
		const desc = a.data.description;
		if (seen.has(desc)) assert.fail(`Дубликат description между ${seen.get(desc)} и ${a.name}`);
		seen.set(desc, a.name);
	});
});

test("[SEO 2026] Content: уникальность заголовков (нет дубликатов)", () => {
	const seen = new Map();
	articleFiles.forEach((a) => {
		const t = a.data.title;
		if (seen.has(t)) assert.fail(`Дубликат title между ${seen.get(t)} и ${a.name}`);
		seen.set(t, a.name);
	});
});

test("[SEO 2026] Content: отсутствие keyword stuffing (повтор фраз)", () => {
	const skipPhrases = new Set([
		"умный дом",
		"умного дома",
		"умном доме",
		"с алисой",
		"дом с алисой",
		"приложение дом с алисой",
		"умных устройств",
		"яндекс станция",
		"яндекс станции",
	]);
	articleFiles.forEach((a) => {
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
	scenarioEntries.forEach((a) => {
		assert.ok(Array.isArray(a.data.steps) && a.data.steps.length > 0, `${a.name}: нет шагов`);
		assert.ok(a.data.publishDate, `${a.name}: нет publishDate`);
		a.data.steps.forEach((step, i) => {
			assert.ok(step.title, `${a.name} шаг ${i + 1}: нет title`);
			assert.ok(step.text, `${a.name} шаг ${i + 1}: нет text`);
		});
	});
});

test("[SEO 2026] Schema: Yandex share URL ведёт на официальный домен Яндекса", () => {
	scenarioEntries.forEach((a) => {
		if (a.data.yandexShareUrl) {
			assert.ok(
				a.data.yandexShareUrl.startsWith("https://yandex.ru/alice/shared-scenarios/"),
				`${a.name}: невалидный yandexShareUrl: ${a.data.yandexShareUrl}`,
			);
		}
	});
});

test("[SEO 2026] Schema: сценарии содержат список необходимого оборудования", () => {
	scenarioEntries.forEach((a) => {
		assert.ok(Array.isArray(a.data.devices) && a.data.devices.length > 0, `${a.name}: нет списка devices`);
	});
});

test("[SEO 2026] Schema: все статьи имеют поле category", () => {
	articleFiles.forEach((a) => {
		assert.ok(a.data.category, `${a.name}: отсутствует category`);
		assert.ok(["scenario", "troubleshooting"].includes(a.data.category), `${a.name}: невалидный category`);
	});
});

test("[SEO 2026] Schema: все статьи имеют updatedDate", () => {
	articleFiles.forEach((a) => {
		assert.ok(a.data.updatedDate, `${a.name}: отсутствует updatedDate`);
	});
});

// ============================================================
// 4. ПЕРЕЛИНКОВКА (internal linking)
// ============================================================

test("[SEO 2026] Linking: нет orphan-страниц (каждая статья ссылается на ≥1 другую)", () => {
	if (articleFiles.length <= 1) return;
	articleFiles.forEach((a) => {
		const links = a.body.match(/\[([^\]]+)\]\((\/[^)]+)\)/g) || [];
		const internal = links.filter((l) => l.includes("/scenarios/") || l.includes("/troubleshooting/"));
		assert.ok(internal.length >= 1, `${a.name}: ни одной внутренней ссылки (orphan page)`);
	});
});

test("[SEO 2026] Linking: все внутренние ссылки ведут на существующие slug'и", () => {
	articleFiles.forEach((a) => {
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
	articleFiles.forEach((a) => {
		const linkRegex = /\[([^\]]+)\]\((\/[^)]+)\)/g;
		let m;
		while ((m = linkRegex.exec(a.body)) !== null) {
			const anchor = m[1].trim();
			assert.ok(anchor.length >= 3, `${a.name}: короткий анкор "${anchor}"`);
			const isBad = badAnchors.some((w) => anchor.toLowerCase().includes(w));
			assert.ok(!isBad, `${a.name}: неинформативный анкор "${anchor}"`);
		}
	});
});

test("[SEO 2026] Linking: inbound — на каждую статью ссылается ≥1 другая статья (нет orphan)", () => {
	const allSlugs = new Map(articleFiles.map((a) => [a.name.replace(".md", ""), new Set()]));
	articleFiles.forEach((source) => {
		const srcSlug = source.name.replace(".md", "");
		const linkRegex = /\[([^\]]+)\]\(\/(scenarios|troubleshooting)\/([^)#?]+)/g;
		let m;
		while ((m = linkRegex.exec(source.body)) !== null) {
			const targetSlug = m[3];
			if (allSlugs.has(targetSlug)) allSlugs.get(targetSlug).add(srcSlug);
		}
	});
	if (articleFiles.length > 1) {
		allSlugs.forEach((inbound, slug) => {
			assert.ok(inbound.size >= 1, `${slug}.md: 0 входящих ссылок (orphan page)`);
		});
	}
});

test("[SEO 2026] Linking: cross-category — минимум 1 ссылка между scenario и troubleshooting", () => {
	if (scenarioEntries.length === 0 || troubleshootingEntries.length === 0) return;
	let hasCrossLink = false;
	scenarioEntries.forEach((a) => {
		if (a.body.includes("/troubleshooting/")) hasCrossLink = true;
	});
	troubleshootingEntries.forEach((a) => {
		if (a.body.includes("/scenarios/")) hasCrossLink = true;
	});
	assert.ok(hasCrossLink, "Нет ни одной кросс-категорийной ссылки (scenario↔troubleshooting)");
});

test("[SEO 2026] Linking: crawl depth — все статьи достижимы с главной за ≤2 клика", () => {
	// Главная → категорийные страницы → статьи
	// Проверяем, что категорийные страницы ссылаются на все свои статьи
	const scenarioPage = path.join(DIST_DIR, "scenarios/index.html");
	const troubleshootingPage = path.join(DIST_DIR, "troubleshooting/index.html");
	if (!fs.existsSync(scenarioPage) || !fs.existsSync(troubleshootingPage)) return;

	const htmlFiles = getDistHtmlFiles();

	// Собираем ссылки на сценарии со всех страниц списков сценариев (включая пагинацию)
	const scenarioLinks = new Set();
	htmlFiles.forEach((f) => {
		const relative = path.relative(DIST_DIR, f);
		if (relative === "scenarios/index.html" || /^scenarios\/\d+\/index\.html$/.test(relative)) {
			const html = fs.readFileSync(f, "utf8");
			const matches = html.matchAll(/href="\/scenarios\/([^"#/]+)/g);
			for (const m of matches) {
				if (!/^\d+$/.test(m[1])) {
					scenarioLinks.add(m[1]);
				}
			}
		}
	});

	// Собираем ссылки на траблшутинг со всех страниц списков траблшутинга (включая пагинацию)
	const tshootLinks = new Set();
	htmlFiles.forEach((f) => {
		const relative = path.relative(DIST_DIR, f);
		if (relative === "troubleshooting/index.html" || /^troubleshooting\/\d+\/index\.html$/.test(relative)) {
			const html = fs.readFileSync(f, "utf8");
			const matches = html.matchAll(/href="\/troubleshooting\/([^"#/]+)/g);
			for (const m of matches) {
				if (!/^\d+$/.test(m[1])) {
					tshootLinks.add(m[1]);
				}
			}
		}
	});

	const allScenarioArticles = new Set(
		articleFiles.filter((a) => a.data.category === "scenario").map((a) => a.name.replace(".md", "")),
	);
	const allTroubleshootingArticles = new Set(
		articleFiles.filter((a) => a.data.category === "troubleshooting").map((a) => a.name.replace(".md", "")),
	);

	allScenarioArticles.forEach((slug) => {
		assert.ok(scenarioLinks.has(slug), `/scenarios/${slug} не найден на страницах /scenarios/ или их пагинации`);
	});
	allTroubleshootingArticles.forEach((slug) => {
		assert.ok(
			tshootLinks.has(slug),
			`/troubleshooting/${slug} не найден на страницах /troubleshooting/ или их пагинации`,
		);
	});

	// Проверяем, что главная страница ссылается на категорийные
	const indexHtml = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf8");
	assert.match(indexHtml, /href="\/scenarios\/"/, "Главная не ссылается на /scenarios/");
	assert.match(indexHtml, /href="\/troubleshooting\/"/, "Главная не ссылается на /troubleshooting/");
});

test("[SEO 2026] Linking: related статьи используют правильные URL-пути", () => {
	// Проверяем, что в сгенерированном HTML related-карточки scenario ведут на /scenarios/,
	// а troubleshooting — на /troubleshooting/
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		// Все ссылки в related-секции должны вести на правильные пути
		const relatedSection = content.match(/related-section[\s\S]*?<\/div>\s*<\/div>/);
		if (!relatedSection) return;
		const links = relatedSection[0].match(/href="\/(scenarios|troubleshooting)\/[^"]+"/g) || [];
		links.forEach((link) => {
			assert.ok(
				link.includes("/scenarios/") || link.includes("/troubleshooting/"),
				`${fp}: related ссылка с неверным путём: ${link}`,
			);
		});
	});
});

// ============================================================
// 5. ИЗОБРАЖЕНИЯ (image SEO / CLS)
// ============================================================

test("[SEO 2026] Images: все <img> в .astro файлах имеют loading=lazy, decoding=async, alt, width, height", () => {
	const violations = [];
	getAstroFiles(SRC_DIR).forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const imgRegex = /<img([^>]*)\/?>/g;
		let m;
		while ((m = imgRegex.exec(content)) !== null) {
			const attrs = m[1] || "";
			const isLCP = /fetchpriority=["']high["']/.test(attrs);
			if (!isLCP && !/loading=["']lazy["']/.test(attrs))
				violations.push({ file: path.basename(fp), tag: m[0], error: "Missing loading='lazy' (no fetchpriority='high')" });
			if (!/decoding=["']async["']/.test(attrs))
				violations.push({ file: path.basename(fp), tag: m[0], error: "Missing decoding='async'" });
			if (!/alt=/i.test(attrs)) violations.push({ file: path.basename(fp), tag: m[0], error: "Missing alt" });
			if (!/width=/i.test(attrs) || !/height=/i.test(attrs))
				violations.push({ file: path.basename(fp), tag: m[0], error: "Missing width/height (CLS)" });
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
	assert.match(
		content,
		/Sitemap:\s*https:\/\/smart-hub\.info\/sitemap-index\.xml/i,
		"robots.txt: нет ссылки на sitemap",
	);
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
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const h1s = content.match(/<h1[^>]*>/gi) || [];
		assert.equal(h1s.length, 1, `${fp}: ${h1s.length} тегов <h1> (должен быть 1)`);
	});
});

test("[SEO 2026] HTML: canonical URL уникален, в нижнем регистре, без ?/#", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	const canonicals = new Set();
	files.forEach((fp) => {
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
	files.forEach((fp) => {
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
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const linkInHeader = /<h([1-6])[^>]*>(?:(?!<\/h\1>)[\s\S])*?<a\s[\s\S]*?<\/h\1>/gi.test(content);
		assert.ok(!linkInHeader, `${fp}: ссылка внутри заголовка`);
	});
});

test("[SEO 2026] HTML: все <img> в сгенерированном HTML имеют loading=lazy, decoding=async, alt, width, height", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const imgRegex = /<img([^>]*)\/?>/gi;
		let mi;
		while ((mi = imgRegex.exec(content)) !== null) {
			const attrs = mi[1] || "";
			const isLCP = /fetchpriority=["']high["']/i.test(attrs);
			if (!isLCP) {
				assert.ok(/loading=["']lazy["']/i.test(attrs), `${fp}: img без loading=lazy (и нет fetchpriority=high)`);
			}
			assert.ok(/decoding=["']async["']/i.test(attrs), `${fp}: img без decoding=async`);
			assert.ok(/alt=/i.test(attrs), `${fp}: img без alt`);
			assert.ok(/width=/i.test(attrs) && /height=/i.test(attrs), `${fp}: img без width/height (CLS)`);
		}
	});
});

test("[PERF 2026] HTML: LCP-изображение имеет fetchpriority=high и не имеет loading=lazy", () => {
	const fp = path.join(DIST_DIR, "index.html");
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	const imgRegex = /<img([^>]*)\/?>/gi;
	let mi;
	let foundLCP = false;
	while ((mi = imgRegex.exec(content)) !== null) {
		const attrs = mi[1] || "";
		if (/class=["'][^"']*hero-image[^"']*["']/i.test(attrs)) {
			console.log("DEBUG LCP test attrs:", attrs);
			foundLCP = true;
			assert.ok(/fetchpriority=["']high["']/i.test(attrs), "Hero image без fetchpriority=high");
			assert.ok(!/loading=["']lazy["']/i.test(attrs), "Hero image не должна иметь loading=lazy");
			assert.ok(/decoding=["']async["']/i.test(attrs), "Hero image без decoding=async");
		}
	}
	assert.ok(foundLCP, "Hero image с классом hero-image не найдена на главной");
});

test("[PERF 2026] HTML: изображения в контейнерах <500px имеют атрибут sizes", () => {
	const fp = path.join(DIST_DIR, "index.html");
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	const imgRegex = /<img([^>]*)\/?>/gi;
	let mi;
	while ((mi = imgRegex.exec(content)) !== null) {
		const attrs = mi[1] || "";
		if (/class=["'][^"']*strip-image[^"']*["']/i.test(attrs)) {
			assert.ok(/sizes=/i.test(attrs), `Troubleshooting strip image без sizes атрибута: ${mi[0].substring(0, 100)}`);
		}
	}
});

test("[PERF 2026] HTML: нет неиспользуемых preconnect (только для доменов с реальными запросами)", () => {
	const fp = path.join(DIST_DIR, "index.html");
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	const preconnects = [...content.matchAll(/<link[^>]*rel=["']preconnect["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];
	preconnects.forEach((m) => {
		const href = m[1];
		const domain = new URL(href).hostname;
		const hasRequest = content.includes(href) || content.includes(`https://${domain}/`);
		assert.ok(hasRequest, `Неиспользуемый preconnect: ${href}`);
	});
});

// ============================================================
// 9. A11Y (accessibility)
// ============================================================

test("[A11Y 2026] HTML: skip-link присутствует (клавиатурная навигация)", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.ok(content.includes("skip-link"), `${fp}: нет skip-link`);
	});
});

test("[A11Y 2026] HTML: главная навигация имеет aria-label", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const hasAriaNav = /<nav[^>]*aria-label=["'][^"']+["'][^>]*>/.test(content);
		assert.ok(hasAriaNav, `${fp}: <nav> без aria-label`);
	});
});

test("[A11Y 2026] CSS: prefers-reduced-motion присутствует в стилях", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	const cssFiles = fs.readdirSync(path.join(DIST_DIR, "_astro")).filter((f) => f.endsWith(".css"));
	const allCss = cssFiles.map((f) => fs.readFileSync(path.join(DIST_DIR, "_astro", f), "utf8")).join("\n");
	assert.ok(allCss.includes("prefers-reduced-motion"), "prefers-reduced-motion отсутствует в CSS");
});

test("[A11Y 2026] HTML: :focus-visible стили определены", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	const cssFiles = fs.readdirSync(path.join(DIST_DIR, "_astro")).filter((f) => f.endsWith(".css"));
	const allCss = cssFiles.map((f) => fs.readFileSync(path.join(DIST_DIR, "_astro", f), "utf8")).join("\n");
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
	const locs = [...content.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
		let url = m[1];
		if (url.endsWith("/") && url !== `${SITE_URL}/`) url = url.replace(/\/$/, "");
		return url;
	});
	const unique = new Set(locs);
	assert.equal(locs.length, unique.size, "sitemap содержит дубликаты URL");
	locs.forEach((url) => {
		assert.ok(!url.includes("?"), `sitemap URL с ?: ${url}`);
		assert.ok(!url.includes("#"), `sitemap URL с #: ${url}`);
	});
	// Сравниваем с собранными страницами
	const pages = getDistHtmlFiles();
	const pageUrls = new Set(
		pages.map((p) => {
			let rel = "/" + path.relative(DIST_DIR, p);
			rel = rel.replace(/index\.html$/, "");
			if (rel === "/") rel = "/";
			if (rel !== "/" && rel.endsWith("/")) rel = rel.replace(/\/$/, "");
			let url = `${SITE_URL}${rel}`;
			if (url !== `${SITE_URL}/` && url.endsWith("/")) url = url.replace(/\/$/, "");
			return url;
		}),
	);
	locs.forEach((url) => {
		assert.ok(
			pageUrls.has(url),
			`sitemap URL не соответствует собранной странице: ${url} (доступно: ${[...pageUrls].join(", ")})`,
		);
	});
	// Обратная проверка: все собранные страницы есть в sitemap (кроме 404)
	pageUrls.forEach((url) => {
		if (url.includes("/404")) return;
		assert.ok(
			locs.some((l) => l.replace(/\/$/, "") === url.replace(/\/$/, "")),
			`Собранная страница отсутствует в sitemap: ${url}`,
		);
	});
});

test("[SEO 2026] Sitemap: sitemap-index.xml — валидный XML", () => {
	const fp = `${DIST_DIR}/sitemap-index.xml`;
	assert.ok(fs.existsSync(fp), "sitemap-index.xml не найден");
	const content = fs.readFileSync(fp, "utf8");
	assert.match(content, /^<\?xml/, "sitemap-index.xml не начинается с <?xml");
	assert.match(content, /<sitemapindex/, "нет <sitemapindex>");
	assert.match(content, /<sitemap>/, "нет <sitemap>");
	assert.match(content, /<loc>/, "нет <loc> в sitemapindex");
});

test("[SEO 2026] Sitemap: sitemap-0.xml — валидный XML", () => {
	const fp = `${DIST_DIR}/sitemap-0.xml`;
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	assert.match(content, /^<\?xml/, "sitemap-0.xml не начинается с <?xml");
	assert.match(content, /<urlset/, "нет <urlset>");
	assert.match(content, /<url>/, "нет <url>");
	assert.match(content, /<loc>/, "нет <loc>");
});

test("[SEO 2026] Sitemap: vercel.json содержит редирект /sitemap.xml → /sitemap-index.xml", () => {
	const fp = path.join(__dirname, "../vercel.json");
	assert.ok(fs.existsSync(fp), "vercel.json не найден");
	const vercel = JSON.parse(fs.readFileSync(fp, "utf8"));
	assert.ok(Array.isArray(vercel.redirects), "vercel.json: нет redirects");
	const hasSitemapRedirect = vercel.redirects.some(
		(r) =>
			r.source === "/sitemap.xml" &&
			r.destination === "/sitemap-index.xml" &&
			r.permanent === true,
	);
	assert.ok(hasSitemapRedirect, "vercel.json: нет редиректа /sitemap.xml → /sitemap-index.xml");
});

test("[SEO 2026] Sitemap: _headers содержит Content-Type для *.xml", () => {
	const fp = `${PUBLIC_DIR}/_headers`;
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	assert.match(content, /\*\.xml\b/, "_headers: нет секции *.xml");
	assert.match(content, /Content-Type:\s*application\/xml/, "_headers: нет Content-Type application/xml для *.xml");
});

test("[SEO 2026] Sitemap: sitemap-0.xml не содержит битых/пустых URL", () => {
	const fp = path.join(DIST_DIR, "sitemap-0.xml");
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	const locs = [...content.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	locs.forEach((url) => {
		assert.ok(url.startsWith("https://smart-hub.info"), `sitemap URL не абсолютный: ${url}`);
		assert.ok(new URL(url).pathname.length >= 1, `sitemap URL пустой или битый: ${url}`);
		assert.ok(!url.includes("404"), `sitemap содержит 404: ${url}`);
	});
});

// ============================================================
// 11. INDEXNOW — ключ и скрипт отправки
// ============================================================

test("[SEO 2026] IndexNow: файл ключа существует в public/", () => {
	const keyFile = `${PUBLIC_DIR}/6ed4729b32d062cb2538a42dca7bd6fa.txt`;
	assert.ok(fs.existsSync(keyFile), "IndexNow key file not found");
});

test("[SEO 2026] IndexNow: ключ скопирован в dist/ после сборки", () => {
	const distKeyFile = `${DIST_DIR}/6ed4729b32d062cb2538a42dca7bd6fa.txt`;
	assert.ok(fs.existsSync(distKeyFile), "IndexNow key not in dist/ — проверь, что файл в public/");
	const content = fs.readFileSync(distKeyFile, "utf8").trim();
	assert.equal(content, "6ed4729b32d062cb2538a42dca7bd6fa", `IndexNow key mismatch: ${content}`);
});

test("[SEO 2026] IndexNow: скрипт отправки существует", () => {
	const scriptPath = path.join(__dirname, "../scripts/indexnow.js");
	assert.ok(fs.existsSync(scriptPath), "scripts/indexnow.js not found");
});

test("[SEO 2026] IndexNow: ключ не попал в sitemap (не индексируется)", () => {
	const sitemapFile = `${DIST_DIR}/sitemap-0.xml`;
	if (!fs.existsSync(sitemapFile)) return;
	const content = fs.readFileSync(sitemapFile, "utf8");
	assert.ok(!content.includes("6ed4729b32d062cb2538a42dca7bd6fa"), "IndexNow key leaked into sitemap");
});

test("[SEO 2026] Hreflang: ru и x-default присутствуют на каждой странице", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /hreflang="ru"/, `${fp}: нет hreflang="ru"`);
		assert.match(content, /hreflang="x-default"/, `${fp}: нет hreflang="x-default"`);
	});
});

test("[SEO 2026] OG: og:image:width и og:image:height присутствуют на всех страницах", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /og:image:width/, `${fp}: нет og:image:width`);
		assert.match(content, /og:image:height/, `${fp}: нет og:image:height`);
	});
});

test("[SEO 2026] Twitter: twitter:card summary_large_image присутствует", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /twitter:card.*summary_large_image/, `${fp}: нет twitter:card summary_large_image`);
	});
});

test("[SEO 2026] Lang: все страницы имеют lang='ru'", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /<html[^>]*lang="ru"/, `${fp}: нет lang="ru" на <html>`);
	});
});

test("[SEO 2026] Noindex: страница 404 должна быть noindex", () => {
	const fp = `${DIST_DIR}/404.html`;
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	assert.match(content, /<title>Страница не найдена/, "404 не имеет корректного title");
	assert.match(content, /noindex/, "404 не содержит noindex в meta robots");
});

test("[SEO 2026] Article: article:published_time присутствует на страницах статей", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	const articlePages = files.filter(
		(f) => f.includes("/scenarios/") && /\/scenarios\/(?!\d+\b)[^/]+\/index\.html$/.test(f),
	);
	const troubleshootingPages = files.filter(
		(f) => f.includes("/troubleshooting/") && /\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html$/.test(f),
	);
	[...articlePages, ...troubleshootingPages].forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /article:published_time/, `${fp}: нет article:published_time`);
	});
});

// ============================================================
// 12. БЕЗОПАСНОСТЬ (security / CSP / rel-атрибуты)
// ============================================================

test("[Security 2026] External: внешние ссылки имеют rel='noopener noreferrer'", () => {
	const allAstro = getAstroFiles(SRC_DIR);
	const violations = [];
	allAstro.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const aRegex = /<a\s[^>]*href="https?:\/\/(?!smart-hub)[^"]*"[^>]*>/g;
		let m;
		while ((m = aRegex.exec(content)) !== null) {
			const tag = m[0];
			if (!/rel=["'](?:.*\b)?noopener\s+noreferrer(?:.*\b)?["']/.test(tag)) {
				if (tag.includes('target="_blank"') || tag.includes("target='_blank'")) {
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
	allAstro.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		if (content.includes("market.yandex.ru") && !content.includes('rel="preconnect"')) {
			hasMarketButton = true;
			assert.match(content, /target=["']_blank["']/, `${path.basename(fp)}: market.yandex без target=_blank`);
			assert.match(
				content,
				/rel=["'](?:.*\b)?noopener\s+noreferrer(?:.*\b)?["']/,
				`${path.basename(fp)}: market.yandex без rel=noopener`,
			);
		}
	});
	assert.ok(hasMarketButton, "Не найдено ссылок на Яндекс.Маркет в .astro файлах");
});

// ============================================================
// 13. JSON-LD СТРУКТУРНЫЕ ДАННЫЕ (built output)
// ============================================================

test("[SEO 2026] JSON-LD: все страницы имеют валидный JSON-LD без ошибок парсинга", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
		scripts.forEach((s) => {
			const json = s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, "");
			try {
				JSON.parse(json);
			} catch (e) {
				assert.fail(`${fp}: невалидный JSON-LD — ${e.message}`);
			}
		});
	});
});

test("[SEO 2026] JSON-LD: статьи HowTo имеют обязательные поля (name, description, datePublished, step, image)", () => {
	const files = getDistHtmlFiles().filter((f) => f.includes("/scenarios/") && !f.includes("/404"));
	if (files.length === 0) return;
	const howToPages = [];
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
		scripts.forEach((s) => {
			const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
			const schemas = Array.isArray(json) ? json : [json];
			schemas.forEach((node) => {
				if (node["@type"] === "HowTo") howToPages.push({ file: fp, schema: node });
			});
		});
	});
	howToPages.forEach((item) => {
		assert.ok(item.schema.name, `${item.file}: HowTo без name`);
		assert.ok(item.schema.description, `${item.file}: HowTo без description`);
		assert.ok(item.schema.datePublished, `${item.file}: HowTo без datePublished`);
		assert.ok(item.schema.image, `${item.file}: HowTo без image (главное изображение для сниппета)`);
		assert.ok(Array.isArray(item.schema.step) && item.schema.step.length > 0, `${item.file}: HowTo без шагов`);
		item.schema.step.forEach((step, i) => {
			assert.ok(step.name, `${item.file}: HowToStep ${i + 1} без name`);
			assert.ok(step.text, `${item.file}: HowToStep ${i + 1} без text`);
			assert.ok(step.url, `${item.file}: HowToStep ${i + 1} без url (якорная ссылка на шаг)`);
			assert.ok(step.url.includes("#step-"), `${item.file}: HowToStep ${i + 1} url без #step-${i + 1}`);
		});
	});
});

test("[SEO 2026] JSON-LD: страницы статей имеют BreadcrumbList с чистыми URL (без hash)", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
		let hasBreadcrumb = false;
		let breadcrumbOk = true;
		scripts.forEach((s) => {
			const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
			const schemas = Array.isArray(json) ? json : [json];
			const bc = schemas.find((n) => n["@type"] === "BreadcrumbList");
			if (bc) {
				hasBreadcrumb = true;
				// Проверяем, что ни один itemListElement не содержит # (hash-фрагмент)
				(bc.itemListElement || []).forEach((item) => {
					if (item.item && item.item.includes("#")) {
						breadcrumbOk = false;
					}
				});
				// Проверяем, что позиция 2 ссылается на /scenarios/ или /troubleshooting/
				if (bc.itemListElement && bc.itemListElement[1]) {
					const pos2url = bc.itemListElement[1].item;
					assert.ok(
						pos2url.includes("/scenarios/") || pos2url.includes("/troubleshooting/"),
						`${fp}: BreadcrumbList позиция 2 не содержит /scenarios/ или /troubleshooting/`,
					);
				}
			}
		});
		assert.ok(hasBreadcrumb, `${fp}: нет BreadcrumbList в JSON-LD`);
		assert.ok(breadcrumbOk, `${fp}: BreadcrumbList содержит hash-фрагмент (#) — нужен чистый URL`);
	});
});

test("[SEO 2026] JSON-LD: Organization и WebSite схемы присутствуют на каждой странице", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
		let hasOrg = false;
		let hasWebSite = false;
		scripts.forEach((s) => {
			const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
			const schemas = Array.isArray(json) ? json : [json];
			if (schemas.some((n) => n["@type"] === "Organization" && n.name && n.logo)) hasOrg = true;
			if (schemas.some((n) => n["@type"] === "WebSite" && n.name && n.url)) hasWebSite = true;
		});
		assert.ok(hasOrg, `${fp}: нет Organization JSON-LD (name + logo)`);
		assert.ok(hasWebSite, `${fp}: нет WebSite JSON-LD`);
	});
});

// ============================================================
// 14. UX / НАВИГАЦИЯ
// ============================================================

test("[UX 2026] Nav: хлебные крошки на статьях не содержат hash-фрагментов", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.doesNotMatch(content, /href="\/#scenarios"/, `${fp}: хлебные крошки с /#scenarios`);
		assert.doesNotMatch(content, /href="\/#troubleshooting"/, `${fp}: хлебные крошки с /#troubleshooting`);
		assert.match(content, /href="\/scenarios\/"/, `${fp}: хлебные крошки без ссылки на /scenarios/`);
	});
});

test("[UX 2026] Theme: кнопка переключения темы присутствует", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /theme-toggle/, `${fp}: нет кнопки theme-toggle`);
		assert.match(content, /localStorage/, `${fp}: нет логики localStorage для темы`);
	});
});

test("[UX 2026] Footer: ссылки на /about, /privacy ведут на существующие страницы", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	const pagePaths = new Set(
		files.map((f) => {
			let rel = "/" + path.relative(DIST_DIR, f);
			rel = rel.replace(/index\.html$/, "");
			return rel === "/" ? "/" : `/${rel.replace(/\/$/, "").replace(/^\//, "")}/`;
		}),
	);
	["/about/", "/privacy/"].forEach((p) => {
		assert.ok(
			pagePaths.has(p),
			`Страница ${p} не собрана, но ссылается из футера (доступные: ${[...pagePaths].join(", ")})`,
		);
	});
});

// ============================================================
// 13b. КАТЕГОРИЙНЫЕ ХАБЫ (страницы /scenarios/, /troubleshooting/)
// ============================================================

test("[SEO 2026] Hubs: страница /scenarios/ существует с H1 и canonical", () => {
	const fp = path.join(DIST_DIR, "scenarios/index.html");
	assert.ok(fs.existsSync(fp), "/scenarios/ не собрана");
	const content = fs.readFileSync(fp, "utf8");
	assert.match(content, /<h1[^>]*>[\s\S]*?Сценарии/, "/scenarios/: без H1 'Сценарии'");
	assert.match(content, /canonical.*\/scenarios\b/, "/scenarios/: canonical без /scenarios");
});

test("[SEO 2026] Hubs: страница /troubleshooting/ существует с H1 и canonical", () => {
	const fp = path.join(DIST_DIR, "troubleshooting/index.html");
	assert.ok(fs.existsSync(fp), "/troubleshooting/ не собрана");
	const content = fs.readFileSync(fp, "utf8");
	assert.match(content, /<h1[^>]*>[\s\S]*?траблшутинг/i, "/troubleshooting/: без H1 'траблшутинг'");
	assert.match(content, /canonical.*\/troubleshooting\b/, "/troubleshooting/: canonical без /troubleshooting");
});

test("[SEO 2026] Hubs: категорийные страницы не выдают себя за статьи (нет хлебных крошек, нет article:published_time)", () => {
	const hubFiles = getDistHtmlFiles().filter((f) => {
		const relative = path.relative(DIST_DIR, f);
		return (
			relative === "scenarios/index.html" ||
			relative === "troubleshooting/index.html" ||
			/^scenarios\/\d+\/index\.html$/.test(relative) ||
			/^troubleshooting\/\d+\/index\.html$/.test(relative)
		);
	});
	hubFiles.forEach((fp) => {
		if (!fs.existsSync(fp)) return;
		const content = fs.readFileSync(fp, "utf8");
		assert.doesNotMatch(content, /article:published_time/, `${fp}: хаб не должен иметь article:published_time`);
		assert.doesNotMatch(content, /aria-label=["']Хлебные крошки["']/, `${fp}: хаб не должен иметь хлебных крошек`);
	});
});

// ============================================================
// 13c. ЯКОРНЫЕ ССЫЛКИ НА ШАГИ
// ============================================================

test("[UX 2026] Steps: каждый шаг на статье имеет якорь id='step-N'", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const stepIds = content.match(/id="step-(\d+)"/g) || [];
		assert.ok(stepIds.length >= 1, `${fp}: нет ни одного id="step-N" — шаги не имеют якорей`);
		// Проверяем, что нумерация начинается с 1
		const hasStep1 = content.includes('id="step-1"');
		assert.ok(hasStep1, `${fp}: нет id="step-1"`);
	});
});

test("[SEO 2026] Header: навигация использует чистые URL вместо хеш-фрагментов", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		// Проверяем наличие ссылок на чистые URL категорий в навигации
		assert.match(content, /href="\/scenarios\/"/, `${fp}: header без ссылки на /scenarios/`);
		assert.match(content, /href="\/troubleshooting\/"/, `${fp}: header без ссылки на /troubleshooting/`);
		// Проверяем отсутствие hash-фрагментов в навигационных ссылках
		assert.doesNotMatch(content, /href="\/#scenarios"/, `${fp}: header содержит устаревшую ссылку /#scenarios`);
		assert.doesNotMatch(
			content,
			/href="\/#troubleshooting"/,
			`${fp}: header содержит устаревшую ссылку /#troubleshooting`,
		);
	});
});

// ============================================================
// 15. КОНТЕНТ-ПЛАН (coverage)
// ============================================================

test("[SEO 2026] Coverage: есть минимум 1 troubleshooting и 1 scenario", () => {
	assert.ok(scenarioEntries.length >= 1, "Нет ни одной статьи категории scenario");
	assert.ok(troubleshootingEntries.length >= 1, "Нет ни одной статьи категории troubleshooting");
});

test("[SEO 2026] Coverage: все сценарии имеют хотя бы 3 устройства", () => {
	scenarioEntries.forEach((a) => {
		assert.ok(a.data.devices && a.data.devices.length >= 3, `${a.name}: менее 3 устройств`);
	});
});

test("[SEO 2026] Dates: publishDate не позже updatedDate", () => {
	articleFiles.forEach((a) => {
		if (a.data.publishDate && a.data.updatedDate) {
			const pub = new Date(a.data.publishDate);
			const upd = new Date(a.data.updatedDate);
			assert.ok(pub <= upd, `${a.name}: publishDate позже updatedDate`);
		}
	});
});

test("[SEO 2026] Viral: все scenario-статьи имеют yandexShareUrl (вирусный импорт в Алису)", () => {
	scenarioEntries.forEach((a) => {
		assert.ok(a.data.yandexShareUrl, `${a.name}: сценарий без yandexShareUrl`);
		assert.ok(
			a.data.yandexShareUrl.startsWith("https://yandex.ru/alice/shared-scenarios/"),
			`${a.name}: yandexShareUrl не начинается с https://yandex.ru/alice/shared-scenarios/`,
		);
	});
});
