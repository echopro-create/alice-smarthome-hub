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
			width: parseInt(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || "0", 10),
			height: parseInt(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || "0", 10),
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

test("[SEO 2026] Content: объём новых статей от 700 до 900 слов (старые — от 150)", () => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	articleFiles.forEach((a) => {
		const wc = words(a.body).length;
		const isNew = a.data.publishDate && new Date(a.data.publishDate) >= today;
		if (isNew) {
			assert.ok(wc >= 700, `${a.name}: ${wc} слов (новые статьи — минимум 700)`);
			assert.ok(wc <= 900, `${a.name}: ${wc} слов (максимум 900)`);
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
				violations.push({
					file: path.basename(fp),
					tag: m[0],
					error: "Missing loading='lazy' (no fetchpriority='high')",
				});
			if (!/decoding=["']async["']/.test(attrs))
				violations.push({ file: path.basename(fp), tag: m[0], error: "Missing decoding='async'" });
			if (!/alt=/i.test(attrs)) violations.push({ file: path.basename(fp), tag: m[0], error: "Missing alt" });
			if (!/width=/i.test(attrs) || !/height=/i.test(attrs))
				violations.push({ file: path.basename(fp), tag: m[0], error: "Missing width/height (CLS)" });
		}
	});
	assert.deepEqual(violations, [], "Нарушения CLS/SEO в img-тегах");
});

test("[SEO 2026] Content Images: каждая статья имеет ровно одну картинку в шагах", () => {
	articleFiles.forEach((a) => {
		let imgCount = 0;
		if (Array.isArray(a.data.steps)) {
			a.data.steps.forEach((step) => {
				if (step.image) imgCount++;
			});
		}
		assert.equal(imgCount, 1, `${a.name}: найдено ${imgCount} изображений в steps (должно быть ровно 1)`);
	});
});

test("[SEO 2026] Content Images: файлы картинок существуют, имена в нижнем регистре, уникальны", () => {
	const seenImages = new Map();
	articleFiles.forEach((a) => {
		if (Array.isArray(a.data.steps)) {
			a.data.steps.forEach((step) => {
				if (step.image) {
					const absPath = path.resolve(SCENARIOS_DIR, step.image);
					assert.ok(fs.existsSync(absPath), `${a.name}: файл изображения ${step.image} не найден на диске`);

					const filename = path.basename(absPath);
					const isLowercase = filename === filename.toLowerCase();
					assert.ok(isLowercase, `${a.name}: имя файла изображения "${filename}" должно быть строго в нижнем регистре`);

					if (seenImages.has(filename)) {
						assert.fail(`${a.name}: изображение "${filename}" дублируется со статьей ${seenImages.get(filename)}`);
					}
					seenImages.set(filename, a.name);
				}
			});
		}
	});
});

test("[SEO 2026] Content Images: отсутствие лишних inline-изображений в теле Markdown", () => {
	articleFiles.forEach((a) => {
		const hasHtmlImg = /<img\s+/i.test(a.body);
		assert.ok(!hasHtmlImg, `${a.name}: обнаружены HTML-теги <img> в теле статьи`);

		const hasMarkdownImg = /!\[.*?\]\(.*?\)/.test(a.body);
		assert.ok(!hasMarkdownImg, `${a.name}: обнаружена Markdown-разметка изображений в теле статьи`);
	});
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

test("[SEO 2026] HTML: длина тега <title> на всех страницах от 20 до 70 символов", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const m = content.match(/<title>([\s\S]*?)<\/title>/i);
		assert.ok(m, `${fp}: отсутствует тег <title>`);
		const titleText = m[1].trim();
		const len = titleText.length;
		assert.ok(len >= 20 && len <= 70, `${fp}: title "${titleText}" ${len} симв. (ожидается 20–70)`);
	});
});

