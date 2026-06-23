import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const urlSchema = z.string().refine((val) => {
	try {
		new URL(val);
		return true;
	} catch {
		return false;
	}
}, "Invalid URL");

const scenariosCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/scenarios" }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			publishDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			difficulty: z.enum(["easy", "medium", "hard"]).optional(),
			category: z.enum(["scenario", "troubleshooting"]),
			devices: z.array(z.string()).optional(),
			yandexShareUrl: urlSchema.optional(),
			steps: z
				.array(
					z.object({
						title: z.string(),
						text: z.string(),
						image: image().optional(),
					}),
				)
				.optional(),
		}),
});

export const collections = {
	scenarios: scenariosCollection,
};
