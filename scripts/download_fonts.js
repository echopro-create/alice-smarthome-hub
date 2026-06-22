import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONTS_DIR = path.join(__dirname, '..', 'public', 'fonts');

// Создаем папку, если ее нет
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Запрос метаданных шрифтов...');
  
  try {
    const interData = await getJson('https://gwfh.mranftl.com/api/fonts/inter?subsets=latin,cyrillic');
    const outfitData = await getJson('https://gwfh.mranftl.com/api/fonts/outfit?subsets=latin');

    const interWeights = ['300', '400', '500', '600', '700'];
    const outfitWeights = ['400', '500', '600', '700', '800'];

    const downloadTasks = [];
    const cssRules = [];

    // Inter woff2
    cssRules.push('/* Inter — Cyrillic + Latin subsets */');
    for (const variant of interData.variants) {
      if (interWeights.includes(variant.fontWeight) && variant.fontStyle === 'normal') {
        const destName = `inter-${variant.fontWeight}.woff2`;
        const destPath = path.join(FONTS_DIR, destName);
        console.log(`Добавлена задача: Inter ${variant.fontWeight} -> ${destName}`);
        downloadTasks.push({ url: variant.woff2, path: destPath });
        
        cssRules.push(`@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: ${variant.fontWeight};
  font-display: swap;
  src: url('/fonts/${destName}') format('woff2');
}`);
      }
    }

    // Outfit woff2
    cssRules.push('\n/* Outfit — Latin subset */');
    for (const variant of outfitData.variants) {
      if (outfitWeights.includes(variant.fontWeight) && variant.fontStyle === 'normal') {
        const destName = `outfit-${variant.fontWeight}.woff2`;
        const destPath = path.join(FONTS_DIR, destName);
        console.log(`Добавлена задача: Outfit ${variant.fontWeight} -> ${destName}`);
        downloadTasks.push({ url: variant.woff2, path: destPath });

        cssRules.push(`@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-weight: ${variant.fontWeight};
  font-display: swap;
  src: url('/fonts/${destName}') format('woff2');
}`);
      }
    }

    // Загрузка файлов
    console.log(`Начало загрузки ${downloadTasks.length} файлов шрифтов...`);
    for (const task of downloadTasks) {
      console.log(`Загрузка: ${path.basename(task.path)}...`);
      await downloadFile(task.url, task.path);
      const stats = fs.statSync(task.path);
      console.log(`Успешно: ${path.basename(task.path)} (${(stats.size / 1024).toFixed(1)} KB)`);
    }

    // Запись нового CSS
    const cssContent = cssRules.join('\n') + '\n';
    fs.writeFileSync(path.join(FONTS_DIR, 'fonts.css'), cssContent);
    console.log('Файл fonts.css успешно перезаписан!');
    console.log('Все шрифты оптимизированы и готовы к использованию.');

  } catch (error) {
    console.error('Ошибка во время оптимизации шрифтов:', error);
  }
}

main();
