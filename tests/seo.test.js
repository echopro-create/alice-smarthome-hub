import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SCENARIOS_DIR = "./src/content/scenarios";

// Упрощенный парсер метаданных Markdown для тестов
function parseArticle(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`File ${filePath} is missing frontmatter`);
  }
  
  const frontmatter = match[1];
  const body = content.substring(match[0].length).trim();
  const data = {};
  
  // Парсим простые строки ключ-значение
  const lines = frontmatter.split(/\r?\n/);
  let currentKey = null;
  let inSteps = false;
  let currentStep = null;
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Переключение контекста списков
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
    
    // Если мы в списке устройств
    if (currentKey === "devices" && trimmed.startsWith("-")) {
      const device = trimmed.replace(/^-\s*"/, "").replace(/"$/, "").replace(/^-\s*/, "");
      data.devices.push(device);
      continue;
    }
    
    // Если мы в списке шагов
    if (inSteps && trimmed.startsWith("-")) {
      if (currentStep) data.steps.push(currentStep);
      currentStep = {};
    }
    
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex !== -1) {
      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();
      
      // Очистка кавычек
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      
      if (inSteps && currentStep) {
        const cleanKey = key.replace(/^-\s*/, "");
        currentStep[cleanKey] = value;
      } else if (!inSteps && currentKey !== "devices") {
        data[key] = value;
      }
    }
  }
  if (currentStep && inSteps) {
    data.steps.push(currentStep);
  }
  
  return { data, body };
}

// Загрузка всех демо-статей
const articleFiles = fs.readdirSync(SCENARIOS_DIR)
  .filter(file => file.endsWith(".md"))
  .map(file => ({
    name: file,
    path: path.join(SCENARIOS_DIR, file),
    ...parseArticle(path.join(SCENARIOS_DIR, file))
  }));

test("SEO: мета-описание (description) должно соответствовать требованиям длины", () => {
  articleFiles.forEach(article => {
    const desc = article.data.description || "";
    // Рекомендуемый диапазон для сниппетов в поиске Яндекс и Google: от 100 до 170 символов
    assert.ok(
      desc.length >= 100 && desc.length <= 170,
      `Статья ${article.name} имеет недопустимую длину мета-описания: ${desc.length} симв. (Ожидалось от 100 до 170)`
    );
  });
});

test("SEO: длина заголовка (title) не должна превышать 70 символов", () => {
  articleFiles.forEach(article => {
    const title = article.data.title || "";
    assert.ok(
      title.length <= 70,
      `Статья ${article.name} имеет слишком длинный заголовок: ${title.length} симв. (Максимум 70)`
    );
  });
});

test("Content: объем текста должен соответствовать стандартам качества YMYL/Proxima", () => {
  articleFiles.forEach(article => {
    const wordCount = article.body.split(/\s+/).filter(Boolean).length;
    // Минимальный объем статьи без воды для предотвращения фильтра МПК — 150 слов
    assert.ok(
      wordCount >= 150,
      `Статья ${article.name} слишком короткая: ${wordCount} слов. (Минимум 150)`
    );
  });
});

test("Schema.org: шаги сценариев HowTo должны содержать обязательные поля", () => {
  articleFiles.forEach(article => {
    if (article.data.category === "scenario") {
      assert.ok(
        Array.isArray(article.data.steps) && article.data.steps.length > 0,
        `Сценарий ${article.name} должен содержать хотя бы один шаг в steps`
      );
      
      article.data.steps.forEach((step, idx) => {
        assert.ok(step.title, `В сценарии ${article.name} у шага ${idx + 1} отсутствует заголовок (title)`);
        assert.ok(step.text, `В сценарии ${article.name} у шага ${idx + 1} отсутствует описание (text)`);
      });
    }
  });
});

test("Вирусность: ссылки на импорт сценариев в Алису должны вести на официальный домен Яндекса", () => {
  articleFiles.forEach(article => {
    if (article.data.category === "scenario" && article.data.yandexShareUrl) {
      assert.ok(
        article.data.yandexShareUrl.startsWith("https://yandex.ru/alice/shared-scenarios/"),
        `В сценарии ${article.name} невалидная ссылка импорта: ${article.data.yandexShareUrl}`
      );
    }
  });
});

test("Оборудование: сценарии автоматизации должны содержать перечень необходимых гаджетов", () => {
  articleFiles.forEach(article => {
    if (article.data.category === "scenario") {
      assert.ok(
        Array.isArray(article.data.devices) && article.data.devices.length > 0,
        `Сценарий ${article.name} должен указывать список оборудования в devices`
      );
    }
  });
});

test("Изображения: все теги <img> в .astro файлах должны содержать loading='lazy', decoding='async', alt и размеры width/height для предотвращения CLS", () => {
  const srcDir = "./src";
  const files = [];

  function getAstroFiles(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getAstroFiles(filePath);
      } else if (file.endsWith(".astro")) {
        files.push(filePath);
      }
    });
  }

  getAstroFiles(srcDir);

  const violations = [];

  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, "utf8");
    const imgRegex = /<img([^>]*)\/?>/g;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      const fullTag = match[0];
      const attributes = match[1] || "";

      const hasLoading = /loading=["']lazy["']/.test(attributes);
      const hasDecoding = /decoding=["']async["']/.test(attributes);
      const hasAlt = /alt=/i.test(attributes);
      const hasWidth = /width=/i.test(attributes);
      const hasHeight = /height=/i.test(attributes);

      if (!hasLoading) {
        violations.push({ file: path.basename(filePath), tag: fullTag, error: "Missing loading='lazy'" });
      }
      if (!hasDecoding) {
        violations.push({ file: path.basename(filePath), tag: fullTag, error: "Missing decoding='async'" });
      }
      if (!hasAlt) {
        violations.push({ file: path.basename(filePath), tag: fullTag, error: "Missing alt attribute" });
      }
      if (!hasWidth || !hasHeight) {
        violations.push({ file: path.basename(filePath), tag: fullTag, error: "Missing width or height attribute to prevent CLS" });
      }
    }
  });

  assert.deepEqual(violations, [], "Некоторые теги <img> не соответствуют стандартам SEO/CLS");
});

