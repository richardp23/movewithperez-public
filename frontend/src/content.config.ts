import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const neighborhoods = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/neighborhoods' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      summary: z.string(),
      heroImage: image(),
      heroAlt: z.string(),
      heroImageCredit: z.string().optional(),
      heroImageCreditUrl: z.url().optional(),
      heroImageLicense: z.string().optional(),
      heroImageLicenseUrl: z.url().optional(),
      medianPrice: z.number().optional(),
      vibeTags: z.array(z.string()).default([]),
      lat: z.number(),
      lng: z.number(),
      related: z.array(z.string()).default([]),
      ctaLine: z.string().optional(),
      questions: z.array(z.string()).max(6).optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
    }),
});

const insights = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/insights' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      heroImage: image().optional(),
      heroAlt: z.string().optional(),
      category: z.enum(['market', 'buying', 'selling', 'local']).default('local'),
      publishedAt: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { neighborhoods, insights };
