import fs from "node:fs";
import path from "node:path";

if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV !== "production") {
	console.log("IndexNow: skipping — not a Vercel production build");
	process.exit(0);
}

const SITE = "https://smart-hub.info";
const KEY = "6ed4729b32d062cb2538a42dca7bd6fa";
const KEY_LOCATION = `${SITE}/${KEY}.txt`;

const ENDPOINTS = [
	"https://api.indexnow.org/indexnow",
	"https://yandex.com/indexnow",
	"https://www.bing.com/indexnow",
];

function extractUrls(sitemapPath) {
	const content = fs.readFileSync(sitemapPath, "utf8");
	const matches = [...content.matchAll(/<loc>([^<]+)<\/loc>/g)];
	return matches.map((m) => m[1]).filter((url) => !url.includes("/404"));
}

async function submit(apiUrl, urls) {
	const body = {
		host: new URL(SITE).host,
		key: KEY,
		keyLocation: KEY_LOCATION,
		urlList: urls,
	};
	const response = await fetch(apiUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=utf-8" },
		body: JSON.stringify(body),
	});
	return { url: apiUrl, status: response.status, ok: response.ok };
}

const sitemapFile = path.resolve("dist/sitemap-0.xml");

if (!fs.existsSync(sitemapFile)) {
	console.error(`Sitemap not found: ${sitemapFile}`);
	process.exit(0);
}

const urls = extractUrls(sitemapFile);
if (urls.length === 0) {
	console.error("No URLs found in sitemap");
	process.exit(0);
}

const results = await Promise.allSettled(ENDPOINTS.map((url) => submit(url, urls)));

for (const result of results) {
	if (result.status === "rejected") {
		console.error(`Error: ${result.reason?.message || result.reason}`);
	} else {
		const { url, status } = result.value;
		console.log(`[${status}] ${url} — ${urls.length} URLs`);
	}
}
console.log("IndexNow submission complete");