test("Перелинковка: статьи должны ссылаться друг на друга с валидными внутренними URL и информативными анкорами", () => {
  const invalidAnchors = ["тут", "здесь", "подробнее", "ссылка", "нажмите", "кликните", "go", "link"];
  
  articleFiles.forEach(article => {
    // Ищем все ссылки в формате Markdown: [анкор](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let internalLinksCount = 0;

    while ((match = linkRegex.exec(article.body)) !== null) {
      const anchorText = match[1].trim();
      const url = match[2].trim();

      // Проверяем только внутренние ссылки (абсолютные локальные пути)
      if (url.startsWith("/")) {
        internalLinksCount++;

        // 1. Проверяем, что ссылка ведет на существующий файл сценария
        if (url.startsWith("/scenarios/")) {
          const targetSlug = url.substring("/scenarios/".length);
          const targetFileExists = articleFiles.some(f => f.name === `${targetSlug}.md`);
          assert.ok(
            targetFileExists,
            `Статья ${article.name} содержит битую ссылку на несуществующий сценарий: ${url}`
          );
        }

        // 2. Валидация анкора
        assert.ok(
          anchorText.length >= 3,
          `В статье ${article.name} ссылка на ${url} имеет слишком короткий анкор: "${anchorText}"`
        );
        
        const isBadAnchor = invalidAnchors.some(badWord => anchorText.toLowerCase().includes(badWord));
        assert.ok(
          !isBadAnchor,
          `В статье ${article.name} ссылка на ${url} использует неинформативный анкор: "${anchorText}"`
        );
      }
    }

    // 3. Каждая статья должна содержать как минимум 1 внутреннюю ссылку на другие материалы хаба (Orphan Page)
    if (articleFiles.length > 1) {
      assert.ok(
        internalLinksCount >= 1,
        `Статья ${article.name} не имеет ни одной внутренней ссылки на другие материалы хаба (Orphan Page)`
      );
    }
  });
});

test("HTML: структура и иерархия заголовков, canonical теги на сгенерированных страницах", () => {
  const distDir = "./dist";
  if (!fs.existsSync(distDir)) {
    // Если сборки еще нет, тест пропускается (будет проверен при сборке)
    return;
  }

  const htmlFiles = [];
  function getHtmlFiles(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getHtmlFiles(filePath);
      } else if (file.endsWith(".html")) {
        htmlFiles.push(filePath);
      }
    });
  }
  getHtmlFiles(distDir);

  htmlFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, "utf8");

    // 1. Проверка H1: строго ровно один на странице
    const h1Matches = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    assert.equal(
      h1Matches.length,
      1,
      `Файл ${filePath} должен содержать ровно один тег <h1>, найдено: ${h1Matches.length}`
    );

    // 2. Проверка, что заголовки не содержат ссылок
    const headerWithLinkRegex = /<h([1-6])[^>]*>(?:(?!<\/h\1>)[\s\S])*?<a\s[\s\S]*?<\/h\1>/gi;
    const hasHeaderWithLink = headerWithLinkRegex.test(content);
    assert.ok(
      !hasHeaderWithLink,
      `Файл ${filePath} содержит ссылку внутри тега заголовка (h1-h6), что является антипаттерном`
    );

    // 3. Проверка наличия canonical URL
    const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    assert.ok(
      canonicalMatch,
      `Файл ${filePath} не содержит тега <link rel="canonical" ... />`
    );

    const canonicalUrl = canonicalMatch[1];
    
    // 4. Проверка нижнего регистра в canonical
    assert.equal(
      canonicalUrl,
      canonicalUrl.toLowerCase(),
      `Канонический URL в ${filePath} содержит символы в верхнем регистре: ${canonicalUrl}`
    );

    // 5. Проверка отсутствия trailing slash (для страниц глубже корня)
    const isRoot = canonicalUrl === "https://alice-smarthome.ru/";
    if (!isRoot) {
      assert.ok(
        !canonicalUrl.endsWith("/"),
        `Канонический URL не должен оканчиваться на слэш: ${canonicalUrl}`
      );
    }

    // 6. Проверка иерархии заголовков (без перескоков уровней)
    const headingRegex = /<h([1-6])[^>]*>/gi;
    let headingMatch;
    const headingLevels = [];
    while ((headingMatch = headingRegex.exec(content)) !== null) {
      headingLevels.push(parseInt(headingMatch[1], 10));
    }

    // Проверка дерева: разница между соседними уровнями не должна превышать +1
    let maxLevelSeen = 1;
    for (let i = 0; i < headingLevels.length; i++) {
      const current = headingLevels[i];
      if (current > maxLevelSeen + 1) {
        assert.fail(
          `Нарушение иерархии заголовков в ${filePath}: обнаружен переход с H${maxLevelSeen} на H${current} (пропущен уровень)`
        );
      }
      if (current > maxLevelSeen) {
        maxLevelSeen = current;
      }
    }
  });
});
