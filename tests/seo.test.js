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
