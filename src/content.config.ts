import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({
    pattern: '**/*.mdx',
    base: './src/features/blog/content',
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.object({
        url: image(),
        alt: z.string(),
      }),
      tags: z.array(z.string()).optional(),
      relatedPosts: z.array(reference('blog')),
      readingTimeMinutes: z.number().optional(), // Added by remark plugin
      isDraft: z.boolean(),
      featured: z.boolean().optional(),
      lang: z.enum(['fr', 'en']).optional().default('fr'),
    }),
});

const aboutMeCollection = defineCollection({
  loader: glob({
    pattern: '**/*.mdx',
    base: './src/features/about-me/content',
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).optional(),
      isDraft: z.boolean().default(false),
      heroImage: z
        .object({
          url: image(),
          alt: z.string(),
        })
        .optional(),
      lang: z.enum(['fr', 'en']).optional().default('fr'),
      relatedContent: z.array(reference('about-me')).optional(),
      featured: z.boolean().optional(),
      category: z.enum(['personal', 'professional', 'skills', 'experience']).optional(),
    }),
});

export const collections = {
  blog: blogCollection,
  'about-me': aboutMeCollection,
};