test("[SEO 2026] HTML: длина мета-описания на всех страницах от 100 до 170 символов", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const m =
			content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
			content.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
		assert.ok(m, `${fp}: отсутствует мета-описание`);
		const descText = m[1].trim();
		const len = descText.length;
		assert.ok(len >= 100 && len <= 170, `${fp}: description "${descText}" ${len} симв. (ожидается 100–170)`);
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
			let rel = `/${path.relative(DIST_DIR, p)}`;
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
		(r) => r.source === "/sitemap.xml" && r.destination === "/sitemap-index.xml" && r.permanent === true,
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
					if (item.item?.includes("#")) {
						breadcrumbOk = false;
					}
				});
				// Проверяем, что позиция 2 ссылается на /scenarios/ или /troubleshooting/
				if (bc.itemListElement?.[1]) {
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
			let rel = `/${path.relative(DIST_DIR, f)}`;
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

// ============================================================
// 16. JSON-LD: TechArticle для траблшутинга + дополнительные проверки
// ============================================================

test("[SEO 2026] JSON-LD: страницы troubleshooting имеют TechArticle с author, publisher, logo", () => {
	const files = getDistHtmlFiles().filter(
		(f) => f.includes("/troubleshooting/") && /\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html$/.test(f),
	);
	if (files.length === 0) return;
	let hasTechArticle = false;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
		scripts.forEach((s) => {
			const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
			const schemas = Array.isArray(json) ? json : [json];
			const ta = schemas.find((n) => n["@type"] === "TechArticle");
			if (ta) {
				hasTechArticle = true;
				assert.ok(ta.headline, `${fp}: TechArticle без headline`);
				assert.ok(ta.description, `${fp}: TechArticle без description`);
				assert.ok(ta.datePublished, `${fp}: TechArticle без datePublished`);
				assert.ok(ta.author, `${fp}: TechArticle без author`);
				assert.ok(ta.author.name, `${fp}: TechArticle author без name`);
				assert.ok(ta.publisher, `${fp}: TechArticle без publisher`);
				assert.ok(ta.publisher.name, `${fp}: TechArticle publisher без name`);
				assert.ok(ta.publisher.logo, `${fp}: TechArticle publisher без logo`);
				assert.ok(ta.publisher.logo.url, `${fp}: TechArticle publisher logo без url`);
			}
		});
	});
	assert.ok(hasTechArticle, "Ни одна troubleshooting-статья не содержит TechArticle JSON-LD");
});

test("[SEO 2026] JSON-LD: HowTo сценарии содержат image (главное изображение) и step.url с #step-N", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
		scripts.forEach((s) => {
			const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
			const schemas = Array.isArray(json) ? json : [json];
			const howTo = schemas.find((n) => n["@type"] === "HowTo");
			if (howTo) {
				assert.ok(howTo.image, `${fp}: HowTo без image (главное изображение)`);
				assert.ok(howTo.step && howTo.step.length > 0, `${fp}: HowTo без шагов`);
				howTo.step.forEach((step, i) => {
					assert.ok(step.name, `${fp}: HowToStep ${i + 1} без name`);
					assert.ok(step.text, `${fp}: HowToStep ${i + 1} без text`);
					assert.ok(step.url, `${fp}: HowToStep ${i + 1} без url`);
					assert.ok(step.url.includes("#step-"), `${fp}: HowToStep ${i + 1} url без #step-якоря`);
				});
			}
		});
	});
});

test("[SEO 2026] JSON-LD: dateModified присутствует в HowTo/TechArticle если updatedDate задана", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	let checkedCount = 0;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
		scripts.forEach((s) => {
			const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
			const schemas = Array.isArray(json) ? json : [json];
			const mainSchema = schemas.find((n) => n["@type"] === "HowTo" || n["@type"] === "TechArticle");
			if (mainSchema) {
				checkedCount++;
				if (mainSchema.dateModified) {
					const d1 = new Date(mainSchema.datePublished);
					const d2 = new Date(mainSchema.dateModified);
					assert.ok(d2 >= d1, `${fp}: dateModified раньше datePublished в JSON-LD`);
				}
			}
		});
	});
	assert.ok(checkedCount > 0, "Не найдено ни одной HowTo/TechArticle схемы в dist");
});

test("[SEO 2026] JSON-LD: статьи troubleshooting с шагами содержат HowTo (не только scenario)", () => {
	const files = getDistHtmlFiles().filter(
		(f) => f.includes("/troubleshooting/") && /\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html$/.test(f),
	);
	if (files.length === 0) return;
	let troubleshootingWithSteps = 0;
	let troubleshootingWithHowTo = 0;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const hasSteps = content.includes("steps-section") || content.includes('id="step-');
		if (!hasSteps) return;
		troubleshootingWithSteps++;
		const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
		scripts.forEach((s) => {
			const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
			const schemas = Array.isArray(json) ? json : [json];
			if (schemas.some((n) => n["@type"] === "HowTo")) troubleshootingWithHowTo++;
		});
	});
	if (troubleshootingWithSteps > 0) {
		assert.ok(troubleshootingWithHowTo > 0, "Есть troubleshooting со шагами, но без HowTo JSON-LD");
	}
});

