import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const scenariosCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/scenarios' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    category: z.enum(['scenario', 'troubleshooting']),
    devices: z.array(z.string()).optional(),
    yandexShareUrl: z.string().url().optional(),
    steps: z.array(
      z.object({
        title: z.string(),
        text: z.string(),
        image: z.string().optional(),
      })
    ).optional(),
  }),
});

export const collections = {
  scenarios: scenariosCollection,
};
