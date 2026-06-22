import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");

function injectPreloads(filePath) {
	let html = fs.readFileSync(filePath, "utf8");

	const cssLinks = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
	if (cssLinks.length === 0) return;

	const preloads = cssLinks
		.map((m) => `<link rel="preload" href="${m[1]}" as="style" fetchpriority="high">`)
		.join("");

	html = html.replace("<meta charset=", `${preloads}<meta charset=`);
	fs.writeFileSync(filePath, html);
}

function walkDir(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walkDir(fullPath);
		} else if (entry.name.endsWith(".html")) {
			injectPreloads(fullPath);
		}
	}
}

walkDir(DIST);
console.log("CSS preload hints injected");