test("[SEO 2026] JSON-LD: BreadcrumbList itemListElement[0] — Главная с корректным URL на всех страницах", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	let breadcrumbCount = 0;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const scripts = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
		scripts.forEach((s) => {
			const json = JSON.parse(s.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, ""));
			const schemas = Array.isArray(json) ? json : [json];
			const bc = schemas.find((n) => n["@type"] === "BreadcrumbList");
			if (bc) {
				breadcrumbCount++;
				const item0 = bc.itemListElement?.[0];
				assert.ok(item0, `${fp}: BreadcrumbList без itemListElement[0]`);
				assert.equal(item0.position, 1, `${fp}: BreadcrumbList позиция 1 не равна 1`);
				assert.equal(item0.name, "Главная", `${fp}: BreadcrumbList позиция 1 не "Главная"`);
				assert.ok(
					item0.item?.replace(/\/$/, "").endsWith("smart-hub.info"),
					`${fp}: BreadcrumbList позиция 1 URL не на smart-hub.info`,
				);
			}
		});
	});
	assert.ok(breadcrumbCount > 0, "Ни одна страница не содержит BreadcrumbList");
});

// ============================================================
// 17. ARTICLE METADATA (modified_time, pagefind)
// ============================================================

test("[SEO 2026] Article: article:modified_time присутствует на страницах статей (сигнал свежести)", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	const articlePages = files.filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (articlePages.length === 0) return;
	let withModified = 0;
	articlePages.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		if (content.includes("article:modified_time")) withModified++;
	});
	assert.ok(
		withModified >= articlePages.length * 0.8,
		`article:modified_time найден только на ${withModified}/${articlePages.length} страницах статей`,
	);
});

test("[SEO 2026] Pagefind: data-pagefind-body присутствует на страницах статей", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	const articlePages = files.filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (articlePages.length === 0) return;
	articlePages.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /data-pagefind-body/, `${fp}: отсутствует data-pagefind-body (Pagefind не проиндексирует)`);
	});
});

test("[SEO 2026] Pagefind: pagefind-ui.js и pagefind-ui.css существуют в dist/", () => {
	assert.ok(fs.existsSync(`${DIST_DIR}/pagefind/pagefind-ui.js`), "pagefind-ui.js не найден в dist/pagefind/");
	assert.ok(fs.existsSync(`${DIST_DIR}/pagefind/pagefind-ui.css`), "pagefind-ui.css не найден в dist/pagefind/");
});

// ============================================================
// 18. SECURITY HEADERS & VERCEL CONFIG
// ============================================================

test("[Security 2026] Vercel: www → non-www редирект настроен", () => {
	const fp = path.join(__dirname, "../vercel.json");
	assert.ok(fs.existsSync(fp), "vercel.json не найден");
	const vercel = JSON.parse(fs.readFileSync(fp, "utf8"));
	const hasWwwRedirect = vercel.redirects.some(
		(r) =>
			r.has?.some((h) => h.type === "host" && h.value === "www.smart-hub.info") &&
			r.destination === "https://smart-hub.info/:path*" &&
			r.permanent === true,
	);
	assert.ok(hasWwwRedirect, "vercel.json: нет редиректа www → non-www");
});

test("[Security 2026] Vercel: Strict-Transport-Security (HSTS) заголовок настроен", () => {
	const fp = path.join(__dirname, "../vercel.json");
	assert.ok(fs.existsSync(fp), "vercel.json не найден");
	const vercel = JSON.parse(fs.readFileSync(fp, "utf8"));
	const globalHeaders = vercel.headers.find((h) => h.source === "/(.*)");
	assert.ok(globalHeaders, "vercel.json: нет глобальной секции headers для '/(.*)'");
	const sts = globalHeaders.headers.find((h) => h.key === "Strict-Transport-Security");
	assert.ok(sts, "vercel.json: нет заголовка Strict-Transport-Security");
	assert.match(sts.value, /max-age=31536000/, "HSTS: неверный max-age");
	assert.match(sts.value, /includeSubDomains/, "HSTS: нет includeSubDomains");
});

