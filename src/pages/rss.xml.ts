import { getCollection } from "astro:content";
import rss from "@astrojs/rss";

export async function GET(context) {
	const entries = await getCollection("scenarios");
	const sorted = entries.sort(
		(a, b) => new Date(b.data.publishDate).getTime() - new Date(a.data.publishDate).getTime(),
	);

	return rss({
		title: "Умный Дом с Алисой",
		description: "Сценарии автоматизации и руководства по траблшутингу умного дома с Алисой от Яндекса",
		site: context.site ?? "https://smart-hub.info",
		items: sorted.map((entry) => ({
			title: entry.data.title,
			description: entry.data.description,
			pubDate: entry.data.publishDate,
			link: `/${entry.data.category === "scenario" ? "scenarios" : "troubleshooting"}/${entry.id}/`,
		})),
		customData: `<language>ru</language>`,
	});
}
