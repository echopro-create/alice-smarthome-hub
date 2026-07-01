import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://smart-hub.info';
const DIST = path.resolve(__dirname, '../dist');
const CONTENT_DIR = path.resolve(__dirname, '../src/content/scenarios');
const OUTPUT = path.resolve(__dirname, '../public/sitemap-images.xml');
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif']);

function escapeXml(value = "") {
  return `${value}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function imageEntry(url, caption) {
  return `    <image:image>
      <image:loc>${escapeXml(url)}</image:loc>
      <image:caption>${escapeXml(caption)}</image:caption>
    </image:image>`;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const kvMatch = line.match(/^(\w[\w_]*):\s*(.*)/);
    if (kvMatch) {
      fm[kvMatch[1]] = kvMatch[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return fm;
}

function findImageRefs(frontmatterText) {
  const refs = [];
  const regex = /image:\s*(.+?\.(?:png|jpg|jpeg|webp|svg|gif|avif))/gi;
  let m;
  while ((m = regex.exec(frontmatterText)) !== null) {
    const ref = m[1].trim().replace(/^['"]|['"]$/g, '');
    if (!refs.includes(ref)) refs.push(ref);
  }
  return refs;
}

function scanDistImages() {
  const images = new Map();
  if (!fs.existsSync(DIST)) return images;

  const astroDir = path.join(DIST, '_astro');
  if (!fs.existsSync(astroDir)) return images;

  for (const file of fs.readdirSync(astroDir)) {
    const ext = path.extname(file).toLowerCase();
    if (!IMG_EXT.has(ext)) continue;

    // Astro hashed: {slug}.{hash}.ext or {slug}.{hash}_{hash2}.ext
    const clean = file.replace(/\.[A-Za-z0-9_-]{6,}(?:_[A-Za-z0-9]+)?\.\w+$/, '');

    if (!images.has(clean)) {
      images.set(clean, []);
    }
    images.get(clean).push(file);
  }

  return images;
}

function findMatchingImages(distImages, imageRefs) {
  const matched = [];
  for (const ref of imageRefs) {
    const refBase = path.basename(ref, path.extname(ref));
    for (const [key, files] of distImages) {
      if (key.includes(refBase) || refBase.includes(key)) {
        for (const file of files) {
          if (!matched.includes(file)) matched.push(file);
        }
        break;
      }
    }
  }
  return matched;
}

function buildImageSitemap() {
  const entries = [];

  // Static images from public/
  const staticImgs = [
    { path: '/og-image.png', caption: 'Smart Hub — Умный дом с Алисой' },
    { path: '/icon-192.png', caption: 'Smart Hub — Иконка 192x192' },
    { path: '/icon-512.png', caption: 'Smart Hub — Иконка 512x512' },
    { path: '/favicon.svg', caption: 'Smart Hub — Favicon SVG' },
    { path: '/apple-touch-icon.png', caption: 'Smart Hub — Apple Touch Icon' },
  ];
  const staticBlock = staticImgs.map(i => imageEntry(SITE_URL + i.path, i.caption)).join('\n');
  entries.push(`  <url>
    <loc>${escapeXml(SITE_URL)}</loc>
${staticBlock}
  </url>`);

  // Scan dist images
  const distImages = scanDistImages();

  // Articles
  if (!fs.existsSync(CONTENT_DIR)) {
    return entries;
  }

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  const seenDist = new Set();

  for (const file of files) {
    const slug = file.replace('.md', '');
    const fullPath = path.join(CONTENT_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const fm = parseFrontmatter(content);
    const categoryPath = fm.category === "scenario" ? "scenarios" : "troubleshooting";
    const pageUrl = `${SITE_URL}/${categoryPath}/${slug}/`;
    const imageRefs = findImageRefs(content);

    if (imageRefs.length === 0) continue;

    const matched = findMatchingImages(distImages, imageRefs);
    if (matched.length === 0) continue;

    const imgs = [];
    for (const file of matched) {
      if (seenDist.has(file)) continue;
      seenDist.add(file);
      imgs.push(imageEntry(
        `${SITE_URL}/_astro/${file}`,
        `${fm.title || slug}`
      ));
    }

    if (imgs.length > 0) {
      entries.push(`  <url>
    <loc>${escapeXml(pageUrl)}</loc>
${imgs.join('\n')}
  </url>`);
    }
  }

  return entries;
}

try {
  const entries = buildImageSitemap();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>
`;

  fs.writeFileSync(OUTPUT, xml, 'utf-8');
  const count = (xml.match(/<image:image>/g) || []).length;
  console.log(`✓ sitemap-images.xml generated at ${OUTPUT}`);
  console.log(`  ${count} images listed`);
} catch (err) {
  console.error('✗ Failed:', err);
  process.exit(1);
}