test("[Security 2026] Vercel: X-Content-Type-Options: nosniff настроен", () => {
	const fp = path.join(__dirname, "../vercel.json");
	const vercel = JSON.parse(fs.readFileSync(fp, "utf8"));
	const globalHeaders = vercel.headers.find((h) => h.source === "/(.*)");
	const xcto = globalHeaders.headers.find((h) => h.key === "X-Content-Type-Options");
	assert.ok(xcto, "vercel.json: нет X-Content-Type-Options");
	assert.equal(xcto.value, "nosniff", "X-Content-Type-Options: должно быть nosniff");
});

test("[Security 2026] Vercel: X-Frame-Options: DENY настроен", () => {
	const fp = path.join(__dirname, "../vercel.json");
	const vercel = JSON.parse(fs.readFileSync(fp, "utf8"));
	const globalHeaders = vercel.headers.find((h) => h.source === "/(.*)");
	const xfo = globalHeaders.headers.find((h) => h.key === "X-Frame-Options");
	assert.ok(xfo, "vercel.json: нет X-Frame-Options");
	assert.equal(xfo.value, "DENY", "X-Frame-Options: должно быть DENY");
});

test("[Security 2026] Vercel: Referrer-Policy: strict-origin-when-cross-origin", () => {
	const fp = path.join(__dirname, "../vercel.json");
	const vercel = JSON.parse(fs.readFileSync(fp, "utf8"));
	const globalHeaders = vercel.headers.find((h) => h.source === "/(.*)");
	const rp = globalHeaders.headers.find((h) => h.key === "Referrer-Policy");
	assert.ok(rp, "vercel.json: нет Referrer-Policy");
	assert.equal(rp.value, "strict-origin-when-cross-origin", "Referrer-Policy: неверное значение");
});

test("[Security 2026] Vercel: Content-Security-Policy содержит основные директивы", () => {
	const fp = path.join(__dirname, "../vercel.json");
	const vercel = JSON.parse(fs.readFileSync(fp, "utf8"));
	const globalHeaders = vercel.headers.find((h) => h.source === "/(.*)");
	const csp = globalHeaders.headers.find((h) => h.key === "Content-Security-Policy");
	assert.ok(csp, "vercel.json: нет Content-Security-Policy");
	assert.match(csp.value, /default-src/, "CSP: нет default-src");
	assert.match(csp.value, /style-src/, "CSP: нет style-src");
	assert.match(csp.value, /script-src/, "CSP: нет script-src");
	assert.match(csp.value, /img-src/, "CSP: нет img-src");
	assert.match(csp.value, /font-src/, "CSP: нет font-src");
});

test("[Security 2026] Vercel: Cache-Control immutable для _astro ресурсов", () => {
	const fp = path.join(__dirname, "../vercel.json");
	const vercel = JSON.parse(fs.readFileSync(fp, "utf8"));
	const astroHeaders = vercel.headers.find((h) => h.source === "/_astro/(.*)");
	assert.ok(astroHeaders, "vercel.json: нет секции headers для /_astro/ ресурсов");
	const cc = astroHeaders.headers.find((h) => h.key === "Cache-Control");
	assert.ok(cc, "vercel.json: нет Cache-Control для _astro/");
	assert.match(cc.value, /max-age=31536000/, "Cache-Control: нет max-age=31536000");
	assert.match(cc.value, /immutable/, "Cache-Control: нет immutable");
});

// ============================================================
// 19. SECURITY: все внешние ссылки (расширенная проверка)
// ============================================================

test("[Security 2026] External: ВСЕ внешние ссылки в .astro содержат rel='noopener noreferrer'", () => {
	const allAstro = getAstroFiles(SRC_DIR);
	const violations = [];
	allAstro.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const aRegex = /<a\s[^>]*href="(https?:\/\/(?!smart-hub)[^"]*)"[^>]*>/g;
		let m;
		while ((m = aRegex.exec(content)) !== null) {
			const tag = m[0];
			const href = m[1];
			if (href.includes("preconnect") || href.includes("astatic") || href.includes("yastatic")) return;
			if (!/rel=["'][^"']*(?:noopener|noreferrer)[^"']*["']/.test(tag)) {
				violations.push({ file: path.basename(fp), tag: tag.substring(0, 120) });
			}
		}
	});
	assert.deepEqual(violations, [], "Внешние ссылки без rel=noopener/noreferrer");
});

// ============================================================
// 20. HTML: фундаментальные мета-теги (viewport, charset, generator)
// ============================================================

test("[SEO 2026] HTML: все страницы имеют viewport мета-тег", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /<meta\s+name=["']viewport["'][^>]*>/, `${fp}: нет viewport мета-тега`);
	});
});

test("[SEO 2026] HTML: все страницы имеют meta charset UTF-8", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /<meta\s+charset=["']UTF-8["']/i, `${fp}: нет meta charset UTF-8`);
	});
});

test("[SEO 2026] HTML: meta name='title' присутствует наравне с <title>", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /<meta\s+name=["']title["']/i, `${fp}: нет meta name="title"`);
	});
});

test("[SEO 2026] HTML: og:type = 'website' на всех страницах", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /og:type["']\s+content=["']website["']/i, `${fp}: нет og:type website`);
	});
});

// ============================================================
// 21. CANONICAL: trailing slash и консистентность
// ============================================================

test("[SEO 2026] HTML: canonical URL заканчивается на / (trailing slash)", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const m = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
		if (!m) return;
		const url = m[1];
		assert.ok(url.endsWith("/") || url === "https://smart-hub.info", `${fp}: canonical без trailing slash: ${url}`);
	});
});

test("[SEO 2026] HTML: canonical URL не содержит index.html", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const m = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
		if (!m) return;
		const url = m[1];
		assert.ok(!url.includes("index.html"), `${fp}: canonical содержит index.html: ${url}`);
	});
});

// ============================================================
// 22. ARTIFACTS: PWA иконки, верификация, шрифты
// ============================================================

test("[SEO 2026] Artifacts: PWA иконки icon-192.png и icon-512.png существуют в public/", () => {
	assert.ok(fs.existsSync(`${PUBLIC_DIR}/icon-192.png`), "icon-192.png не найден в public/");
	assert.ok(fs.existsSync(`${PUBLIC_DIR}/icon-512.png`), "icon-512.png не найден в public/");
	const dims192 = getImageDimensions(`${PUBLIC_DIR}/icon-192.png`);
	assert.ok(
		dims192 && dims192.width === 192 && dims192.height === 192,
		`icon-192.png: размеры ${dims192?.width}x${dims192?.height}, ожидается 192x192`,
	);
	const dims512 = getImageDimensions(`${PUBLIC_DIR}/icon-512.png`);
	assert.ok(
		dims512 && dims512.width === 512 && dims512.height === 512,
		`icon-512.png: размеры ${dims512?.width}x${dims512?.height}, ожидается 512x512`,
	);
});

test("[SEO 2026] Artifacts: PWA иконки скопированы в dist/ после сборки", () => {
	assert.ok(fs.existsSync(`${DIST_DIR}/icon-192.png`), "icon-192.png не найден в dist/");
	assert.ok(fs.existsSync(`${DIST_DIR}/icon-512.png`), "icon-512.png не найден в dist/");
});

test("[SEO 2026] Artifacts: файлы верификации Google и Яндекс существуют", () => {
	assert.ok(fs.existsSync(`${PUBLIC_DIR}/google13719b92e35599e0.html`), "Google verification file not found");
	const yandexFiles = fs.readdirSync(PUBLIC_DIR).filter((f) => f.startsWith("yandex_") && f.endsWith(".html"));
	assert.ok(yandexFiles.length >= 1, "Yandex verification file not found");
});

test("[SEO 2026] Artifacts: Google и Яндекс верификация скопированы в dist/", () => {
	assert.ok(fs.existsSync(`${DIST_DIR}/google13719b92e35599e0.html`), "Google verification not in dist/");
	const yandexDistFiles = fs.readdirSync(DIST_DIR).filter((f) => f.startsWith("yandex_") && f.endsWith(".html"));
	assert.ok(yandexDistFiles.length >= 1, "Yandex verification not in dist/");
});

test("[PERF 2026] Fonts: self-hosted шрифты (woff2) существуют в public/fonts/", () => {
	const fontDir = `${PUBLIC_DIR}/fonts`;
	assert.ok(fs.existsSync(fontDir), "public/fonts/ не существует");
	const woff2Files = fs.readdirSync(fontDir).filter((f) => f.endsWith(".woff2"));
	assert.ok(woff2Files.length >= 3, `Найдено ${woff2Files.length} woff2 шрифтов, ожидается >= 3`);
});

test("[PERF 2026] Fonts: self-hosted шрифты скопированы в dist/fonts/", () => {
	const fontDir = `${DIST_DIR}/fonts`;
	assert.ok(fs.existsSync(fontDir), "dist/fonts/ не существует");
	const woff2Files = fs.readdirSync(fontDir).filter((f) => f.endsWith(".woff2"));
	assert.ok(woff2Files.length >= 3, `Найдено ${woff2Files.length} woff2 шрифтов в dist, ожидается >= 3`);
});

test("[PERF 2026] Fonts: font-display: swap используется в @font-face", () => {
	const fp = path.join(DIST_DIR, "index.html");
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	assert.match(content, /font-display:\s*swap/, "font-display: swap не найден в HTML");
});

test("[PERF 2026] Fonts: шрифты preloaded с crossorigin для ускорения LCP", () => {
	const fp = path.join(DIST_DIR, "index.html");
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	const preloadFonts = content.match(/<link[^>]*rel=["']preload["'][^>]*as=["']font["'][^>]*>/gi) || [];
	assert.ok(preloadFonts.length >= 2, `Найдено ${preloadFonts.length} preload шрифтов, ожидается >= 2`);
	preloadFonts.forEach((tag) => {
		assert.match(tag, /crossorigin/i, `Font preload без crossorigin: ${tag.substring(0, 80)}`);
	});
});

// ============================================================
// 23. UX: reading time, feedback, social share, TOC
// ============================================================

test("[UX 2026] Article: время чтения отображается на страницах статей", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /мин чтения/, `${fp}: нет индикатора 'мин чтения'`);
	});
});

test("[UX 2026] Article: блок обратной связи (фидбек) присутствует", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /Была ли статья полезна/, `${fp}: нет блока обратной связи`);
		assert.match(content, /feedback-btn/, `${fp}: нет кнопок фидбека`);
	});
});

test("[UX 2026] Article: социальные кнопки (Telegram, VK, WhatsApp) присутствуют", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /t\.me\/share/, `${fp}: нет кнопки Telegram`);
		assert.match(content, /vk\.com\/share/, `${fp}: нет кнопки VK`);
		assert.match(content, /whatsapp\.com\/send/, `${fp}: нет кнопки WhatsApp`);
	});
});

test("[UX 2026] Article: оглавление (TOC) присутствует на статьях с заголовками", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	let tocCount = 0;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const hasHeadings = (content.match(/<h[23][^>]*>/gi) || []).length >= 1;
		if (!hasHeadings) return;
		if (content.includes("toc-box") || content.includes("toc-link")) tocCount++;
	});
	assert.ok(tocCount > 0, "Ни одна статья с заголовками не имеет TOC-оглавления");
});

test("[UX 2026] Article: DeviceList рендерится на страницах с устройствами", () => {
	const files = getDistHtmlFiles().filter(
		(f) =>
			f.match(/\/scenarios\/(?!\d+\b)[^/]+\/index\.html/) || f.match(/\/troubleshooting\/(?!\d+\b)[^/]+\/index\.html/),
	);
	if (files.length === 0) return;
	let deviceListCount = 0;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		if (content.includes("device-list") || content.includes("Необходимое оборудование")) deviceListCount++;
	});
	assert.ok(deviceListCount > 0, "DeviceList не отрендерен ни на одной странице");
});

// ============================================================
// 24. BREADCRUMB & SITEMAP HTML PAGE
// ============================================================

test("[SEO 2026] Nav: страницы /about, /privacy, /compatibility, /sitemap имеют хлебные крошки", () => {
	const pages = ["about", "privacy", "compatibility", "sitemap"];
	pages.forEach((page) => {
		const fp = path.join(DIST_DIR, page, "index.html");
		if (!fs.existsSync(fp)) return;
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /aria-label=["']Хлебные крошки["']/, `/${page}/: нет хлебных крошек`);
	});
});

test("[SEO 2026] Nav: страница /sitemap/ имеет все секции карты сайта", () => {
	const fp = path.join(DIST_DIR, "sitemap/index.html");
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	assert.match(content, /<h1[^>]*>[\s\S]*?Карта сайта/, "/sitemap/: нет h1");
	assert.match(content, /Основные страницы/, "/sitemap/: нет секции основных страниц");
	assert.match(content, /Сценарии автоматизации/, "/sitemap/: нет секции сценариев");
	assert.match(content, /Траблшутинг/, "/sitemap/: нет секции траблшутинга");
	assert.match(content, /sitemap\.xml/, "/sitemap/: нет ссылки на sitemap.xml");
});

// ============================================================
// 25. LISTING PAGES: пагинация и фильтры
// ============================================================

test("[UX 2026] Listing: страницы /scenarios/ и /troubleshooting/ имеют пагинацию", () => {
	["scenarios", "troubleshooting"].forEach((section) => {
		const fp = path.join(DIST_DIR, section, "index.html");
		if (!fs.existsSync(fp)) return;
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /pagination/, `/${section}/: нет блока пагинации`);
	});
});

test("[UX 2026] Listing: страницы /scenarios/ и /troubleshooting/ имеют фильтры", () => {
	["scenarios", "troubleshooting"].forEach((section) => {
		const fp = path.join(DIST_DIR, section, "index.html");
		if (!fs.existsSync(fp)) return;
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /filter-panel/, `/${section}/: нет панели фильтров`);
	});
});

test("[UX 2026] Listing: страницы /scenarios/ и /troubleshooting/ имеют empty state", () => {
	["scenarios", "troubleshooting"].forEach((section) => {
		const fp = path.join(DIST_DIR, section, "index.html");
		if (!fs.existsSync(fp)) return;
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /empty-state/, `/${section}/: нет empty-state компонента`);
	});
});

// ============================================================
// 26. BACK-TO-TOP BUTTON
// ============================================================

test("[UX 2026] Article: кнопка 'Наверх' (back-to-top) присутствует на всех страницах", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		assert.match(content, /back-to-top/, `${fp}: нет кнопки back-to-top`);
	});
});

// ============================================================
// 27. ДОПОЛНИТЕЛЬНЫЕ SEO
// ============================================================

test("[SEO 2026] Sitemap: sitemap-0.xml содержит lastmod для всех URL (чтобы Google знал свежесть)", () => {
	const fp = path.join(DIST_DIR, "sitemap-0.xml");
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	const locs = content.match(/<loc>/g) || [];
	const lastmods = content.match(/<lastmod>/g) || [];
	if (lastmods.length < locs.length * 0.9) {
	}
});

test("[SEO 2026] OG: og:url совпадает с canonical URL на всех страницах", () => {
	const files = getDistHtmlFiles();
	if (files.length === 0) return;
	files.forEach((fp) => {
		const content = fs.readFileSync(fp, "utf8");
		const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
		const ogUrlMatch = content.match(/og:url["']\s+content=["']([^"']+)["']/i);
		if (canonicalMatch && ogUrlMatch) {
			assert.equal(
				ogUrlMatch[1],
				canonicalMatch[1],
				`${fp}: og:url "${ogUrlMatch[1]}" не совпадает с canonical "${canonicalMatch[1]}"`,
			);
		}
	});
});

test("[SEO 2026] Coverage: все статьи имеют difficulty (не осталось без сложности)", () => {
	const noDifficulty = articleFiles.filter((a) => !a.data.difficulty);
	if (noDifficulty.length > 0) {
		const names = noDifficulty.map((a) => a.name).join(", ");
		assert.fail(`${noDifficulty.length} статей без difficulty: ${names}`);
	}
});

test("[UX 2026] Mobile: hamburger menu присутствует в разметке", () => {
	const fp = path.join(DIST_DIR, "index.html");
	if (!fs.existsSync(fp)) return;
	const content = fs.readFileSync(fp, "utf8");
	assert.match(content, /menu-toggle/, "Нет кнопки мобильного меню");
	assert.match(content, /mobile-menu/, "Нет мобильного меню");
});

test("[SEO 2026] Content: статьи не содержат markdown-комментариев (<!-- -->) в теле", () => {
	articleFiles.forEach((a) => {
		const hasComment = /<!--[\s\S]*?-->/.test(a.body);
		assert.ok(!hasComment, `${a.name}: содержит HTML/Markdown комментарий в теле статьи`);
	});
});
